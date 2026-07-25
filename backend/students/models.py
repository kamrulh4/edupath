"""Models for student profiles and their application cases."""

from django.db import models

from common.models import BaseModelWithUID
from core.models import Organisation, User
from students.choices import CaseStage


class Student(BaseModelWithUID):
    """Single source of truth for a student's profile and information."""

    organisation = models.ForeignKey(
        Organisation, on_delete=models.CASCADE, related_name="students"
    )
    user = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="student_profile",
    )

    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    email = models.EmailField(max_length=255, db_index=True)
    phone = models.CharField(max_length=20, blank=True)
    date_of_birth = models.DateField(null=True, blank=True)
    passport_number = models.CharField(max_length=100, blank=True)
    nationality = models.CharField(max_length=100, blank=True)

    # Can store extracted complex data
    education_history = models.JSONField(default=list, blank=True)
    english_scores = models.JSONField(default=dict, blank=True)
    goals_and_preferences = models.TextField(blank=True)

    # Privacy and Trust
    ai_processing_consent = models.BooleanField(default=False)
    ai_processing_consent_at = models.DateTimeField(null=True, blank=True)
    communication_consent = models.BooleanField(default=False)
    communication_consent_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Case(BaseModelWithUID):
    """Tracks a student's journey from enquiry to application."""

    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="cases")
    adviser = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_cases",
    )
    stage = models.CharField(
        max_length=50, choices=CaseStage.choices, default=CaseStage.ENQUIRY
    )

    def __str__(self):
        return f"Case for {self.student} - {self.get_stage_display()}"
