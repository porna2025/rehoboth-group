"""
URLs — Demandes et messagerie
Préfixe : /api/v1/demandes/
"""

from django.urls import path
from . import views

urlpatterns = [
    # ── Client ────────────────────────────────────────────────────────────────
    path('',                              views.creer_demande,        name='creer_demande'),
    path('mes-demandes/',                 views.mes_demandes,         name='mes_demandes'),

    # ── Technicien ────────────────────────────────────────────────────────────
    path('disponibles/',                  views.demandes_disponibles, name='demandes_disponibles'),
    path('mes-missions/',                 views.mes_missions,         name='mes_missions'),

    # ── Admin ─────────────────────────────────────────────────────────────────
    path('admin/toutes/',                 views.toutes_les_demandes,  name='toutes_demandes'),

    # ── Détail et actions sur une demande ─────────────────────────────────────
    path('<uuid:pk>/',                    views.detail_demande,       name='detail_demande'),
    path('<uuid:pk>/accepter/',           views.accepter_demande,     name='accepter_demande'),
    path('<uuid:pk>/statut/',             views.mettre_a_jour_statut, name='maj_statut'),
    path('<uuid:pk>/annuler/',            views.annuler_demande,      name='annuler_demande'),

    # ── Messagerie ────────────────────────────────────────────────────────────
    path('<uuid:pk>/messages/',           views.messages_demande,     name='messages_demande'),
    path('<uuid:pk>/messages/envoyer/',   views.envoyer_message,      name='envoyer_message'),
]