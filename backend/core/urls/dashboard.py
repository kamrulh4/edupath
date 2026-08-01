from django.urls import path

from core.views.dashboard import DashboardReportingView

urlpatterns = [
    path("", DashboardReportingView.as_view(), name="dashboard-reporting"),
]
