from rest_framework import generics
from rest_framework.generics import get_object_or_404
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from common.views.mixins import StandardResponseMixin
from core.choices import UserKind
from core.permissions import HasRole
from students.models import Case, Document
from students.serializers.document import DocumentSerializer
from students.services.document_ingest import create_documents_bulk

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


class DocumentBulkUploadView(StandardResponseMixin, generics.GenericAPIView):
    """Accepts several files (or one zip) in a single request - every file
    is created with document_type left for the AI to auto-classify, since a
    bulk drop is rarely all the same document type."""

    serializer_class = DocumentSerializer
    permission_classes = [IsOrganisationStaff]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        case = get_object_or_404(
            Case.objects.filter(student__organisation=request.user.organisation),
            uid=request.data.get("case"),
        )

        files = request.FILES.getlist("files")
        zip_file = request.FILES.get("zip_file")
        if not files and not zip_file:
            return Response(
                {"detail": "Attach at least one file under 'files' or a 'zip_file'."},
                status=400,
            )

        try:
            created, errors = create_documents_bulk(
                request, case, files=files, zip_file=zip_file
            )
        except ValueError as exc:
            return Response({"detail": str(exc)}, status=400)

        return Response(
            {
                "created": DocumentSerializer(
                    created, many=True, context={"request": request}
                ).data,
                "created_count": len(created),
                "errors": errors,
            },
            status=201,
        )
