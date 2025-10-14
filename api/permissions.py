from rest_framework.permissions import BasePermission

class IsClient(BasePermission):
    """
    Allows access only to users with the 'CLIENT' role.
    """
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'CLIENT'