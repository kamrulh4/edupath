from rest_framework import serializers

from students.serializers.task import TaskSerializer


class AdviserWorkloadSerializer(serializers.Serializer):
    adviser_uid = serializers.UUIDField()
    adviser_name = serializers.CharField()
    active_cases = serializers.IntegerField()
    pending_tasks = serializers.IntegerField()
    overdue_tasks = serializers.IntegerField()


class CourseInterestSerializer(serializers.Serializer):
    course_uid = serializers.UUIDField()
    course_name = serializers.CharField()
    provider_name = serializers.CharField()
    recommendation_count = serializers.IntegerField()


class DashboardReportSerializer(serializers.Serializer):
    missing_documents_count = serializers.IntegerField()
    upcoming_deadlines = TaskSerializer(many=True)
    adviser_workload = AdviserWorkloadSerializer(many=True)
    course_interest = CourseInterestSerializer(many=True)
    avg_processing_time_days = serializers.FloatField(allow_null=True)
