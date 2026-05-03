"""
URLs — Authentification et gestion des utilisateurs
Préfixe : /api/v1/auth/
"""

from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

urlpatterns = [
    # ── Authentification ──────────────────────────────────────────────────────
    path('inscription/', views.inscription, name='inscription'),
    path('connexion/', views.connexion, name='connexion'),
    path('connexion/verifier-otp/', views.verifier_otp_connexion, name='verifier_otp_connexion'),
    path('connexion/renvoyer-otp/', views.renvoyer_otp_connexion, name='renvoyer_otp_connexion'),
    path('mot-de-passe-oublie/', views.forgot_password_request, name='forgot_password_request'),
    path('mot-de-passe-oublie/confirmer/', views.forgot_password_confirm, name='forgot_password_confirm'),
    path('deconnexion/', views.deconnexion, name='deconnexion'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),

    # ── Profil personnel ──────────────────────────────────────────────────────
    path('profil/', views.mon_profil, name='mon_profil'),
    path('changer-mot-de-passe/', views.changer_mot_de_passe, name='changer_mdp'),

    # ── Administration ────────────────────────────────────────────────────────
    path('admin/utilisateurs/', views.liste_utilisateurs, name='liste_utilisateurs'),
    path('admin/utilisateurs/<uuid:pk>/', views.detail_utilisateur, name='detail_utilisateur'),
    path('admin/utilisateurs/<uuid:pk>/suspendre/', views.suspendre_utilisateur, name='suspendre'),
    path('admin/utilisateurs/<uuid:pk>/valider/', views.valider_utilisateur, name='valider_utilisateur'),
    path('admin/utilisateurs/<uuid:pk>/supprimer/', views.supprimer_utilisateur, name='supprimer_utilisateur'),
]
