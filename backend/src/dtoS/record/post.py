import datetime
from dataclasses import dataclass

@dataclass(frozen=True,slots=True)
class PostRecordDTO:
    id: int 
    user_id: int 
    slug: str 
    title: str
    description: str 
    body: str 
    created_at: datetime.datetime
    updated_at: datetime.datetime

@dataclass(frozen=True,slots=True)
class PostFeedRecordDTO:
    id: int
    user_id: int 
    slug: str 
    title: str
    description: str 
    body: str 
    tags: list[str]
    user_username: str
    user_bio: str | None
    user_image: str | None
    user_following: bool
    favorited: bool
    favorites_count: int
    created_at: datetime.datetime
    updated_at: datetime.datetime