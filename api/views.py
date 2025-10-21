from rest_framework import generics, permissions, serializers
from rest_framework.response import Response
from rest_framework import status
from .models import User, Project, Bid
from .serializers import UserSerializer, ProjectSerializer, BidSerializer, MyTokenObtainPairSerializer
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
        
class UserProfileView(APIView):
    # This is the security guard. It ensures the user is logged in.
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """
        This method handles GET requests to /api/profile/
        """
        # The authenticated user object is automatically attached to the request
        # by the JWT middleware. We can access it via `request.user`.
        user = request.user
        serializer = UserSerializer(user)
        return Response(serializer.data)
    
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