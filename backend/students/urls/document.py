from django.urls import path

from students.views.document import (
    DocumentBulkUploadView,
    DocumentDetailView,
    DocumentListCreateView,
)
from students.views.document_download import DocumentDownloadView

urlpatterns = [
    path("", DocumentListCreateView.as_view(), name="document-list-create"),
    path("bulk/", DocumentBulkUploadView.as_view(), name="document-bulk-upload"),
    path(
        "<uuid:uid>/download/",
        DocumentDownloadView.as_view(),
        name="document-download",
    ),
    path("<uuid:uid>/", DocumentDetailView.as_view(), name="document-detail"),
]
