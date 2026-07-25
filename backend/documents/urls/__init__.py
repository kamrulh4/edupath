from django.urls import include, path

urlpatterns = [
    path("documents/", include("documents.urls.document")),
    path("extracted-fields/", include("documents.urls.extracted_field")),
]
