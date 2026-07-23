import uuid
from django.db import models
from django.contrib.auth.models import AbstractUser

# -----------------------------------------------------------------------------
# 1. Workspace and Case Management
# -----------------------------------------------------------------------------

class BaseModelWithUID(models.Model):
    """
    Abstract base model with UUID primary key and timestamps.
    """

    uid = models.UUIDField(default=uuid.uuid4, editable=False, db_index=True, unique=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    metadata = models.JSONField(default=dict, blank=True)

    class Meta:
        abstract = True

class NameDescriptionBaseModel(BaseModelWithUID):
    """
    Abstract base model with name and description fields.
    """

    name = models.CharField(max_length=255)
    description = models.TextField(blank=True)

    class Meta:
        abstract = True

class Organisation(NameDescriptionBaseModel):
    """
    Multi-tenant organisation representing a consultancy.
    """

    name = models.CharField(max_length=255)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.name


class OrganisationSettings(BaseModelWithUID):
    """
    Configuration for provider preferences, scoring weights, and workflows.
    """
    organisation = models.OneToOneField(Organisation, on_delete=models.CASCADE, related_name="settings")
    provider_preferences = models.JSONField(default=list, blank=True)
    scoring_weights = models.JSONField(default=dict, blank=True)
    workflow_config = models.JSONField(default=dict, blank=True)
    updated_at = models.DateTimeField(auto_now=True)


class User(AbstractUser):
    """
    Custom user model with Role-Based Access Control.
    """

    ROLE_CHOICES = [
        ("ADMIN", "Support Admin"),
        ("ADVISER", "Adviser"),
        ("OFFICER", "Admission Officer"),
        ("STUDENT", "Student"),
    ]
    organisation = models.ForeignKey(
        Organisation,
        on_delete=models.CASCADE,
        related_name="users",
        null=True,
        blank=True,
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default="STUDENT")


class Student(BaseModelWithUID):
    """
    A single source of truth for student profile and information.
    """

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="student_profile",
        null=True,
        blank=True,
    )
    organisation = models.ForeignKey(
        Organisation, on_delete=models.CASCADE, related_name="students"
    )

    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    date_of_birth = models.DateField(null=True, blank=True)
    passport_number = models.CharField(max_length=100, null=True, blank=True)
    nationality = models.CharField(max_length=100, null=True, blank=True)

    # Can store extracted complex data
    education_history = models.JSONField(default=list, blank=True)
    english_scores = models.JSONField(default=dict, blank=True)
    goals_and_preferences = models.TextField(blank=True)

    # Privacy and Trust
    ai_processing_consent = models.BooleanField(default=False)
    communication_consent = models.BooleanField(default=False)


    def __str__(self):
        return f"{self.first_name} {self.last_name}"


class Case(BaseModelWithUID):
    """
    Tracks a student's journey from enquiry to application.
    """

    STAGE_CHOICES = [
        ("ENQUIRY", "Enquiry"),
        ("DOCUMENTS_PENDING", "Documents Pending"),
        ("SHORTLISTED", "Shortlisted"),
        ("PREPARED", "Prepared"),
        ("SUBMITTED", "Submitted"),
        ("ENROLLED", "Enrolled"),
    ]
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name="cases")
    adviser = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="assigned_cases"
    )
    stage = models.CharField(max_length=50, choices=STAGE_CHOICES, default="ENQUIRY")


    def __str__(self):
        return f"Case for {self.student} - {self.get_stage_display()}"


# -----------------------------------------------------------------------------
# 2. Document Intelligence
# -----------------------------------------------------------------------------


class Document(BaseModelWithUID):
    """
    Stores uploaded files and preserves original copies.
    """

    DOCUMENT_TYPES = [
        ("PASSPORT", "Passport"),
        ("TRANSCRIPT", "Transcript"),
        ("O_LEVEL", "O Level"),
        ("A_LEVEL", "A Level"),
        ("ENGLISH_RESULT", "English Result"),
        ("POLICE_CLEARANCE", "Police Clearance"),
        ("FINANCIAL", "Financial"),
        ("OTHER", "Other"),
    ]
    DOCUMENT_CATEGORIES = [
        ("IDENTITY", "Identity"),
        ("ACADEMIC", "Academic"),
        ("ENGLISH", "English"),
        ("FINANCIAL", "Financial"),
        ("OTHER", "Other"),
    ]
    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("SUBMITTED", "Submitted"),
        ("APPROVED", "Approved"),
        ("REJECTED", "Rejected"),
    ]
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="documents")
    document_category = models.CharField(
        max_length=50, choices=DOCUMENT_CATEGORIES, default="OTHER"
    )
    document_type = models.CharField(
        max_length=50, choices=DOCUMENT_TYPES, default="OTHER"
    )
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="PENDING")

    original_file = models.FileField(upload_to="documents/originals/")
    renamed_file = models.FileField(
        upload_to="documents/renamed/", null=True, blank=True
    )

    quality_flags = models.JSONField(default=list, blank=True)
    is_duplicate = models.BooleanField(default=False)
    uploaded_at = models.DateTimeField(auto_now_add=True)


