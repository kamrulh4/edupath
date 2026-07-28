"""Small helper for writing AuditLog entries from views that perform
sensitive actions (uploads, approvals, verifications...)."""

from core.models import AuditLog


def log_action(request, action_type, target, details=None):
    AuditLog.objects.create(
        organisation=request.user.organisation,
        actor=request.user,
        action_type=action_type,
        target_model=target.__class__.__name__,
        target_uid=getattr(target, "uid", None),
        details=details or {},
        ip_address=request.META.get("REMOTE_ADDR"),
    )
