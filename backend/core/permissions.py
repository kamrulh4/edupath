from rest_framework.permissions import SAFE_METHODS, BasePermission

from core.choices import UserKind


class IsOrganisationMember(BasePermission):
    """User must belong to an organisation (tenant scoping)."""

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.organisation_id
        )


class IsOrganisationAdminOrReadOnly(IsOrganisationMember):
    """Any member of the organisation can read; only its ADMIN can write."""

    def has_permission(self, request, view):
        if not super().has_permission(request, view):
            return False
        if request.method in SAFE_METHODS:
            return True
        return request.user.kind == UserKind.ADMIN


def HasRole(*allowed_kinds):
    """Permission factory: only users whose `kind` is in `allowed_kinds`."""

    class _HasRole(BasePermission):
        def has_permission(self, request, view):
            return bool(
                request.user
                and request.user.is_authenticated
                and request.user.kind in allowed_kinds
            )

    return _HasRole
