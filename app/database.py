from sqlmodel import SQLModel, Session, create_engine
from typing import Generator
from sqlmodel import SQLModel, create_engine
from app.models import * # Εισαγωγή όλων των μοντέλων σου

sqlite_url = "sqlite:///./app.db"
engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})

def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

def get_session() -> Generator[Session, None, None]:
    with Session(engine) as session:
        yield session  