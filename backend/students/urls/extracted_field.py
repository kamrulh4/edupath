from django.urls import path

from students.views.extracted_field import (
    ExtractedFieldDetailView,
    ExtractedFieldListCreateView,
    ExtractedFieldVerifyView,
)

urlpatterns = [
    path("", ExtractedFieldListCreateView.as_view(), name="extracted-field-list-create"),
    path("<uuid:uid>/", ExtractedFieldDetailView.as_view(), name="extracted-field-detail"),
    path(
        "<uuid:uid>/verify/",
        ExtractedFieldVerifyView.as_view(),
        name="extracted-field-verify",
    ),
]
