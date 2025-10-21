from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import User, Project, Bid
from rest_framework.exceptions import AuthenticationFailed



class MyTokenObtainPairSerializer(TokenObtainPairSerializer):

    @classmethod
    def get_token(cls, user):
        # This method creates the token payload
        token = super().get_token(user)

        # Add custom claims to the token payload
        token['username'] = user.username
        token['role'] = user.role

        return token

    def validate(self, attrs):
        # This method handles the authentication and token generation process
        # It calls Django's authenticate() function
        data = super().validate(attrs)

        # If authentication was successful, self.user is set.
        # Now, we add the custom claims from get_token() to the response data.
        # Note: In newer versions, adding to get_token might be sufficient, 
        # but explicitly adding here ensures compatibility and clarity.
        
        # We already added claims in get_token, let's ensure they are in the final response
        # The 'access' and 'refresh' keys are already populated by super().validate()
        # We decode the access token briefly to add claims directly IF NEEDED
        # However, modifying get_token is the standard way. Let's just return data.
        
        # If you wanted to add username/role *outside* the token payload (directly in response body):
        # data['username'] = self.user.username
        # data['role'] = self.user.role

        return data # Return the data containing 'refresh' and 'access' tokens
# --- END UPDATED Token Serializer ---

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'name', 'email', 'role', 'password']
        extra_kwargs = {'password': {'write_only': True}}

    def create(self, validated_data):
        # Use the custom create_user method to handle password hashing
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            name=validated_data['name'],
            role=validated_data['role'],
            password=validated_data['password']
        )
        return user
    
class ProjectSerializer(serializers.ModelSerializer):
    # To display the client's username in the project list (read-only)
    client_username = serializers.ReadOnlyField(source='client.username')

    class Meta:
        model = Project
        fields = [
            'id', 
            'title', 
            'description', 
            'budget', 
            'status', 
            'client', 
            'client_username', 
            'freelancer', # Include freelancer field
            'category', # ADDED category
            'skills_required', # ADDED skills_required
            'created_at',
            'updated_at' # Include updated_at
        ]
        # Make sure client, status, created_at, updated_at, category_display and freelancer are read-only during creation
        # category and skills_required MUST BE WRITABLE (i.e., NOT in read_only_fields)
        read_only_fields = [
            'client', 
            'client_username', 
            'status', 
            'created_at', 
            'updated_at', 
            'freelancer' # Freelancer is assigned later, not on creation
        ]

class BidSerializer(serializers.ModelSerializer):
    # Display freelancer's username (read-only)
    freelancer_username = serializers.ReadOnlyField(source='freelancer.username')
    # Use PrimaryKeyRelatedField for project if submitting via a separate endpoint
    # project = serializers.PrimaryKeyRelatedField(queryset=Project.objects.all())

    class Meta:
        model = Bid
        fields = [
            'id',
            'project', # Project ID will likely come from URL, not payload
            'freelancer', # Freelancer ID will be set automatically
            'freelancer_username',
            'amount',
            'proposal',
            'status',
            'created_at'
        ]
        # These fields are set automatically or read-only
        read_only_fields = [
            'freelancer',
            'freelancer_username',
            'status',
            'created_at',
            'project' # If project ID comes from URL
        ]

    # Add validation specific to bids if needed (beyond model's clean method)
    def validate(self, data):
        # Example: Ensure bid amount is positive
        if data.get('amount') is not None and data['amount'] <= 0:
            raise serializers.ValidationError("Bid amount must be positive.")
        # We rely on the model's clean method for freelancer role and project status
        return data