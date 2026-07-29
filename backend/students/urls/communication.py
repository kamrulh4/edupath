from django.urls import path

from students.views.communication import (
    CommunicationDetailView,
    CommunicationListCreateView,
)

urlpatterns = [
    path("", CommunicationListCreateView.as_view(), name="communication-list-create"),
    path("<uuid:uid>/", CommunicationDetailView.as_view(), name="communication-detail"),
]
