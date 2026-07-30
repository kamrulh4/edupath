from django.urls import path

from portal.views.case import CaseListView
from portal.views.communication import CommunicationListCreateView
from portal.views.document import DocumentListCreateView
from portal.views.profile import ProfileView
from portal.views.recommendation import RecommendationListView

urlpatterns = [
    path("profile/", ProfileView.as_view(), name="portal-profile"),
    path("cases/", CaseListView.as_view(), name="portal-case-list"),
    path(
        "documents/",
        DocumentListCreateView.as_view(),
        name="portal-document-list-create",
    ),
    path(
        "recommendations/",
        RecommendationListView.as_view(),
        name="portal-recommendation-list",
    ),
    path(
        "communications/",
        CommunicationListCreateView.as_view(),
        name="portal-communication-list-create",
    ),
]
