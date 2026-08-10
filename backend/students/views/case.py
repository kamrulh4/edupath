import os
import zipfile
from io import BytesIO

from django.http import HttpResponse
from django.shortcuts import get_object_or_404
from rest_framework import generics
from rest_framework.views import APIView

from common.views.mixins import StandardResponseMixin
from core.audit import log_action
from core.choices import UserKind
from core.permissions import HasRole
from students.choices import DocumentStatus
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

        student_uid = self.request.query_params.get("student")
        if student_uid:
            queryset = queryset.filter(student__uid=student_uid)

        provider = self.request.query_params.get("provider")
        if provider:
            queryset = queryset.filter(
                recommendations__course__provider_name__icontains=provider
            ).distinct()

        if self.request.query_params.get("missing_documents"):
            queryset = queryset.filter(
                documents__doc_status__in=[
                    DocumentStatus.PENDING,
                    DocumentStatus.REJECTED,
                ]
            ).distinct()

        return queryset


class CaseDetailView(StandardResponseMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CaseSerializer
    permission_classes = [IsOrganisationStaff]
    lookup_field = "uid"

    def get_permissions(self):
        # Deletion is irreversible and cascades to every document, task,
        # recommendation and message on the case - restrict it to admins.
        if self.request.method == "DELETE":
            return [HasRole(UserKind.ADMIN)()]
        return super().get_permissions()

    def get_queryset(self):
        return Case.objects.filter(student__organisation=self.request.user.organisation)

    def perform_destroy(self, instance):
        log_action(
            self.request,
            "CASE_DELETED",
            instance,
            details={"stage": instance.stage, "student": str(instance.student.uid)},
        )
        instance.delete()


class ApplicationPackView(APIView):
    """Bundles the approved application draft(s) and non-duplicate case
    documents into a single ZIP for the adviser to hand off to the provider."""

    permission_classes = [IsOrganisationStaff]

    def _unique_name(self, used_names, name):
        if name not in used_names:
            used_names.add(name)
            return name
        base, ext = os.path.splitext(name)
        counter = 2
        candidate = f"{base}_{counter}{ext}"
        while candidate in used_names:
            counter += 1
            candidate = f"{base}_{counter}{ext}"
        used_names.add(candidate)
        return candidate

    def get(self, request, uid):
        case = get_object_or_404(
            Case, uid=uid, student__organisation=request.user.organisation
        )

        buffer = BytesIO()
        used_names = set()
        with zipfile.ZipFile(buffer, "w", zipfile.ZIP_DEFLATED) as zip_file:
            for draft in case.application_drafts.filter(is_approved=True):
                if not draft.draft_file:
                    continue
                name = self._unique_name(
                    used_names, f"application/{os.path.basename(draft.draft_file.name)}"
                )
                with draft.draft_file.open("rb") as f:
                    zip_file.writestr(name, f.read())

            for document in case.documents.filter(is_duplicate=False):
                file_field = document.renamed_file or document.original_file
                if not file_field:
                    continue
                name = self._unique_name(
                    used_names, f"documents/{os.path.basename(file_field.name)}"
                )
                with file_field.open("rb") as f:
                    zip_file.writestr(name, f.read())

        if not used_names:
            return HttpResponse(
                "Nothing to include in the application pack yet.", status=400
            )

        log_action(request, "APPLICATION_PACK_DOWNLOADED", case)

        response = HttpResponse(buffer.getvalue(), content_type="application/zip")
        response["Content-Disposition"] = (
            f'attachment; filename="case-{case.uid}-application-pack.zip"'
        )
        return response
