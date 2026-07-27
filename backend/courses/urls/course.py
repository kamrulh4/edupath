from django.urls import path

from courses.views.course import CourseDetailView, CourseListCreateView

urlpatterns = [
    path("", CourseListCreateView.as_view(), name="course-list-create"),
    path("<uuid:uid>/", CourseDetailView.as_view(), name="course-detail"),
]
