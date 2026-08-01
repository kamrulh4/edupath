import logging

from celery import shared_task
from django.db import transaction

from students.choices import DocumentStatus
from students.models import Document, ExtractedField
from students.services.document_extraction import (
    DocumentExtractionError,
    extract_fields_from_document,
)

logger = logging.getLogger(__name__)


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
        fields = extract_fields_from_document(document)
    except DocumentExtractionError as exc:
        logger.warning(
            "Gemini extraction failed for document %s: %s", document_id, exc
        )
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        _flag_extraction_failure(document)
        return

    with transaction.atomic():
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


def _flag_extraction_failure(document):
    if "AI_EXTRACTION_FAILED" not in document.quality_flags:
        document.quality_flags = [*document.quality_flags, "AI_EXTRACTION_FAILED"]
        document.save(update_fields=["quality_flags", "updated_at"])
