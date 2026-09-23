import datetime
from dataclasses import dataclass

@dataclass(frozen=True,slots=True)
class CommentRecordDTO:
    id: int 
    body: str 
    user_id: int 
    post_id: int 
    created_at: datetime.datetime
    updated_at: datetime.datetime