from django.urls import path

from core.views.auth import LoginView, MeView, RefreshView, RegisterView, SetPasswordView

urlpatterns = [
    path("register/", RegisterView.as_view(), name="register"),
    path("login/", LoginView.as_view(), name="login"),
    path("refresh/", RefreshView.as_view(), name="token-refresh"),
    path("me/", MeView.as_view(), name="me"),
    path("set-password/", SetPasswordView.as_view(), name="set-password"),
]
