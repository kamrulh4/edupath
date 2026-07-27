from django.urls import include, path

urlpatterns = [
    path("students/", include("students.urls.student")),
    path("cases/", include("students.urls.case")),
    path("documents/", include("students.urls.document")),
    path("extracted-fields/", include("students.urls.extracted_field")),
]
