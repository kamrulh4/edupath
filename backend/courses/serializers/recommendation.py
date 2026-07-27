from rest_framework import serializers

from courses.models import Course, Recommendation
from students.models import Case


class RecommendationSerializer(serializers.ModelSerializer):
    case = serializers.SlugRelatedField(slug_field="uid", queryset=Case.objects.all())
    course = serializers.SlugRelatedField(
        slug_field="uid", queryset=Course.objects.all()
    )

    class Meta:
        model = Recommendation
        fields = (
            "id",
            "uid",
            "case",
            "course",
            "rank",
            "score",
            "score_breakdown",
            "unmet_requirements",
            "recommendation_notes",
            "risk_notes",
            "adviser_override_reason",
            "is_approved",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "uid", "status", "created_at", "updated_at")

    def validate_case(self, value):
        request = self.context["request"]
        if value.student.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError(
                "Case does not belong to your organisation."
            )
        return value

    def validate_course(self, value):
        request = self.context["request"]
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError(
                "Course does not belong to your organisation."
            )
        return value
