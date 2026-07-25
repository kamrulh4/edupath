"""Shared response envelope builders so every endpoint returns the same shape."""


def build_success_envelope(results, code=200, count=None, next_link=None, previous_link=None):
    return {
        "success": True,
        "code": code,
        "count": count,
        "next": next_link,
        "previous": previous_link,
        "results": results,
    }


def build_error_envelope(code, message, errors):
    return {
        "success": False,
        "code": code,
        "message": message,
        "errors": errors,
    }
