"""
Modèles — Demandes d'intervention, photos, messages du chat
"""

import uuid
from django.conf import settings
from django.db import models


class Demande(models.Model):
    """
    Demande d'intervention soumise par un client.
    Cycle de vie : EN_ATTENTE → ACCEPTÉE → EN_ROUTE → EN_COURS → TERMINÉE / ANNULÉE
    """

    # ── Statuts ──────────────────────────────────────────────────────────────
    EN_ATTENTE = 'en_attente'
    ACCEPTEE = 'acceptee'
    EN_ROUTE = 'en_route'
    EN_COURS = 'en_cours'
    TERMINEE = 'terminee'
    ANNULEE = 'annulee'

    STATUT_CHOICES = [
        (EN_ATTENTE, 'En attente'),
        (ACCEPTEE, 'Acceptée'),
        (EN_ROUTE, 'Technicien en route'),
        (EN_COURS, 'Intervention en cours'),
        (TERMINEE, 'Terminée'),
        (ANNULEE, 'Annulée'),
    ]

    # ── Types d'intervention ─────────────────────────────────────────────────
    IMMEDIAT = 'immediat'
    PLANIFIE = 'planifie'

    TYPE_CHOICES = [
        (IMMEDIAT, 'Immédiat (urgent)'),
        (PLANIFIE, 'Planifié (date choisie)'),
    ]

    # ── Modes ────────────────────────────────────────────────────────────────
    SUR_PLACE = 'sur_place'
    A_DISTANCE = 'a_distance'

    MODE_CHOICES = [
        (SUR_PLACE, 'Sur place (déplacement)'),
        (A_DISTANCE, 'À distance (téléphone/vidéo)'),
    ]

    # ── Champs ───────────────────────────────────────────────────────────────
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='demandes_client',
        verbose_name='Client'
    )
    technicien = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='demandes_technicien',
        verbose_name='Technicien assigné'
    )
    categorie = models.ForeignKey(
        'techniciens.Categorie',
        on_delete=models.SET_NULL,
        null=True,
        verbose_name='Catégorie de service'
    )

    # Description
    description = models.TextField(verbose_name='Description du problème')
    adresse = models.CharField(max_length=300, blank=True, default='', verbose_name='Adresse d\'intervention')
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='Latitude GPS')
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True, verbose_name='Longitude GPS')

    # Type et mode
    type_intervention = models.CharField(max_length=20, choices=TYPE_CHOICES, default=IMMEDIAT)
    mode = models.CharField(max_length=20, choices=MODE_CHOICES, default=SUR_PLACE)
    date_souhaitee = models.DateTimeField(null=True, blank=True, verbose_name='Date souhaitée')

    # Suivi
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default=EN_ATTENTE)
    rapport = models.TextField(blank=True, verbose_name='Rapport du technicien')
    montant_devis = models.DecimalField(
        max_digits=10, decimal_places=2,
        null=True, blank=True,
        verbose_name='Montant du devis (FCFA)'
    )

    # Horodatages
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'demandes'
        verbose_name = 'Demande'
        verbose_name_plural = 'Demandes'
        ordering = ['-created_at']

    def __str__(self):
        return (
            f"Demande #{str(self.id)[:8].upper()} "
            f"— {self.client.nom_complet} "
            f"({self.get_statut_display()})"
        )


class PhotoDemande(models.Model):
    """Photos jointes à une demande d'intervention."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    demande = models.ForeignKey(Demande, on_delete=models.CASCADE, related_name='photos')
    image = models.ImageField(upload_to='demandes/photos/', verbose_name='Photo')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'photos_demandes'

    def __str__(self):
        return f"Photo — Demande #{str(self.demande.id)[:8]}"


class Message(models.Model):
    """
    Message du chat entre client et technicien pour une demande.
    Stocké en base + diffusé en temps réel via WebSocket.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    demande = models.ForeignKey(Demande, on_delete=models.CASCADE, related_name='messages')
    expediteur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='messages_envoyes')
    contenu = models.TextField(verbose_name='Contenu du message')
    lu = models.BooleanField(default=False, verbose_name='Lu')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']

    def __str__(self):
        return (
            f"Message de {self.expediteur.nom_complet} "
            f"— {self.created_at.strftime('%d/%m %H:%M')}"
        )
