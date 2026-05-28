import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from .models import TeamMembership

class IntentOSConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return

        self.groups_to_join = []
        
        # 1. Join user-specific channel
        user_group_name = f"user_{self.user.id}"
        self.groups_to_join.append(user_group_name)

        # 2. Join team-specific channels
        team_ids = await self.get_user_teams(self.user.id)
        for team_id in team_ids:
            self.groups_to_join.append(f"team_{team_id}")

        for group_name in self.groups_to_join:
            await self.channel_layer.group_add(
                group_name,
                self.channel_name
            )

        await self.accept()

    async def disconnect(self, close_code):
        if not hasattr(self, 'user') or self.user.is_anonymous:
            return

        for group_name in getattr(self, 'groups_to_join', []):
            await self.channel_layer.group_discard(
                group_name,
                self.channel_name
            )

    # Handlers for real-time events triggered from channel layer
    async def broadcast_event(self, event):
        """
        Custom event handler that forwards any message with type="broadcast_event"
        to the websocket client.
        """
        await self.send(text_data=json.dumps({
            'type': event.get('event_type'),
            'payload': event.get('payload', {})
        }))

    @database_sync_to_async
    def get_user_teams(self, user_id):
        memberships = TeamMembership.objects.filter(user_id=user_id).values_list('team_id', flat=True)
        return list(memberships)
