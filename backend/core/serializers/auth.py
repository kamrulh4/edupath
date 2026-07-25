"""Serializers for the signup / login flow."""

from django.db import transaction
from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer

from core.choices import UserKind
from core.models import Organisation, User
from core.serializers.users import MeSerializer


class RegisterSerializer(serializers.Serializer):
    """Creates a new Organisation together with its first ADMIN user (signup)."""

    organisation_name = serializers.CharField(max_length=255)
    first_name = serializers.CharField(max_length=150)
    last_name = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        with transaction.atomic():
            organisation = Organisation.objects.create(
                name=validated_data["organisation_name"]
            )
            user = User.objects.create_user(
                first_name=validated_data["first_name"],
                last_name=validated_data["last_name"],
                email=validated_data["email"],
                password=validated_data["password"],
                organisation=organisation,
                kind=UserKind.ADMIN,
            )
            organisation.entry_by = user
            organisation.save(update_fields=["entry_by"])
        return user


class EduPathTokenObtainPairSerializer(TokenObtainPairSerializer):
    """Login serializer that also returns the authenticated user's profile."""

    def validate(self, attrs):
        data = super().validate(attrs)
        data["user"] = MeSerializer(self.user).data
        return data
