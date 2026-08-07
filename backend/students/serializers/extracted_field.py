from rest_framework import serializers

from students.models import Document, ExtractedField
from students.services.profile_sync import sync_verified_field_to_profile


class ExtractedFieldSerializer(serializers.ModelSerializer):
    document = serializers.SlugRelatedField(slug_field="uid", queryset=Document.objects.all())

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
            raise serializers.ValidationError("Document does not belong to your organisation.")
        return value

    def update(self, instance, validated_data):
        was_verified = instance.is_verified
        instance = super().update(instance, validated_data)
        # The dedicated /verify/ action triggers this itself (it edits the
        # model directly, bypassing this serializer) - this covers the
        # generic PATCH path too, so profile sync can't be silently skipped
        # depending on which endpoint an adviser happens to use.
        if instance.is_verified and not was_verified:
            sync_verified_field_to_profile(instance)
        return instance
