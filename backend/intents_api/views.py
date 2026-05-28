from rest_framework import status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Intent, Task, ActivityLog, Notification, Team, TeamMembership
from .serializers import IntentSerializer, TaskSerializer, ActivityLogSerializer, RegisterSerializer, UserSerializer, NotificationSerializer, TeamSerializer, TeamMembershipSerializer
from django.contrib.auth.models import User
from rest_framework.permissions import IsAuthenticated, AllowAny
from .services import TaskGenerationService, SchedulingService, AdaptationEngine
from django.utils import timezone
from django.db.models import Count, Q
from datetime import timedelta
from .ai_service import ai_service
from google.oauth2 import id_token
from google.auth.transport import requests as google_requests
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
import random
import string
import secrets


class AIEngineViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'], url_path='analyze-intent')
    def analyze_intent(self, request):
        text = request.data.get('text')
        if not text:
            return Response({'error': 'text is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = ai_service.analyze_intent(text)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='generate-workflow')
    def generate_workflow(self, request):
        intent_data = request.data.get('intent_data')
        text = request.data.get('text')
        if not intent_data or not text:
            return Response({'error': 'intent_data and text are required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = ai_service.generate_workflow(intent_data, text)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['get'], url_path='recommendations')
    def recommendations(self, request):
        try:
            # Gather user stats for context
            today = timezone.localdate()
            total_tasks = Task.objects.filter(intent__user=request.user).count()
            completed_tasks = Task.objects.filter(intent__user=request.user, status=Task.Status.COMPLETED).count()
            missed_tasks = Task.objects.filter(intent__user=request.user, status=Task.Status.PENDING, due_date__lt=today).count()
            
            # Additional recent activity can be useful too
            recent_completed = ActivityLog.objects.filter(
                related_intent__user=request.user,
                event_type=ActivityLog.EventType.TASK_COMPLETED,
                timestamp__gte=timezone.now() - timedelta(days=7)
            ).count()

            stats = {
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'missed_tasks': missed_tasks,
                'completed_in_last_7_days': recent_completed,
            }
            result = ai_service.get_recommendations(stats)
            return Response(result)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=False, methods=['post'], url_path='copilot')
    def copilot(self, request):
        prompt = request.data.get('prompt')
        history = request.data.get('history', [])
        json_mode = request.data.get('json_mode', False)
        if not prompt:
            return Response({'error': 'prompt is required'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            result = ai_service.chat_copilot(prompt, history, json_mode=json_mode)
            return Response({'reply': result})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AuthViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def register(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            return Response({'message': 'User created successfully.'}, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['get'])
    def profile(self, request):
        serializer = UserSerializer(request.user)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def google(self, request):
        token = request.data.get('credential')
        if not token:
            return Response({'error': 'No credential provided.'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            idinfo = id_token.verify_oauth2_token(token, google_requests.Request(), settings.GOOGLE_CLIENT_ID)

            email = idinfo.get('email')
            name = idinfo.get('name', '')
            
            if not email:
                return Response({'error': 'Email not provided by Google.'}, status=status.HTTP_400_BAD_REQUEST)

            try:
                user = User.objects.get(email=email)
            except User.DoesNotExist:
                random_password = ''.join(secrets.choice(string.ascii_letters + string.digits) for _ in range(16))
                base_username = email.split('@')[0]
                username = base_username
                counter = 1
                while User.objects.filter(username=username).exists():
                    username = f"{base_username}{counter}"
                    counter += 1
                    
                user = User.objects.create_user(
                    username=username,
                    email=email,
                    password=random_password
                )

            refresh = RefreshToken.for_user(user)

            return Response({
                'refresh': str(refresh),
                'access': str(refresh.access_token),
                'user': UserSerializer(user).data
            }, status=status.HTTP_200_OK)

        except ValueError as e:
            return Response({'error': 'Invalid Google token.'}, status=status.HTTP_400_BAD_REQUEST)

class TeamViewSet(viewsets.ModelViewSet):
    serializer_class = TeamSerializer
    
    def get_queryset(self):
        return Team.objects.filter(memberships__user=self.request.user).distinct()

    def perform_create(self, serializer):
        team = serializer.save(owner=self.request.user)
        TeamMembership.objects.create(user=self.request.user, team=team, role=TeamMembership.Role.OWNER)

    @action(detail=True, methods=['post'], url_path='invite')
    def invite(self, request, pk=None):
        team = self.get_object()
        membership = TeamMembership.objects.filter(user=request.user, team=team).first()
        if not membership or membership.role not in [TeamMembership.Role.OWNER, TeamMembership.Role.ADMIN]:
            return Response({'error': 'You do not have permission to invite members.'}, status=status.HTTP_403_FORBIDDEN)
            
        username_or_email = request.data.get('user')
        if not username_or_email:
            return Response({'error': 'User identifier is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            user_to_invite = User.objects.get(Q(username=username_or_email) | Q(email=username_or_email))
        except User.DoesNotExist:
            return Response({'error': 'User not found.'}, status=status.HTTP_404_NOT_FOUND)
            
        if TeamMembership.objects.filter(user=user_to_invite, team=team).exists():
            return Response({'error': 'User is already a member.'}, status=status.HTTP_400_BAD_REQUEST)
            
        role = request.data.get('role', TeamMembership.Role.MEMBER)
        TeamMembership.objects.create(user=user_to_invite, team=team, role=role)
        return Response({'message': 'User invited successfully.'}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='members')
    def members(self, request, pk=None):
        team = self.get_object()
        memberships = TeamMembership.objects.filter(team=team)
        return Response(TeamMembershipSerializer(memberships, many=True).data)

    @action(detail=True, methods=['post'], url_path='assign-task')
    def assign_task(self, request, pk=None):
        team = self.get_object()
        task_id = request.data.get('task_id')
        user_id = request.data.get('user_id')
        
        if not task_id:
            return Response({'error': 'Task ID is required.'}, status=status.HTTP_400_BAD_REQUEST)
            
        try:
            task = Task.objects.get(id=task_id, intent__team=team)
        except Task.DoesNotExist:
            return Response({'error': 'Task not found in this team.'}, status=status.HTTP_404_NOT_FOUND)
            
        if user_id:
            try:
                user_to_assign = User.objects.get(id=user_id, team_memberships__team=team)
                task.assigned_to = user_to_assign
            except User.DoesNotExist:
                return Response({'error': 'User not found in this team.'}, status=status.HTTP_404_NOT_FOUND)
        else:
            task.assigned_to = None
            
        task.save()
        return Response(TaskSerializer(task).data)

class IntentViewSet(viewsets.ModelViewSet):
    def get_queryset(self):
        return Intent.objects.filter(
            Q(user=self.request.user) | Q(team__memberships__user=self.request.user)
        ).distinct().order_by('-created_at')
    serializer_class = IntentSerializer

    def perform_create(self, serializer):
        intent = serializer.save(user=self.request.user)
        
        ai_tasks = self.request.data.get('ai_tasks')
        if ai_tasks and isinstance(ai_tasks, list):
            from .models import Task
            tasks_to_create = []
            for task_data in ai_tasks:
                tasks_to_create.append(Task(
                    intent=intent,
                    title=task_data.get('title'),
                    description=task_data.get('description', '')
                ))
            Task.objects.bulk_create(tasks_to_create)
        else:
            TaskGenerationService.generate_for_intent(intent)

    @action(detail=True, methods=['post'], url_path='generate-tasks')
    def generate_tasks(self, request, pk=None):
        intent = self.get_object()
        force = request.data.get('force') is True
        result = TaskGenerationService.generate_for_intent(intent, force=force)
        serializer = TaskSerializer(result.tasks, many=True)

        return Response(
            {
                'message': result.message,
                'generated': result.generated,
                'tasks': serializer.data,
            },
            status=status.HTTP_201_CREATED if result.generated else status.HTTP_200_OK,
        )

    @action(detail=True, methods=['post'], url_path='schedule')
    def schedule(self, request, pk=None):
        intent = self.get_object()
        force = request.data.get('force') is True
        duration = request.data.get('duration')
        if duration is not None:
            try:
                duration = int(duration)
            except ValueError:
                duration = None

        result = SchedulingService.schedule_intent_tasks(intent, force=force, duration=duration)
        serializer = TaskSerializer(result.tasks, many=True)

        return Response(
            {
                'message': result.message,
                'scheduled': result.scheduled,
                'tasks': serializer.data,
            },
            status=status.HTTP_201_CREATED if result.scheduled else status.HTTP_200_OK,
        )


class TaskViewSet(viewsets.ModelViewSet):
    serializer_class = TaskSerializer

    def get_queryset(self):
        queryset = Task.objects.select_related('intent').filter(
            Q(intent__user=self.request.user) | Q(intent__team__memberships__user=self.request.user)
        ).distinct().order_by('created_at', 'id')
        intent_id = self.request.query_params.get('intent_id')
        if intent_id:
            queryset = queryset.filter(intent_id=intent_id)
        return queryset

    @action(detail=True, methods=['post'], url_path='breakdown')
    def breakdown(self, request, pk=None):
        task = self.get_object()
        force = request.data.get('force') is True
        if task.subtasks and not force:
            return Response(TaskSerializer(task).data)

        try:
            intent_description = task.intent.description or task.intent.title
            subtasks = ai_service.generate_task_breakdown(task.title, intent_description)
            task.subtasks = subtasks
            task.save()
            return Response(TaskSerializer(task).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @action(detail=True, methods=['post'], url_path='study-guide')
    def study_guide(self, request, pk=None):
        task = self.get_object()
        force = request.data.get('force') is True
        if task.study_guide and not force:
            return Response(TaskSerializer(task).data)

        try:
            intent_title = task.intent.title
            guide_text = ai_service.generate_study_guide(task.title, intent_title)
            task.study_guide = guide_text
            task.save()
            return Response(TaskSerializer(task).data)
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class DashboardViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def overview(self, request):
        total_intents = Intent.objects.filter(user=request.user).count()
        total_tasks = Task.objects.filter(intent__user=request.user).count()
        completed_tasks = Task.objects.filter(intent__user=request.user, status=Task.Status.COMPLETED).count()
        pending_tasks = total_tasks - completed_tasks
        completion_percentage = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0
        
        today = timezone.localdate()
        missed_tasks_count = Task.objects.filter(intent__user=request.user, status=Task.Status.PENDING, due_date__lt=today).count()
        
        # Streak logic
        yesterday = today - timedelta(days=1)
        logs = ActivityLog.objects.filter(related_intent__user=request.user, event_type=ActivityLog.EventType.TASK_COMPLETED).order_by('-timestamp')
        dates_with_completion = sorted(list(set([log.timestamp.astimezone(timezone.get_current_timezone()).date() for log in logs])), reverse=True)
        
        current_streak = 0
        if dates_with_completion:
            current_date_to_check = today
            if dates_with_completion[0] == today:
                pass
            elif dates_with_completion[0] == yesterday:
                current_date_to_check = yesterday
            else:
                dates_with_completion = [] # Streak broken
                
            for d in dates_with_completion:
                if d == current_date_to_check:
                    current_streak += 1
                    current_date_to_check -= timedelta(days=1)
                elif d > current_date_to_check:
                    continue
                else:
                    break

        return Response({
            'total_intents': total_intents,
            'total_tasks': total_tasks,
            'completed_tasks': completed_tasks,
            'pending_tasks': pending_tasks,
            'completion_percentage': completion_percentage,
            'productivity_score': completion_percentage,
            'current_streak': current_streak,
            'missed_tasks_count': missed_tasks_count,
        })

    @action(detail=False, methods=['get'])
    def today(self, request):
        today = timezone.localdate()
        tasks = Task.objects.select_related('intent').filter(
            intent__user=request.user,
            due_date=today
        ).order_by('created_at')
        return Response(TaskSerializer(tasks, many=True).data)

    @action(detail=False, methods=['get'])
    def upcoming(self, request):
        today = timezone.localdate()
        tasks = Task.objects.select_related('intent').filter(
            intent__user=request.user,
            due_date__gt=today
        ).exclude(status=Task.Status.COMPLETED).order_by('due_date', 'created_at')
        return Response(TaskSerializer(tasks, many=True).data)

    @action(detail=False, methods=['get'])
    def progress(self, request):
        intents = Intent.objects.filter(user=request.user).annotate(
            total_tasks=Count('tasks'),
            completed_tasks=Count('tasks', filter=Q(tasks__status=Task.Status.COMPLETED))
        ).order_by('-created_at')
        
        data = []
        for intent in intents:
            percentage = round((intent.completed_tasks / intent.total_tasks * 100), 1) if intent.total_tasks > 0 else 0
            data.append({
                'id': intent.id,
                'title': intent.title,
                'total_tasks': intent.total_tasks,
                'completed_tasks': intent.completed_tasks,
                'percentage': percentage
            })
        return Response(data)
        
    @action(detail=False, methods=['get'])
    def recent(self, request):
        recent_intents = Intent.objects.filter(user=request.user).order_by('-created_at')[:5]
        recent_tasks = Task.objects.filter(intent__user=request.user, status=Task.Status.COMPLETED).select_related('intent').order_by('-created_at')[:5]
        return Response({
            'intents': IntentSerializer(recent_intents, many=True).data,
            'completed_tasks': TaskSerializer(recent_tasks, many=True).data
        })

    @action(detail=False, methods=['get'])
    def briefing(self, request):
        try:
            today = timezone.localdate()
            total_tasks = Task.objects.filter(intent__user=request.user).count()
            completed_tasks = Task.objects.filter(intent__user=request.user, status=Task.Status.COMPLETED).count()
            pending_tasks = total_tasks - completed_tasks
            missed_tasks = Task.objects.filter(intent__user=request.user, status=Task.Status.PENDING, due_date__lt=today).count()
            
            yesterday = today - timedelta(days=1)
            logs = ActivityLog.objects.filter(related_intent__user=request.user, event_type=ActivityLog.EventType.TASK_COMPLETED).order_by('-timestamp')
            dates_with_completion = sorted(list(set([log.timestamp.astimezone(timezone.get_current_timezone()).date() for log in logs])), reverse=True)
            
            streak = 0
            if dates_with_completion:
                current_date_to_check = today
                if dates_with_completion[0] == today:
                    pass
                elif dates_with_completion[0] == yesterday:
                    current_date_to_check = yesterday
                else:
                    dates_with_completion = []
                    
                for d in dates_with_completion:
                    if d == current_date_to_check:
                        streak += 1
                        current_date_to_check -= timedelta(days=1)
                    elif d > current_date_to_check:
                        continue
                    else:
                        break

            stats = {
                'total_tasks': total_tasks,
                'completed_tasks': completed_tasks,
                'pending_tasks': pending_tasks,
                'missed_tasks': missed_tasks,
                'streak': streak,
            }

            briefing_text = ai_service.get_daily_briefing(stats)
            return Response({'briefing': briefing_text})
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class AnalyticsViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['get'])
    def summary(self, request):
        today = timezone.localdate()
        total_tasks = Task.objects.filter(intent__user=request.user).count()
        completed_tasks = Task.objects.filter(intent__user=request.user, status=Task.Status.COMPLETED).count()
        pending_tasks = total_tasks - completed_tasks
        completion_percentage = round((completed_tasks / total_tasks * 100), 1) if total_tasks > 0 else 0
        missed_tasks = Task.objects.filter(intent__user=request.user, status=Task.Status.PENDING, due_date__lt=today).count()
        
        streak = self._calculate_streak(request)
        
        return Response({
            'total_completed': completed_tasks,
            'total_pending': pending_tasks,
            'completion_percentage': completion_percentage,
            'current_streak': streak,
            'missed_tasks_count': missed_tasks,
        })
        
    def _calculate_streak(self, request):
        today = timezone.localdate()
        yesterday = today - timedelta(days=1)
        
        logs = ActivityLog.objects.filter(related_intent__user=request.user, event_type=ActivityLog.EventType.TASK_COMPLETED).order_by('-timestamp')
        dates_with_completion = sorted(list(set([log.timestamp.astimezone(timezone.get_current_timezone()).date() for log in logs])), reverse=True)
        
        if not dates_with_completion:
            return 0
            
        streak = 0
        current_date_to_check = today
        
        if dates_with_completion[0] == today:
            pass
        elif dates_with_completion[0] == yesterday:
            current_date_to_check = yesterday
        else:
            return 0
            
        for d in dates_with_completion:
            if d == current_date_to_check:
                streak += 1
                current_date_to_check -= timedelta(days=1)
            elif d > current_date_to_check:
                continue
            else:
                break
                
        return streak

    @action(detail=False, methods=['get'])
    def daily(self, request):
        today = timezone.localdate()
        start_datetime = timezone.now() - timedelta(days=14)
        
        logs = ActivityLog.objects.filter(
            related_intent__user=request.user,
            event_type=ActivityLog.EventType.TASK_COMPLETED,
            timestamp__gte=start_datetime
        )
        
        counts = {}
        for log in logs:
            d = log.timestamp.astimezone(timezone.get_current_timezone()).date()
            counts[d] = counts.get(d, 0) + 1
            
        start_date = today - timedelta(days=13)
        data = []
        for i in range(14):
            d = start_date + timedelta(days=i)
            data.append({
                'date': d.isoformat(),
                'count': counts.get(d, 0)
            })
            
        return Response(data)

    @action(detail=False, methods=['get'])
    def weekly(self, request):
        today = timezone.localdate()
        start_datetime = timezone.now() - timedelta(weeks=8)
        
        logs = ActivityLog.objects.filter(
            related_intent__user=request.user,
            event_type=ActivityLog.EventType.TASK_COMPLETED,
            timestamp__gte=start_datetime
        )
        
        counts = {}
        for log in logs:
            d = log.timestamp.astimezone(timezone.get_current_timezone()).date()
            week_start = d - timedelta(days=d.weekday())
            counts[week_start] = counts.get(week_start, 0) + 1
            
        start_of_week = today - timedelta(days=today.weekday())
        start_date = start_of_week - timedelta(weeks=7)
        data = []
        for i in range(8):
            ws = start_date + timedelta(weeks=i)
            data.append({
                'week': ws.isoformat(),
                'count': counts.get(ws, 0)
            })
            
        return Response(data)
        
    @action(detail=False, methods=['get'])
    def timeline(self, request):
        logs = ActivityLog.objects.filter(related_intent__user=request.user).select_related('related_intent', 'related_task').order_by('-timestamp')[:50]
        return Response(ActivityLogSerializer(logs, many=True).data)

class AdaptationViewSet(viewsets.ViewSet):
    @action(detail=False, methods=['post'])
    def run(self, request):
        result = AdaptationEngine.run_adaptation(request.user)
        return Response({
            'message': result.message,
            'rescheduled_count': result.rescheduled_count,
            'workload_limit': result.workload_limit,
            'recovery_days_inserted': result.recovery_days_inserted,
        }, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'])
    def status(self, request):
        status_data = AdaptationEngine.get_status(request.user)
        return Response(status_data)

    @action(detail=False, methods=['post'], url_path='ai-reschedule')
    def ai_reschedule(self, request):
        today = timezone.localdate()
        overdue_tasks = Task.objects.filter(
            intent__user=request.user,
            status__in=[Task.Status.PENDING, Task.Status.IN_PROGRESS]
        ).filter(due_date__lt=today)
        
        upcoming_tasks = Task.objects.filter(
            intent__user=request.user,
            status__in=[Task.Status.PENDING, Task.Status.IN_PROGRESS]
        ).filter(due_date__gte=today, due_date__lte=today + timedelta(days=14))
        
        if not overdue_tasks.exists():
            return Response({
                'message': 'No overdue tasks found. Your schedule is up to date!',
                'rescheduled_count': 0
            }, status=status.HTTP_200_OK)
            
        tasks_list = []
        for t in overdue_tasks:
            tasks_list.append({
                'id': t.id,
                'title': t.title,
                'due_date': str(t.due_date) if t.due_date else None,
                'status': t.status,
                'is_overdue': True,
                'intent_title': t.intent.title
            })
            
        for t in upcoming_tasks:
            tasks_list.append({
                'id': t.id,
                'title': t.title,
                'due_date': str(t.due_date) if t.due_date else None,
                'status': t.status,
                'is_overdue': False,
                'intent_title': t.intent.title
            })
            
        try:
            reschedule_plan = ai_service.calculate_smart_reschedule(tasks_list, str(today))
            
            rescheduled_count = 0
            updates = []
            
            tasks_map = {t.id: t for t in Task.objects.filter(intent__user=request.user, id__in=[item.get('id') for item in reschedule_plan if item.get('id')])}
            
            for item in reschedule_plan:
                t_id = item.get('id')
                new_date_str = item.get('new_due_date')
                reasoning = item.get('reasoning', '')
                
                if t_id in tasks_map and new_date_str:
                    task = tasks_map[t_id]
                    if str(task.due_date) != new_date_str:
                        task.due_date = new_date_str
                        task.save()
                        rescheduled_count += 1
                        updates.append({
                            'task_title': task.title,
                            'new_due_date': new_date_str,
                            'reasoning': reasoning
                        })
            
            if rescheduled_count > 0:
                Notification.objects.create(
                    user=request.user,
                    title="🤖 Autopilot Reschedule Complete",
                    message=f"Smart Reschedule has adjusted {rescheduled_count} overdue tasks to balance your workload.",
                    type=Notification.NotificationType.ADAPTATION_UPDATE
                )
                
            return Response({
                'message': f'Smart Reschedule successfully redistributed {rescheduled_count} tasks!',
                'rescheduled_count': rescheduled_count,
                'updates': updates
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

class NotificationViewSet(viewsets.ModelViewSet):
    serializer_class = NotificationSerializer

    def get_queryset(self):
        return Notification.objects.filter(user=self.request.user).order_by('-created_at')

    @action(detail=True, methods=['patch'], url_path='read')
    def mark_as_read(self, request, pk=None):
        notification = self.get_object()
        notification.is_read = True
        notification.save()
        return Response({'status': 'Notification marked as read'})

    @action(detail=False, methods=['patch'], url_path='read-all')
    def mark_all_as_read(self, request):
        self.get_queryset().update(is_read=True)
        return Response({'status': 'All notifications marked as read'})

    @action(detail=False, methods=['delete'], url_path='clear-all')
    def clear_all(self, request):
        self.get_queryset().delete()
        return Response(status=status.HTTP_204_NO_CONTENT)



