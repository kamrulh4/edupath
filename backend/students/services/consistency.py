from students.models import Document
from students.utils import add_quality_flag

# Different document types name the same concept differently (a passport
# says "date_of_birth", a bank statement might not have it at all) - these
# are the field_name aliases we treat as the same underlying fact.
IDENTITY_FIELD_GROUPS = {
    "DATE_OF_BIRTH": {"date_of_birth", "dob"},
    "PASSPORT_NUMBER": {"passport_number"},
    "NATIONALITY": {"nationality"},
}

NAME_FIELD_NAMES = {
    "full_name",
    "given_names",
    "surname",
    "candidate_name",
    "student_name",
    "account_holder_name",
    "name",
    "first_name",
    "last_name",
}


def _normalize(value: str) -> str:
    return " ".join(value.strip().upper().split())


def _name_tokens(fields) -> set[str]:
    tokens: set[str] = set()
    for field in fields:
        if (
            field.field_name.lower() in NAME_FIELD_NAMES
            and field.extracted_value.strip()
        ):
            tokens.update(_normalize(field.extracted_value).split())
    # Drop single-letter tokens (initials) - too easy to coincidentally match.
    return {t for t in tokens if len(t) > 1}


def check_cross_document_consistency(document):
    """Flags this document, and any sibling document in the same case, when
    they disagree on identity facts (name, DOB, passport number,
    nationality). Advisory only - the adviser makes the final call, nothing
    here blocks the document."""

    own_fields = list(document.extracted_fields.all())
    if not own_fields:
        return

    siblings = list(
        Document.objects.filter(case_id=document.case_id)
        .exclude(id=document.id)
        .prefetch_related("extracted_fields")
    )
    if not siblings:
        return

    flags_for_self: set[str] = set()

    for concept, aliases in IDENTITY_FIELD_GROUPS.items():
        own_values = {
            _normalize(f.extracted_value)
            for f in own_fields
            if f.field_name.lower() in aliases and f.extracted_value.strip()
        }
        if not own_values:
            continue
        for sibling in siblings:
            sibling_values = {
                _normalize(f.extracted_value)
                for f in sibling.extracted_fields.all()
                if f.field_name.lower() in aliases and f.extracted_value.strip()
            }
            if sibling_values and not (own_values & sibling_values):
                flags_for_self.add(f"{concept}_MISMATCH")
                add_quality_flag(sibling, f"{concept}_MISMATCH")

    own_name_tokens = _name_tokens(own_fields)
    if own_name_tokens:
        for sibling in siblings:
            sibling_name_tokens = _name_tokens(sibling.extracted_fields.all())
            if sibling_name_tokens and not (own_name_tokens & sibling_name_tokens):
                flags_for_self.add("NAME_MISMATCH")
                add_quality_flag(sibling, "NAME_MISMATCH")

    for flag in flags_for_self:
        add_quality_flag(document, flag)
