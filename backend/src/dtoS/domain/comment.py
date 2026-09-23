import datetime
from dataclasses import dataclass

from src.dtoS.domain.profile import ProfileDTO
from src.dtoS.record.comment import CommentRecordDTO

@dataclass(frozen=True,slots=True)
class CommentDTO:
    id: int 
    body: str 
    user: ProfileDTO
    created_at: datetime.datetime
    updated_at: datetime.datetime

    @classmethod
    def from_record(
            cls,
            record: CommentRecordDTO,
            user: ProfileDTO
    )-> "CommentDTO":
        return cls(
            id=record.id,
            body=record.body,
            user=user,
            created_at=record.created_at,
            updated_at=record.updated_at,            
        )



@dataclass(frozen=True,slots=True)
class CommentsListDTO:
    comments: list[CommentDTO]
    comments_count: int 


@dataclass(frozen=True,slots=True)
class CreateCommentDTO:
    body: str