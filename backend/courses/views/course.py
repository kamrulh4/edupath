from rest_framework import generics

from common.views.mixins import StandardResponseMixin
from core.choices import UserKind
from core.permissions import HasRole
from courses.models import Course
from courses.serializers.course import CourseSerializer

IsOrganisationStaff = HasRole(
    UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER
)


class CourseListCreateView(StandardResponseMixin, generics.ListCreateAPIView):
    serializer_class = CourseSerializer
    permission_classes = [IsOrganisationStaff]

    def get_queryset(self):
        queryset = Course.objects.filter(
            organisation=self.request.user.organisation
        ).order_by("-id")

        category = self.request.query_params.get("category")
        if category:
            queryset = queryset.filter(category__iexact=category)

        active_only = self.request.query_params.get("active")
        if active_only:
            queryset = queryset.filter(is_active=True)

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(course_name__icontains=search)

        return queryset

    def perform_create(self, serializer):
        serializer.save(organisation=self.request.user.organisation)


class CourseDetailView(StandardResponseMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = CourseSerializer
    permission_classes = [IsOrganisationStaff]
    lookup_field = "uid"

    def get_queryset(self):
        return Course.objects.filter(organisation=self.request.user.organisation)
