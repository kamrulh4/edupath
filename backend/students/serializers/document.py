from django.core.files.base import ContentFile
from rest_framework import serializers

from core.audit import log_action
from students.choices import DOCUMENT_TYPE_TO_CATEGORY
from students.models import Case, Document
from students.utils import build_renamed_filename, hash_file


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
        original_file = validated_data["original_file"]
        case = validated_data["case"]
        document_type = validated_data.get(
            "document_type", Document.document_type.field.default
        )

        if "document_category" not in validated_data:
            validated_data["document_category"] = DOCUMENT_TYPE_TO_CATEGORY.get(
                document_type, Document.document_category.field.default
            )

        file_hash = hash_file(original_file)
        is_duplicate = Document.objects.filter(case=case, file_hash=file_hash).exists()

        document = Document.objects.create(
            uploaded_by=request.user,
            file_hash=file_hash,
            is_duplicate=is_duplicate,
            **validated_data,
        )

        renamed_name = build_renamed_filename(case, document_type, original_file.name)
        original_file.seek(0)
        document.renamed_file.save(
            renamed_name, ContentFile(original_file.read()), save=True
        )

        log_action(
            request,
            "DOCUMENT_UPLOAD",
            document,
            details={"document_type": document_type, "is_duplicate": is_duplicate},
        )

        return document
