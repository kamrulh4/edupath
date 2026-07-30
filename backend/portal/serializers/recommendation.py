from rest_framework import serializers

from courses.models import Course
from courses.serializers.recommendation import RecommendationSerializer


class PortalCourseSerializer(serializers.ModelSerializer):
    class Meta:
        model = Course
        fields = (
            "uid",
            "provider_name",
            "course_name",
            "campus",
            "duration",
            "intake_dates",
            "tuition_fee",
            "category",
        )


class PortalRecommendationSerializer(RecommendationSerializer):
    """Read-only for students - nests course details since a student has no
    access to the staff-only /api/courses/ endpoint to resolve names."""

    course = PortalCourseSerializer(read_only=True)
