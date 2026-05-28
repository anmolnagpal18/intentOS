from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from .views import IntentViewSet, TaskViewSet, DashboardViewSet, AnalyticsViewSet, AdaptationViewSet, AuthViewSet, NotificationViewSet, AIEngineViewSet, TeamViewSet

router = DefaultRouter()
router.register(r'auth', AuthViewSet, basename='auth')
router.register(r'teams', TeamViewSet, basename='team')
router.register(r'intents', IntentViewSet, basename='intent')
router.register(r'tasks', TaskViewSet, basename='task')
router.register(r'dashboard', DashboardViewSet, basename='dashboard')
router.register(r'analytics', AnalyticsViewSet, basename='analytics')
router.register(r'adaptation', AdaptationViewSet, basename='adaptation')
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'ai', AIEngineViewSet, basename='ai')
urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', TokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
