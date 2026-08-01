from rest_framework import generics
from rest_framework.generics import get_object_or_404
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from common.views.mixins import StandardResponseMixin
from portal.permissions import IsPortalStudent
from portal.serializers.document import PortalDocumentSerializer
from students.models import Case, Document
from students.services.document_ingest import create_documents_bulk


class DocumentListCreateView(StandardResponseMixin, generics.ListCreateAPIView):
    """A student's own document checklist - they can also submit missing
    documents here (same upload/rename/dedupe pipeline staff use)."""

    serializer_class = PortalDocumentSerializer
    permission_classes = [IsPortalStudent]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = Document.objects.filter(
            case__student__user=self.request.user
        ).order_by("-id")

        case_uid = self.request.query_params.get("case")
        if case_uid:
            queryset = queryset.filter(case__uid=case_uid)

        return queryset


class DocumentBulkUploadView(StandardResponseMixin, generics.GenericAPIView):
    """Lets a student submit several missing documents (or a zip) in one go."""

    serializer_class = PortalDocumentSerializer
    permission_classes = [IsPortalStudent]
    parser_classes = [MultiPartParser, FormParser]

    def post(self, request, *args, **kwargs):
        case = get_object_or_404(
            Case.objects.filter(student__user=request.user),
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
                "created": PortalDocumentSerializer(
                    created, many=True, context={"request": request}
                ).data,
                "created_count": len(created),
                "errors": errors,
            },
            status=201,
        )
