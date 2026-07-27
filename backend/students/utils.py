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
