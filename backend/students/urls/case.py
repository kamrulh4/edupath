from django.urls import path

from students.views.case import (
    ApplicationPackView,
    CaseDetailView,
    CaseListCreateView,
)

urlpatterns = [
    path("", CaseListCreateView.as_view(), name="case-list-create"),
    path("<uuid:uid>/", CaseDetailView.as_view(), name="case-detail"),
    path(
        "<uuid:uid>/application-pack/",
        ApplicationPackView.as_view(),
        name="case-application-pack",
    ),
]
