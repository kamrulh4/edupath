from rest_framework import serializers

from students.serializers.communication import CommunicationSerializer


class PortalCommunicationSerializer(CommunicationSerializer):
    """A student may only read/send messages on their own case."""

    def validate_case(self, value):
        request = self.context["request"]
        if value.student.user_id != request.user.id:
            raise serializers.ValidationError("This case does not belong to you.")
        return value
