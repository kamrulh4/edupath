from rest_framework import generics
from rest_framework.parsers import FormParser, MultiPartParser

from common.views.mixins import StandardResponseMixin
from portal.permissions import IsPortalStudent
from portal.serializers.document import PortalDocumentSerializer
from students.models import Document


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
