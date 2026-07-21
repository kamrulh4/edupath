from django.db.models import TextChoices


class UserKind(TextChoices):
    ADMIN = "ADMIN", "Admin"
    ADVISER = "ADVISER", "Adviser"
    ADMISSION_OFFICER = "ADMISSION_OFFICER", "Admission_Officer"
    SUPER_ADMIN = "SUPER_ADMIN", "Super_Admin"
    STUDENT = "STUDENT", "Student"
    UNDEFINED = "UNDEFINED", "Undefined"


class UserGender(TextChoices):
    MALE = "MALE", "Male"
    FEMALE = "FEMALE", "Female"
    OTHER = "OTHER", "Other"
    UNKNOWN = "UNKNOWN", "Unknown"
