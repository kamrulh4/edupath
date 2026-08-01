import logging

from celery import shared_task
from django.core.files.base import ContentFile
from django.db import transaction

from students.choices import DOCUMENT_TYPE_TO_CATEGORY, DocumentStatus, DocumentType
from students.models import Document, ExtractedField
from students.services.document_extraction import (
    DocumentExtractionError,
    UnsupportedDocumentTypeError,
    classify_and_extract_fields,
    extract_fields_from_document,
)
from students.utils import build_renamed_filename

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

    needs_classification = document.document_type == DocumentType.OTHER

    try:
        if needs_classification:
            result = classify_and_extract_fields(document)
            detected_type = result["document_type"]
            fields = result["fields"]
        else:
            detected_type = None
            fields = extract_fields_from_document(document)
    except UnsupportedDocumentTypeError as exc:
        logger.warning("Unsupported file type for document %s: %s", document_id, exc)
        _flag_extraction_failure(document, "AI_UNSUPPORTED_FILE_TYPE")
        return
    except DocumentExtractionError as exc:
        logger.warning("Gemini extraction failed for document %s: %s", document_id, exc)
        if self.request.retries < self.max_retries:
            raise self.retry(exc=exc)
        _flag_extraction_failure(document, "AI_EXTRACTION_FAILED")
        return

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


def _flag_extraction_failure(document, flag):
    if flag not in document.quality_flags:
        document.quality_flags = [*document.quality_flags, flag]
        document.save(update_fields=["quality_flags", "updated_at"])
