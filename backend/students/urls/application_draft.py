from django.urls import path

from students.views.application_draft import (
    ApplicationDraftApproveView,
    ApplicationDraftDetailView,
    ApplicationDraftGenerateView,
    ApplicationDraftListCreateView,
)

urlpatterns = [
    path(
        "",
        ApplicationDraftListCreateView.as_view(),
        name="application-draft-list-create",
    ),
    path(
        "generate/",
        ApplicationDraftGenerateView.as_view(),
        name="application-draft-generate",
    ),
    path(
        "<uuid:uid>/",
        ApplicationDraftDetailView.as_view(),
        name="application-draft-detail",
    ),
    path(
        "<uuid:uid>/approve/",
        ApplicationDraftApproveView.as_view(),
        name="application-draft-approve",
    ),
]
