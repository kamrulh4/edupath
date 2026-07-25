from rest_framework import generics

from common.views.mixins import StandardResponseMixin
from core.models import OrganisationSettings
from core.permissions import IsOrganisationAdminOrReadOnly
from core.serializers.organisation import (
    OrganisationSerializer,
    OrganisationSettingsSerializer,
)


class OrganisationDetailView(StandardResponseMixin, generics.RetrieveUpdateAPIView):
    """The current user's own organisation - every member can view, only its ADMIN can edit."""

    serializer_class = OrganisationSerializer
    permission_classes = [IsOrganisationAdminOrReadOnly]

    def get_object(self):
        return self.request.user.organisation


class OrganisationSettingsDetailView(
    StandardResponseMixin, generics.RetrieveUpdateAPIView
):
    serializer_class = OrganisationSettingsSerializer
    permission_classes = [IsOrganisationAdminOrReadOnly]

    def get_object(self):
        settings_obj, _ = OrganisationSettings.objects.get_or_create(
            organisation=self.request.user.organisation
        )
        return settings_obj
