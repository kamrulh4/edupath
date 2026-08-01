from rest_framework import serializers

from students.models import Case, Document
from students.services.document_ingest import create_document


class DocumentSerializer(serializers.ModelSerializer):
    case = serializers.SlugRelatedField(slug_field="uid", queryset=Case.objects.all())

    class Meta:
        model = Document
        fields = (
            "id",
            "uid",
            "case",
            "document_category",
            "document_type",
            "doc_status",
            "original_file",
            "renamed_file",
            "quality_flags",
            "is_duplicate",
            "uploaded_by",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "uid",
            "renamed_file",
            "is_duplicate",
            "uploaded_by",
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

    def create(self, validated_data):
        request = self.context["request"]
        return create_document(
            request,
            case=validated_data["case"],
            uploaded_file=validated_data["original_file"],
            document_type=validated_data.get(
                "document_type", Document.document_type.field.default
            ),
            document_category=validated_data.get("document_category"),
        )
