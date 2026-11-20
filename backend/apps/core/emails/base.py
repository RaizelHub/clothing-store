from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class EmailMessage:
    """Standardized email payload representation across providers."""
    to_email: str
    subject: str
    html_body: str
    text_body: str
    from_email: Optional[str] = None
    reply_to: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class EmailSendResult:
    """Standardized dispatch result across providers."""
    success: bool
    message_id: Optional[str] = None
    provider: str = ""
    error: Optional[str] = None


class BaseEmailProvider(ABC):
    """Abstract interface for all transactional email providers."""

    @property
    @abstractmethod
    def name(self) -> str:
        """Provider identifier string, e.g. 'mock', 'resend', or 'smtp'."""
        pass

    @abstractmethod
    def send(self, message: EmailMessage) -> EmailSendResult:
        """Deliver an email message."""
        pass
