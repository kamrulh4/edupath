from rest_framework import serializers

from students.models import ApplicationDraft, Case, FormTemplate


class ApplicationDraftSerializer(serializers.ModelSerializer):
    case = serializers.SlugRelatedField(slug_field="uid", queryset=Case.objects.all())
    template = serializers.SlugRelatedField(
        slug_field="uid",
        queryset=FormTemplate.objects.all(),
        required=False,
        allow_null=True,
    )

    class Meta:
        model = ApplicationDraft
        fields = (
            "id",
            "uid",
            "case",
            "template",
            "draft_file",
            "missing_fields",
            "is_approved",
            "adviser_notes",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "uid",
            "missing_fields",
            "status",
            "created_at",
            "updated_at",
        )

    def validate_case(self, value):
        request = self.context["request"]
        if value.student.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError(
                "Case does not belong to your organisation."
            )
        return value

    def validate_template(self, value):
        if value is None:
            return value
        request = self.context["request"]
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError(
                "Template does not belong to your organisation."
            )
        return value
