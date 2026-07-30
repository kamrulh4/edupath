from rest_framework import generics

from common.views.mixins import StandardResponseMixin
from courses.models import Recommendation
from portal.permissions import IsPortalStudent
from portal.serializers.recommendation import PortalRecommendationSerializer


class RecommendationListView(StandardResponseMixin, generics.ListAPIView):
    """Only the recommendations an adviser has approved - a student never
    sees the unapproved shortlist an adviser is still working through."""

    serializer_class = PortalRecommendationSerializer
    permission_classes = [IsPortalStudent]

    def get_queryset(self):
        queryset = Recommendation.objects.filter(
            case__student__user=self.request.user, is_approved=True
        ).order_by("rank")

        case_uid = self.request.query_params.get("case")
        if case_uid:
            queryset = queryset.filter(case__uid=case_uid)

        return queryset
