import logging

from dateutil import parser as date_parser

from students.choices import DocumentType

logger = logging.getLogger(__name__)

# Direct scalar fields on Student that a verified PASSPORT field can update.
PASSPORT_FIELD_TO_STUDENT_ATTR = {
    "date_of_birth": "date_of_birth",
    "dob": "date_of_birth",
    "passport_number": "passport_number",
    "nationality": "nationality",
}

ACADEMIC_TYPES = {DocumentType.TRANSCRIPT, DocumentType.O_LEVEL, DocumentType.A_LEVEL}


def sync_verified_field_to_profile(field):
    """Projects a verified extracted field onto the student's reusable
    profile, so course recommendations and application drafts can reuse it
    without re-reading documents. Only verified fields are synced - AI
    output alone never touches the canonical profile."""

    document = field.document
    student = document.case.student
    document_type = document.document_type
    field_name = field.field_name.lower()
    value = field.extracted_value.strip()
    if not value:
        return

    if document_type == DocumentType.PASSPORT:
        _sync_passport_field(student, field_name, value)
    elif document_type == DocumentType.ENGLISH_RESULT:
        _sync_english_field(student, document, field_name, value)
    elif document_type in ACADEMIC_TYPES:
        _sync_academic_field(student, document, field_name, value)


def _sync_passport_field(student, field_name, value):
    attr = PASSPORT_FIELD_TO_STUDENT_ATTR.get(field_name)
    if not attr:
        return

    if attr == "date_of_birth":
        parsed = _parse_date(value)
        if parsed is None or student.date_of_birth == parsed:
            return
        student.date_of_birth = parsed
        student.save(update_fields=["date_of_birth", "updated_at"])
    elif getattr(student, attr) != value:
        setattr(student, attr, value)
        student.save(update_fields=[attr, "updated_at"])


def _sync_english_field(student, document, field_name, value):
    scores = dict(student.english_scores or {})
    scores[field_name] = value
    scores["_source_document"] = str(document.uid)
    student.english_scores = scores
    student.save(update_fields=["english_scores", "updated_at"])


def _sync_academic_field(student, document, field_name, value):
    history = list(student.education_history or [])
    entry = next(
        (item for item in history if item.get("document") == str(document.uid)), None
    )
    if entry is None:
        entry = {
            "document": str(document.uid),
            "document_type": document.document_type,
            "fields": {},
        }
        history.append(entry)
    entry["fields"][field_name] = value
    student.education_history = history
    student.save(update_fields=["education_history", "updated_at"])


def _parse_date(value):
    try:
        return date_parser.parse(value, fuzzy=True).date()
    except (ValueError, OverflowError):
        logger.warning("Could not parse date value for profile sync: %r", value)
        return None
