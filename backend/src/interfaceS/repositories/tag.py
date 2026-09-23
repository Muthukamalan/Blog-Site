import abc
from sqlalchemy.ext.asyncio import AsyncSession

from src.dtoS.record.tag import TagRecordDTO


class ITagRepository(abc.ABC):

    @abc.abstractmethod
    async def list(self,session:AsyncSession)->list[TagRecordDTO]:
        ...