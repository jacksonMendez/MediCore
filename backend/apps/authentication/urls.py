from django.urls import path
from .views import (
    LoginView,
    RegisterView,
    VerificarCodigoView,
    ReenviarCodigoView,
    GoogleAuthView,
    ProfileView,
    LogoutView,
)

urlpatterns = [
    path('login', LoginView.as_view(), name='auth-login'),
    path('login/', LoginView.as_view(), name='auth-login-slash'),
    path('register', RegisterView.as_view(), name='auth-register'),
    path('register/', RegisterView.as_view(), name='auth-register-slash'),
    path('verificar-codigo', VerificarCodigoView.as_view(), name='auth-verificar-codigo'),
    path('verificar-codigo/', VerificarCodigoView.as_view(), name='auth-verificar-codigo-slash'),
    path('reenviar-codigo', ReenviarCodigoView.as_view(), name='auth-reenviar-codigo'),
    path('reenviar-codigo/', ReenviarCodigoView.as_view(), name='auth-reenviar-codigo-slash'),
    path('google', GoogleAuthView.as_view(), name='auth-google'),
    path('google/', GoogleAuthView.as_view(), name='auth-google-slash'),
    path('me', ProfileView.as_view(), name='auth-me'),
    path('me/', ProfileView.as_view(), name='auth-me-slash'),
    path('logout', LogoutView.as_view(), name='auth-logout'),
    path('logout/', LogoutView.as_view(), name='auth-logout-slash'),
]
