from rest_framework import serializers

from students.models import Student
from students.utils import apply_consent_timestamps


class ConsentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = (
            "ai_processing_consent",
            "ai_processing_consent_at",
            "communication_consent",
            "communication_consent_at",
        )
        read_only_fields = ("ai_processing_consent_at", "communication_consent_at")

    def update(self, instance, validated_data):
        validated_data = apply_consent_timestamps(instance, validated_data)
        return super().update(instance, validated_data)
