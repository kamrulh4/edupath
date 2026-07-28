from rest_framework import generics
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from common.views.mixins import StandardResponseMixin
from core.audit import log_action
from core.choices import UserKind
from core.permissions import HasRole
from students.models import ExtractedField
from students.serializers.extracted_field import ExtractedFieldSerializer

IsOrganisationStaff = HasRole(
    UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER
)


class ExtractedFieldListCreateView(StandardResponseMixin, generics.ListCreateAPIView):
    serializer_class = ExtractedFieldSerializer
    permission_classes = [IsOrganisationStaff]

    def get_queryset(self):
        queryset = ExtractedField.objects.filter(
            document__case__student__organisation=self.request.user.organisation
        ).order_by("-id")

        document_uid = self.request.query_params.get("document")
        if document_uid:
            queryset = queryset.filter(document__uid=document_uid)

        unverified_only = self.request.query_params.get("unverified")
        if unverified_only:
            queryset = queryset.filter(is_verified=False)

        return queryset


class ExtractedFieldDetailView(
    StandardResponseMixin, generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = ExtractedFieldSerializer
    permission_classes = [IsOrganisationStaff]
    lookup_field = "uid"

    def get_queryset(self):
        return ExtractedField.objects.filter(
            document__case__student__organisation=self.request.user.organisation
        )


class ExtractedFieldVerifyView(StandardResponseMixin, generics.GenericAPIView):
    """Review-queue action: an adviser confirms (or corrects) an extracted value."""

    serializer_class = ExtractedFieldSerializer
    permission_classes = [IsOrganisationStaff]

    def get_queryset(self):
        return ExtractedField.objects.filter(
            document__case__student__organisation=self.request.user.organisation
        )

    def post(self, request, *args, **kwargs):
        field = get_object_or_404(self.get_queryset(), uid=self.kwargs["uid"])
        extracted_value = request.data.get("extracted_value")
        if extracted_value is not None:
            field.extracted_value = extracted_value
        field.is_verified = True
        field.reviewer = request.user
        field.save(
            update_fields=["extracted_value", "is_verified", "reviewer", "updated_at"]
        )
        log_action(
            request, "FIELD_VERIFIED", field, details={"field_name": field.field_name}
        )
        return Response(self.get_serializer(field).data)
