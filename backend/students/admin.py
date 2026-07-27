from django.contrib import admin

from students.models import Case, Document, ExtractedField, Student

admin.site.register(Student)
admin.site.register(Case)
admin.site.register(Document)
admin.site.register(ExtractedField)
