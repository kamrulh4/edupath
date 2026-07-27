from django.urls import path

from courses.views.recommendation import (
    RecommendationApproveView,
    RecommendationDetailView,
    RecommendationListCreateView,
)

urlpatterns = [
    path("", RecommendationListCreateView.as_view(), name="recommendation-list-create"),
    path(
        "<uuid:uid>/", RecommendationDetailView.as_view(), name="recommendation-detail"
    ),
    path(
        "<uuid:uid>/approve/",
        RecommendationApproveView.as_view(),
        name="recommendation-approve",
    ),
]
