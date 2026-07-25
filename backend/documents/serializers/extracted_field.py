from rest_framework import serializers

from documents.models import Document, ExtractedField


class ExtractedFieldSerializer(serializers.ModelSerializer):
    document = serializers.SlugRelatedField(
        slug_field="uid", queryset=Document.objects.all()
    )

    class Meta:
        model = ExtractedField
        fields = (
            "id",
            "uid",
            "document",
            "field_name",
            "extracted_value",
            "confidence_level",
            "confidence_value",
            "is_verified",
            "reviewer",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "uid", "reviewer", "created_at", "updated_at")

    def validate_document(self, value):
        request = self.context["request"]
        if value.case.student.organisation_id != request.user.organisation_id:
            raise serializers.ValidationError(
                "Document does not belong to your organisation."
            )
        return value
