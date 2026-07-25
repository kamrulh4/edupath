"""Serializers for the Organisation model."""

from rest_framework import serializers

from core.models import Organisation, OrganisationSettings


class OrganisationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Organisation
        fields = (
            "id",
            "uid",
            "name",
            "description",
            "logo",
            "address",
            "status",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "uid", "status", "created_at", "updated_at")


class OrganisationSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrganisationSettings
        fields = (
            "id",
            "uid",
            "organisation",
            "provider_preferences",
            "scoring_weights",
            "workflow_config",
        )
        read_only_fields = ("id", "uid", "organisation")
