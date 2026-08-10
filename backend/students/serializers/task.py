from rest_framework import serializers

from core.choices import UserKind
from core.models import User
from students.models import Case, Task

STAFF_KINDS = (UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER)


class TaskSerializer(serializers.ModelSerializer):
    case = serializers.SlugRelatedField(slug_field="uid", queryset=Case.objects.all())
    assignee = serializers.SlugRelatedField(
        slug_field="uid", queryset=User.objects.all(), required=False, allow_null=True
    )

    class Meta:
        model = Task
        fields = (
            "id",
            "uid",
            "case",
            "assignee",
            "title",
            "description",
            "due_date",
            "task_status",
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

    def validate_assignee(self, value):
        if value is None:
            return value
        request = self.context["request"]
        if value.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError(
                "Assignee must belong to your organisation."
            )
        if value.kind not in STAFF_KINDS:
            raise serializers.ValidationError(
                "Assignee must be an admin, adviser or admission officer."
            )
        return value
