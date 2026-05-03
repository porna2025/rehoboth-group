"""
URLs — Techniciens
Préfixe : /api/v1/techniciens/
"""

from django.urls import path
from . import views

urlpatterns = [
    # ── Catégories (public) ───────────────────────────────────────────────────
    path('categories/', views.liste_categories, name='liste_categories'),
    path('categories/creer/', views.creer_categorie, name='creer_categorie'),
    path('categories/<uuid:pk>/', views.modifier_categorie, name='modifier_categorie'),

    # ── Mon profil technicien ─────────────────────────────────────────────────
    path('profil/', views.mon_profil_technicien, name='mon_profil_tech'),
    path('profil/creer/', views.creer_mon_profil, name='creer_profil'),
    path('profil/position/', views.mettre_a_jour_position, name='maj_position'),
    path('profil/documents/', views.ajouter_document, name='ajouter_document'),
    path('profil/disponibilites/', views.mes_disponibilites, name='disponibilites'),

    # ── Administration ────────────────────────────────────────────────────────
    path('admin/en-attente/', views.techniciens_en_attente, name='tech_en_attente'),
    path('admin/<int:pk>/valider/', views.valider_technicien, name='valider_tech'),

    # ── Techniciens (public) ──────────────────────────────────────────────────
    path('', views.liste_techniciens, name='liste_techniciens'),
    path('<str:pk>/', views.detail_technicien, name='detail_technicien'),
]
