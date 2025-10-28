import stripe
from stripe import StripeError
from rest_framework import generics, permissions, serializers
from rest_framework.response import Response
from rest_framework import status
from .models import User, Project, Bid, Skill
from django.db.models import Q
from .serializers import UserSerializer, ProjectSerializer, BidSerializer, MyTokenObtainPairSerializer, PublicUserProfileSerializer, UserProfileUpdateSerializer, SkillSerializer
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from rest_framework import filters
from .permissions import IsClient, IsFreelancer
from rest_framework.permissions import IsAuthenticatedOrReadOnly
from rest_framework_simplejwt.views import TokenObtainPairView
from django.shortcuts import get_object_or_404 # Import this
from django.core.exceptions import ValidationError # Import this

# Create your views here.

# --- UPDATED: Public User Profile View ---
class PublicUserProfileView(generics.RetrieveAPIView):
    serializer_class = PublicUserProfileSerializer
    permission_classes = [permissions.AllowAny]
    lookup_field = 'username'
    lookup_url_kwarg = 'username'

    # Optimize database query
    def get_queryset(self):
        # Prefetch related skills and projects to reduce database hits
        return User.objects.prefetch_related(
            'skills',
            'projects_as_client', # Use related_name from Project.client ForeignKey
            'projects_as_freelancer' # Use related_name from Project.freelancer ForeignKey
        ).all()

# --- END: Public User Profile View ---

class UserSearchListView(generics.ListAPIView):
    """
    API view to list and search public user profiles.
    Supports searching by username, name, and skills.
    Supports filtering by role.
    Accessible via /api/profiles/
    """
    # Use the same optimized queryset from PublicUserProfileView
    queryset = User.objects.prefetch_related(
        'skills',
        'projects_as_client',
        'projects_as_freelancer'
    ).all().order_by('username') # Default ordering

    serializer_class = PublicUserProfileSerializer
    permission_classes = [permissions.IsAuthenticated] # Only logged-in users can search
    
    # --- Enable Filtering and Searching ---
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    
    # Fields for exact-match filtering (e.g., /api/profiles/?role=FREELANCER)
    filterset_fields = ['role']
    
    
    # Fields for partial-match search (e.g., /api/profiles/?search=john)
    # We can search by username, name, and the 'name' field of related skills
    search_fields = ['username', 'name', 'skills__name']
    
    # Optional: Allow ordering
    ordering_fields = ['username', 'date_joined', 'name']

# --- NEW: Project Owner Permission ---
class IsProjectOwner(permissions.BasePermission):
    """
    Object-level permission to only allow owners of a project to access bids.
    """
    def has_object_permission(self, request, view, obj):
        # obj here is a Bid instance. Check if the request.user is the client of the bid's project.
        return obj.project.client == request.user
    

class BidUpdateView(generics.UpdateAPIView):
    """
    API view for the client to accept or reject a bid.
    Only allows updating the 'status' field via PATCH.
    Accessible via /api/bids/<bid_pk>/
    """
    queryset = Bid.objects.all()
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated, IsProjectOwner]
    lookup_field = 'pk'

    def get_serializer(self, *args, **kwargs):
        kwargs['partial'] = True # Ensure PATCH is allowed
        return super().get_serializer(*args, **kwargs)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', True)
        instance = self.get_object() # Get the specific Bid object

        print(f"[BidUpdateView] Received PATCH data for Bid ID {instance.pk}: {request.data}") # Log incoming data
        print(f"[BidUpdateView] Current Bid status: {instance.status}")

        # Ensure only 'status' is being updated
        allowed_updates = {'status'}
        if not set(request.data.keys()).issubset(allowed_updates):
             return Response({"detail": "Only the 'status' field can be updated."}, status=status.HTTP_400_BAD_REQUEST)

        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)

        new_status = serializer.validated_data.get('status')
        print(f"[BidUpdateView] Validated new status: {new_status}")

        # Custom Logic for Accepting Bid
        if new_status == Bid.Status.ACCEPTED:
            project = instance.project
            print(f"[BidUpdateView] Accepting bid for Project ID {project.pk}, Current Status: {project.status}")

            if project.status != Project.Status.OPEN:
                print("[BidUpdateView] ERROR: Project not open.")
                return Response({"detail": "Project is no longer open for bidding."}, status=status.HTTP_400_BAD_REQUEST)
            if project.freelancer is not None:
                print("[BidUpdateView] ERROR: Project already has freelancer.")
                return Response({"detail": "Project already has an assigned freelancer."}, status=status.HTTP_400_BAD_REQUEST)

            # Assign freelancer and update project status
            project.freelancer = instance.freelancer
            project.status = Project.Status.IN_PROGRESS
            print(f"[BidUpdateView] Assigning Freelancer ID {project.freelancer.pk} and setting Project Status to {project.status}...")
            project.save() # SAVE THE PROJECT CHANGES
            print("[BidUpdateView] Project saved.")

            # Reject other pending bids
            updated_count = Bid.objects.filter(project=project, status=Bid.Status.PENDING).exclude(pk=instance.pk).update(status=Bid.Status.REJECTED)
            print(f"[BidUpdateView] Rejected {updated_count} other pending bids.")

        # --- THIS LINE SAVES THE BID STATUS ---
        print("[BidUpdateView] Calling perform_update to save Bid status...")
        self.perform_update(serializer)
        print("[BidUpdateView] perform_update finished.")
        # --- END SAVE BID STATUS ---

        # Refresh instance AFTER saving to get final state
        instance.refresh_from_db()
        print(f"[BidUpdateView] Bid status after refresh: {instance.status}")
        refreshed_serializer = self.get_serializer(instance) # Serialize the updated instance

        return Response(refreshed_serializer.data) # Return refreshed data

    
