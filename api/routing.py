# In api/routing.py
from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # Route for WebSocket connections, captures 'room_id'
    re_path(r'ws/chat/(?P<room_id>\d+)/$', consumers.ChatConsumer.as_asgi()),
]