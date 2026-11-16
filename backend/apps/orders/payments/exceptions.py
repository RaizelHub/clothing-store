class PaymentError(Exception):
    """Base exception for payment operations."""
    pass


class PaymentConfigurationError(PaymentError):
    """Raised when payment credentials or required settings are missing or invalid."""
    pass


class PaymentProviderError(PaymentError):
    """Raised when an external payment provider returns an error."""
    def __init__(self, message: str, raw_response: dict | None = None, status_code: int | None = None):
        super().__init__(message)
        self.raw_response = raw_response or {}
        self.status_code = status_code


class WebhookVerificationError(PaymentError):
    """Raised when a webhook signature fails validation."""
    pass

