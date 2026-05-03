"""
Modèle Evaluation — Note et commentaire d'un client sur un technicien
"""

import uuid
from django.conf import settings
from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from apps.demandes.models import Demande


class Evaluation(models.Model):
    """
    Évaluation d'un technicien par le client après une mission terminée.
    Déclenche automatiquement le recalcul de la note moyenne du technicien.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    demande = models.OneToOneField(
        Demande, on_delete=models.CASCADE,
        related_name='evaluation',
        verbose_name='Demande évaluée'
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='evaluations_donnees',
        verbose_name='Client évaluateur'
    )
    technicien = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='evaluations_recues',
        verbose_name='Technicien évalué'
    )
    note = models.IntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name='Note (1 à 5)'
    )
    commentaire = models.TextField(blank=True, verbose_name='Commentaire')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'evaluations'
        verbose_name = 'Évaluation'
        verbose_name_plural = 'Évaluations'
        ordering = ['-created_at']

    def __str__(self):
        etoiles = '★' * self.note + '☆' * (5 - self.note)
        return f"{etoiles} par {self.client.nom_complet} → {self.technicien.nom_complet}"

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Recalcule automatiquement la note moyenne du technicien
        try:
            self.technicien.profil_technicien.recalculer_note()
        except Exception:
            pass
