from rest_framework import serializers

from students.models import Case, Meeting


class MeetingSerializer(serializers.ModelSerializer):
    case = serializers.SlugRelatedField(slug_field="uid", queryset=Case.objects.all())

    class Meta:
        model = Meeting
        fields = (
            "id",
            "uid",
            "case",
            "scheduled_time",
            "meet_link",
            "meeting_status",
            "transcript",
            "ai_summary",
            "extracted_requirements",
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
