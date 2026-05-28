from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from .models import Task, Notification, ActivityLog, Intent
from .serializers import TaskSerializer, NotificationSerializer

def broadcast_to_user(user_id, event_type, payload):
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"user_{user_id}",
            {
                "type": "broadcast_event",
                "event_type": event_type,
                "payload": payload
            }
        )

def broadcast_to_team(team_id, event_type, payload):
    channel_layer = get_channel_layer()
    if channel_layer:
        async_to_sync(channel_layer.group_send)(
            f"team_{team_id}",
            {
                "type": "broadcast_event",
                "event_type": event_type,
                "payload": payload
            }
        )

@receiver(post_save, sender=Task)
def task_saved(sender, instance, created, **kwargs):
    # Only broadcast updates to existing tasks here.
    # New tasks and task completions are handled via ActivityLog creation for a more unified event stream,
    # but we also might need immediate task updates if it's just a title change or assignment.
    # Let's send a general task_updated event to ensure UI is in sync.
    if not created:
        payload = TaskSerializer(instance).data
        if instance.assigned_to:
            broadcast_to_user(instance.assigned_to.id, 'task_updated', payload)
        # Also broadcast to intent's user
        broadcast_to_user(instance.intent.user.id, 'task_updated', payload)
        if instance.intent.team:
            broadcast_to_team(instance.intent.team.id, 'task_updated', payload)

@receiver(post_save, sender=ActivityLog)
def activity_log_created(sender, instance, created, **kwargs):
    if created:
        # Construct basic payload
        payload = {
            'id': instance.id,
            'event_type': instance.event_type,
            'timestamp': instance.timestamp.isoformat(),
            'metadata': instance.metadata
        }
        
        # Include task data if available
        if instance.related_task:
            payload['task'] = TaskSerializer(instance.related_task).data
        
        intent = instance.related_intent
        if intent:
            broadcast_to_user(intent.user.id, instance.event_type, payload)
            if intent.team:
                broadcast_to_team(intent.team.id, instance.event_type, payload)

@receiver(post_save, sender=Notification)
def notification_created(sender, instance, created, **kwargs):
    if created:
        payload = NotificationSerializer(instance).data
        broadcast_to_user(instance.user.id, 'notification_created', payload)

