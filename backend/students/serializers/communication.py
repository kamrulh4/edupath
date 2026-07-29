from rest_framework import serializers

from students.models import Case, Communication


class CommunicationSerializer(serializers.ModelSerializer):
    case = serializers.SlugRelatedField(slug_field="uid", queryset=Case.objects.all())

    class Meta:
        model = Communication
        fields = (
            "id",
            "uid",
            "case",
            "sender",
            "message_body",
            "is_read",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "uid", "sender", "status", "created_at", "updated_at")

    def validate_case(self, value):
        request = self.context["request"]
        if value.student.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError(
                "Case does not belong to your organisation."
            )
        return value
