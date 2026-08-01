from django.urls import path

from courses.views.recommendation import (
    RecommendationApproveView,
    RecommendationDetailView,
    RecommendationGenerateView,
    RecommendationListCreateView,
)

urlpatterns = [
    path("", RecommendationListCreateView.as_view(), name="recommendation-list-create"),
    path(
        "generate/",
        RecommendationGenerateView.as_view(),
        name="recommendation-generate",
    ),
    path(
        "<uuid:uid>/", RecommendationDetailView.as_view(), name="recommendation-detail"
    ),
    path(
        "<uuid:uid>/approve/",
        RecommendationApproveView.as_view(),
        name="recommendation-approve",
    ),
]
