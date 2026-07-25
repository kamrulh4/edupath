"""Serializer for user model."""

from django.contrib.auth import get_user_model

from rest_framework import status
from rest_framework import serializers

from core.choices import UserKind

User = get_user_model()

ORGANISATION_MEMBER_KINDS = (
    UserKind.ADMIN,
    UserKind.ADVISER,
    UserKind.ADMISSION_OFFICER,
)


class UserListSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "uid",
            "first_name",
            "last_name",
            "email",
            "gender",
            "kind",
            "organisation",
            "image",
        )
        read_only_fields = ("id", "uid", "organisation", "image")


class UserDetailSerializer(UserListSerializer):
    class Meta(UserListSerializer.Meta):
        fields = UserListSerializer.Meta.fields + (
            "status",
            "is_staff",
        )
        read_only_fields = UserListSerializer.Meta.read_only_fields + ()


class UserRegistrationSerializer(serializers.ModelSerializer):
    # Specify password and confirm_password fields as write_only, meaning they won't be included in responses
    password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},  # Styling to indicate it's a password field
        trim_whitespace=False,
    )
    confirm_password = serializers.CharField(
        write_only=True,
        style={"input_type": "password"},
        trim_whitespace=False,
    )

    # Custom validation for password to check if it matches confirm_password
    def validate_password(self, value):
        password = value
        confirm_password = self.initial_data.get("confirm_password", "")
        if password != confirm_password:
            raise serializers.ValidationError(
                detail="Password and confirm password don't match!!!",  # Error message
                code=status.HTTP_400_BAD_REQUEST,  # HTTP status code
            )
        return value

    class Meta:
        model = User  # Specify the model for the serializer
        fields = (
            "first_name",
            "last_name",
            "phone",
            "email",
            "gender",
            "password",
            "confirm_password",
        )  # Fields to include in the serialization

    # Custom create method to handle user creation
    def create(self, validated_data):
        validated_data.pop(
            "confirm_password", None
        )  # Remove confirm_password from validated data
        user = User(**validated_data)  # Create a new user instance with validated data
        user.set_password(validated_data.get("password", ""))  # Set user's password
        user.save()  # Save the user to the database
        return user  # Return the created user instance


class MeSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = (
            "id",
            "uid",
            "first_name",
            "last_name",
            "phone",
            "email",
            "gender",
            "kind",
            "organisation",
            "image",
            "created_at",
            "updated_at",
        )
        read_only_fields = (
            "id",
            "uid",
            "kind",
            "organisation",
            "created_at",
            "updated_at",
        )


class OrganisationMemberSerializer(serializers.ModelSerializer):
    """Lets an org ADMIN add a teammate (Adviser/Admission Officer/Admin)
    to their own organisation. The organisation itself always comes from
    the requesting admin, never from the payload."""

    password = serializers.CharField(write_only=True, trim_whitespace=False)

    class Meta:
        model = User
        fields = (
            "id",
            "uid",
            "first_name",
            "last_name",
            "email",
            "kind",
            "password",
            "status",
            "created_at",
        )
        read_only_fields = ("id", "uid", "status", "created_at")

    def validate_kind(self, value):
        if value not in ORGANISATION_MEMBER_KINDS:
            raise serializers.ValidationError(
                f"Role must be one of {', '.join(ORGANISATION_MEMBER_KINDS)}."
            )
        return value

    def validate_email(self, value):
        if User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        organisation = self.context["request"].user.organisation
        return User.objects.create_user(
            first_name=validated_data["first_name"],
            last_name=validated_data["last_name"],
            email=validated_data["email"],
            password=validated_data["password"],
            organisation=organisation,
            kind=validated_data.get("kind", UserKind.ADVISER),
        )
