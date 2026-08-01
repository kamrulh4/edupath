import zipfile

from django.core.files.base import ContentFile
from django.core.files.uploadedfile import SimpleUploadedFile

from core.audit import log_action
from students.choices import DOCUMENT_TYPE_TO_CATEGORY, DocumentType
from students.models import Document
from students.tasks import extract_document_fields, extract_documents_bulk
from students.utils import build_renamed_filename, hash_file

# Skip the junk entries macOS/most zip tools add automatically.
IGNORED_ZIP_ENTRY_PREFIXES = ("__MACOSX/",)
IGNORED_ZIP_ENTRY_NAMES = {".DS_Store"}


def create_document(
    request,
    case,
    uploaded_file,
    document_type=DocumentType.OTHER,
    document_category=None,
    enqueue_extraction=True,
):
    """Shared ingest pipeline: hash + dedupe, save the original, build the
    renamed copy, log the action and (for non-duplicates) enqueue AI
    extraction. Used by the single-file serializer and the bulk upload views.

    enqueue_extraction=False lets a caller batch several documents into one
    Celery message instead (see create_documents_bulk) - firing one .delay()
    per file in a tight loop proved unreliable against a remote broker."""

    if document_category is None:
        document_category = DOCUMENT_TYPE_TO_CATEGORY.get(
            document_type, Document.document_category.field.default
        )

    file_hash = hash_file(uploaded_file)
    is_duplicate = Document.objects.filter(case=case, file_hash=file_hash).exists()

    document = Document.objects.create(
        case=case,
        document_type=document_type,
        document_category=document_category,
        uploaded_by=request.user,
        file_hash=file_hash,
        is_duplicate=is_duplicate,
        original_file=uploaded_file,
    )

    renamed_name = build_renamed_filename(case, document_type, uploaded_file.name)
    uploaded_file.seek(0)
    document.renamed_file.save(
        renamed_name, ContentFile(uploaded_file.read()), save=True
    )

    log_action(
        request,
        "DOCUMENT_UPLOAD",
        document,
        details={"document_type": document_type, "is_duplicate": is_duplicate},
    )

    if not is_duplicate and enqueue_extraction:
        extract_document_fields.delay(document.id)

    return document


def _iter_zip_files(zip_file):
    with zipfile.ZipFile(zip_file) as archive:
        for info in archive.infolist():
            if info.is_dir():
                continue
            name = info.filename
            base_name = name.rsplit("/", 1)[-1]
            if (
                name.startswith(IGNORED_ZIP_ENTRY_PREFIXES)
                or base_name in IGNORED_ZIP_ENTRY_NAMES
            ):
                continue
            with archive.open(info) as entry:
                content = entry.read()
            yield SimpleUploadedFile(base_name, content)


def create_documents_bulk(request, case, files=None, zip_file=None):
    """Every file (or every file inside the zip) is created with
    document_type=OTHER so the AI classification pipeline identifies each
    one individually - bulk uploads are rarely all the same document type."""

    source_files = list(files or [])
    if zip_file is not None:
        try:
            source_files.extend(_iter_zip_files(zip_file))
        except zipfile.BadZipFile as exc:
            raise ValueError(f"Could not read the zip file: {exc}") from exc

    created = []
    errors = []
    for uploaded_file in source_files:
        try:
            document = create_document(
                request, case, uploaded_file, enqueue_extraction=False
            )
        except Exception as exc:
            errors.append({"filename": uploaded_file.name, "error": str(exc)})
            continue
        created.append(document)

    non_duplicate_ids = [doc.id for doc in created if not doc.is_duplicate]
    if non_duplicate_ids:
        extract_documents_bulk.delay(non_duplicate_ids)

    return created, errors
