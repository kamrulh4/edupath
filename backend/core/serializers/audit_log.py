from rest_framework import serializers

from core.models import AuditLog


class AuditLogSerializer(serializers.ModelSerializer):
    class Meta:
        model = AuditLog
        fields = (
            "id",
            "uid",
            "actor",
            "action_type",
            "target_model",
            "target_uid",
            "details",
            "ip_address",
            "created_at",
        )
        read_only_fields = fields
