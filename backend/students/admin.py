from django.contrib import admin

from students.models import (
    ApplicationDraft,
    Case,
    Document,
    ExtractedField,
    FormTemplate,
    Meeting,
    Student,
    Task,
)

admin.site.register(Student)
admin.site.register(Case)
admin.site.register(Document)
admin.site.register(ExtractedField)
admin.site.register(Task)
admin.site.register(FormTemplate)
admin.site.register(ApplicationDraft)
admin.site.register(Meeting)
