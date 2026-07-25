from rest_framework import generics, status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from common.views.mixins import StandardResponseMixin
from core.serializers.auth import (
    EduPathTokenObtainPairSerializer,
    RegisterSerializer,
    SetPasswordSerializer,
)
from core.serializers.users import MeSerializer


class RegisterView(StandardResponseMixin, generics.CreateAPIView):
    """Signup: creates an Organisation together with its first ADMIN user."""

    serializer_class = RegisterSerializer
    permission_classes = [AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        return Response(MeSerializer(user).data, status=status.HTTP_201_CREATED)


class LoginView(StandardResponseMixin, TokenObtainPairView):
    serializer_class = EduPathTokenObtainPairSerializer
    permission_classes = [AllowAny]


class RefreshView(StandardResponseMixin, TokenRefreshView):
    pass


class MeView(StandardResponseMixin, generics.RetrieveUpdateAPIView):
    serializer_class = MeSerializer
    permission_classes = [IsAuthenticated]

    def get_object(self):
        return self.request.user


class SetPasswordView(StandardResponseMixin, generics.GenericAPIView):
    """Consumes an invite link to set a first password (e.g. a newly invited student)."""

    serializer_class = SetPasswordSerializer
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response({"message": "Password set successfully. You can now log in."})
