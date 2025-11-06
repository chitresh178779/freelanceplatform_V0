from rest_framework.permissions import BasePermission
from rest_framework import permissions
from .models import User, Bid, Project

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

class IsAssignedFreelancer(permissions.BasePermission):
    """
    Object-level permission to only allow the assigned freelancer to interact.
    Assumes the view is operating on a Project object.
    """
    def has_object_permission(self, request, view, obj):
        if isinstance(obj, Project):
            return obj.freelancer == request.user
        return False