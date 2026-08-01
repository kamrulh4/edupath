from django.urls import path

from students.views.document import (
    DocumentBulkUploadView,
    DocumentDetailView,
    DocumentListCreateView,
)

urlpatterns = [
    path("", DocumentListCreateView.as_view(), name="document-list-create"),
    path("bulk/", DocumentBulkUploadView.as_view(), name="document-bulk-upload"),
    path("<uuid:uid>/", DocumentDetailView.as_view(), name="document-detail"),
]
