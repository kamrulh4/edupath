from rest_framework import generics
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from common.views.mixins import StandardResponseMixin
from core.audit import log_action
from core.choices import UserKind
from core.permissions import HasRole
from courses.models import Recommendation
from courses.serializers.recommendation import RecommendationSerializer
from courses.services.scoring import generate_recommendations_for_case
from students.models import Case

IsOrganisationStaff = HasRole(
    UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER
)


class RecommendationListCreateView(StandardResponseMixin, generics.ListCreateAPIView):
    serializer_class = RecommendationSerializer
    permission_classes = [IsOrganisationStaff]

    def get_queryset(self):
        queryset = Recommendation.objects.filter(
            case__student__organisation=self.request.user.organisation
        ).order_by("rank")

        case_uid = self.request.query_params.get("case")
        if case_uid:
            queryset = queryset.filter(case__uid=case_uid)

        return queryset


class RecommendationDetailView(
    StandardResponseMixin, generics.RetrieveUpdateDestroyAPIView
):
    serializer_class = RecommendationSerializer
    permission_classes = [IsOrganisationStaff]
    lookup_field = "uid"

    def get_queryset(self):
        return Recommendation.objects.filter(
            case__student__organisation=self.request.user.organisation
        )


class RecommendationApproveView(StandardResponseMixin, generics.GenericAPIView):
    """Adviser approves a recommendation before it becomes visible to the student."""

    serializer_class = RecommendationSerializer
    permission_classes = [IsOrganisationStaff]

    def get_queryset(self):
        return Recommendation.objects.filter(
            case__student__organisation=self.request.user.organisation
        )

    def post(self, request, *args, **kwargs):
        recommendation = get_object_or_404(self.get_queryset(), uid=self.kwargs["uid"])
        recommendation.is_approved = True
        recommendation.save(update_fields=["is_approved", "updated_at"])
        log_action(request, "RECOMMENDATION_APPROVED", recommendation)
        return Response(self.get_serializer(recommendation).data)


class RecommendationGenerateView(StandardResponseMixin, generics.GenericAPIView):
    """Runs the weighted auto-scoring engine for a case's top-10 courses.
    Replaces any not-yet-approved recommendations for that case - approved
    ones (an adviser's finalized call) are left alone."""

    serializer_class = RecommendationSerializer
    permission_classes = [IsOrganisationStaff]

    def post(self, request, *args, **kwargs):
        case = get_object_or_404(
            Case.objects.filter(student__organisation=request.user.organisation),
            uid=request.data.get("case"),
        )
        recommendations = generate_recommendations_for_case(case)
        log_action(
            request,
            "RECOMMENDATIONS_GENERATED",
            case,
            details={"count": len(recommendations)},
        )
        return Response(
            self.get_serializer(recommendations, many=True).data, status=201
        )
