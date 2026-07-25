from django.urls import path

from students.views.case import CaseDetailView, CaseListCreateView

urlpatterns = [
    path("", CaseListCreateView.as_view(), name="case-list-create"),
    path("<uuid:uid>/", CaseDetailView.as_view(), name="case-detail"),
]
