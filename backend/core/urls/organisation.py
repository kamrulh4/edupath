from django.urls import path

from core.views.organisation import (
    OrganisationDetailView,
    OrganisationMemberListCreateView,
    OrganisationSettingsDetailView,
)

urlpatterns = [
    path("", OrganisationDetailView.as_view(), name="organisation-detail"),
    path(
        "settings/",
        OrganisationSettingsDetailView.as_view(),
        name="organisation-settings-detail",
    ),
    path(
        "members/",
        OrganisationMemberListCreateView.as_view(),
        name="organisation-members",
    ),
]
