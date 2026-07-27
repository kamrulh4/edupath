"""Models for the course catalogue and explainable recommendations."""

from django.db import models

from common.models import BaseModelWithUID
from core.models import Organisation
from students.models import Case


class Course(BaseModelWithUID):
    """A controlled course catalogue entry, curated per organisation."""

    organisation = models.ForeignKey(
        Organisation, on_delete=models.CASCADE, related_name="courses"
    )

    provider_name = models.CharField(max_length=255)
    course_name = models.CharField(max_length=255)
    campus = models.CharField(max_length=255, blank=True)
    duration = models.CharField(max_length=100, blank=True)
    intake_dates = models.JSONField(default=list, blank=True)
    tuition_fee = models.DecimalField(
        max_digits=12, decimal_places=2, null=True, blank=True
    )

    academic_requirements = models.TextField(blank=True)
    english_requirements = models.TextField(blank=True)
    prerequisite_requirements = models.TextField(blank=True)

    category = models.CharField(
        max_length=100, blank=True
    )  # e.g. IT, Business, Nursing
    source_url = models.URLField(max_length=500, blank=True)
    last_verification_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    # Transparency - partner-provider or commission relationships must be
    # visible to the adviser alongside the recommendation, not hidden.
    is_partner_provider = models.BooleanField(default=False)
    commission_notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.course_name} @ {self.provider_name}"


class Recommendation(BaseModelWithUID):
    """Explainable course recommendation for a case.

    Advisers create these manually for now - an automated scoring engine
    (using OrganisationSettings.scoring_weights) is a separate follow-up.
    """

    case = models.ForeignKey(
        Case, on_delete=models.CASCADE, related_name="recommendations"
    )
    course = models.ForeignKey(
        Course, on_delete=models.CASCADE, related_name="recommendations"
    )

    rank = models.PositiveIntegerField()

    # Weighted scoring - the overall match score plus a per-factor
    # breakdown so an adviser can see exactly how the rank was produced.
    score = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)
    score_breakdown = models.JSONField(default=dict, blank=True)
    unmet_requirements = models.JSONField(default=list, blank=True)

    recommendation_notes = models.TextField(blank=True)
    risk_notes = models.TextField(blank=True)
    adviser_override_reason = models.TextField(blank=True)

    # Denormalized for fast queries (e.g. student portal "approved courses"
    # list); the authoritative approval record/audit trail is a later concern.
    is_approved = models.BooleanField(default=False)

    def __str__(self):
        return f"#{self.rank} {self.course} for {self.case}"
