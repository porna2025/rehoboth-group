"""
URLs REST — Notifications
Préfixe : /api/v1/notifications/   (configuré dans config/urls.py)
"""

from django.urls import path
from . import views

app_name = 'notifications'

urlpatterns = [
    # Liste paginée  →  GET  /api/v1/notifications/
    # Filtrage :        GET  /api/v1/notifications/?non_lues=true
    path('', views.mes_notifications, name='mes_notifications'),

    # Compteur        →  GET  /api/v1/notifications/non-lues/
    path('non-lues/', views.compteur_non_lues, name='compteur_non_lues'),

    # Tout marquer lus → POST /api/v1/notifications/lire-tout/
    path('lire-tout/', views.marquer_tout_lue, name='marquer_tout_lue'),

    # Marquer une seule → POST /api/v1/notifications/<uuid>/lire/
    path('<uuid:pk>/lire/', views.marquer_lue, name='marquer_lue'),

    # Supprimer        → DELETE /api/v1/notifications/<uuid>/supprimer/
    path('<uuid:pk>/supprimer/', views.supprimer_notification, name='supprimer_notification'),
]
