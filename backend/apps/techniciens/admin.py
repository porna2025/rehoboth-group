from django.contrib import admin
from .models import Categorie, ProfilTechnicien, DocumentTechnicien, Disponibilite


@admin.register(Categorie)
class CategorieAdmin(admin.ModelAdmin):
    list_display = ['nom', 'icone', 'description_courte', 'nb_techniciens_valides', 'created_at']
    search_fields = ['nom', 'description']
    ordering = ['nom']
    list_per_page = 20

    def description_courte(self, obj):
        if not obj.description:
            return '—'
        return obj.description[:60] + ('…' if len(obj.description) > 60 else '')

    description_courte.short_description = 'Description'


@admin.register(ProfilTechnicien)
class ProfilTechnicienAdmin(admin.ModelAdmin):
    list_display = ['user', 'specialite', 'categorie', 'statut_validation', 'disponible', 'note_moyenne', 'nb_missions']
    list_filter = ['statut_validation', 'disponible', 'categorie']
    search_fields = ['user__email', 'user__nom', 'user__prenom', 'specialite']
    ordering = ['-created_at']
    readonly_fields = ['note_moyenne', 'nb_evaluations', 'nb_missions', 'created_at', 'updated_at']
    list_editable = ['statut_validation', 'disponible']
    list_select_related = ['user', 'categorie']

    actions = ['valider_profils', 'rejeter_profils']

    def valider_profils(self, request, queryset):
        queryset.update(statut_validation=ProfilTechnicien.VALIDE)
        self.message_user(request, f"{queryset.count()} profil(s) validé(s).")

    valider_profils.short_description = "Valider les profils sélectionnés"

    def rejeter_profils(self, request, queryset):
        queryset.update(statut_validation=ProfilTechnicien.REJETE)
        self.message_user(request, f"{queryset.count()} profil(s) rejeté(s).")

    rejeter_profils.short_description = "Rejeter les profils sélectionnés"


@admin.register(DocumentTechnicien)
class DocumentTechnicienAdmin(admin.ModelAdmin):
    list_display = ['technicien', 'type_doc', 'created_at']
    list_filter = ['type_doc']
    search_fields = ['technicien__user__email']


@admin.register(Disponibilite)
class DisponibiliteAdmin(admin.ModelAdmin):
    list_display = ['technicien', 'jour_semaine', 'heure_debut', 'heure_fin']
    list_filter = ['jour_semaine']

