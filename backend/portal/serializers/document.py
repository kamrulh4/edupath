from rest_framework import serializers

from students.serializers.document import DocumentSerializer


class PortalDocumentSerializer(DocumentSerializer):
    """Same upload/rename/dedupe logic as the staff serializer, but a
    student may only attach documents to their own case."""

    def validate_case(self, value):
        request = self.context["request"]
        if value.student.user_id != request.user.id:
            raise serializers.ValidationError("This case does not belong to you.")
        return value
