# In backend/asgi.py
import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
# REMOVED: from channels.auth import AuthMiddlewareStack
from api.auth_middleware import TokenAuthMiddleware # Import our custom middleware
import api.routing

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

django_asgi_app = get_asgi_application()

application = ProtocolTypeRouter({
    "http": django_asgi_app,
    "websocket": TokenAuthMiddleware( 
        URLRouter(
            api.routing.websocket_urlpatterns
        )
    ),
})