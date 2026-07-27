from django.urls import include, path

urlpatterns = [
    path("courses/", include("courses.urls.course")),
    path("recommendations/", include("courses.urls.recommendation")),
]
