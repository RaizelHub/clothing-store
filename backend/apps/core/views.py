from rest_framework.decorators import api_view
from rest_framework.response import Response


@api_view(["GET"])
def health(request):
    """Confirms API is up and reachable from the frontend. Used by
    the Phase 1 homepage sanity check; safe to keep around long-term
    as an uptime/monitoring endpoint (Phase 10)."""
    return Response({"status": "ok", "service": "clothing-store-api"})
