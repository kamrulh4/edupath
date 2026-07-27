from django.contrib import admin

from courses.models import Course, Recommendation

admin.site.register(Course)
admin.site.register(Recommendation)
