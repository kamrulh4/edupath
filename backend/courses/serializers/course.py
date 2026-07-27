from rest_framework import serializers

from courses.models import Course


class CourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = (
            "id",
            "uid",
            "organisation",
            "provider_name",
            "course_name",
            "campus",
            "duration",
            "intake_dates",
            "tuition_fee",
            "academic_requirements",
            "english_requirements",
            "prerequisite_requirements",
            "category",
            "source_url",
            "last_verification_date",
            "is_active",
            "is_partner_provider",
            "commission_notes",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "uid",
            "organisation",
            "status",
            "created_at",
            "updated_at",
        )
