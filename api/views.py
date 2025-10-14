from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from .models import User, Project
from .serializers import UserSerializer, ProjectSerializer
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated
from .permissions import IsClient

# Create your views here.
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
