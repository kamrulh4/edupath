from rest_framework import generics
from rest_framework.generics import get_object_or_404

from common.views.mixins import StandardResponseMixin
from portal.permissions import IsPortalStudent
from students.models import Student
from students.serializers.student import StudentSerializer


class ProfileView(StandardResponseMixin, generics.RetrieveAPIView):
    """The logged-in student's own profile - read-only from the portal."""

    serializer_class = StudentSerializer
    permission_classes = [IsPortalStudent]

    def get_object(self):
        return get_object_or_404(Student, user=self.request.user)
