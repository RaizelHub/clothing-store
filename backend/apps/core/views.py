import re
import logging
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.conf import settings

from .emails import get_email_provider, build_contact_acknowledgement_email, EmailMessage

logger = logging.getLogger("studio.core")
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    """Confirms API is up and reachable from the frontend. Used by
    the Phase 1 homepage sanity check; safe to keep around long-term
    as an uptime/monitoring endpoint."""
    return Response({"status": "ok", "service": "clothing-store-api"})


@api_view(["POST"])
@permission_classes([AllowAny])
def contact_inquiry(request):
    """
    POST /api/contact/
    Receives customer care and styling concierge inquiries.
    Dispatches automated confirmation email and notifies concierge.
    """
    data = request.data or {}
    name = str(data.get("name", "")).strip()
    email = str(data.get("email", "")).strip().lower()
    subject = str(data.get("subject", "General Inquiry")).strip()
    message = str(data.get("message", "")).strip()
    order_number = str(data.get("order_number", "")).strip()

    errors = {}
    if not name:
        errors["name"] = ["Please provide your name."]
    if not email or not EMAIL_RE.match(email):
        errors["email"] = ["A valid email address is required."]
    if not message or len(message) < 5:
        errors["message"] = ["Please provide an inquiry message of at least 5 characters."]

    if errors:
        return Response({"errors": errors}, status=status.HTTP_400_BAD_REQUEST)

    full_subject = f"[{subject}] from {name}"
    if order_number:
        full_subject += f" (Order #{order_number})"

    # Deliver confirmation to the customer
    provider = get_email_provider()
    try:
        ack_email = build_contact_acknowledgement_email(
            name=name,
            email=email,
            subject_text=subject,
            message=message,
        )
        provider.send(ack_email)

        # Notify studio concierge staff
        staff_inbox = getattr(settings, "DEFAULT_FROM_EMAIL", "concierge@studio-atelier.ph")
        provider.send(
            EmailMessage(
                to_email="concierge@studio-atelier.ph",
                subject=f"New Concierge Inquiry: {full_subject}",
                html_body=f"<p><strong>From:</strong> {name} &lt;{email}&gt;</p><p><strong>Subject:</strong> {subject}</p><p><strong>Message:</strong></p><blockquote>{message}</blockquote>",
                text_body=f"From: {name} <{email}>\nSubject: {subject}\n\nMessage:\n{message}",
                reply_to=email,
                metadata={"type": "staff_concierge_notification"},
            )
        )
    except Exception as exc:
        logger.warning(f"Failed to deliver contact inquiry email: {exc}")

    return Response({
        "ok": True,
        "message": "Thank you for contacting Studio Atelier. Our concierge team has received your message and will respond within 24 hours.",
    })

