from common.response import build_success_envelope


class StandardResponseMixin:
    """Wrap non-paginated responses (retrieve/create/update/delete) in the
    same success envelope the paginated list responses already use, so every
    endpoint returns one consistent shape."""

    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)

        if response.exception or response.data is None:
            return response

        already_wrapped = isinstance(response.data, dict) and "success" in response.data
        if already_wrapped:
            return response

        response.data = build_success_envelope(results=response.data, code=response.status_code)
        return response
