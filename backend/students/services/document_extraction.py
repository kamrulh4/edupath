import io
import json
import mimetypes

import docx
from django.conf import settings
from google import genai
from google.genai import types

from students.choices import ConfidenceLevel, DocumentType

# Gemini's generateContent API understands these natively (PDF pages and
# images are read directly - no separate OCR step needed).
NATIVE_MIME_TYPES = {
    "application/pdf",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/heic",
    "image/heif",
}

DOCX_MIME_TYPE = (
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
)

DOCUMENT_TYPE_HINTS = {
    DocumentType.PASSPORT: (
        "full name, passport number, nationality, date of birth, place of birth, "
        "sex, date of issue, date of expiry, issuing authority"
    ),
    DocumentType.TRANSCRIPT: (
        "institution name, student name, program or degree name, subjects with "
        "grades, overall GPA or result, graduation or completion date"
    ),
    DocumentType.O_LEVEL: (
        "institution name, student name, examination board, subjects with grades, "
        "year of examination"
    ),
    DocumentType.A_LEVEL: (
        "institution name, student name, examination board, subjects with grades, "
        "year of examination"
    ),
    DocumentType.ENGLISH_RESULT: (
        "test name (IELTS, TOEFL, PTE, etc.), candidate name, test date, overall "
        "score/band, listening score, reading score, writing score, speaking score"
    ),
    DocumentType.POLICE_CLEARANCE: (
        "full name, issuing authority, certificate number, issue date, result or status"
    ),
    DocumentType.FINANCIAL: (
        "account holder name, bank name, statement date, closing balance, currency"
    ),
    DocumentType.OTHER: (
        "any clearly identifiable structured information relevant to a "
        "study-abroad application"
    ),
}

RESPONSE_SCHEMA = types.Schema(
    type=types.Type.OBJECT,
    properties={
        "fields": types.Schema(
            type=types.Type.ARRAY,
            items=types.Schema(
                type=types.Type.OBJECT,
                properties={
                    "field_name": types.Schema(type=types.Type.STRING),
                    "extracted_value": types.Schema(type=types.Type.STRING),
                    "confidence_level": types.Schema(
                        type=types.Type.STRING,
                        enum=[level.value for level in ConfidenceLevel],
                    ),
                },
                required=["field_name", "extracted_value", "confidence_level"],
            ),
        )
    },
    required=["fields"],
)

PROMPT_TEMPLATE = """You are extracting structured data from a "{doc_label}" document \
for an international education consultancy's case management system.

Look for these fields if present: {hints}.

Return every field you can clearly read as a separate entry with:
- field_name: a short snake_case name (e.g. "passport_number", "date_of_birth")
- extracted_value: ONLY the raw value copied exactly as it appears on the document \
(e.g. "A+", "15 July 2023") - never a description, label, or explanation of the field
- confidence_level: HIGH if clearly legible and unambiguous, MEDIUM if legible but \
you are inferring formatting or context, LOW if the text is unclear, blurry, or you \
are guessing

Do not invent values that are not present in the document. Skip fields that are not \
present rather than guessing.
"""


class DocumentExtractionError(Exception):
    pass


class UnsupportedDocumentTypeError(DocumentExtractionError):
    """Raised for file types we can't meaningfully send to Gemini - not worth
    retrying, unlike a transient API error."""


def _extract_docx_text(file_bytes: bytes) -> str:
    document = docx.Document(io.BytesIO(file_bytes))
    return "\n".join(p.text for p in document.paragraphs if p.text.strip())


def extract_fields_from_document(document) -> list[dict]:
    if not settings.GEMINI_API_KEY:
        raise DocumentExtractionError("GEMINI_API_KEY is not configured.")

    source_file = document.renamed_file or document.original_file
    source_file.open("rb")
    try:
        file_bytes = source_file.read()
    finally:
        source_file.close()

    mime_type, _ = mimetypes.guess_type(source_file.name)
    mime_type = mime_type or "application/octet-stream"

    doc_label = DocumentType(document.document_type).label
    hints = DOCUMENT_TYPE_HINTS.get(
        document.document_type, DOCUMENT_TYPE_HINTS[DocumentType.OTHER]
    )
    prompt = PROMPT_TEMPLATE.format(doc_label=doc_label, hints=hints)

    if mime_type in NATIVE_MIME_TYPES:
        content_part = types.Part.from_bytes(data=file_bytes, mime_type=mime_type)
    elif mime_type == DOCX_MIME_TYPE:
        try:
            text = _extract_docx_text(file_bytes)
        except Exception as exc:
            raise UnsupportedDocumentTypeError(
                f"Could not read .docx file: {exc}"
            ) from exc
        if not text:
            raise UnsupportedDocumentTypeError("The .docx file has no readable text.")
        content_part = f"Document text (extracted from a Word file):\n\n{text}"
    else:
        raise UnsupportedDocumentTypeError(
            f"Unsupported file type for AI extraction: {mime_type}"
        )

    client = genai.Client(api_key=settings.GEMINI_API_KEY)

    try:
        response = client.models.generate_content(
            model=settings.GEMINI_EXTRACTION_MODEL,
            contents=[content_part, prompt],
            config=types.GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=RESPONSE_SCHEMA,
            ),
        )
    except Exception as exc:
        raise DocumentExtractionError(str(exc)) from exc

    try:
        payload = json.loads(response.text)
    except (TypeError, ValueError) as exc:
        raise DocumentExtractionError("Gemini returned a non-JSON response.") from exc

    return payload.get("fields", [])
