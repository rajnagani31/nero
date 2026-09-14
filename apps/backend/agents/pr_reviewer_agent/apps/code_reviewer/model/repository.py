from .mixin import DateTimeMixin
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import BigInteger, Integer, ForeignKey, Boolean
from sqlalchemy.dialects.postgresql import UUID as PG_UUID
from apps.backend.bot.application.core.database import Base
import uuid


class Repository(Base, DateTimeMixin):
    __tablename__ = "repositories"
    """
    {
        "id": 1,
        "repo_id": 987654321,
        "user_id": 10,
        "full_name": "raj/codebot",
        "owner": "raj",
        "default_branch": "main",
        "is_private": false,
        "is_active": true,
        "is_deleted": false
    }
    """
    id: Mapped[BigInteger] = mapped_column(BigInteger, primary_key=True)
    repo_id: Mapped[BigInteger] = mapped_column(BigInteger, nullable=True, index=True)
    installation_id: Mapped[int] = mapped_column(BigInteger, nullable=True, index=True)
    github_account_id: Mapped[int] = mapped_column(BigInteger, nullable=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_details.id", ondelete="CASCADE"), nullable=True
    )
    full_name: Mapped[str] = mapped_column(nullable=False)
    owner: Mapped[str] = mapped_column(nullable=False)
    default_branch: Mapped[str] = mapped_column(nullable=True)
    is_private: Mapped[bool] = mapped_column(Boolean, default=False, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_deleted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=True)
