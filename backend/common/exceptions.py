from rest_framework.views import exception_handler as drf_exception_handler

from common.response import build_error_envelope


def custom_exception_handler(exc, context):
    """Normalize every DRF error (validation, permission, auth, throttle, 404...)
    into the same {success, code, message, errors} shape."""

    response = drf_exception_handler(exc, context)
    if response is None:
        return None

    detail = response.data

    if isinstance(detail, dict):
        message = detail.get("detail", next(iter(detail.values()), "Request failed"))
    elif isinstance(detail, list):
        message = detail[0] if detail else "Request failed"
    else:
        message = detail

    if isinstance(message, list):
        message = message[0] if message else "Request failed"

    response.data = build_error_envelope(
        code=response.status_code,
        message=str(message),
        errors=detail,
    )
    return response
