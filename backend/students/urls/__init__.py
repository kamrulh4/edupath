from django.urls import include, path

urlpatterns = [
    path("students/", include("students.urls.student")),
    path("cases/", include("students.urls.case")),
    path("documents/", include("students.urls.document")),
    path("extracted-fields/", include("students.urls.extracted_field")),
    path("tasks/", include("students.urls.task")),
    path("form-templates/", include("students.urls.form_template")),
    path("application-drafts/", include("students.urls.application_draft")),
    path("meetings/", include("students.urls.meeting")),
]
