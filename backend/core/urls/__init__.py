from django.urls import include, path

urlpatterns = [
    path("auth/", include("core.urls.auth")),
    path("organisation/", include("core.urls.organisation")),
]
