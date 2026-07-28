from django.urls import path

from students.views.form_template import (
    FormTemplateDetailView,
    FormTemplateListCreateView,
)

urlpatterns = [
    path("", FormTemplateListCreateView.as_view(), name="form-template-list-create"),
    path("<uuid:uid>/", FormTemplateDetailView.as_view(), name="form-template-detail"),
]
