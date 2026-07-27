from django.db.models import TextChoices


class CaseStage(TextChoices):
    ENQUIRY = "ENQUIRY", "Enquiry"
    DOCUMENTS_PENDING = "DOCUMENTS_PENDING", "Documents Pending"
    SHORTLISTED = "SHORTLISTED", "Shortlisted"
    PREPARED = "PREPARED", "Prepared"
    SUBMITTED = "SUBMITTED", "Submitted"
    ENROLLED = "ENROLLED", "Enrolled"


class DocumentType(TextChoices):
    PASSPORT = "PASSPORT", "Passport"
    TRANSCRIPT = "TRANSCRIPT", "Transcript"
    O_LEVEL = "O_LEVEL", "O Level"
    A_LEVEL = "A_LEVEL", "A Level"
    ENGLISH_RESULT = "ENGLISH_RESULT", "English Result"
    POLICE_CLEARANCE = "POLICE_CLEARANCE", "Police Clearance"
    FINANCIAL = "FINANCIAL", "Financial"
    OTHER = "OTHER", "Other"


class DocumentCategory(TextChoices):
    IDENTITY = "IDENTITY", "Identity"
    ACADEMIC = "ACADEMIC", "Academic"
    ENGLISH = "ENGLISH", "English"
    FINANCIAL = "FINANCIAL", "Financial"
    OTHER = "OTHER", "Other"


class DocumentStatus(TextChoices):
    PENDING = "PENDING", "Pending"
    SUBMITTED = "SUBMITTED", "Submitted"
    APPROVED = "APPROVED", "Approved"
    REJECTED = "REJECTED", "Rejected"


class ConfidenceLevel(TextChoices):
    HIGH = "HIGH", "High"
    MEDIUM = "MEDIUM", "Medium"
    LOW = "LOW", "Low"


class TaskStatus(TextChoices):
    PENDING = "PENDING", "Pending"
    IN_PROGRESS = "IN_PROGRESS", "In Progress"
    WAITING_FOR_STUDENT = "WAITING_FOR_STUDENT", "Waiting for Student"
    COMPLETED = "COMPLETED", "Completed"
    OVERDUE = "OVERDUE", "Overdue"


# A document type implies a default category - used to auto-set
# document_category when only document_type is provided at upload time.
DOCUMENT_TYPE_TO_CATEGORY = {
    DocumentType.PASSPORT: DocumentCategory.IDENTITY,
    DocumentType.POLICE_CLEARANCE: DocumentCategory.IDENTITY,
    DocumentType.TRANSCRIPT: DocumentCategory.ACADEMIC,
    DocumentType.O_LEVEL: DocumentCategory.ACADEMIC,
    DocumentType.A_LEVEL: DocumentCategory.ACADEMIC,
    DocumentType.ENGLISH_RESULT: DocumentCategory.ENGLISH,
    DocumentType.FINANCIAL: DocumentCategory.FINANCIAL,
    DocumentType.OTHER: DocumentCategory.OTHER,
}
