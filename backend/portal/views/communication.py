from rest_framework import generics

from common.views.mixins import StandardResponseMixin
from portal.permissions import IsPortalStudent
from portal.serializers.communication import PortalCommunicationSerializer
from students.models import Communication


class CommunicationListCreateView(StandardResponseMixin, generics.ListCreateAPIView):
    """A student's messages on their own case, plus sending a reply."""

    serializer_class = PortalCommunicationSerializer
    permission_classes = [IsPortalStudent]

    def get_queryset(self):
        queryset = Communication.objects.filter(
            case__student__user=self.request.user
        ).order_by("-id")

        case_uid = self.request.query_params.get("case")
        if case_uid:
            queryset = queryset.filter(case__uid=case_uid)

        return queryset

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)
