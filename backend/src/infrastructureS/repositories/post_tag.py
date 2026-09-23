from datetime import datetime

from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.ext.asyncio import AsyncSession


from src.dtoS.record.tag import TagRecordDTO
from src.infrastructureS.models import PostTag,Tag
from src.interfaceS.repositories.post_tag import IPostTagRepository


class PostTagRepository(IPostTagRepository):

    @staticmethod
    def _to_tag_record_dto(model:Tag)->TagRecordDTO:
        return TagRecordDTO(id=model.id,tag=model.tag,created_at=model.created_at)

    async def add_many(self, session:AsyncSession, post_id:int, tags:list[str])->list[TagRecordDTO]:
        insert_query = ( 
            insert(Tag).on_conflict_do_nothing().values([dict(tag=tag,created_at=datetime.now())  for tag in tags ])
        )
        await session.execute(insert_query)

        select_query = select(Tag).where(Tag.tag.in_(tags))
        selected_tags = await session.scalars(select(select_query))
        tag_records = [ self._to_tag_record_dto(tag) for tag in selected_tags ]


        link_query = (
            insert(PostTag).on_conflict_do_nothing().values(
                [
                    dict(
                        post_id=post_id,
                        tag_id=tag_record.id,
                        created_at=datetime.now()
                    )
                    for tag_record in tag_records
                ]
            )
        )
        await session.execute(link_query)
        return tag_records
        


    async def list(self, session:AsyncSession, post_id:int)->list[TagRecordDTO]:
        query = (
            select(Tag,PostTag).where((PostTag.post_id==post_id) & (PostTag.tag_id==Tag.id) ).order_by(Tag.created_at.desc())
        )
        tags = await session.scalars(query)
        return [self._to_tag_record_dto(tag) for tag in tags ]

