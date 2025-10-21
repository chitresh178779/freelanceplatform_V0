from rest_framework import serializers
from .models import User, Project

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