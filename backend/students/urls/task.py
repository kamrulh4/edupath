from django.urls import path

from students.views.task import TaskDetailView, TaskListCreateView

urlpatterns = [
    path("", TaskListCreateView.as_view(), name="task-list-create"),
    path("<uuid:uid>/", TaskDetailView.as_view(), name="task-detail"),
]
