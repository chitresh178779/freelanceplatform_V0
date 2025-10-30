# In api/auth_middleware.py
from django.contrib.auth import get_user_model
from django.contrib.auth.models import AnonymousUser
from channels.db import database_sync_to_async
from channels.middleware import BaseMiddleware
from rest_framework_simplejwt.tokens import AccessToken
from urllib.parse import parse_qs

User = get_user_model()

@database_sync_to_async
def get_user_from_token(token_key):
    """
    Get user from an access token.
    """
    try:
        # Validate the token
        token = AccessToken(token_key)
        # Get user ID from token payload
        user_id = token['user_id']
        # Get user from database
        return User.objects.get(id=int(user_id))
    except Exception as e:
        print(f"Token auth failed: {e}")
        return AnonymousUser()

class TokenAuthMiddleware(BaseMiddleware):
    """
    Custom WebSocket middleware to authenticate user via JWT in query string.
    """
    async def __call__(self, scope, receive, send):
        # Get query string from scope
        query_string = scope.get('query_string', b'').decode('utf-8')
        # Parse query string to get token
        query_params = parse_qs(query_string)
        token = query_params.get('token', [None])[0]

        if token:
            # If token provided, try to authenticate
            scope['user'] = await get_user_from_token(token)
        else:
            # If no token, user is anonymous
            scope['user'] = AnonymousUser()
        
        # Continue to the next middleware or consumer
        return await super().__call__(scope, receive, send)