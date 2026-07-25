from rest_framework import generics

from common.views.mixins import StandardResponseMixin
from core.choices import UserKind
from core.permissions import HasRole
from students.models import Case
from students.serializers.case import CaseSerializer

IsOrganisationStaff = HasRole(
    UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER
)


class CaseListCreateView(StandardResponseMixin, generics.ListCreateAPIView):
    serializer_class = CaseSerializer
    permission_classes = [IsOrganisationStaff]

    def get_queryset(self):
        queryset = Case.objects.filter(
            student__organisation=self.request.user.organisation
        ).order_by("-id")

        stage = self.request.query_params.get("stage")
        if stage:
            queryset = queryset.filter(stage=stage)

        adviser_uid = self.request.query_params.get("adviser")
        if adviser_uid:
            queryset = queryset.filter(adviser__uid=adviser_uid)

        return queryset


class CaseDetailView(StandardResponseMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CaseSerializer
    permission_classes = [IsOrganisationStaff]
    lookup_field = "uid"

    def get_queryset(self):
        return Case.objects.filter(student__organisation=self.request.user.organisation)
