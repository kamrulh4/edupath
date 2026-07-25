from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from common.response import build_success_envelope


class StandardResultsPagination(PageNumberPagination):
    page_size_query_param = "page_size"

    def get_paginated_response(self, data):
        return Response(
            build_success_envelope(
                results=data,
                code=200,
                count=self.page.paginator.count,
                next_link=self.get_next_link(),
                previous_link=self.get_previous_link(),
            )
        )
