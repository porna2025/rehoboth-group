"""
URLs — Paiements et retraits
Préfixe : /api/v1/paiements/
"""

from django.urls import path
from . import views

urlpatterns = [
    # Client
    path('initier/', views.initier_paiement, name='initier_paiement'),
    path('mes-paiements/', views.mes_paiements, name='mes_paiements'),
    path('verifier/<str:transaction_id>/', views.verifier_paiement, name='verifier_paiement'),

    # Technicien
    path('mes-revenus/', views.mes_revenus, name='mes_revenus'),
    path('retrait/', views.demander_retrait, name='demander_retrait'),

    # Admin
    path('admin/rapport/', views.rapport_financier, name='rapport_financier'),
    path('admin/retraits/<uuid:pk>/traiter/', views.traiter_retrait, name='traiter_retrait'),

    # Webhook CinetPay (pas d'auth — appelé par CinetPay)
    path('cinetpay/notify/', views.cinetpay_notify, name='cinetpay_notify'),
]
