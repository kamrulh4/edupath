from rest_framework import serializers

from students.models import Student


class StudentSerializer(serializers.ModelSerializer):
    class Meta:
        model = Student
        fields = (
            "id",
            "uid",
            "organisation",
            "user",
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
            "status",
            "created_at",
            "updated_at",
        )
