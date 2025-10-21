from rest_framework.permissions import BasePermission
from .models import User

class IsClient(BasePermission):
    """
    Allows access only to users with the 'CLIENT' role.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'CLIENT'
    
class IsFreelancer(BasePermission):
    """
    Allows access only to authenticated users with the 'FREELANCER' role.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.role == User.Role.FREELANCER # Use Enum/Choices value
        )