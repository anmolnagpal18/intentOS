from django.contrib import admin
from .models import Intent, Task


@admin.register(Intent)
class IntentAdmin(admin.ModelAdmin):
    list_display = ('title', 'created_at')
    search_fields = ('title', 'description')


@admin.register(Task)
class TaskAdmin(admin.ModelAdmin):
    list_display = ('title', 'intent', 'status', 'due_date', 'created_at')
    list_filter = ('status', 'due_date')
    search_fields = ('title', 'description', 'intent__title')
