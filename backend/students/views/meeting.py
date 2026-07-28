from rest_framework import generics

from common.views.mixins import StandardResponseMixin
from core.choices import UserKind
from core.permissions import HasRole
from students.models import Meeting
from students.serializers.meeting import MeetingSerializer

IsOrganisationStaff = HasRole(
    UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER
)


class MeetingListCreateView(StandardResponseMixin, generics.ListCreateAPIView):
    serializer_class = MeetingSerializer
    permission_classes = [IsOrganisationStaff]

    def get_queryset(self):
        queryset = Meeting.objects.filter(
            case__student__organisation=self.request.user.organisation
        ).order_by("-scheduled_time")

        case_uid = self.request.query_params.get("case")
        if case_uid:
            queryset = queryset.filter(case__uid=case_uid)

        return queryset


class MeetingDetailView(StandardResponseMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = MeetingSerializer
    permission_classes = [IsOrganisationStaff]
    lookup_field = "uid"

    def get_queryset(self):
        return Meeting.objects.filter(
            case__student__organisation=self.request.user.organisation
        )