# --- NEW: Bid List View ---
class ProjectBidListView(generics.ListAPIView):
    """
    API view for the client to list all bids placed on one of their projects.
    Accessible via /api/projects/<project_pk>/bids/
    """
    serializer_class = BidSerializer
    # Permission: Must be authenticated, AND must be the client who owns the project
    # We check project ownership within get_queryset for simplicity here
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        project_pk = self.kwargs.get('project_pk')
        project = get_object_or_404(Project, pk=project_pk)

        # Permission check: Ensure the request user is the client for this project
        if project.client != self.request.user:
            # Raise PermissionDenied or return an empty queryset
            # Returning empty is often simpler for ListViews
            return Bid.objects.none()

        # Return bids only for this specific project
        return Bid.objects.filter(project=project).order_by('created_at') # Show oldest first maybe? Or by amount?

class MyTokenObtainPairView(TokenObtainPairView):
    """
    Takes a set of user credentials and returns an access and refresh JSON web
    token pair to prove the authentication of those credentials, including
    custom user data (username, role).
    """
    serializer_class = MyTokenObtainPairSerializer

#registration view abstraction class
class RegisterView(generics.CreateAPIView):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            self.perform_create(serializer)
            headers = self.get_success_headers(serializer.data)
            # We customize the response to not return the user data upon registration
            return Response({"message": "User registered successfully."}, status=status.HTTP_201_CREATED, headers=headers)
        else:
            # Customize error response
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
        
# class UserProfileView(APIView):
#     # This is the security guard. It ensures the user is logged in.
#     permission_classes = [IsAuthenticated]

#     def get(self, request):
#         """
#         This method handles GET requests to /api/profile/
#         """
#         # The authenticated user object is automatically attached to the request
#         # by the JWT middleware. We can access it via `request.user`.
#         user = request.user
#         serializer = UserSerializer(user)
#         return Response(serializer.data)
    
class UserProfileUpdateView(generics.RetrieveUpdateAPIView):
    serializer_class = UserProfileUpdateSerializer
    permission_classes = [permissions.IsAuthenticated]
    def get_object(self):
        return self.request.user
    def get_queryset(self):
        return User.objects.filter(pk=self.request.user.pk)


class ProjectListCreateView(generics.ListCreateAPIView):
    queryset = Project.objects.all().order_by('-created_at') # Show newest projects first
    serializer_class = ProjectSerializer

    def get_permissions(self):
        """
        Instantiates and returns the list of permissions that this view requires.
        """
        if self.request.method == 'POST':
            # Only authenticated clients can create projects
            return [IsAuthenticated(), IsClient()]
        # Anyone can view the list of projects
        return []

    def perform_create(self, serializer):
        """
        This method is called when a new project is created.
        We automatically assign the logged-in user as the project's client.
        """
        serializer.save(client=self.request.user)

class ProjectListCreateView(generics.ListCreateAPIView):
    queryset = Project.objects.filter(status=Project.Status.OPEN).order_by('-created_at') # Only show OPEN projects
    serializer_class = ProjectSerializer

    # --- ADD THESE FILTERING/SEARCHING/SORTING SETTINGS ---
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['category', 'client__username'] # Fields available for exact filtering
    search_fields = ['title', 'description', 'skills_required'] # Fields available for keyword search
    ordering_fields = ['created_at', 'budget'] # Fields available for sorting
    ordering = ['-created_at'] # Default sort order
    # --- END ADDED SETTINGS ---

    def get_permissions(self):
        if self.request.method == 'POST':
            return [IsAuthenticated(), IsClient()]
        return [] # No permissions needed for GET (listing projects)

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)

class ProjectDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Project.objects.all()
    serializer_class = ProjectSerializer
    permission_classes = [IsAuthenticatedOrReadOnly]
    lookup_field = 'pk'

class BidCreateView(generics.CreateAPIView):
    """
    API view for freelancers to create a bid on a specific project.
    Accessible via /api/projects/<project_pk>/bid/
    """
    serializer_class = BidSerializer
    permission_classes = [IsAuthenticated, IsFreelancer] # Must be logged in and a freelancer

    def perform_create(self, serializer):
        # Get project from URL parameter 'project_pk'
        project_pk = self.kwargs.get('project_pk')
        project = get_object_or_404(Project, pk=project_pk)
        
        # Get freelancer from the request user
        freelancer = self.request.user

        # Create a temporary Bid instance to run model validation
        bid_instance = Bid(
            project=project,
            freelancer=freelancer,
            amount=serializer.validated_data.get('amount'),
            proposal=serializer.validated_data.get('proposal')
        )
        
        try:
            bid_instance.clean() # Manually call model's clean method
        except ValidationError as e:
            # Re-raise as DRF ValidationError
            raise serializers.ValidationError(e.message_dict)

        # Check if freelancer already bid on this project (handled by unique_together, but good practice)
        if Bid.objects.filter(project=project, freelancer=freelancer).exists():
            raise serializers.ValidationError("You have already placed a bid on this project.")

        # Save the bid, automatically setting the freelancer and project
        serializer.save(freelancer=freelancer, project=project)

# --- Dashboard Views ---

class MyProjectsListView(generics.ListAPIView):
    """
    API view for a logged-in user to see projects relevant to them.
    - Clients see projects they posted (any status).
    - Freelancers see projects they are assigned to (status IN_PROGRESS or COMPLETED).
    Accessible via /api/dashboard/my-projects/
    """
    serializer_class = ProjectSerializer
    permission_classes = [permissions.IsAuthenticated] # Must be logged in

    def get_queryset(self):
        user = self.request.user

        if user.role == User.Role.CLIENT:
            # Clients see all projects they posted, newest first
            return Project.objects.filter(client=user).order_by('-created_at')
        elif user.role == User.Role.FREELANCER:
            # Freelancers see projects assigned to them that are in progress or completed
            return Project.objects.filter(
                freelancer=user,
                status__in=[Project.Status.IN_PROGRESS, Project.Status.COMPLETED]
            ).order_by('-updated_at') # Show recently updated ones first
        else:
            # Should not happen for valid roles, but return empty for safety
            return Project.objects.none()

# --- END Dashboard Views ---

# --- Add My Bids List View ---
class MyBidsListView(generics.ListAPIView):
    """
    API view for a logged-in freelancer to see all bids they have placed.
    Accessible via /api/dashboard/my-bids/
    """
    serializer_class = BidSerializer
    permission_classes = [permissions.IsAuthenticated, IsFreelancer] # Must be logged-in Freelancer

    def get_queryset(self):
        user = self.request.user
        # Return all bids made by this freelancer, newest first
        return Bid.objects.filter(freelancer=user).order_by('-created_at')

# --- END Add My Bids List View ---
class SkillListCreateView(generics.ListCreateAPIView):
    """
    API view to retrieve list of all skills or create a new skill.
    Accessible via /api/skills/
    """
    queryset = Skill.objects.all().order_by('name') # List skills alphabetically
    serializer_class = SkillSerializer
    # Permission: Anyone can view, only authenticated users can create
    # You might want to change POST permission to IsAdminUser later
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

