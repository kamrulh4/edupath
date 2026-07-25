from django.db.models import TextChoices


class CaseStage(TextChoices):
    ENQUIRY = "ENQUIRY", "Enquiry"
    DOCUMENTS_PENDING = "DOCUMENTS_PENDING", "Documents Pending"
    SHORTLISTED = "SHORTLISTED", "Shortlisted"
    PREPARED = "PREPARED", "Prepared"
    SUBMITTED = "SUBMITTED", "Submitted"
    ENROLLED = "ENROLLED", "Enrolled"
