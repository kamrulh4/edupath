from django.urls import path

from core.views.auth import LoginView, MeView, RefreshView, RegisterView
from core.views.organisation import (
    OrganisationDetailView,
    OrganisationSettingsDetailView,
)

urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="register"),
    path("auth/login/", LoginView.as_view(), name="login"),
    path("auth/refresh/", RefreshView.as_view(), name="token-refresh"),
    path("auth/me/", MeView.as_view(), name="me"),
    path("organisation/", OrganisationDetailView.as_view(), name="organisation-detail"),
    path(
        "organisation/settings/",
        OrganisationSettingsDetailView.as_view(),
        name="organisation-settings-detail",
    ),
]
