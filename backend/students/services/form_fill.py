import io

from pypdf import PdfReader, PdfWriter
from pypdf.errors import PdfReadError


class FormFillError(Exception):
    pass


def _resolve_student_value(student, attr: str) -> str:
    value = getattr(student, attr, None)
    if value is None:
        return ""
    return str(value)


def fill_application_form(template, student) -> tuple[bytes, list[str]]:
    """Fills the template's PDF form fields using field_mapping (a dict of
    PDF field name -> Student attribute name, e.g. {"Full Name":
    "first_name"}). Returns (filled_pdf_bytes, missing_fields), where
    missing_fields are form fields that ended up blank - either because
    they have no mapping configured or the mapped student attribute is
    empty. Only works against PDFs that actually have fillable form fields
    (AcroForm) - most official application PDFs do."""

    template.template_file.open("rb")
    try:
        raw = template.template_file.read()
    finally:
        template.template_file.close()

    try:
        reader = PdfReader(io.BytesIO(raw))
    except PdfReadError as exc:
        raise FormFillError(f"Could not read the template PDF: {exc}") from exc

    form_fields = reader.get_fields()
    if not form_fields:
        raise FormFillError(
            "This template PDF has no fillable form fields - auto-fill isn't "
            "available for it. Upload a fillable PDF form, or add the draft "
            "manually instead."
        )

    field_mapping = template.field_mapping or {}
    values = {}
    missing_fields = []

    for pdf_field_name in form_fields:
        student_attr = field_mapping.get(pdf_field_name)
        value = _resolve_student_value(student, student_attr) if student_attr else ""
        if value:
            values[pdf_field_name] = value
        else:
            missing_fields.append(pdf_field_name)

    writer = PdfWriter()
    writer.append(reader)
    if writer.get_fields():
        writer.set_need_appearances_writer(True)
        for page in writer.pages:
            writer.update_page_form_field_values(page, values)

    output = io.BytesIO()
    writer.write(output)
    return output.getvalue(), missing_fields
