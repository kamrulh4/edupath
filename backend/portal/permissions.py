from rest_framework.permissions import BasePermission

from core.choices import UserKind


class IsPortalStudent(BasePermission):
    """Only an authenticated STUDENT user may use the portal endpoints.

    Every view still scopes its queryset to `case__student__user=request.user`
    on top of this - this permission alone doesn't guarantee row-level access.
    """

    def has_permission(self, request, view):
        return bool(
            request.user
            and request.user.is_authenticated
            and request.user.kind == UserKind.STUDENT
        )
