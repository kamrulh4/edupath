from datetime import timedelta

from django.db.models import Count
from django.utils import timezone
from rest_framework import generics
from rest_framework.response import Response

from common.views.mixins import StandardResponseMixin
from core.choices import UserKind
from core.models import User
from core.permissions import HasRole
from courses.models import Recommendation
from students.choices import DocumentStatus, TaskStatus
from students.models import Case, Document, Task
from students.serializers.task import TaskSerializer

IsOrganisationStaff = HasRole(
    UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER
)

# How far ahead an "upcoming" deadline counts.
DEADLINE_WINDOW_DAYS = 7

OPEN_TASK_STATUSES = [
    TaskStatus.PENDING,
    TaskStatus.IN_PROGRESS,
    TaskStatus.WAITING_FOR_STUDENT,
]


class DashboardReportingView(StandardResponseMixin, generics.GenericAPIView):
    """Consolidated reporting for the dashboard - one request instead of a
    waterfall of small ones, since several of these (adviser workload,
    course interest) need server-side aggregation across advisers/courses
    that a single filtered list endpoint can't express."""

    permission_classes = [IsOrganisationStaff]

    def get(self, request, *args, **kwargs):
        organisation = request.user.organisation

        missing_documents_count = Document.objects.filter(
            case__student__organisation=organisation,
            doc_status__in=[DocumentStatus.PENDING, DocumentStatus.REJECTED],
        ).count()

        deadline_cutoff = timezone.now().date() + timedelta(days=DEADLINE_WINDOW_DAYS)
        upcoming_tasks = (
            Task.objects.filter(
                case__student__organisation=organisation,
                task_status__in=[*OPEN_TASK_STATUSES, TaskStatus.OVERDUE],
                due_date__isnull=False,
                due_date__lte=deadline_cutoff,
            )
            .select_related("case")
            .order_by("due_date")[:10]
        )

        advisers = User.objects.filter(
            organisation=organisation, kind=UserKind.ADVISER
        )
        adviser_workload = [
            {
                "adviser_uid": str(adviser.uid),
                "adviser_name": f"{adviser.first_name} {adviser.last_name}",
                "active_cases": Case.objects.filter(adviser=adviser).count(),
                "pending_tasks": Task.objects.filter(
                    assignee=adviser, task_status__in=OPEN_TASK_STATUSES
                ).count(),
                "overdue_tasks": Task.objects.filter(
                    assignee=adviser, task_status=TaskStatus.OVERDUE
                ).count(),
            }
            for adviser in advisers
        ]

        course_interest = list(
            Recommendation.objects.filter(case__student__organisation=organisation)
            .values("course__uid", "course__course_name", "course__provider_name")
            .annotate(recommendation_count=Count("id"))
            .order_by("-recommendation_count")[:10]
        )

        return Response(
            {
                "missing_documents_count": missing_documents_count,
                "upcoming_deadlines": TaskSerializer(
                    upcoming_tasks, many=True, context={"request": request}
                ).data,
                "adviser_workload": adviser_workload,
                "course_interest": [
                    {
                        "course_uid": str(row["course__uid"]),
                        "course_name": row["course__course_name"],
                        "provider_name": row["course__provider_name"],
                        "recommendation_count": row["recommendation_count"],
                    }
                    for row in course_interest
                ],
            }
        )
