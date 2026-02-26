from pydantic import BaseModel, EmailStr

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str

class UserRead(BaseModel):
    id: int
    username: str
    email: EmailStr

class Token(BaseModel):
    access_token: str
    token_type: str

from typing import Optional

class LogMedia(BaseModel):
    external_id: str 
    title: str
    year: str
    media_type: str
    poster_url: Optional[str] = None
    description: Optional[str] = None
    rating: float
    review: Optional[str] = None
    status: str 