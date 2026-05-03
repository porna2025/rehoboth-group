from django.contrib import admin
from .models import Demande, PhotoDemande, Message


@admin.register(Demande)
class DemandeAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'categorie', 'statut', 'type_intervention', 'technicien', 'created_at']
    list_filter = ['statut', 'type_intervention', 'mode', 'categorie']
    search_fields = ['client__nom', 'client__email', 'description', 'adresse']
    ordering = ['-created_at']
    readonly_fields = ['created_at', 'updated_at']
    date_hierarchy = 'created_at'

    fieldsets = (
        ('Demande', {'fields': ('client', 'technicien', 'categorie', 'statut')}),
        ('Détails', {'fields': ('description', 'adresse', 'latitude', 'longitude',
                                'type_intervention', 'mode', 'date_souhaitee')}),
        ('Résultat', {'fields': ('rapport', 'montant_devis')}),
        ('Dates', {'classes': ('collapse',), 'fields': ('created_at', 'updated_at')}),
    )


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['expediteur', 'demande', 'contenu', 'lu', 'created_at']
    list_filter = ['lu']
    search_fields = ['expediteur__nom', 'contenu']
    ordering = ['-created_at']
