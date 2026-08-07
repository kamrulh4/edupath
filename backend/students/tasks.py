import logging
from datetime import timedelta

from celery import shared_task
from django.core.files.base import ContentFile
from django.core.mail import send_mail
from django.db import transaction
from django.utils import timezone

from students.choices import (
    DOCUMENT_TYPE_TO_CATEGORY,
    DocumentStatus,
    DocumentType,
    TaskStatus,
)
from students.models import Document, ExtractedField, Task
from students.services.consistency import check_cross_document_consistency
from students.services.document_extraction import (
    DocumentExtractionError,
    UnsupportedDocumentTypeError,
    classify_and_extract_fields,
    extract_fields_from_document,
)
from students.utils import add_quality_flag, build_renamed_filename

logger = logging.getLogger(__name__)

OPEN_TASK_STATUSES = [
    TaskStatus.PENDING,
    TaskStatus.IN_PROGRESS,
    TaskStatus.WAITING_FOR_STUDENT,
]

# How many days before a deadline to send the reminder email.
REMINDER_LEAD_DAYS = 2


def _extract_and_apply(document):
    """Runs classification/extraction for one document and applies the
    result. Raises DocumentExtractionError (or the more specific
    UnsupportedDocumentTypeError) on failure - callers decide whether to
    retry or flag it."""

    needs_classification = document.document_type == DocumentType.OTHER

    if needs_classification:
        result = classify_and_extract_fields(document)
        detected_type = result["document_type"]
        # Gemini's structured output is schema-constrained but not
        # guaranteed - never trust an external value enough to feed it
        # straight into DocumentType(...), which raises ValueError on
        # anything unrecognized and would crash the whole task.
        if detected_type not in DocumentType.values:
            logger.warning(
                "classify_and_extract_fields returned an unrecognized "
                "document_type %r for document %s - leaving unclassified.",
                detected_type,
                document.id,
            )
            detected_type = None
    else:
        detected_type = None
        result = extract_fields_from_document(document)

    fields = result["fields"]
    quality_flags = result["quality_flags"]

    with transaction.atomic():
        if detected_type and detected_type != document.document_type:
            _reclassify_document(document, detected_type)

        ExtractedField.objects.filter(document=document).delete()
        ExtractedField.objects.bulk_create(
            ExtractedField(
                document=document,
                field_name=field["field_name"],
                extracted_value=field["extracted_value"],
                confidence_level=field["confidence_level"],
            )
            for field in fields
            if field.get("field_name") and field.get("extracted_value")
        )

        if document.doc_status == DocumentStatus.PENDING:
            document.doc_status = DocumentStatus.SUBMITTED
            document.save(update_fields=["doc_status", "updated_at"])

    for issue in quality_flags:
        add_quality_flag(document, f"AI_QUALITY_{issue}")

    check_cross_document_consistency(document)


@shared_task(bind=True, max_retries=2, default_retry_delay=30)
def extract_document_fields(self, document_id):
    try:
        document = Document.objects.get(id=document_id)
    except Document.DoesNotExist:
        logger.warning(
            "extract_document_fields: document %s no longer exists", document_id
        )
        return

    try:
        _extract_and_apply(document)
    except UnsupportedDocumentTypeError as exc:
        logger.warning("Unsupported file type for document %s: %s", document_id, exc)
        add_quality_flag(document, "AI_UNSUPPORTED_FILE_TYPE")
    except DocumentExtractionError as exc:
        logger.warning("Gemini extraction failed for document %s: %s", document_id, exc)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        add_quality_flag(document, "AI_EXTRACTION_FAILED")


@shared_task
def extract_documents_bulk(document_ids):
    """Processes a batch of documents inside a single task execution, rather
    than firing one .delay() per file - a burst of many rapid .delay() calls
    against the remote broker proved unreliable (some messages never
    arrived), so bulk uploads are enqueued as one message instead."""

    for document_id in document_ids:
        try:
            document = Document.objects.get(id=document_id)
        except Document.DoesNotExist:
            continue

        try:
            _extract_and_apply(document)
        except UnsupportedDocumentTypeError as exc:
            logger.warning(
                "Unsupported file type for document %s: %s", document_id, exc
            )
            add_quality_flag(document, "AI_UNSUPPORTED_FILE_TYPE")
        except DocumentExtractionError as exc:
            logger.warning(
                "Gemini extraction failed for document %s: %s", document_id, exc
            )
            add_quality_flag(document, "AI_EXTRACTION_FAILED")


def _reclassify_document(document, detected_type):
    """Applies an AI-detected document_type: updates the category and
    re-renames the file to match, since the naming convention encodes type."""

    document.document_type = detected_type
    document.document_category = DOCUMENT_TYPE_TO_CATEGORY.get(
        detected_type, Document.document_category.field.default
    )

    old_renamed_name = document.renamed_file.name if document.renamed_file else None
    new_name = build_renamed_filename(
        document.case, detected_type, document.original_file.name
    )
    document.original_file.open("rb")
    try:
        content = document.original_file.read()
    finally:
        document.original_file.close()
    document.renamed_file.save(new_name, ContentFile(content), save=False)

    if old_renamed_name and old_renamed_name != document.renamed_file.name:
        document.renamed_file.storage.delete(old_renamed_name)

    document.save(
        update_fields=[
            "document_type",
            "document_category",
            "renamed_file",
            "updated_at",
        ]
    )


@shared_task
def flag_overdue_tasks():
    """Runs daily - anything still open past its due date becomes OVERDUE,
    which is what feeds the dashboard's adviser-workload overdue count."""

    updated = Task.objects.filter(
        due_date__lt=timezone.now().date(),
        task_status__in=OPEN_TASK_STATUSES,
    ).update(task_status=TaskStatus.OVERDUE)
    if updated:
        logger.info("flag_overdue_tasks: marked %s task(s) overdue", updated)


@shared_task
def send_deadline_reminders():
    """Runs daily - emails whoever's assigned (staff) and the student (only
    if they've granted communication_consent) once, REMINDER_LEAD_DAYS
    before a task's due date. Silently does nothing per-task if no email
    backend is configured yet (see EMAIL_BACKEND in settings)."""

    # <=, not ==: an exact-date match means a single missed Beat run (a
    # deploy, a restart, the broker being down - all of which have actually
    # happened during this project) permanently skips that task's reminder,
    # since tomorrow's target_date can never match a fixed due_date again.
    target_date = timezone.now().date() + timedelta(days=REMINDER_LEAD_DAYS)
    tasks = Task.objects.filter(
        due_date__lte=target_date,
        task_status__in=OPEN_TASK_STATUSES,
        reminder_sent_at__isnull=True,
    ).select_related("assignee", "case__student")

    for task in tasks:
        student = task.case.student
        recipients = []
        if task.assignee and task.assignee.email:
            recipients.append(task.assignee.email)
        if student.communication_consent and student.email:
            recipients.append(student.email)

        # Nobody to notify yet (no assignee, no consent) - leave
        # reminder_sent_at unset so this task is retried on a later run
        # instead of being silently and permanently skipped.
        if not recipients:
            continue

        try:
            send_mail(
                subject=f'Reminder: "{task.title}" due {task.due_date}',
                message=(
                    f'This is a reminder that "{task.title}" for '
                    f"{student.first_name} {student.last_name} is due on "
                    f"{task.due_date}."
                ),
                from_email=None,
                recipient_list=recipients,
                fail_silently=True,
            )
        except Exception:
            logger.exception(
                "send_deadline_reminders: failed to email for task %s", task.id
            )
            continue

        task.reminder_sent_at = timezone.now()
        task.save(update_fields=["reminder_sent_at"])