class StripeOnboardingView(APIView):
    """
    Creates a Stripe Account and Account Link for user onboarding.
    Accessible via /api/stripe/onboard/
    Returns an onboarding URL for the frontend to redirect the user to.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request, *args, **kwargs):
        user = request.user
        return_url_base = "http://localhost:3000" # Your frontend URL

        try:
            # 1. Create/Retrieve Stripe Account
            if not user.stripe_account_id:
                print(f"Creating Stripe account for user {user.username}...")
                account = stripe.Account.create(type='express', email=user.email)
                user.stripe_account_id = account.id
                user.save()
                print(f"Stripe account created: {account.id}")
            else:
                print(f"User {user.username} already has Stripe account: {user.stripe_account_id}")
                # Optional: Retrieve existing account if needed
                # account = stripe.Account.retrieve(user.stripe_account_id)

            # 2. Create an Account Link
            print(f"Creating Account Link for {user.stripe_account_id}...")
            account_link = stripe.AccountLink.create(
                account=user.stripe_account_id,
                refresh_url=f"{return_url_base}/stripe/reauth",
                return_url=f"{return_url_base}/stripe/return?account_id={user.stripe_account_id}",
                type='account_onboarding',
            )
            print(f"Account Link created: {account_link.url}")

            # 3. Return the URL to the frontend
            return Response({'onboarding_url': account_link.url}, status=status.HTTP_200_OK)

        # --- UPDATED EXCEPTION HANDLING ---
        except StripeError as e: # Catch StripeError directly
            print(f"Stripe Error creating onboarding link: {e}")
            # Try accessing user_message or default to str(e)
            error_message = getattr(e, 'user_message', str(e)) 
            return Response(
                {"error": f"Stripe Error: {error_message or 'Could not initiate onboarding.'}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
        # --- END UPDATE ---
        except Exception as e:
            print(f"Error creating onboarding link: {e}")
            return Response(
                {"error": "An unexpected error occurred. Could not initiate onboarding."},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

# --- END Stripe Onboarding View ---
# --- NEW: Project Funding View ---
class ProjectFundView(APIView):
    """
    Creates a Stripe Payment Intent for a Client to fund their project.
    Accessible via POST /api/projects/<project_pk>/fund/
    Returns the client_secret for the Payment Intent.
    """
    permission_classes = [permissions.IsAuthenticated, IsClient] # Must be logged-in Client

    def post(self, request, *args, **kwargs):
        project_pk = self.kwargs.get('project_pk')
        user = request.user

        try:
            project = get_object_or_404(Project, pk=project_pk)

            # --- Permission Checks ---
            # 1. Ensure the user is the client who owns this project
            if project.client != user:
                return Response({"error": "You do not own this project."}, status=status.HTTP_403_FORBIDDEN)

           # 2. Ensure the project is IN_PROGRESS (meaning a bid was accepted)
            if project.status != Project.Status.IN_PROGRESS:
                 return Response({"error": f"Project must be 'IN PROGRESS' to be funded (current: {project.status})."}, status=status.HTTP_400_BAD_REQUEST)

            # 3. Ensure a freelancer IS assigned (this should be true if IN_PROGRESS)
            if project.freelancer is None:
                  # This case might indicate an issue if status is IN_PROGRESS but no freelancer
                  return Response({"error": "Project is in progress but no freelancer assigned. Please contact support."}, status=status.HTTP_400_BAD_REQUEST)

            # 4. Check if Freelancer has Stripe Account ID
            if not project.freelancer.stripe_account_id:
                 return Response({"error": "The assigned freelancer has not completed Stripe onboarding yet."}, status=status.HTTP_400_BAD_REQUEST)
            # --- END UPDATED CHECK ---
            if project.payment_intent_id:
                # Optionally retrieve existing intent to return its client_secret
                try:
                    existing_intent = stripe.PaymentIntent.retrieve(project.payment_intent_id)
                    print(f"Project {project.pk} already funded. Returning existing Intent ID: {existing_intent.id}")
                    return Response({'clientSecret': existing_intent.client_secret}, status=status.HTTP_200_OK)
                except StripeError as e:
                     print(f"Error retrieving existing Payment Intent {project.payment_intent_id}: {e}")
                     # Fall through to create a new one? Or return error? For now, let's return error.
                     return Response({"error": "Project already funded, but failed to retrieve payment details."}, status=status.HTTP_400_BAD_REQUEST)
            # --- End check ---

            # --- Create Stripe Payment Intent ---
            # Amount needs to be in cents
            amount_in_cents = int(project.budget * 100)

            print(f"Creating Payment Intent for Project {project.pk}, Amount: {amount_in_cents} cents")

            # Create the Payment Intent
            # We use 'capture_method': 'manual' to authorize funds now and capture later.
            # Or omit capture_method to capture immediately (funds go to platform balance).
            # We'll use 'manual' for a basic escrow flow.
            intent = stripe.PaymentIntent.create(
                amount=amount_in_cents,
                currency='usd', # Or your desired currency
                # capture_method='manual', # Authorize now, capture later upon release
                automatic_payment_methods={'enabled': True}, # Let Stripe handle payment method types
                # --- Stripe Connect Specifics ---
                application_fee_amount=int(amount_in_cents * 0.10), # Example: 10% platform fee in cents
                transfer_data={ # Destination is the Freelancer's Stripe account
                    'destination': project.freelancer.stripe_account_id,
                },
                metadata={ # Useful for tracking
                    'project_id': project.pk,
                    'project_title': project.title,
                    'client_username': user.username,
                    'freelancer_username': project.freelancer.username,
                }
            )
            project.payment_intent_id = intent.id
            project.save(update_fields=['payment_intent_id']) # Only update this field
            print(f"Saved Payment Intent ID {intent.id} to Project {project.pk}")

            # Return the client_secret to the frontend
            return Response({'clientSecret': intent.client_secret}, status=status.HTTP_201_CREATED)

        except Project.DoesNotExist:
            return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        except AttributeError:
             # Handle cases where freelancer or their stripe_account_id might be missing
             return Response({"error": "Assigned freelancer does not have a connected Stripe account."}, status=status.HTTP_400_BAD_REQUEST)
        except StripeError as e:
            print(f"Stripe Error creating Payment Intent: {e}")
            error_message = getattr(e, 'user_message', str(e))
            return Response({"error": f"Stripe Error: {error_message or 'Could not process payment.'}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        except Exception as e:
            print(f"Error creating Payment Intent: {e}")
            return Response({"error": "An unexpected error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- END Project Funding View ---

class ProjectReleasePaymentView(APIView):
    """
    Captures the Payment Intent associated with a project, releasing funds.
    Accessible via POST /api/projects/<project_pk>/release/
    """
    permission_classes = [permissions.IsAuthenticated, IsClient] # Must be logged-in Client

    def post(self, request, *args, **kwargs):
        project_pk = self.kwargs.get('project_pk')
        user = request.user

        try:
            project = get_object_or_404(Project, pk=project_pk)

            # --- Permission Checks ---
            # 1. User must own the project
            if project.client != user:
                 return Response({"error": "You do not own this project."}, status=status.HTTP_403_FORBIDDEN)

            # 2. Project must be IN_PROGRESS
            if project.status != Project.Status.IN_PROGRESS:
                 return Response({"error": f"Payment can only be released for 'IN PROGRESS' projects (current: {project.status})."}, status=status.HTTP_400_BAD_REQUEST)

            # 3. Project must have a Payment Intent ID
            if not project.payment_intent_id:
                 return Response({"error": "Project has not been funded yet."}, status=status.HTTP_400_BAD_REQUEST)

            # --- Capture Payment Intent ---
            print(f"Attempting to capture Payment Intent {project.payment_intent_id} for Project {project.pk}")
            
            # Retrieve the intent first to check status (optional but good practice)
            intent = stripe.PaymentIntent.retrieve(project.payment_intent_id)

            if intent.status == 'succeeded':
                 print("Payment Intent already succeeded.")
                 # Update project status if it wasn't already
                 if project.status != Project.Status.COMPLETED:
                     project.status = Project.Status.COMPLETED
                     project.save(update_fields=['status'])
                 return Response({"message": "Payment already captured and released."}, status=status.HTTP_200_OK)

            if intent.status != 'requires_capture': # Should be requires_capture if using manual capture
                 # Handle cases where immediate capture was used or intent failed/cancelled
                 # If using immediate capture, the transfer happens automatically or needs a separate Transfer API call
                 print(f"Payment Intent status is '{intent.status}', cannot capture manually.")
                 # For now, return an error - adjust logic based on your capture strategy
                 return Response({"error": f"Cannot release payment. Payment status: {intent.status}."}, status=status.HTTP_400_BAD_REQUEST)


            # Capture the payment (if using manual capture method)
            # This triggers the charge and the transfer defined in transfer_data
            captured_intent = stripe.PaymentIntent.capture(project.payment_intent_id)
            print(f"Payment Intent {captured_intent.id} captured successfully.")

            # --- Update Project Status ---
            project.status = Project.Status.COMPLETED
            project.save(update_fields=['status'])
            print(f"Project {project.pk} status updated to COMPLETED.")

            return Response({"message": "Payment released successfully."}, status=status.HTTP_200_OK)

        except Project.DoesNotExist:
            return Response({"error": "Project not found."}, status=status.HTTP_404_NOT_FOUND)
        except StripeError as e:
            print(f"Stripe Error capturing Payment Intent: {e}")
            error_message = getattr(e, 'user_message', str(e))
            # Handle specific errors like 'payment_intent_unexpected_state' if needed
            return Response({"error": f"Stripe Error: {error_message or 'Could not release payment.'}"}, status=status.HTTP_400_BAD_REQUEST) # Use 400 for Stripe errors usually
        except Exception as e:
            print(f"Error releasing payment: {e}")
            return Response({"error": "An unexpected error occurred."}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

# --- END Release Payment View ---

