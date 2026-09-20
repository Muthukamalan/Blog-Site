import datetime
from dataclasses import dataclass

@dataclass(frozen=True,slots=True)
class PostRecordDTO:
    id: int 
    author_id: int 
    slug: str 
    title: str
    description: str 
    body: str 
    created_at: datetime.datetime
    updated_at: datetime.datetime

@dataclass(frozen=True,slots=True)
class PostFeedRecordDTO:
    id: int
    author_id: int 
    slug: str 
    title: str
    description: str 
    body: str 
    tags: list[str]
    author_username: str
    author_bio: str | None
    author_image: str | None
    author_following: bool
    favorited: bool
    favorites_count: int
    created_at: datetime.datetime
    updated_at: datetime.datetime