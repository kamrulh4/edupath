from rest_framework import serializers

from students.models import Student
from students.utils import apply_consent_timestamps


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = (
            "id",
            "uid",
            "organisation",
            "user",
            "photo",
            "first_name",
            "last_name",
            "email",
            "phone",
            "date_of_birth",
            "passport_number",
            "nationality",
            "education_history",
            "english_scores",
            "goals_and_preferences",
            "ai_processing_consent",
            "ai_processing_consent_at",
            "communication_consent",
            "communication_consent_at",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "uid",
            "organisation",
            "user",
            "ai_processing_consent_at",
            "communication_consent_at",
            "status",
            "created_at",
            "updated_at",
        )

    def update(self, instance, validated_data):
        validated_data = apply_consent_timestamps(instance, validated_data)
        return super().update(instance, validated_data)
