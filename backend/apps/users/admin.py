"""Interface d'administration Django pour les utilisateurs."""

from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from django.apps import apps
from .models import Administrateur, Client, Technicien, User


admin.site.site_header = 'Administration Rehoboth Groupe'
admin.site.site_title = 'Rehoboth Admin'
admin.site.index_title = 'Gestion des comptes, catégories et opérations'


class BaseCompteAdmin(BaseUserAdmin):
    list_display = ['email', 'nom_complet_display', 'role', 'est_actif', 'est_verifie', 'created_at']
    list_filter = ['role', 'est_actif', 'est_verifie', 'created_at']
    search_fields = ['email', 'nom', 'prenom', 'telephone']
    ordering = ['-created_at']
    list_per_page = 25
    date_hierarchy = 'created_at'

    fieldsets = (
        (None, {
            'fields': ('email', 'password')
        }),
        ('Informations personnelles', {
            'fields': ('nom', 'prenom', 'telephone', 'photo_profil')
        }),
        ('Rôle et statut', {
            'fields': ('role', 'est_actif', 'est_verifie', 'fcm_token')
        }),
        ('Permissions Django', {
            'classes': ('collapse',),
            'fields': ('is_staff', 'is_superuser', 'groups', 'user_permissions'),
        }),
        ('Dates', {
            'classes': ('collapse',),
            'fields': ('created_at', 'updated_at', 'last_login'),
        }),
    )

    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('email', 'nom', 'prenom', 'role', 'password1', 'password2'),
        }),
    )

    readonly_fields = ['created_at', 'updated_at', 'last_login']
    fixed_role = None
    hide_from_index = False

    def nom_complet_display(self, obj):
        return obj.nom_complet

    nom_complet_display.short_description = 'Nom complet'

    actions = ['activer_comptes', 'suspendre_comptes', 'supprimer_comptes']

    def get_fieldsets(self, request, obj=None):
        fieldsets = super().get_fieldsets(request, obj)
        if not self.fixed_role:
            return fieldsets

        updated_fieldsets = []
        for title, options in fieldsets:
            fields = options.get('fields', ())
            cleaned_fields = tuple(field for field in fields if field != 'role')
            updated_fieldsets.append((title, {**options, 'fields': cleaned_fields}))
        return tuple(updated_fieldsets)

    def get_add_fieldsets(self, request, obj=None):
        fieldsets = super().get_add_fieldsets(request, obj)
        if not self.fixed_role:
            return fieldsets

        updated_fieldsets = []
        for title, options in fieldsets:
            fields = options.get('fields', ())
            cleaned_fields = tuple(field for field in fields if field != 'role')
            updated_fieldsets.append((title, {**options, 'fields': cleaned_fields}))
        return tuple(updated_fieldsets)

    def get_queryset(self, request):
        queryset = super().get_queryset(request)
        if self.fixed_role:
            return queryset.filter(role=self.fixed_role)
        return queryset

    def get_model_perms(self, request):
        if self.hide_from_index:
            return {}
        return super().get_model_perms(request)

    def save_model(self, request, obj, form, change):
        if self.fixed_role:
            obj.role = self.fixed_role
        super().save_model(request, obj, form, change)

    def valider_comptes(self, request, queryset):
        updated = queryset.exclude(role=User.ADMIN).update(
            est_verifie=True,
            est_actif=True,
            is_active=True,
        )
        self.message_user(request, f"{updated} compte(s) validé(s).")

    valider_comptes.short_description = 'Valider les comptes sélectionnés'

    def activer_comptes(self, request, queryset):
        updated = queryset.exclude(role=User.ADMIN).update(est_actif=True, is_active=True)
        self.message_user(request, f"{updated} compte(s) activé(s).")

    activer_comptes.short_description = "Activer les comptes sélectionnés"

    def suspendre_comptes(self, request, queryset):
        updated = queryset.exclude(role=User.ADMIN).update(est_actif=False, is_active=False)
        self.message_user(request, f"{updated} compte(s) suspendu(s).")

    suspendre_comptes.short_description = "Suspendre les comptes sélectionnés"

    def supprimer_comptes(self, request, queryset):
        comptes = queryset.exclude(role=User.ADMIN)
        total = comptes.count()
        comptes.delete()
        self.message_user(
            request,
            f"{total} compte(s) supprimé(s).",
            level=messages.WARNING,
        )

    supprimer_comptes.short_description = "Supprimer les comptes sélectionnés"


@admin.register(User)
class UserAdmin(BaseCompteAdmin):
    hide_from_index = True


@admin.register(Client)
class ClientAdmin(BaseCompteAdmin):
    fixed_role = User.CLIENT
    list_display = ['email', 'nom_complet_display', 'est_actif', 'est_verifie', 'created_at']
    list_filter = ['est_actif', 'est_verifie', 'created_at']
    actions = ['valider_comptes', 'suspendre_comptes', 'supprimer_comptes']


@admin.register(Technicien)
class TechnicienAdmin(BaseCompteAdmin):
    fixed_role = User.TECHNICIEN
    list_display = [
        'email',
        'nom_complet_display',
        'statut_validation_display',
        'est_actif',
        'est_verifie',
        'created_at',
    ]
    list_filter = ['est_actif', 'est_verifie', 'created_at', 'profil_technicien__statut_validation']
    actions = ['valider_comptes', 'suspendre_comptes', 'supprimer_comptes']
    list_select_related = ['profil_technicien']

    def get_queryset(self, request):
        return super().get_queryset(request).select_related('profil_technicien')

    def statut_validation_display(self, obj):
        profil = getattr(obj, 'profil_technicien', None)
        if profil is None:
            return 'Aucun profil'
        return profil.get_statut_validation_display()

    statut_validation_display.short_description = 'Validation profil'

    def valider_comptes(self, request, queryset):
        profil_technicien_model = apps.get_model('techniciens', 'ProfilTechnicien')
        comptes = queryset.filter(role=User.TECHNICIEN)
        super().valider_comptes(request, comptes)
        profils_valides = profil_technicien_model.objects.filter(user__in=comptes).update(
            statut_validation=profil_technicien_model.VALIDE
        )
        self.message_user(
            request,
            f"{comptes.count()} compte(s) technicien traité(s), {profils_valides} profil(s) validé(s).",
        )

    valider_comptes.short_description = 'Valider les comptes techniciens sélectionnés'


@admin.register(Administrateur)
class AdministrateurAdmin(BaseCompteAdmin):
    fixed_role = User.ADMIN
    list_display = ['email', 'nom_complet_display', 'is_staff', 'is_superuser', 'created_at']
    list_filter = ['is_staff', 'is_superuser', 'created_at']
    actions = []

    def save_model(self, request, obj, form, change):
        obj.role = User.ADMIN
        obj.is_staff = True
        super().save_model(request, obj, form, change)
