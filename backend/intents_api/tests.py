from django.urls import reverse
from rest_framework import status
from rest_framework.test import APITestCase

from .models import Intent, Task


from django.contrib.auth.models import User

class TaskApiTests(APITestCase):
    def setUp(self):
        self.user = User.objects.create_user(username='testuser', password='password')
        self.client.force_authenticate(user=self.user)
        self.intent = Intent.objects.create(title='Launch project', user=self.user)
        self.other_intent = Intent.objects.create(title='Plan week', user=self.user)

    def test_create_task_for_intent(self):
        response = self.client.post(
            reverse('task-list'),
            {'intent': self.intent.id, 'title': 'Draft checklist'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['intent'], self.intent.id)
        self.assertEqual(response.data['title'], 'Draft checklist')
        self.assertEqual(response.data['status'], Task.Status.PENDING)

    def test_rejects_empty_task_title(self):
        response = self.client.post(
            reverse('task-list'),
            {'intent': self.intent.id, 'title': '   '},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('title', response.data)

    def test_lists_and_filters_tasks_by_intent(self):
        task = Task.objects.create(intent=self.intent, title='Write plan')
        Task.objects.create(intent=self.other_intent, title='Buy supplies')

        response = self.client.get(reverse('task-list'), {'intent_id': self.intent.id})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data), 1)
        self.assertEqual(response.data[0]['id'], task.id)

    def test_updates_task_status(self):
        task = Task.objects.create(intent=self.intent, title='Ship feature')

        response = self.client.patch(
            reverse('task-detail', args=[task.id]),
            {'status': Task.Status.COMPLETED},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        task.refresh_from_db()
        self.assertEqual(task.status, Task.Status.COMPLETED)

    def test_deletes_task(self):
        task = Task.objects.create(intent=self.intent, title='Remove clutter')

        response = self.client.delete(reverse('task-detail', args=[task.id]))

        self.assertEqual(response.status_code, status.HTTP_204_NO_CONTENT)
        self.assertFalse(Task.objects.filter(id=task.id).exists())

    def test_creates_tasks_for_learning_intent(self):
        response = self.client.post(
            reverse('intent-list'),
            {'title': 'Learn Django REST Framework'},
            format='json',
        )

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        intent = Intent.objects.get(id=response.data['id'])
        self.assertEqual(
            list(intent.tasks.order_by('created_at').values_list('title', flat=True)),
            [
                'Basics / Introduction',
                'Core Concepts',
                'Practice / Exercises',
                'Projects',
                'Revision',
            ],
        )
        self.assertEqual(intent.tasks.filter(status=Task.Status.PENDING).count(), 5)

    def test_generate_tasks_endpoint_does_not_duplicate_existing_tasks(self):
        Task.objects.create(intent=self.intent, title='Existing task')

        response = self.client.post(reverse('intent-generate-tasks', args=[self.intent.id]))

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response.data['message'], 'Tasks already exist')
        self.assertFalse(response.data['generated'])
        self.assertEqual(self.intent.tasks.count(), 1)

    def test_generate_tasks_endpoint_creates_exam_tasks(self):
        intent = Intent.objects.create(title='Prepare for civil service exam', user=self.user)

        response = self.client.post(reverse('intent-generate-tasks', args=[intent.id]))

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['message'], 'Tasks generated successfully')
        self.assertEqual(
            [task['title'] for task in response.data['tasks']],
            [
                'Syllabus breakdown',
                'Daily study plan',
                'Practice tests',
                'Revision schedule',
            ],
        )
        self.assertEqual(intent.tasks.count(), 4)
