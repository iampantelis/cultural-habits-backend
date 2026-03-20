from typing import Optional, List, Dict
from datetime import datetime
from sqlmodel import Field, SQLModel, Relationship, JSON, Column

class User(SQLModel, table=True):
    __tablename__ = "users"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    email: str = Field(unique=True, index=True)
    username: str = Field(unique=True, index=True)
    password_hash: str 
    created_at: datetime = Field(default_factory=datetime.utcnow)
    interactions: List["UserInteraction"] = Relationship(back_populates="user")


class MediaItem(SQLModel, table=True):
    __tablename__ = "media_items"
    
    id: Optional[int] = Field(default=None, primary_key=True)
    
    external_id: str = Field(index=True) 
    source: str 
    media_type: str   
    title: str
    cover_image_url: Optional[str] = None
    meta_data: Dict = Field(default={}, sa_column=Column(JSON))
    interactions: List["UserInteraction"] = Relationship(back_populates="media_item")

class UserInteraction(SQLModel, table=True):
    __tablename__ = "user_interactions"
    id: Optional[int] = Field(default=None, primary_key=True)
    user_id: int = Field(foreign_key="users.id")
    media_item_id: int = Field(foreign_key="media_items.id") 
    rating: float = Field(default=0.0)
    status: str = Field(default="completed")
    review_text: Optional[str] = None #Προαιρετικό 
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user: User = Relationship(back_populates="interactions")
    media_item: MediaItem = Relationship(back_populates="interactions")