from rest_framework import serializers
from rest_framework.reverse import reverse

from students.models import Case, Document
from students.services.document_ingest import create_document
from students.services.secure_links import generate_download_token


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

    def to_representation(self, instance):
        data = super().to_representation(instance)
        request = self.context.get("request")
        if instance.original_file:
            data["original_file"] = self._signed_url(
                request, instance.uid, "original", instance.original_file
            )
        if instance.renamed_file:
            data["renamed_file"] = self._signed_url(
                request, instance.uid, "renamed", instance.renamed_file
            )
        return data

    @staticmethod
    def _signed_url(request, document_uid, file_field, file_obj):
        if not request or not request.user or not request.user.is_authenticated:
            return file_obj.url
        token = generate_download_token(str(document_uid), file_field, request.user.id)
        path = reverse("document-download", kwargs={"uid": document_uid})
        url = f"{path}?token={token}"
        return request.build_absolute_uri(url)

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
