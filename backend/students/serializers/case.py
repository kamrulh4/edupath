from rest_framework import serializers

from core.choices import UserKind
from core.models import User
from students.models import Case, CaseStageHistory, Student

STAFF_KINDS = (UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER)


class CaseSerializer(serializers.ModelSerializer):
    # Every other endpoint identifies records by `uid`, not the internal
    # auto-increment `id` - keep relational input/output consistent with that.
    student = serializers.SlugRelatedField(
        slug_field="uid", queryset=Student.objects.all()
    )
    adviser = serializers.SlugRelatedField(
        slug_field="uid", queryset=User.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Case
        fields = (
            "id",
            "uid",
            "student",
            "adviser",
            "stage",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "uid", "status", "created_at", "updated_at")

    def validate_student(self, value):
        request = self.context["request"]
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError(
                "Student does not belong to your organisation."
            )
        return value

    def validate_adviser(self, value):
        if value is None:
            return value
        request = self.context["request"]
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError(
                "Adviser must belong to your organisation."
            )
        if value.kind not in STAFF_KINDS:
            raise serializers.ValidationError(
                "Adviser must be an admin, adviser or admission officer."
            )
        return value

    def create(self, validated_data):
        case = super().create(validated_data)
        CaseStageHistory.objects.create(case=case, stage=case.stage)
        return case

    def update(self, instance, validated_data):
        old_stage = instance.stage
        case = super().update(instance, validated_data)
        if case.stage != old_stage:
            CaseStageHistory.objects.create(case=case, stage=case.stage)
        return case
