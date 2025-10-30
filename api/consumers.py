# In api/consumers.py
import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import Message, ChatRoom, User
from .serializers import MessageSerializer

class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.room_id = self.scope['url_route']['kwargs']['room_id']
        self.room_group_name = f'chat_{self.room_id}'
        self.user = self.scope['user']

        # --- UPDATED: More verbose logging for connect ---
        if not self.user or not self.user.is_authenticated:
            print(f"WebSocket REJECT: User is not authenticated. Closing connection.")
            await self.close()
            return
        
        print(f"WebSocket trying to connect: User {self.user.username} (ID: {self.user.pk}) to Room {self.room_id}")

        # Check if the user is a participant
        if not await self.is_participant(self.room_id, self.user):
            print(f"WebSocket REJECT: User {self.user.username} is NOT a participant in room {self.room_id}. Closing connection.")
            await self.close()
            return
        # --- END UPDATED ---

        # Add the user to the room's group
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )

        # Accept the connection
        await self.accept()
        print(f"WebSocket SUCCESS: User {self.user.username} connected to room {self.room_id}")

    async def disconnect(self, close_code):
        if hasattr(self, 'room_group_name'): # Check if group name was set
            await self.channel_layer.group_discard(
                self.room_group_name,
                self.channel_name
            )
        print(f"WebSocket disconnected from room {getattr(self, 'room_id', 'N/A')}")

    # Receive message from WebSocket
    async def receive(self, text_data):
        data = json.loads(text_data)
        message_content = data.get('message')

        if not message_content:
            return

        message = await self.save_message(message_content)
        serializer = MessageSerializer(message)
        
        await self.channel_layer.group_send(
            self.room_group_name,
            {'type': 'chat_message', 'message': serializer.data}
        )

    # Handler for messages broadcast from the group
    async def chat_message(self, event):
        message = event['message']
        await self.send(text_data=json.dumps(message))

    # --- Database Helper Methods ---
    
    @database_sync_to_async
    def is_participant(self, room_id, user):
        """
        Check if a user is a participant in the given room.
        """
        try:
            # Check if a room exists with this ID
            room = ChatRoom.objects.get(id=room_id)
            # Check if the user is in the participants list
            if user in room.participants.all():
                print(f"Auth check: User {user.username} IS a participant.")
                return True
            else:
                print(f"Auth check: User {user.username} is NOT in participant list for room {room_id}.")
                return False
        except ChatRoom.DoesNotExist:
            print(f"Auth check: ChatRoom with ID {room_id} does not exist.")
            return False
        except Exception as e:
            print(f"Auth check (is_participant) error: {e}")
            return False

    @database_sync_to_async
    def save_message(self, content):
        """
Save a new message to the database.
        """
        room = ChatRoom.objects.get(id=self.room_id)
        message = Message.objects.create(
            room=room,
            sender=self.user,
            content=content
        )
        room.save() # Update the room's 'updated_at' timestamp
        return message