class ExtractedField(BaseModelWithUID):
    """
    Fields extracted from documents via AI.
    """

    CONFIDENCE_LEVELS = [
        ("HIGH", "High"),
        ("MEDIUM", "Medium"),
        ("LOW", "Low"),
    ]
    
    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name="extracted_fields"
    )

    field_name = models.CharField(max_length=255)  # e.g. 'date_of_birth', 'grades'
    extracted_value = models.TextField()
    confidence_score = models.CharField(max_length=20, choices=CONFIDENCE_LEVELS)

    is_verified = models.BooleanField(default=False)
    reviewer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)



# -----------------------------------------------------------------------------
# 3. Course Intelligence
# -----------------------------------------------------------------------------


class Course(BaseModelWithUID):
    """
    A controlled course catalogue.
    """

    provider_name = models.CharField(max_length=255)
    course_name = models.CharField(max_length=255)
    campus = models.CharField(max_length=255)
    duration = models.CharField(max_length=100)
    intake_dates = models.JSONField(default=list)
    tuition_fee = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    academic_requirements = models.TextField(blank=True)
    english_requirements = models.TextField(blank=True)
    prerequisite_requirements = models.TextField(blank=True)

    category = models.CharField(max_length=100)  # e.g., IT, Business
    source_url = models.URLField(max_length=500, blank=True)
    last_verification_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)


class Recommendation(BaseModelWithUID):
    """
    Explainable course recommendation.
    """

    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name="recommendations"
    )
    course = models.ForeignKey(Course, on_delete=models.CASCADE)

    rank = models.PositiveIntegerField()
    recommendation_notes = models.TextField(blank=True)
    risk_notes = models.TextField(blank=True)
    adviser_override_reason = models.TextField(blank=True)

    is_approved = models.BooleanField(default=False)


# -----------------------------------------------------------------------------
# 4. Preparation and Consultation
# -----------------------------------------------------------------------------


class Review(BaseModelWithUID):
    """
    For Human-in-the-loop approvals across the app.
    """

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="reviews")
    reviewer = models.ForeignKey(User, on_delete=models.CASCADE)

    item_type = models.CharField(
        max_length=100
    )  # e.g., 'Recommendation', 'Application Form'
    status = models.CharField(
        max_length=50,
        choices=[
            ("PENDING", "Pending"),
            ("APPROVED", "Approved"),
            ("REJECTED", "Rejected"),
        ],
    )
    comments = models.TextField(blank=True)
    reviewed_at = models.DateTimeField(auto_now_add=True)


class FormTemplate(BaseModelWithUID):
    """
    Application form automation mapping.
    """

    provider_name = models.CharField(max_length=255)
    form_name = models.CharField(max_length=255)
    template_file = models.FileField(upload_to="form_templates/")
    field_mapping = models.JSONField(default=dict)
    is_active = models.BooleanField(default=True)


class ApplicationDraft(BaseModelWithUID):
    """
    Generated application form draft for adviser review.
    """
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="application_drafts")
    template = models.ForeignKey(FormTemplate, on_delete=models.SET_NULL, null=True)
    
    draft_file = models.FileField(upload_to="application_drafts/")
    is_approved = models.BooleanField(default=False)
    adviser_notes = models.TextField(blank=True)



class Meeting(BaseModelWithUID):
    """
    Google Meet consultation sync.
    """

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="meetings")
    scheduled_time = models.DateTimeField()
    meet_link = models.URLField(max_length=500, blank=True)

    transcript = models.TextField(blank=True)
    ai_summary = models.TextField(blank=True)
    extracted_requirements = models.JSONField(default=dict, blank=True)



# -----------------------------------------------------------------------------
# 5. Follow-through (Tasks)
# -----------------------------------------------------------------------------


class Task(BaseModelWithUID):
    """
    Deadlines and missing document workflows.
    """

    STATUS_CHOICES = [
        ("PENDING", "Pending"),
        ("IN_PROGRESS", "In Progress"),
        ("WAITING_FOR_STUDENT", "Waiting for Student"),
        ("COMPLETED", "Completed"),
        ("OVERDUE", "Overdue"),
    ]
    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="tasks")
    assignee = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="assigned_tasks"
    )

    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=50, choices=STATUS_CHOICES, default="PENDING")


    def __str__(self):
        return f"{self.title} - {self.get_status_display()}"


# -----------------------------------------------------------------------------
# 6. Communication and Audit (Visibility and Trust)
# -----------------------------------------------------------------------------


class Communication(BaseModelWithUID):
    """
    Messages and notices linked to a case for the student portal.
    """

    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name="communications"
    )
    sender = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

    message_body = models.TextField()
    is_read = models.BooleanField(default=False)


class AuditLog(BaseModelWithUID):
    """
    Immutable audit trail for security and trust.
    Records uploads, edits, approvals, downloads, and sharing.
    """

    organisation = models.ForeignKey(
        Organisation, on_delete=models.CASCADE, related_name="audit_logs"
    )
    actor = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, related_name="actions"
    )

    action_type = models.CharField(
        max_length=100
    )  # e.g. 'DOCUMENT_UPLOAD', 'RECOMMENDATION_APPROVE'
    target_model = models.CharField(
        max_length=100
    )  # e.g. 'Document', 'Recommendation'
    target_id = models.UUIDField(null=True, blank=True)
    details = models.JSONField(default=dict, blank=True)

    ip_address = models.GenericIPAddressField(null=True, blank=True)
