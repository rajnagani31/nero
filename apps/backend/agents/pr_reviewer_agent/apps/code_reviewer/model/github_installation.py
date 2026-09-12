from sqlalchemy import BigInteger, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from apps.backend.bot.application.core.database import Base
from .mixin import DateTimeMixin


class GitHubInstallation(Base, DateTimeMixin):
    """Ownership record for a GitHub App installation.

    GitHub webhooks are sent by GitHub and therefore never include a NeroAI
    access token.  The installation id is the stable bridge between a webhook
    and the NeroAI user who connected the installation.
    """

    __tablename__ = "github_installations"
    __table_args__ = (
        UniqueConstraint("installation_id", name="uq_github_installations_installation_id"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True, autoincrement=True)
    installation_id: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    user_id: Mapped[int] = mapped_column(
        ForeignKey("user_details.id", ondelete="CASCADE"), nullable=False, index=True
    )
    github_account_id: Mapped[int | None] = mapped_column(BigInteger, nullable=True)
