from django.urls import path

from students.views.document import DocumentDetailView, DocumentListCreateView

urlpatterns = [
    path("", DocumentListCreateView.as_view(), name="document-list-create"),
    path("<uuid:uid>/", DocumentDetailView.as_view(), name="document-detail"),
]
