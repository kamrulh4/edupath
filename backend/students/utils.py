import hashlib
import os

from django.utils import timezone

from students.choices import DocumentType


def get_student_media_path_prefix(instance, filename):
    return os.path.join("students", str(instance.uid), filename)


def hash_file(uploaded_file) -> str:
    uploaded_file.seek(0)
    digest = hashlib.sha256()
    for chunk in uploaded_file.chunks():
        digest.update(chunk)
    uploaded_file.seek(0)
    return digest.hexdigest()


def build_renamed_filename(case, document_type: str, original_name: str) -> str:
    """StudentName_DocumentType_Year.ext, per the product's naming convention."""

    student = case.student
    student_name = (
        f"{student.first_name}{student.last_name}".replace(" ", "") or "Student"
    )
    type_label = DocumentType(document_type).label.replace(" ", "")
    year = timezone.now().year
    ext = os.path.splitext(original_name)[1]
    return f"{student_name}_{type_label}_{year}{ext}"


def add_quality_flag(document, flag: str):
    if flag not in document.quality_flags:
        document.quality_flags = [*document.quality_flags, flag]
        document.save(update_fields=["quality_flags", "updated_at"])


CONSENT_FIELDS = (
    ("ai_processing_consent", "ai_processing_consent_at"),
    ("communication_consent", "communication_consent_at"),
)


def apply_consent_timestamps(instance, validated_data):
    """The *_consent_at timestamps are server-controlled, never client-
    supplied - set automatically the moment a consent flag flips to True,
    and cleared if it's revoked. Call from a serializer's update() before
    saving."""

    now = timezone.now()
    for flag_field, ts_field in CONSENT_FIELDS:
        if flag_field in validated_data:
            new_value = validated_data[flag_field]
            old_value = getattr(instance, flag_field)
            if new_value and not old_value:
                validated_data[ts_field] = now
            elif not new_value:
                validated_data[ts_field] = None
    return validated_data
