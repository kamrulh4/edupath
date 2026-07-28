from rest_framework import generics
from rest_framework.generics import get_object_or_404
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from common.views.mixins import StandardResponseMixin
from core.audit import log_action
from core.choices import UserKind
from core.permissions import HasRole
from students.models import ApplicationDraft
from students.serializers.application_draft import ApplicationDraftSerializer

IsOrganisationStaff = HasRole(
    UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER
)


class ApplicationDraftListCreateView(StandardResponseMixin, generics.ListCreateAPIView):
    serializer_class = ApplicationDraftSerializer
    permission_classes = [IsOrganisationStaff]
    parser_classes = [MultiPartParser, FormParser]

    def get_queryset(self):
        queryset = ApplicationDraft.objects.filter(
            case__student__organisation=self.request.user.organisation
        ).order_by("-id")

        case_uid = self.request.query_params.get("case")
        if case_uid:
            queryset = queryset.filter(case__uid=case_uid)

        return queryset


class ApplicationDraftDetailView(
    StandardResponseMixin, generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = ApplicationDraftSerializer
    permission_classes = [IsOrganisationStaff]
    lookup_field = "uid"

    def get_queryset(self):
        return ApplicationDraft.objects.filter(
            case__student__organisation=self.request.user.organisation
        )


class ApplicationDraftApproveView(StandardResponseMixin, generics.GenericAPIView):
    """Adviser approves a draft before it's shared with the student or provider."""

    serializer_class = ApplicationDraftSerializer
    permission_classes = [IsOrganisationStaff]

    def get_queryset(self):
        return ApplicationDraft.objects.filter(
            case__student__organisation=self.request.user.organisation
        )

    def post(self, request, *args, **kwargs):
        draft = get_object_or_404(self.get_queryset(), uid=self.kwargs["uid"])
        draft.is_approved = True
        draft.save(update_fields=["is_approved", "updated_at"])
        log_action(request, "APPLICATION_DRAFT_APPROVED", draft)
        return Response(self.get_serializer(draft).data)
