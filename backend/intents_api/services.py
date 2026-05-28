from dataclasses import dataclass
from datetime import date, timedelta

from django.db import transaction

from .models import Intent, Task, ActivityLog, Notification

@dataclass(frozen=True)
class TaskGenerationResult:
    tasks: list[Task]
    generated: bool
    message: str


class TaskGenerationService:
    RULES = (
        (
            ('learn', 'study', 'course'),
            (
                'Basics / Introduction',
                'Core Concepts',
                'Practice / Exercises',
                'Projects',
                'Revision',
            ),
        ),
        (
            ('fitness', 'gym', 'workout'),
            (
                'Warm-up',
                'Strength training',
                'Cardio',
                'Cool down',
            ),
        ),
        (
            ('exam', 'crack', 'prepare'),
            (
                'Syllabus breakdown',
                'Daily study plan',
                'Practice tests',
                'Revision schedule',
            ),
        ),
    )

    FALLBACK_TASKS = (
        'Clarify outcome',
        'Break down milestones',
        'Start first action',
        'Track progress',
        'Review results',
    )

    @classmethod
    def generate_for_intent(cls, intent: Intent, *, force: bool = False) -> TaskGenerationResult:
        existing_tasks = list(intent.tasks.order_by('created_at', 'id'))

        if existing_tasks and not force:
            return TaskGenerationResult(
                tasks=existing_tasks,
                generated=False,
                message='Tasks already exist',
            )

        task_titles = cls.get_task_titles(intent.title)

        with transaction.atomic():
            if force:
                intent.tasks.all().delete()

            tasks = [
                Task(intent=intent, title=title, status=Task.Status.PENDING)
                for title in task_titles
            ]
            created_tasks = Task.objects.bulk_create(tasks)

        return TaskGenerationResult(
            tasks=created_tasks,
            generated=True,
            message='Tasks generated successfully',
        )

    @classmethod
    def get_task_titles(cls, intent_title: str) -> tuple[str, ...]:
        normalized_title = intent_title.lower()

        for keywords, task_titles in cls.RULES:
            if any(keyword in normalized_title for keyword in keywords):
                return task_titles

        return cls.FALLBACK_TASKS


@dataclass(frozen=True)
class SchedulingResult:
    tasks: list[Task]
    scheduled: bool
    message: str


class SchedulingService:
    @classmethod
    def schedule_intent_tasks(cls, intent: Intent, *, force: bool = False, duration: int = None) -> SchedulingResult:
        tasks = list(intent.tasks.order_by('created_at', 'id'))
        
        if not tasks:
            return SchedulingResult(
                tasks=[],
                scheduled=False,
                message='No tasks to schedule'
            )

        tasks_to_schedule = tasks
        if not force:
            tasks_to_schedule = [t for t in tasks if not t.due_date]
            
        if not tasks_to_schedule:
            return SchedulingResult(
                tasks=tasks,
                scheduled=False,
                message='All tasks are already scheduled'
            )

        # Distribute tasks evenly. For simple case, 1 task per day.
        # Handle buffer: every 5th day is a buffer day (skip it).
        current_date = date.today()
        day_count = 1
        
        tasks_updated = []
        for task in tasks_to_schedule:
            # Check for buffer day
            if day_count % 5 == 0:
                # Buffer day, skip assignment and move to next day
                current_date += timedelta(days=1)
                day_count += 1
            
            task.due_date = current_date
            task.day_number = day_count
            tasks_updated.append(task)
            
            # Move to next day
            current_date += timedelta(days=1)
            day_count += 1

        with transaction.atomic():
            Task.objects.bulk_update(tasks_updated, ['due_date', 'day_number'])

        return SchedulingResult(
            tasks=tasks,
            scheduled=True,
            message='Schedule generated successfully'
        )

@dataclass(frozen=True)
class AdaptationResult:
    rescheduled_count: int
    workload_limit: int
    recovery_days_inserted: int
    message: str

class AdaptationEngine:
    DEFAULT_LIMIT = 4
    RECOVERY_LIMIT = 2

    @classmethod
    def get_status(cls, user) -> dict:
        from django.utils import timezone
        today = timezone.localdate()
        seven_days_ago = timezone.now() - timedelta(days=7)

        completed_recent = ActivityLog.objects.filter(
            related_intent__user=user,
            event_type=ActivityLog.EventType.TASK_COMPLETED,
            timestamp__gte=seven_days_ago
        ).count()

        missed_recent = Task.objects.filter(
            intent__user=user,
            status=Task.Status.PENDING,
            due_date__lt=today,
        ).count()

        workload_limit = cls.DEFAULT_LIMIT
        if completed_recent > 5 and missed_recent == 0:
            workload_limit = 5
        elif missed_recent > 3:
            workload_limit = 3

        return {
            'workload_limit': workload_limit,
            'recent_completed': completed_recent,
            'recent_missed': missed_recent,
            'needs_recovery': missed_recent > 3,
            'message': 'Adaptation status generated.'
        }

    @classmethod
    def run_adaptation(cls, user) -> AdaptationResult:
        from django.utils import timezone
        today = timezone.localdate()

        status = cls.get_status(user)
        workload_limit = status['workload_limit']
        needs_recovery = status['needs_recovery']

        tasks = list(Task.objects.filter(intent__user=user, status=Task.Status.PENDING).order_by('due_date', 'created_at'))
        
        overdue_tasks = [t for t in tasks if t.due_date and t.due_date < today]
        rescheduled_count = len(overdue_tasks)

        future_tasks = [t for t in tasks if t.due_date and t.due_date >= today]
        unscheduled_tasks = [t for t in tasks if not t.due_date]

        all_tasks = overdue_tasks + future_tasks + unscheduled_tasks
        
        tasks_updated = []
        daily_count = {}
        
        recovery_days_inserted = 1 if needs_recovery else 0

        for task in all_tasks:
            if task in overdue_tasks or not task.due_date:
                preferred_date = today
            else:
                preferred_date = task.due_date
                
            assigned_date = preferred_date
            while True:
                if needs_recovery and assigned_date == today:
                    limit = cls.RECOVERY_LIMIT
                else:
                    limit = workload_limit
                    
                if daily_count.get(assigned_date, 0) < limit:
                    break
                assigned_date += timedelta(days=1)
                
            task.due_date = assigned_date
            daily_count[assigned_date] = daily_count.get(assigned_date, 0) + 1
            tasks_updated.append(task)

        with transaction.atomic():
            Task.objects.bulk_update(tasks_updated, ['due_date'])
            
            if rescheduled_count > 0 or recovery_days_inserted > 0:
                message = f"We adapted your schedule! {rescheduled_count} tasks were moved."
                if recovery_days_inserted > 0:
                    message += " Added some recovery time since you've missed a few."
                
                Notification.objects.create(
                    user=user,
                    title="Schedule Adjusted",
                    message=message,
                    type=Notification.NotificationType.ADAPTATION_UPDATE
                )

        return AdaptationResult(
            rescheduled_count=rescheduled_count,
            workload_limit=workload_limit,
            recovery_days_inserted=recovery_days_inserted,
            message='Adaptation run successfully'
        )

