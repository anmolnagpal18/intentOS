from django.core.management.base import BaseCommand
from django.utils import timezone
from intents_api.models import Task, Notification, ActivityLog
from django.contrib.auth.models import User
from datetime import timedelta

class Command(BaseCommand):
    help = 'Generates scheduled notifications for tasks, streaks, and summaries'

    def handle(self, *args, **kwargs):
        today = timezone.localdate()
        users = User.objects.all()

        for user in users:
            self._generate_task_due_reminders(user, today)
            self._generate_task_overdue_reminders(user, today)
            self._generate_streak_alerts(user, today)
            self._generate_daily_summary(user, today)

        self.stdout.write(self.style.SUCCESS('Successfully generated notifications'))

    def _generate_task_due_reminders(self, user, today):
        tasks = Task.objects.filter(intent__user=user, status=Task.Status.PENDING, due_date=today)
        for task in tasks:
            title = f"Task Due Today: {task.title}"
            message = f"Don't forget to complete '{task.title}' today!"
            
            # Prevent duplicate notification for the same task on the same day
            if not Notification.objects.filter(user=user, type=Notification.NotificationType.TASK_DUE, message=message).exists():
                Notification.objects.create(
                    user=user,
                    title=title,
                    message=message,
                    type=Notification.NotificationType.TASK_DUE
                )

    def _generate_task_overdue_reminders(self, user, today):
        tasks = Task.objects.filter(intent__user=user, status=Task.Status.PENDING, due_date__lt=today)
        for task in tasks:
            title = f"Overdue Task: {task.title}"
            message = f"'{task.title}' was due on {task.due_date}. Try to finish it soon!"
            
            # Prevent duplicate notification for the same task
            if not Notification.objects.filter(user=user, type=Notification.NotificationType.TASK_OVERDUE, message=message).exists():
                Notification.objects.create(
                    user=user,
                    title=title,
                    message=message,
                    type=Notification.NotificationType.TASK_OVERDUE
                )

    def _generate_streak_alerts(self, user, today):
        yesterday = today - timedelta(days=1)
        
        # Check if they missed completing any task yesterday
        completed_yesterday = ActivityLog.objects.filter(
            related_intent__user=user, 
            event_type=ActivityLog.EventType.TASK_COMPLETED,
            timestamp__date=yesterday
        ).exists()

        if not completed_yesterday:
            # Maybe they missed a streak
            title = "Keep Your Momentum!"
            message = "You didn't complete any tasks yesterday. Complete one today to keep your progress moving!"
            
            # Send at most one streak alert per day
            if not Notification.objects.filter(user=user, type=Notification.NotificationType.STREAK_ALERT, created_at__date=today).exists():
                Notification.objects.create(
                    user=user,
                    title=title,
                    message=message,
                    type=Notification.NotificationType.STREAK_ALERT
                )

    def _generate_daily_summary(self, user, today):
        total_tasks = Task.objects.filter(intent__user=user).count()
        if total_tasks == 0:
            return

        due_today = Task.objects.filter(intent__user=user, status=Task.Status.PENDING, due_date=today).count()
        overdue = Task.objects.filter(intent__user=user, status=Task.Status.PENDING, due_date__lt=today).count()
        
        title = "Daily Productivity Summary"
        message = f"You have {due_today} tasks due today and {overdue} overdue tasks."
        
        # Send at most one daily summary per day
        if not Notification.objects.filter(user=user, type=Notification.NotificationType.DAILY_SUMMARY, created_at__date=today).exists():
            Notification.objects.create(
                user=user,
                title=title,
                message=message,
                type=Notification.NotificationType.DAILY_SUMMARY
            )
