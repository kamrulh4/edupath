from django.db.models import Q
from rest_framework import generics, status
from rest_framework.generics import get_object_or_404
from rest_framework.response import Response

from common.views.mixins import StandardResponseMixin
from core.choices import UserKind
from core.permissions import HasRole
from students.models import Student
from students.serializers.invite import StudentInviteSerializer
from students.serializers.student import StudentSerializer

IsOrganisationStaff = HasRole(
    UserKind.ADMIN, UserKind.ADVISER, UserKind.ADMISSION_OFFICER
)


class StudentListCreateView(StandardResponseMixin, generics.ListCreateAPIView):
    serializer_class = StudentSerializer
    permission_classes = [IsOrganisationStaff]

    def get_queryset(self):
        queryset = Student.objects.filter(
            organisation=self.request.user.organisation
        ).order_by("-id")

        search = self.request.query_params.get("search")
        if search:
            queryset = queryset.filter(
                Q(first_name__icontains=search)
                | Q(last_name__icontains=search)
                | Q(email__icontains=search)
            )

        return queryset

    def perform_create(self, serializer):
        serializer.save(organisation=self.request.user.organisation)


class StudentDetailView(StandardResponseMixin, generics.RetrieveUpdateDestroyAPIView):
    serializer_class = StudentSerializer
    permission_classes = [IsOrganisationStaff]
    lookup_field = "uid"

    def get_queryset(self):
        return Student.objects.filter(organisation=self.request.user.organisation)


class StudentInviteView(StandardResponseMixin, generics.GenericAPIView):
    """Creates portal login access (a User) for an existing Student."""

    serializer_class = StudentInviteSerializer
    permission_classes = [IsOrganisationStaff]

    def get_student(self):
        return get_object_or_404(
            Student, uid=self.kwargs["uid"], organisation=self.request.user.organisation
        )

    def post(self, request, *args, **kwargs):
        student = self.get_student()
        serializer = self.get_serializer(
            data=request.data, context={"student": student, "request": request}
        )
        serializer.is_valid(raise_exception=True)
        result = serializer.save()
        return Response(
            {
                "message": "Student invited. Share this link with them to set a password.",
                "uidb64": result["uidb64"],
                "token": result["token"],
            },
            status=status.HTTP_201_CREATED,
        )
