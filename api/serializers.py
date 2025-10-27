from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.conf import settings
from .models import User, Project, Bid, Skill
from rest_framework.exceptions import AuthenticationFailed

# --- NEW: Simplified Serializers for Embedding ---
class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'name']
        # Optionally make name read-only if only listing is needed via this serializer
        # read_only_fields = ['id', 'name'] 
        # For creation, ensure 'name' is writable

    # Add validation to prevent duplicate skill names on creation
    def validate_name(self, value):
        # Normalize the input (e.g., lowercase, strip whitespace)
        normalized_name = value.strip().lower() 
        if Skill.objects.filter(name__iexact=normalized_name).exists():
             # Check case-insensitively if skill already exists
            raise serializers.ValidationError("Skill with this name already exists.")
        # Return the original value or a normalized one if preferred
        return value

class SimpleProjectSerializer(serializers.ModelSerializer):
    """ A very basic serializer for listing projects on a profile. """
    class Meta:
        model = Project
        fields = ['id', 'title', 'status', 'category'] # Only essential info

class PublicUserProfileSerializer(serializers.ModelSerializer):
    skills = SkillSerializer(many=True, read_only=True)
    projects_as_client = SimpleProjectSerializer(many=True, read_only=True)
    projects_as_freelancer = SimpleProjectSerializer(many=True, read_only=True)
    profile_picture_url = serializers.SerializerMethodField()
    availability_display = serializers.CharField(source='get_availability_display', read_only=True)

    class Meta:
        model = User
        fields = [
            'id', 'username', 'name', 'role', 'date_joined',
            'profile_picture_url', 'bio', 'skills',
            'availability', 'availability_display', 'hourly_rate', # Added
            'company_name', 'company_website', # Added
            'projects_as_client', 'projects_as_freelancer'
        ]
        read_only_fields = fields

    def get_profile_picture_url(self, user):
        request = self.context.get('request')
        if user.profile_picture and hasattr(user.profile_picture, 'url') and user.profile_picture.name != 'profile_pics/default_avatar.png':
            if request: return request.build_absolute_uri(user.profile_picture.url)
            return user.profile_picture.url
        # Return default only if the field is actually the default or empty
        if request:
             default_path = f"{settings.MEDIA_URL}profile_pics/default_avatar.png"
             try: return request.build_absolute_uri(default_path)
             except Exception: pass
        return None

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
            'updated_at', # Include updated_at
            'payment_intent_id'
        ]
        # Make sure client, status, created_at, updated_at, category_display and freelancer are read-only during creation
        # category and skills_required MUST BE WRITABLE (i.e., NOT in read_only_fields)
        read_only_fields = [
            'client', 
            'client_username', 
            'status', 
            'created_at', 
            'updated_at', 
            'freelancer', # Freelancer is assigned later, not on creation
            'payment_intent_id'
        ]
        def validate(self, data):
            if data.get('amount') is not None and data['amount'] <= 0:
                raise serializers.ValidationError("Bid amount must be positive.")
            # We can add more specific status validation here if needed
            # e.g., ensure status is one of the allowed choices
            return data

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
            # 'status',
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
    
class UserProfileUpdateSerializer(serializers.ModelSerializer):
    skills = serializers.PrimaryKeyRelatedField(queryset=Skill.objects.all(), many=True, required=False)
    profile_picture_url = serializers.SerializerMethodField(read_only=True) # Add this to see URL in response

    class Meta:
        model = User
        fields = [
            'name', 'bio', 'skills', 'profile_picture', 'profile_picture_url', # Added URL field here too
            'availability', 'hourly_rate', 'company_name', 'company_website' # Added new fields
        ]
        extra_kwargs = {
            'profile_picture': {'required': False, 'allow_null': True, 'use_url': False}, # use_url=False because we send file
            'bio': {'required': False, 'allow_blank': True},
            'name': {'required': False, 'allow_blank': False},
            'availability': {'required': False, 'allow_null': True},
            'hourly_rate': {'required': False, 'allow_null': True},
            'company_name': {'required': False, 'allow_blank': True},
            'company_website': {'required': False, 'allow_blank': True},
        }

    # Use the same method as Public serializer to get URL for response
    def get_profile_picture_url(self, user):
        request = self.context.get('request')
        if user.profile_picture and hasattr(user.profile_picture, 'url') and user.profile_picture.name != 'profile_pics/default_avatar.png':
            if request: return request.build_absolute_uri(user.profile_picture.url)
            return user.profile_picture.url
        if request:
             default_path = f"{settings.MEDIA_URL}profile_pics/default_avatar.png"
             try: return request.build_absolute_uri(default_path)
             except Exception: pass
        return None

    def validate(self, data):
        user = self.instance
        if user:
            if user.role == User.Role.CLIENT:
                # Disallow setting freelancer fields if they are actually provided in data
                if data.get('availability') is not None: raise serializers.ValidationError({"availability": "Clients cannot set availability."})
                if data.get('hourly_rate') is not None: raise serializers.ValidationError({"hourly_rate": "Clients cannot set an hourly rate."})
                if 'skills' in data and set(user.skills.values_list('pk', flat=True)) != set(data.get('skills', [])):
                     raise serializers.ValidationError({"skills": "Clients cannot set skills."})
            elif user.role == User.Role.FREELANCER:
                 # Disallow setting client fields if they are provided and not blank
                 if data.get('company_name'): raise serializers.ValidationError({"company_name": "Freelancers cannot set company information."})
                 if data.get('company_website'): raise serializers.ValidationError({"company_website": "Freelancers cannot set company information."})
        return data