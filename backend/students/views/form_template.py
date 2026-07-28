from rest_framework import generics
from rest_framework.parsers import FormParser, MultiPartParser

from common.views.mixins import StandardResponseMixin
from core.choices import UserKind
from core.permissions import HasRole
from students.models import FormTemplate
from students.serializers.form_template import FormTemplateSerializer

IsOrganisationStaff = HasRole(
    UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER
)


class FormTemplateListCreateView(StandardResponseMixin, generics.ListCreateAPIView):
    serializer_class = FormTemplateSerializer
    permission_classes = [IsOrganisationStaff]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = FormTemplate.objects.filter(
            organisation=self.request.user.organisation
        ).order_by("-id")

        active_only = self.request.query_params.get("active")
        if active_only:
            queryset = queryset.filter(is_active=True)

        return queryset

    def perform_create(self, serializer):
        serializer.save(organisation=self.request.user.organisation)


class FormTemplateDetailView(
    StandardResponseMixin, generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = FormTemplateSerializer
    permission_classes = [IsOrganisationStaff]
    lookup_field = "uid"

    def get_queryset(self):
        return FormTemplate.objects.filter(organisation=self.request.user.organisation)
