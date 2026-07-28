from rest_framework import serializers

from students.models import FormTemplate


class FormTemplateSerializer(serializers.ModelSerializer):
    class Meta:
        model = FormTemplate
        fields = (
            "id",
            "uid",
            "organisation",
            "provider_name",
            "form_name",
            "template_file",
            "field_mapping",
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
