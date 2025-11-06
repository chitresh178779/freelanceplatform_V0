from django.urls import path
from .views import RegisterView, ProjectListCreateView, ProjectDetailView, BidCreateView, MyTokenObtainPairView, ProjectBidListView, BidUpdateView, MyBidsListView, MyProjectsListView, PublicUserProfileView, UserProfileUpdateView, SkillListCreateView, StripeOnboardingView, ProjectFundView, ProjectReleasePaymentView,UserSearchListView , ChatRoomListView, MessageListView, FollowerListView, FollowToggleView, FollowingListView, ChatRoomCreateView, ProjectMatchView, WorkSubmissionView

from rest_framework_simplejwt.views import TokenRefreshView

urlpatterns = [
    path('register/', RegisterView.as_view(), name='register'),
    path('token/', MyTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    path('profile/', UserProfileUpdateView.as_view(), name='user_profile_detail_update'),
    path('profiles/', UserSearchListView.as_view(), name='public-profile-list'),
    path('profiles/<str:username>/', PublicUserProfileView.as_view(), name='public-profile-detail'),

    # --- NEW: Follow URLs (nested under profiles) ---
    path('profiles/<str:username>/follow/', FollowToggleView.as_view(), name='follow-toggle'),
    path('profiles/<str:username>/followers/', FollowerListView.as_view(), name='follower-list'),
    path('profiles/<str:username>/following/', FollowingListView.as_view(), name='following-list'),
    # --- END: Follow URLs ---

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
    path('projects/<int:project_pk>/match/', ProjectMatchView.as_view(), name='project-match'),
    
    # --- NEW: Chat API URLs ---
    path('chats/', ChatRoomListView.as_view(), name='chat-room-list'),
    path('chats/start/', ChatRoomCreateView.as_view(), name='chat-room-start'),
    path('chats/<int:room_id>/messages/', MessageListView.as_view(), name='message-list'),
    # --- END: Chat API URLs ---

    # --- NEW: Work Submission URL ---
    path('projects/<int:pk>/submit/', WorkSubmissionView.as_view(), name='work-submission'),
]