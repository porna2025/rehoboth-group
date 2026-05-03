from django.contrib import admin
from .models import Evaluation


@admin.register(Evaluation)
class EvaluationAdmin(admin.ModelAdmin):
    list_display = ['client', 'technicien', 'note', 'commentaire', 'created_at']
    list_filter = ['note']
    search_fields = ['client__nom', 'technicien__nom', 'commentaire']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
