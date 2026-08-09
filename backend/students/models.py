"""Models for student profiles and their application cases."""

from django.db import models

from common.models import BaseModelWithUID
from core.models import Organisation, User
from students.choices import (
    CaseStage,
    ConfidenceLevel,
    DocumentCategory,
    DocumentStatus,
    DocumentType,
    MeetingStatus,
    TaskStatus,
)
from students.utils import get_student_media_path_prefix


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

    photo = models.ImageField(
        upload_to=get_student_media_path_prefix,
        blank=True,
        null=True,
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


class CaseStageHistory(BaseModelWithUID):
    """One row per stage a case has passed through - feeds the dashboard's
    processing-time metric (time from case creation to ENROLLED)."""

    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name="stage_history"
    )
    stage = models.CharField(max_length=50, choices=CaseStage.choices)
    entered_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["entered_at"]

    def __str__(self):
        return f"{self.case} entered {self.get_stage_display()} at {self.entered_at}"


class Document(BaseModelWithUID):
    """Stores uploaded files and preserves original copies."""

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="documents")

    document_category = models.CharField(
        max_length=50, choices=DocumentCategory.choices, default=DocumentCategory.OTHER
    )
    document_type = models.CharField(
        max_length=50, choices=DocumentType.choices, default=DocumentType.OTHER
    )
    doc_status = models.CharField(
        max_length=50, choices=DocumentStatus.choices, default=DocumentStatus.PENDING
    )

    original_file = models.FileField(upload_to="documents/originals/")
    renamed_file = models.FileField(
        upload_to="documents/renamed/", null=True, blank=True
    )
    file_hash = models.CharField(max_length=64, db_index=True, blank=True)

    quality_flags = models.JSONField(default=list, blank=True)
    is_duplicate = models.BooleanField(default=False)

    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_documents",
    )

    def __str__(self):
        return f"{self.get_document_type_display()} for {self.case}"


class ExtractedField(BaseModelWithUID):
    """Fields extracted from documents, either by AI or manual entry."""

    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name="extracted_fields"
    )

    field_name = models.CharField(max_length=255)  # e.g. 'date_of_birth', 'grades'
    extracted_value = models.TextField()
    confidence_level = models.CharField(max_length=20, choices=ConfidenceLevel.choices)
    confidence_value = models.DecimalField(
        max_digits=4, decimal_places=3, null=True, blank=True
    )  # raw 0-1 score from the extraction model, when available

    is_verified = models.BooleanField(default=False)
    reviewer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.field_name}={self.extracted_value} ({self.document})"


class Task(BaseModelWithUID):
    """Deadlines and missing-document follow-ups for a case."""

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="tasks")
    assignee = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="assigned_tasks",
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    task_status = models.CharField(
        max_length=50, choices=TaskStatus.choices, default=TaskStatus.PENDING
    )
    reminder_sent_at = models.DateTimeField(null=True, blank=True)

    def __str__(self):
        return f"{self.title} - {self.get_task_status_display()}"


class TaskChecklistTemplate(BaseModelWithUID):
    """A reusable set of tasks for a common application type (e.g. "UK
    Undergraduate Checklist") - applying one to a case creates every item
    as a real Task in one go, instead of adding them by hand each time.

    items shape: [{"title": str, "description": str, "days_offset": int|None}]
    days_offset is days from today for that item's due_date, or None for no
    due date.
    """

    organisation = models.ForeignKey(
        Organisation, on_delete=models.CASCADE, related_name="task_checklist_templates"
    )
    name = models.CharField(max_length=255)
    items = models.JSONField(default=list, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return self.name


class FormTemplate(BaseModelWithUID):
    """Application form template for a specific provider.

    Auto-fill / PDF generation isn't wired up yet - field_mapping is a
    placeholder seam for a future auto-fill engine.
    """

    organisation = models.ForeignKey(
        Organisation, on_delete=models.CASCADE, related_name="form_templates"
    )

    provider_name = models.CharField(max_length=255)
    form_name = models.CharField(max_length=255)
    template_file = models.FileField(upload_to="form_templates/")
    field_mapping = models.JSONField(default=dict, blank=True)
    is_active = models.BooleanField(default=True)

    def __str__(self):
        return f"{self.form_name} ({self.provider_name})"


class ApplicationDraft(BaseModelWithUID):
    """Generated application form draft for adviser review."""

    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name="application_drafts"
    )
    template = models.ForeignKey(
        FormTemplate, on_delete=models.SET_NULL, null=True, blank=True
    )

    draft_file = models.FileField(upload_to="application_drafts/")
    # Denormalized for fast queries; the AuditLog has the approval trail.
    is_approved = models.BooleanField(default=False)
    adviser_notes = models.TextField(blank=True)
    # Form fields the auto-fill engine couldn't populate (no mapping or no
    # data) - empty for manually-uploaded drafts.
    missing_fields = models.JSONField(default=list, blank=True)

    def __str__(self):
        return f"Draft for {self.case}"


class Meeting(BaseModelWithUID):
    """Consultation meeting record.

    No Google Calendar/Meet API integration yet - the meet link, transcript
    and summary are entered manually.
    """

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="meetings")
    scheduled_time = models.DateTimeField()
    meet_link = models.URLField(max_length=500, blank=True)
    meeting_status = models.CharField(
        max_length=20, choices=MeetingStatus.choices, default=MeetingStatus.SCHEDULED
    )

    transcript = models.TextField(blank=True)
    ai_summary = models.TextField(blank=True)
    extracted_requirements = models.JSONField(default=dict, blank=True)

    def __str__(self):
        return f"Meeting for {self.case} at {self.scheduled_time}"


class Communication(BaseModelWithUID):
    """Messages and notices linked to a case, visible in the student portal."""

    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name="communications"
    )
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    message_body = models.TextField()
    is_read = models.BooleanField(default=False)

    def __str__(self):
        return f"Message on {self.case} from {self.sender}"
