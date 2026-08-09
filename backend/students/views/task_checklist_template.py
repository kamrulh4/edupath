from datetime import timedelta

from django.utils import timezone
from rest_framework import generics
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from common.views.mixins import StandardResponseMixin
from core.audit import log_action
from core.choices import UserKind
from core.permissions import HasRole
from students.models import Case, Task, TaskChecklistTemplate
from students.serializers.task import TaskSerializer
from students.serializers.task_checklist_template import (
    TaskChecklistTemplateSerializer,
)

IsOrganisationStaff = HasRole(
    UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER
)


class TaskChecklistTemplateListCreateView(
    StandardResponseMixin, generics.ListCreateAPIView
):
    serializer_class = TaskChecklistTemplateSerializer
    permission_classes = [IsOrganisationStaff]

    def get_queryset(self):
        queryset = TaskChecklistTemplate.objects.filter(
            organisation=self.request.user.organisation
        ).order_by("-id")

        active_only = self.request.query_params.get("active")
        if active_only:
            queryset = queryset.filter(is_active=True)

        return queryset

    def perform_create(self, serializer):
        serializer.save(organisation=self.request.user.organisation)


class TaskChecklistTemplateDetailView(
    StandardResponseMixin, generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = TaskChecklistTemplateSerializer
    permission_classes = [IsOrganisationStaff]
    lookup_field = "uid"

    def get_queryset(self):
        return TaskChecklistTemplate.objects.filter(
            organisation=self.request.user.organisation
        )


class ApplyChecklistView(StandardResponseMixin, generics.GenericAPIView):
    """Creates one real Task per item in a checklist template, against a
    specific case - the quick way to set up the standard follow-ups for a
    common application type instead of adding tasks one at a time."""

    serializer_class = TaskSerializer
    permission_classes = [IsOrganisationStaff]

    def post(self, request, *args, **kwargs):
        organisation = request.user.organisation
        case = get_object_or_404(
            Case.objects.filter(student__organisation=organisation),
            uid=request.data.get("case"),
        )
        template = get_object_or_404(
            TaskChecklistTemplate.objects.filter(organisation=organisation),
            uid=request.data.get("template"),
        )

        today = timezone.now().date()
        created = []
        for item in template.items:
            title = item.get("title")
            if not title:
                continue
            days_offset = item.get("days_offset")
            due_date = (
                today + timedelta(days=days_offset)
                if isinstance(days_offset, int)
                else None
            )
            created.append(
                Task.objects.create(
                    case=case,
                    title=title,
                    description=item.get("description", ""),
                    due_date=due_date,
                )
            )

        log_action(
            request,
            "CHECKLIST_APPLIED",
            case,
            details={"template": str(template.uid), "task_count": len(created)},
        )
        return Response(self.get_serializer(created, many=True).data, status=201)
