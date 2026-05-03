"""
Modèles — Techniciens : profils, catégories, documents, disponibilités
"""

import uuid
from django.conf import settings
from django.db import models

class Categorie(models.Model):
    """Catégorie de service : plomberie, électricité, informatique..."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    nom = models.CharField(max_length=100, unique=True, verbose_name='Nom')
    description = models.TextField(blank=True, verbose_name='Description')
    icone = models.CharField(max_length=100, blank=True, verbose_name='Icône (emoji ou nom)')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'categories'
        verbose_name = 'Catégorie'
        verbose_name_plural = 'Catégories'
        ordering = ['nom']

    def __str__(self):
        return f"{self.icone} {self.nom}" if self.icone else self.nom

    def nb_techniciens_valides(self):
        return self.techniciens.filter(statut_validation=ProfilTechnicien.VALIDE).count()


class ProfilTechnicien(models.Model):
    """
    Profil professionnel d'un technicien.
    Lié en OneToOne avec le modèle User.
    """

    EN_ATTENTE = 'en_attente'
    VALIDE = 'valide'
    REJETE = 'rejete'

    STATUT_CHOICES = [
        (EN_ATTENTE, 'En attente de validation'),
        (VALIDE, 'Validé'),
        (REJETE, 'Rejeté'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE,
        related_name='profil_technicien',
        verbose_name='Utilisateur'
    )
    categorie = models.ForeignKey(
        Categorie, on_delete=models.SET_NULL,
        null=True, related_name='techniciens',
        verbose_name='Catégorie de service'
    )

    # Informations professionnelles
    specialite = models.CharField(max_length=150, verbose_name='Spécialité')
    description = models.TextField(blank=True, verbose_name='Description des services')
    tarif_horaire = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True)
    zone_couverture = models.CharField(max_length=200, blank=True)
    annees_experience = models.IntegerField(default=0)

    # Géolocalisation GPS
    latitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)
    longitude = models.DecimalField(max_digits=10, decimal_places=7, null=True, blank=True)

    # Statistiques (calculées automatiquement)
    note_moyenne = models.DecimalField(max_digits=3, decimal_places=2, default=0.00)
    nb_evaluations = models.IntegerField(default=0)
    nb_missions = models.IntegerField(default=0)

    # Statut
    disponible = models.BooleanField(default=False)
    statut_validation = models.CharField(
        max_length=20, choices=STATUT_CHOICES,
        default=EN_ATTENTE
    )

    # Finance
    solde = models.DecimalField(max_digits=12, decimal_places=2, default=0.00)

    # Horodatages
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'profils_techniciens'
        verbose_name = 'Profil Technicien'
        verbose_name_plural = 'Profils Techniciens'

    def __str__(self):
        return f"{self.user.nom_complet} — {self.specialite} ({self.get_statut_validation_display()})"

    def recalculer_note(self):
        """
        Recalcule la note moyenne après une nouvelle évaluation.
        Appelé automatiquement dans Evaluation.save()
        """
        from apps.evaluations.models import Evaluation
        evaluations = Evaluation.objects.filter(technicien=self.user)

        if evaluations.exists():
            total = sum(e.note for e in evaluations)
            self.note_moyenne = round(total / evaluations.count(), 2)
            self.nb_evaluations = evaluations.count()
        else:
            self.note_moyenne = 0.00
            self.nb_evaluations = 0

        self.save(update_fields=['note_moyenne', 'nb_evaluations'])


class DocumentTechnicien(models.Model):
    """Documents justificatifs soumis par le technicien."""

    CNI = 'cni'
    CERTIFICAT = 'certificat'
    DIPLOME = 'diplome'
    AUTRE = 'autre'

    TYPE_CHOICES = [
        (CNI, "Carte Nationale d'Identité"),
        (CERTIFICAT, 'Certificat professionnel'),
        (DIPLOME, 'Diplôme'),
        (AUTRE, 'Autre document'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    technicien = models.ForeignKey(
        ProfilTechnicien, on_delete=models.CASCADE,
        related_name='documents',
        verbose_name='Technicien'
    )
    type_doc = models.CharField(max_length=20, choices=TYPE_CHOICES, verbose_name='Type de document')
    fichier = models.FileField(upload_to='documents/techniciens/', verbose_name='Fichier')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'documents_techniciens'

    def __str__(self):
        return f"{self.get_type_doc_display()} — {self.technicien.user.nom_complet}"


class Disponibilite(models.Model):
    """Créneaux horaires de disponibilité hebdomadaire du technicien."""

    JOURS = [
        ('0', 'Lundi'),
        ('1', 'Mardi'),
        ('2', 'Mercredi'),
        ('3', 'Jeudi'),
        ('4', 'Vendredi'),
        ('5', 'Samedi'),
        ('6', 'Dimanche'),
    ]

    technicien = models.ForeignKey(
        ProfilTechnicien, on_delete=models.CASCADE,
        related_name='disponibilites'
    )
    jour_semaine = models.CharField(max_length=1, choices=JOURS)
    heure_debut = models.TimeField()
    heure_fin = models.TimeField()

    class Meta:
        db_table = 'disponibilites'
        unique_together = ['technicien', 'jour_semaine']

    def __str__(self):
        return f"{self.technicien.user.nom_complet} — {self.get_jour_semaine_display()} {self.heure_debut}–{self.heure_fin}"
