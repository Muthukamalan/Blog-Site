import abc
from typing import Any

from src.dtoS.record.tag import TagRecordDTO

class IPostTagRepository(abc.ABC):
    
    @abc.abstractmethod
    async def add_many(
                self,
                session:Any,
                post_id:int,
                tags:list[str]
    )->list[TagRecordDTO]:
        ...

    @abc.abstractmethod
    async def list(self,session:Any,post_id:int)->list[TagRecordDTO]:
        ...