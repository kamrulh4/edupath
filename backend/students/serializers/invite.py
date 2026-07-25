"""Invite a Student to the student portal by creating their User account.

No email backend is wired up yet, so the invite link (uidb64 + token) is
returned directly in the API response instead of being emailed. Swap that
for an email send once notifications exist - the token flow itself won't
need to change.
"""

from django.contrib.auth.tokens import default_token_generator
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework import serializers

from core.choices import UserKind
from core.models import User


class StudentInviteSerializer(serializers.Serializer):
    def validate(self, attrs):
        student = self.context["student"]
        if student.user_id:
            raise serializers.ValidationError("This student already has portal access.")
        if not student.email:
            raise serializers.ValidationError(
                "Add an email for this student before inviting them."
            )
        if User.objects.filter(email__iexact=student.email).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return attrs

    def save(self):
        student = self.context["student"]
        user = User.objects.create_user(
            first_name=student.first_name,
            last_name=student.last_name,
            email=student.email,
            password=None,
            organisation=student.organisation,
            kind=UserKind.STUDENT,
        )
        student.user = user
        student.save(update_fields=["user"])

        return {
            "user": user,
            "uidb64": urlsafe_base64_encode(force_bytes(user.pk)),
            "token": default_token_generator.make_token(user),
        }
