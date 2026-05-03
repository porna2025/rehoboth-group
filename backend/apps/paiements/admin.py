from django.contrib import admin
from .models import Paiement, Retrait


@admin.register(Paiement)
class PaiementAdmin(admin.ModelAdmin):
    list_display = ['id', 'client', 'montant', 'commission', 'methode', 'statut', 'created_at']
    list_filter = ['statut', 'methode']
    search_fields = ['client__nom', 'client__email', 'transaction_id']
    ordering = ['-created_at']
    readonly_fields = ['commission', 'montant_technicien', 'created_at', 'updated_at']


@admin.register(Retrait)
class RetraitAdmin(admin.ModelAdmin):
    list_display = ['technicien', 'montant', 'telephone', 'statut', 'created_at']
    list_filter = ['statut']
    search_fields = ['technicien__nom', 'technicien__email']
    ordering = ['-created_at']
    readonly_fields = ['created_at']
