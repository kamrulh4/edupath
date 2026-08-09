"""Core models for our app."""

from django.contrib.auth.base_user import (
    BaseUserManager,
)
from django.contrib.auth.models import (
    AbstractBaseUser,
    PermissionsMixin,
)
from django.db import models


from common.models import BaseModelWithUID, NameDescriptionBaseModel

from core.choices import (
    UserKind,
    UserGender,
)
from core.utils import get_user_media_path_prefix


class Organisation(NameDescriptionBaseModel):
    """Multi-tenant organisation representing a consultancy."""

    logo = models.URLField(max_length=500, blank=True, null=True)
    address = models.TextField(blank=True)

    def __str__(self):
        return self.name


class OrganisationSettings(BaseModelWithUID):
    """Configuration for provider preferences, scoring weights, and workflows."""

    organisation = models.OneToOneField(
        Organisation, on_delete=models.CASCADE, related_name="settings"
    )
    provider_preferences = models.JSONField(default=list, blank=True)
    scoring_weights = models.JSONField(default=dict, blank=True)
    workflow_config = models.JSONField(default=dict, blank=True)
    # Documented retention policy only - no automated deletion job reads
    # this yet. Cases must be deleted manually (see CaseDetailView DELETE).
    data_retention_days = models.PositiveIntegerField(null=True, blank=True)


class UserManager(BaseUserManager):
    """Managers for users."""

    def create_user(self, first_name, last_name, email, password=None, **extra_fields):
        if not email:
            raise ValueError("User must have an email address.")

        user = self.model(
            first_name=first_name,
            last_name=last_name,
            email=self.normalize_email(email),
            **extra_fields,
        )
        user.set_password(password)
        user.save(using=self._db)

        return user

    def create_superuser(self, first_name, last_name, email, password):
        """Create a new superuser and return superuser"""

        user = self.create_user(
            first_name=first_name,
            last_name=last_name,
            email=email,
            password=password,
        )

        user.is_superuser = True
        user.is_staff = True
        user.kind = UserKind.SUPER_ADMIN
        user.save(using=self._db)

        return user


class User(AbstractBaseUser, BaseModelWithUID, PermissionsMixin):
    """Users in the System"""

    organisation = models.ForeignKey(
        Organisation,
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
    )
    email = models.EmailField(
        max_length=255,
        unique=True,
        db_index=True,
    )
    first_name = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )
    last_name = models.CharField(
        max_length=150,
        blank=True,
        db_index=True,
    )
    phone = models.CharField(
        max_length=20,
        blank=True,
        db_index=True,
    )

    gender = models.CharField(
        max_length=20,
        blank=True,
        choices=UserGender.choices,
        default=UserGender.UNKNOWN,
    )
    image = models.ImageField(
        upload_to=get_user_media_path_prefix,
        blank=True,
        null=True,
    )
    is_active = models.BooleanField(
        default=True,
    )
    is_staff = models.BooleanField(
        default=False,
    )
    kind = models.CharField(
        max_length=20,
        choices=UserKind.choices,
        default=UserKind.UNDEFINED,
    )

    objects = UserManager()

    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = (
        "first_name",
        "last_name",
    )

    class Meta:
        verbose_name = "System User"
        verbose_name_plural = "System Users"


class AuditLog(BaseModelWithUID):
    """Immutable audit trail for security and trust.

    Records uploads, edits, approvals, downloads and sharing. Written to
    inline from the specific views that perform sensitive actions, rather
    than a blanket middleware/signal - keeps entries meaningful instead of
    logging every read.
    """

    organisation = models.ForeignKey(
        Organisation, on_delete=models.CASCADE, related_name="audit_logs"
    )
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True, related_name="actions"
    )

    action_type = models.CharField(max_length=100)  # e.g. 'DOCUMENT_UPLOAD'
    target_model = models.CharField(max_length=100)  # e.g. 'Document'
    target_uid = models.UUIDField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)

    def __str__(self):
        return f"{self.action_type} on {self.target_model} by {self.actor}"
