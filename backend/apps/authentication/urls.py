from django.urls import path
from .views import LoginView, RegisterView, ProfileView, LogoutView

urlpatterns = [
    path('login', LoginView.as_view(), name='auth-login'),
    path('login/', LoginView.as_view(), name='auth-login-slash'),
    path('register', RegisterView.as_view(), name='auth-register'),
    path('register/', RegisterView.as_view(), name='auth-register-slash'),
    path('me', ProfileView.as_view(), name='auth-me'),
    path('me/', ProfileView.as_view(), name='auth-me-slash'),
    path('logout', LogoutView.as_view(), name='auth-logout'),
    path('logout/', LogoutView.as_view(), name='auth-logout-slash'),
]
