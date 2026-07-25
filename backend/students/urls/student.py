from django.urls import path

from students.views.student import (
    StudentDetailView,
    StudentInviteView,
    StudentListCreateView,
)

urlpatterns = [
    path("", StudentListCreateView.as_view(), name="student-list-create"),
    path("<uuid:uid>/", StudentDetailView.as_view(), name="student-detail"),
    path("<uuid:uid>/invite/", StudentInviteView.as_view(), name="student-invite"),
]
