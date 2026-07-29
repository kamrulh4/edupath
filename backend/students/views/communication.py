from rest_framework import generics

from common.views.mixins import StandardResponseMixin
from core.choices import UserKind
from core.permissions import HasRole
from students.models import Communication
from students.serializers.communication import CommunicationSerializer

# Student-side access (a student reading/sending messages on their own case)
# is part of the separate student-portal piece - not built yet, so this stays
# staff-only for now, consistent with everything else in this app.
IsOrganisationStaff = HasRole(
    UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER
)


class CommunicationListCreateView(StandardResponseMixin, generics.ListCreateAPIView):
    serializer_class = CommunicationSerializer
    permission_classes = [IsOrganisationStaff]

    def get_queryset(self):
        queryset = Communication.objects.filter(
            case__student__organisation=self.request.user.organisation
        ).order_by("-id")

        case_uid = self.request.query_params.get("case")
        if case_uid:
            queryset = queryset.filter(case__uid=case_uid)

        return queryset

    def perform_create(self, serializer):
        serializer.save(sender=self.request.user)


class CommunicationDetailView(
    StandardResponseMixin, generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = CommunicationSerializer
    permission_classes = [IsOrganisationStaff]
    lookup_field = "uid"

    def get_queryset(self):
        return Communication.objects.filter(
            case__student__organisation=self.request.user.organisation
        )
