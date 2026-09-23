from src.coreS.exceptions import CommentNotFoundException

from sqlalchemy import delete,insert,select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.sql.functions import count


from src.dtoS.domain.comment import CreateCommentDTO
from src.dtoS.record.comment import CommentRecordDTO
from src.infrastructureS.models import Comment
from src.interfaceS.repositories.comment import ICommentRepository

class CommentRepository(ICommentRepository):
    async def add(self, session, user_id, post_id, create_item):
        return await super().add(session, user_id, post_id, create_item)
    
    async def get_or_none(self,session:AsyncSession)->None:
        ...

    async def get(self, session, comment_id):
        return await super().get(session, comment_id)
    
    async def list(self, session, post_id):
        return await super().list(session, post_id)
    
    async def count(self, session, user_id):
        return await super().count(session, user_id)
    

    async def delete(self, session, comment_id):
        return await super().delete(session, comment_id)
    

    @staticmethod
    def _to_comment_record_dto(model:Comment)->CommentRecordDTO:
        return CommentRecordDTO(
            id=model.id,
            body=model.body,
            post_id=model.post_id,
            user_id=model.user_id,

        )