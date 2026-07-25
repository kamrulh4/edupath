from rest_framework import generics
from rest_framework.parsers import FormParser, MultiPartParser

from common.views.mixins import StandardResponseMixin
from core.choices import UserKind
from core.permissions import HasRole
from documents.models import Document
from documents.serializers.document import DocumentSerializer

IsOrganisationStaff = HasRole(UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER)


class DocumentListCreateView(StandardResponseMixin, generics.ListCreateAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsOrganisationStaff]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = Document.objects.filter(
            case__student__organisation=self.request.user.organisation
        ).order_by("-id")

        case_uid = self.request.query_params.get("case")
        if case_uid:
            queryset = queryset.filter(case__uid=case_uid)

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(document_category=category)

        return queryset


class DocumentDetailView(StandardResponseMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = DocumentSerializer
    permission_classes = [IsOrganisationStaff]
    lookup_field = "uid"

    def get_queryset(self):
        return Document.objects.filter(case__student__organisation=self.request.user.organisation)
