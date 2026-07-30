from rest_framework import generics

from common.views.mixins import StandardResponseMixin
from portal.permissions import IsPortalStudent
from students.models import Case
from students.serializers.case import CaseSerializer


class CaseListView(StandardResponseMixin, generics.ListAPIView):
    """The logged-in student's own case(s) - shows stage/progress."""

    serializer_class = CaseSerializer
    permission_classes = [IsPortalStudent]

    def get_queryset(self):
        return Case.objects.filter(student__user=self.request.user).order_by("-id")
