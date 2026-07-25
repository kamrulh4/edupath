from django.urls import include, path

urlpatterns = [
    path("students/", include("students.urls.student")),
    path("cases/", include("students.urls.case")),
]
