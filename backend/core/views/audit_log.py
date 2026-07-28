from rest_framework import generics

from common.views.mixins import StandardResponseMixin
from core.choices import UserKind
from core.models import AuditLog
from core.permissions import HasRole
from core.serializers.audit_log import AuditLogSerializer


class AuditLogListView(StandardResponseMixin, generics.ListAPIView):
    """Read-only - the trail itself is immutable. ADMIN only, since this
    can reveal what every teammate has been doing."""

    serializer_class = AuditLogSerializer
    permission_classes = [HasRole(UserKind.ADMIN)]

    def get_queryset(self):
        queryset = AuditLog.objects.filter(
            organisation=self.request.user.organisation
        ).order_by("-id")

        action_type = self.request.query_params.get("action_type")
        if action_type:
            queryset = queryset.filter(action_type=action_type)

        return queryset
