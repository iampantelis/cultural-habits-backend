from contextlib import asynccontextmanager
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from sqlmodel import Session, select
from datetime import timedelta
from jose import jwt, JWTError 
from .database import create_db_and_tables, get_session
from .models import User, MediaItem, UserInteraction
from .schemas import UserCreate, UserRead, Token, LogMedia
from .utils import hash_password, verify_password, create_access_token, ACCESS_TOKEN_EXPIRE_MINUTES, SECRET_KEY, ALGORITHM
from .services import search_tmdb_movies, search_spotify_music, search_google_books
from .recommender import generate_cross_media_recommendations, get_smart_recommendations
from fastapi.middleware.cors import CORSMiddleware

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="auth/login")

def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
        
    statement = select(User).where(User.username == username)
    user = session.exec(statement).first()
    if user is None:
        raise credentials_exception
    return user

@asynccontextmanager
async def lifespan(app: FastAPI):
    create_db_and_tables()
    yield

app = FastAPI(lifespan=lifespan)

origins = [
    "http://localhost:5173",
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/search/movies")
async def search_movies(query: str, current_user: User = Depends(get_current_user)):
    return await search_tmdb_movies(query)


@app.get("/search/music")
async def search_music(query: str, token: str = Depends(oauth2_scheme)):
    return await search_spotify_music(query)

@app.get("/search/books")
async def search_books(query: str, token: str = Depends(oauth2_scheme)):
    return await search_google_books(query)

@app.get("/users/me/interactions")
def get_my_interactions(session: Session = Depends(get_session), current_user: User = Depends(get_current_user)):
    statement = select(UserInteraction, MediaItem).where(UserInteraction.user_id == current_user.id).join(MediaItem)
    
    results = session.exec(statement).all()
    
    my_list = []
    for interaction, media in results:
        my_list.append({
            "title": media.title,
            "rating": interaction.rating,
            "status": interaction.status,
            "review": interaction.review_text,
            "poster": media.cover_image_url
        })
        
    return my_list


@app.post("/auth/register", response_model=UserRead)
def register_user(user_data: UserCreate, session: Session = Depends(get_session)):
    statement = select(User).where((User.email == user_data.email) | (User.username == user_data.username))
    if session.exec(statement).first():
        raise HTTPException(status_code=400, detail="User exists")
    new_user = User(username=user_data.username, email=user_data.email, password_hash=hash_password(user_data.password))
    session.add(new_user)
    session.commit()
    session.refresh(new_user)
    return new_user

@app.post("/auth/login", response_model=Token)
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.username == form_data.username)).first()
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Bad credentials")
    token = create_access_token(data={"sub": user.username}, expires_delta=timedelta(minutes=30))
    return {"access_token": token, "token_type": "bearer"}

@app.post("/interactions/log")
def log_media(log_data: LogMedia, session: Session = Depends(get_session), current_user: User = Depends(get_current_user)): 
    statement = select(MediaItem).where(
        (MediaItem.external_id == log_data.external_id) & 
        (MediaItem.source == "tmdb")
    )
    media_item = session.exec(statement).first()
    
    if not media_item:
        media_item = MediaItem(
            external_id=log_data.external_id,
            source="tmdb",
            media_type=log_data.media_type,
            title=log_data.title,
            cover_image_url=log_data.poster_url,
            meta_data={"year": log_data.year, "description": log_data.description}
        )
        session.add(media_item)
        session.commit()
        session.refresh(media_item)
        
    interaction_stmt = select(UserInteraction).where(
        (UserInteraction.user_id == current_user.id) &
        (UserInteraction.media_item_id == media_item.id)
    )
    existing_interaction = session.exec(interaction_stmt).first()
    
    if existing_interaction:
        existing_interaction.rating = log_data.rating
        existing_interaction.status = log_data.status
        existing_interaction.review_text = log_data.review
        session.add(existing_interaction)
    else:
        new_interaction = UserInteraction(
            user_id=current_user.id,
            media_item_id=media_item.id,
            rating=log_data.rating,
            status=log_data.status,
            review_text=log_data.review
        )
        session.add(new_interaction)
        
    session.commit()
    return {"message": "Logged successfully", "media": media_item.title, "rating": log_data.rating}

@app.get("/recommendations/me")
async def get_my_recommendations(
    session: Session = Depends(get_session),
    current_user: User = Depends(get_current_user)
):

    return await get_smart_recommendations(current_user, session)