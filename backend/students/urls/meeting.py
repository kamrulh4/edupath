from django.urls import path

from students.views.meeting import MeetingDetailView, MeetingListCreateView

urlpatterns = [
    path("", MeetingListCreateView.as_view(), name="meeting-list-create"),
    path("<uuid:uid>/", MeetingDetailView.as_view(), name="meeting-detail"),
]
