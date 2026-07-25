"""Models for uploaded student documents and AI-extracted fields."""

from django.db import models

from common.models import BaseModelWithUID
from core.models import User
from documents.choices import (
    ConfidenceLevel,
    DocumentCategory,
    DocumentStatus,
    DocumentType,
)
from students.models import Case


class Document(BaseModelWithUID):
    """Stores uploaded files and preserves original copies."""

    case = models.ForeignKey(Case, on_delete=models.CASCADE, related_name="documents")

    document_category = models.CharField(
        max_length=50, choices=DocumentCategory.choices, default=DocumentCategory.OTHER
    )
    document_type = models.CharField(
        max_length=50, choices=DocumentType.choices, default=DocumentType.OTHER
    )
    doc_status = models.CharField(
        max_length=50, choices=DocumentStatus.choices, default=DocumentStatus.PENDING
    )

    original_file = models.FileField(upload_to="documents/originals/")
    renamed_file = models.FileField(
        upload_to="documents/renamed/", null=True, blank=True
    )
    file_hash = models.CharField(max_length=64, db_index=True, blank=True)

    quality_flags = models.JSONField(default=list, blank=True)
    is_duplicate = models.BooleanField(default=False)

    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="uploaded_documents",
    )

    def __str__(self):
        return f"{self.get_document_type_display()} for {self.case}"


class ExtractedField(BaseModelWithUID):
    """Fields extracted from documents, either by AI or manual entry."""

    document = models.ForeignKey(
        Document, on_delete=models.CASCADE, related_name="extracted_fields"
    )

    field_name = models.CharField(max_length=255)  # e.g. 'date_of_birth', 'grades'
    extracted_value = models.TextField()
    confidence_level = models.CharField(max_length=20, choices=ConfidenceLevel.choices)
    confidence_value = models.DecimalField(
        max_digits=4, decimal_places=3, null=True, blank=True
    )  # raw 0-1 score from the extraction model, when available

    is_verified = models.BooleanField(default=False)
    reviewer = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):
        return f"{self.field_name}={self.extracted_value} ({self.document})"
