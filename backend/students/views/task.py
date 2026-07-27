from rest_framework import generics

from common.views.mixins import StandardResponseMixin
from core.choices import UserKind
from core.permissions import HasRole
from students.models import Task
from students.serializers.task import TaskSerializer

IsOrganisationStaff = HasRole(UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER)


class TaskListCreateView(StandardResponseMixin, generics.ListCreateAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsOrganisationStaff]

    def get_queryset(self):
        queryset = Task.objects.filter(
            case__student__organisation=self.request.user.organisation
        ).order_by("due_date", "-id")

        case_uid = self.request.query_params.get("case")
        if case_uid:
            queryset = queryset.filter(case__uid=case_uid)

        assignee_uid = self.request.query_params.get("assignee")
        if assignee_uid:
            queryset = queryset.filter(assignee__uid=assignee_uid)

        task_status = self.request.query_params.get("task_status")
        if task_status:
            queryset = queryset.filter(task_status=task_status)

        return queryset


class TaskDetailView(StandardResponseMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = TaskSerializer
    permission_classes = [IsOrganisationStaff]
    lookup_field = "uid"

    def get_queryset(self):
        return Task.objects.filter(case__student__organisation=self.request.user.organisation)
