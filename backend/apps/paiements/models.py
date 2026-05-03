"""
Modèles — Paiements et retraits
"""

import uuid
from decimal import Decimal, ROUND_HALF_UP
from django.conf import settings
from django.db import models
from apps.demandes.models import Demande


class Paiement(models.Model):
    """Paiement d'une mission terminée par le client."""

    # Statuts
    EN_ATTENTE = 'en_attente'
    REUSSI = 'reussi'
    ECHOUE = 'echoue'
    REMBOURSE = 'rembourse'

    STATUT_CHOICES = [
        (EN_ATTENTE, 'En attente'),
        (REUSSI, 'Réussi'),
        (ECHOUE, 'Échoué'),
        (REMBOURSE, 'Remboursé'),
    ]

    # Méthodes de paiement
    MOBILE_MONEY = 'mobile_money'
    CARTE = 'carte'
    ESPECES = 'especes'

    METHODE_CHOICES = [
        (MOBILE_MONEY, 'Mobile Money (Orange/Wave/MTN)'),
        (CARTE, 'Carte bancaire'),
        (ESPECES, 'Espèces'),
    ]

    TAUX_COMMISSION = 0.10  # 10% de commission plateforme

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    demande = models.OneToOneField(
        Demande, on_delete=models.CASCADE,
        related_name='paiement',
        verbose_name='Demande associée'
    )
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='paiements_effectues',
        verbose_name='Client payeur'
    )
    montant = models.DecimalField(max_digits=12, decimal_places=2, verbose_name='Montant (FCFA)')
    commission = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    montant_technicien = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)
    methode = models.CharField(max_length=20, choices=METHODE_CHOICES)
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default=EN_ATTENTE)
    transaction_id = models.CharField(max_length=200, blank=True)
    telephone_paiement = models.CharField(max_length=20, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'paiements'
        verbose_name = 'Paiement'
        verbose_name_plural = 'Paiements'
        ordering = ['-created_at']

    def __str__(self):
        return f"Paiement #{str(self.id)[:8]} — {self.montant} FCFA ({self.get_statut_display()})"

    def calculer_commission(self):
        """Calcule et définit la commission (10%) et le montant net pour le technicien."""
        montant = Decimal(self.montant)
        taux = Decimal(str(self.TAUX_COMMISSION))
        self.commission = (montant * taux).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        self.montant_technicien = (montant - self.commission).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)


class Retrait(models.Model):
    """Demande de retrait du solde par un technicien."""

    EN_ATTENTE = 'en_attente'
    EFFECTUE = 'effectue'
    REFUSE = 'refuse'

    STATUT_CHOICES = [
        (EN_ATTENTE, 'En attente'),
        (EFFECTUE, 'Effectué'),
        (REFUSE, 'Refusé'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    technicien = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='retraits',
        verbose_name='Technicien'
    )
    montant = models.DecimalField(max_digits=12, decimal_places=2)
    telephone = models.CharField(max_length=20, verbose_name='Numéro Mobile Money')
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default=EN_ATTENTE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'retraits'
        verbose_name = 'Retrait'
        verbose_name_plural = 'Retraits'
        ordering = ['-created_at']

    def __str__(self):
        return f"Retrait {self.montant} FCFA — {self.technicien.nom_complet} ({self.get_statut_display()})"
