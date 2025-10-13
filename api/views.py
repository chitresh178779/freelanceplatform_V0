from rest_framework import generics
from rest_framework.response import Response
from rest_framework import status
from .models import User
from .serializers import UserSerializer

# Create your views here.

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