from django.urls import path
from .views import RegisterView, ProjectListCreateView, ProjectDetailView, BidCreateView, MyTokenObtainPairView, ProjectBidListView, BidUpdateView, MyBidsListView, MyProjectsListView, PublicUserProfileView, UserProfileUpdateView, SkillListCreateView, StripeOnboardingView, ProjectFundView, ProjectReleasePaymentView, UserSearchListView

from rest_framework_simplejwt.views import TokenRefreshView


urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('profile/', UserProfileUpdateView.as_view(), name='user_profile_detail_update'),
    path('profiles/<str:username>/', PublicUserProfileView.as_view(), name='public-profile-detail'),
    path('projects/', ProjectListCreateView.as_view(), name='project-list-create'),
    path('projects/<int:pk>/', ProjectDetailView.as_view(), name='project-detail'),
    path('projects/<int:project_pk>/bid/', BidCreateView.as_view(), name='bid-create'),
    path('projects/<int:project_pk>/bids/', ProjectBidListView.as_view(), name='project-bid-list'),
    path('bids/<int:pk>/', BidUpdateView.as_view(), name='bid-update'),
    # --- NEW: Dashboard URLs ---
    path('dashboard/my-projects/', MyProjectsListView.as_view(), name='dashboard-my-projects'),
    path('dashboard/my-bids/', MyBidsListView.as_view(), name='dashboard-my-bids'),
    # --- END: Dashboard URLs ---
    # --- NEW: Skills URL ---
    path('skills/', SkillListCreateView.as_view(), name='skill-list-create'),
    # --- END: Skills URL ---
    path('stripe/onboard/', StripeOnboardingView.as_view(), name='stripe-onboard'),
    path('projects/<int:project_pk>/fund/', ProjectFundView.as_view(), name='project-fund'),
    path('projects/<int:project_pk>/release/', ProjectReleasePaymentView.as_view(), name='project-release'),
]