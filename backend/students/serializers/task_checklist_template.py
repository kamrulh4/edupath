from rest_framework import serializers

from students.models import TaskChecklistTemplate


class TaskChecklistTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = TaskChecklistTemplate
        fields = (
            "id",
            "uid",
            "organisation",
            "name",
            "items",
            "is_active",
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

    def validate_items(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("items must be a list.")
        for item in value:
            if not isinstance(item, dict) or not item.get("title"):
                raise serializers.ValidationError("Each item needs at least a 'title'.")
        return value
