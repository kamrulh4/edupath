"""Serializers for the signup / login flow."""

from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils.encoding import force_str
from django.utils.http import urlsafe_base64_decode
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

    def validate_password(self, value):
        # AUTH_PASSWORD_VALIDATORS is configured in settings but Django only
        # auto-applies it to its own auth forms - a DRF serializer has to
        # call it explicitly, which nothing here previously did.
        try:
            validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages)) from exc
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
        data["user"] = MeSerializer(self.user, context=self.context).data
        return data


class SetPasswordSerializer(serializers.Serializer):
    """Consumes an invite link (uidb64 + token) to set a first password.

    Generic on purpose - any invited account (student, or later an
    adviser invited the same way) uses this same endpoint."""

    uidb64 = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True, trim_whitespace=False)

    def validate(self, attrs):
        try:
            user_id = force_str(urlsafe_base64_decode(attrs["uidb64"]))
            user = User.objects.get(pk=user_id)
        except (User.DoesNotExist, ValueError, TypeError, OverflowError):
            raise serializers.ValidationError("Invalid invite link.")

        if not default_token_generator.check_token(user, attrs["token"]):
            raise serializers.ValidationError("Invite link is invalid or has expired.")

        try:
            validate_password(attrs["password"], user=user)
        except DjangoValidationError as exc:
            raise serializers.ValidationError({"password": list(exc.messages)}) from exc

        attrs["user"] = user
        return attrs

    def save(self):
        user = self.validated_data["user"]
        user.set_password(self.validated_data["password"])
        user.save(update_fields=["password"])
        return user
