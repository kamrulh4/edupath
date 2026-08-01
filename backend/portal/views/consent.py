from rest_framework import generics
from rest_framework.generics import get_object_or_404

from common.views.mixins import StandardResponseMixin
from core.audit import log_action
from portal.permissions import IsPortalStudent
from portal.serializers.consent import ConsentSerializer
from students.models import Student


class ConsentUpdateView(StandardResponseMixin, generics.RetrieveUpdateAPIView):
    """Lets a student view and manage their own AI-processing and
    communication consent - self-service, since they're the data subject."""

    serializer_class = ConsentSerializer
    permission_classes = [IsPortalStudent]

    def get_object(self):
        return get_object_or_404(Student, user=self.request.user)

    def perform_update(self, serializer):
        consent_fields = {"ai_processing_consent", "communication_consent"}
        changed_consent = consent_fields & set(serializer.validated_data.keys())
        student = serializer.save()
        if changed_consent:
            log_action(
                self.request,
                "STUDENT_CONSENT_UPDATED",
                student,
                details={
                    field: getattr(student, field) for field in changed_consent
                },
            )
