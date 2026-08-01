from django.urls import include, path

urlpatterns = [
    path("auth/", include("core.urls.auth")),
    path("organisation/", include("core.urls.organisation")),
    path("audit-logs/", include("core.urls.audit_log")),
    path("dashboard/", include("core.urls.dashboard")),
]
