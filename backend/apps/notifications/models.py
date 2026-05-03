"""
Modèles — Notifications in-app et push mobile
"""

import uuid
from django.conf import settings
from django.db import models


class Notification(models.Model):
    """Notification envoyée à un utilisateur (in-app + push FCM)."""

    # Types de notifications
    DEMANDE_RECUE = 'demande_recue'
    DEMANDE_ACCEPTEE = 'demande_acceptee'
    DEMANDE_REFUSEE = 'demande_refusee'
    TECHNICIEN_EN_ROUTE = 'technicien_en_route'
    INTERVENTION_TERMINEE = 'intervention_terminee'
    PAIEMENT_RECU = 'paiement_recu'
    RETRAIT_EFFECTUE = 'retrait_effectue'
    EVALUATION_RECUE = 'evaluation_recue'
    MESSAGE_RECU = 'message_recu'
    COMPTE_VALIDE = 'compte_valide'
    COMPTE_REJETE = 'compte_rejete'
    SYSTEME = 'systeme'

    TYPE_CHOICES = [
        (DEMANDE_RECUE, 'Nouvelle demande reçue'),
        (DEMANDE_ACCEPTEE, 'Demande acceptée'),
        (DEMANDE_REFUSEE, 'Demande refusée'),
        (TECHNICIEN_EN_ROUTE, 'Technicien en route'),
        (INTERVENTION_TERMINEE, 'Intervention terminée'),
        (PAIEMENT_RECU, 'Paiement reçu'),
        (RETRAIT_EFFECTUE, 'Retrait effectué'),
        (EVALUATION_RECUE, 'Évaluation reçue'),
        (MESSAGE_RECU, 'Nouveau message'),
        (COMPTE_VALIDE, 'Compte validé'),
        (COMPTE_REJETE, 'Compte rejeté'),
        (SYSTEME, 'Notification système'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name='Destinataire'
    )
    type_notif = models.CharField(
        max_length=30, choices=TYPE_CHOICES,
        default=SYSTEME, verbose_name='Type'
    )
    titre = models.CharField(max_length=150, verbose_name='Titre')
    message = models.TextField(verbose_name='Contenu du message')

    # Lien optionnel vers l'objet concerné (demande, paiement, etc.)
    objet_id = models.UUIDField(null=True, blank=True, verbose_name='ID objet lié')
    objet_type = models.CharField(max_length=50, blank=True, verbose_name='Type objet lié')

    lu = models.BooleanField(default=False, verbose_name='Lue')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notifications'
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-created_at']

    def __str__(self):
        statut = '✓' if self.lu else '●'
        return f"{statut} [{self.get_type_notif_display()}] → {self.destinataire.email}"
