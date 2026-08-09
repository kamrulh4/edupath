from django.urls import path

from students.views.task_checklist_template import (
    ApplyChecklistView,
    TaskChecklistTemplateDetailView,
    TaskChecklistTemplateListCreateView,
)

urlpatterns = [
    path(
        "",
        TaskChecklistTemplateListCreateView.as_view(),
        name="task-checklist-template-list-create",
    ),
    path(
        "apply/",
        ApplyChecklistView.as_view(),
        name="task-checklist-apply",
    ),
    path(
        "<uuid:uid>/",
        TaskChecklistTemplateDetailView.as_view(),
        name="task-checklist-template-detail",
    ),
]
