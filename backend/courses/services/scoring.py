import re
from datetime import date, datetime

from courses.models import Course, Recommendation

# Sums to 100 - an org can override any subset via
# OrganisationSettings.scoring_weights (missing keys keep the default).
DEFAULT_SCORING_WEIGHTS = {
    "english": 30,
    "academic": 25,
    "budget": 15,
    "location": 15,
    "intake": 15,
}

STALE_VERIFICATION_DAYS = 180
RECOMMENDATION_LIMIT = 10


def _first_number(text) -> float | None:
    match = re.search(r"(\d+(?:\.\d+)?)", text or "")
    return float(match.group(1)) if match else None


def _parse_intake_date(value):
    if not value:
        return None
    for fmt in ("%Y-%m-%d", "%d %B %Y", "%B %Y"):
        try:
            return datetime.strptime(str(value), fmt).date()
        except ValueError:
            continue
    return None


def _sanitize_weights(scoring_weights) -> dict:
    """OrganisationSettings.scoring_weights is an unvalidated JSONField an
    org admin can edit directly via the API - drop anything that isn't a
    plain non-negative number so a bad value (a string, a negative, null)
    can't crash scoring for every course in the case."""

    if not isinstance(scoring_weights, dict):
        return {}
    clean = {}
    for key, value in scoring_weights.items():
        if isinstance(value, bool):
            continue
        if isinstance(value, (int, float)) and value >= 0:
            clean[key] = value
    return clean


def score_course_for_student(student, course, scoring_weights=None):
    """Returns (score, score_breakdown, unmet_requirements, recommendation_notes,
    risk_notes) for one course against one student - see DEFAULT_SCORING_WEIGHTS
    for the factors compared. Hard requirements (English/academic evidence
    missing) go into unmet_requirements; soft mismatches (budget, location,
    unclear intake, stale data) go into risk_notes instead of blocking the
    course outright - the adviser makes the final call either way."""

    factors = {}
    unmet = []
    risks = []
    positives = []

    # English - hard requirement if the course states a numeric threshold.
    required_english = _first_number(course.english_requirements)
    student_english = None
    if isinstance(student.english_scores, dict):
        student_english = _first_number(
            str(student.english_scores.get("overall_score", ""))
        )
    if required_english is None:
        english_score = 100.0
    elif student_english is None:
        english_score = 0.0
        unmet.append(
            "No English test score on file to check against this course's requirement."
        )
    elif student_english >= required_english:
        english_score = 100.0
        positives.append(
            f"the student's English score ({student_english}) meets the requirement"
        )
    else:
        gap = required_english - student_english
        english_score = max(0.0, 100 - gap * 40)
        unmet.append(
            f"English score {student_english} is below the course's required {required_english}."
        )
    factors["english"] = round(english_score, 1)

    # Academic - hard requirement: is there any evidence on file at all.
    if student.education_history:
        academic_score = 100.0
        positives.append("the student's academic background is on file")
    else:
        academic_score = 0.0
        unmet.append("No academic transcript or results on file yet.")
    factors["academic"] = round(academic_score, 1)

    # Budget - soft preference, drawn from free-text goals_and_preferences.
    student_budget = _first_number(student.goals_and_preferences)
    if not student_budget or course.tuition_fee is None:
        budget_score = 100.0
    else:
        tuition = float(course.tuition_fee)
        if tuition <= student_budget:
            budget_score = 100.0
            positives.append("the tuition fits within the student's stated budget")
        else:
            over_pct = (tuition - student_budget) / student_budget * 100
            budget_score = max(0.0, 100 - over_pct)
            risks.append(
                f"Tuition ({course.tuition_fee}) is above the student's stated "
                f"budget ({student_budget:g})."
            )
    factors["budget"] = round(budget_score, 1)

    # Location - soft preference.
    goals = (student.goals_and_preferences or "").lower()
    campus = (course.campus or "").lower()
    if not goals or not campus:
        location_score = 100.0
    elif campus in goals:
        location_score = 100.0
        positives.append("the location matches the student's preference")
    else:
        location_score = 60.0
    factors["location"] = round(location_score, 1)

    # Intake availability.
    upcoming = [
        d
        for d in (course.intake_dates or [])
        if (parsed := _parse_intake_date(d)) and parsed >= date.today()
    ]
    if not upcoming:
        intake_score = 40.0
        risks.append(
            "No upcoming intake date is listed for this course - verify with the provider."
        )
    else:
        intake_score = 100.0
    factors["intake"] = round(intake_score, 1)

    # Data freshness.
    if (
        not course.last_verification_date
        or (date.today() - course.last_verification_date).days > STALE_VERIFICATION_DAYS
    ):
        risks.append(
            "This course's information hasn't been verified recently - "
            "confirm details before submission."
        )

    weights = {**DEFAULT_SCORING_WEIGHTS, **_sanitize_weights(scoring_weights)}
    total_weight = sum(weights.get(key, 0) for key in factors) or 1
    overall = sum(factors[key] * weights.get(key, 0) for key in factors) / total_weight

    if positives:
        notes = "Recommended because " + ", and ".join(positives) + "."
    else:
        notes = "Included based on available course data - please verify fit manually."
    notes += " Adviser should verify the latest entry requirements before submission."

    breakdown = {
        key: {"score": factors[key], "weight": weights.get(key, 0)} for key in factors
    }

    return round(overall, 2), breakdown, unmet, notes, "; ".join(risks)


def generate_recommendations_for_case(case, limit=RECOMMENDATION_LIMIT):
    """Scores every active course in the org against this case's student,
    keeps the top `limit`, and replaces any not-yet-approved recommendations
    with the fresh result - approved ones (an adviser's finalized decision)
    are left untouched."""

    organisation = case.student.organisation
    scoring_weights = {}
    settings = getattr(organisation, "settings", None)
    if settings is not None:
        scoring_weights = settings.scoring_weights or {}

    already_approved_course_ids = set(
        Recommendation.objects.filter(case=case, is_approved=True).values_list(
            "course_id", flat=True
        )
    )
    courses = Course.objects.filter(organisation=organisation, is_active=True).exclude(
        id__in=already_approved_course_ids
    )

    scored = [
        (score_course_for_student(case.student, course, scoring_weights), course)
        for course in courses
    ]
    scored.sort(key=lambda row: row[0][0], reverse=True)

    Recommendation.objects.filter(case=case, is_approved=False).delete()

    created = []
    for rank, ((score, breakdown, unmet, notes, risks), course) in enumerate(
        scored[:limit], start=1
    ):
        created.append(
            Recommendation.objects.create(
                case=case,
                course=course,
                rank=rank,
                score=score,
                score_breakdown=breakdown,
                unmet_requirements=unmet,
                recommendation_notes=notes,
                risk_notes=risks,
            )
        )
    return created
