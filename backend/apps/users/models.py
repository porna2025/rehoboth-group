"""
Modèle utilisateur personnalisé — Rehoboth Groupe
Remplace le User Django par défaut pour ajouter le rôle et les champs métier
"""

import uuid
from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models


class UserManager(BaseUserManager):
    """Manager personnalisé : utilise l'email à la place du username."""

    def create_user(self, email, password=None, **extra_fields):
        if not email:
            raise ValueError("L'adresse email est obligatoire.")
        email = self.normalize_email(email)
        extra_fields.setdefault('is_active', True)
        user = self.model(email=email, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user

    def create_superuser(self, email, password=None, **extra_fields):
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('role', 'admin')
        extra_fields.setdefault('est_verifie', True)
        extra_fields.setdefault('est_actif', True)

        if not extra_fields.get('is_staff'):
            raise ValueError("Le superutilisateur doit avoir is_staff=True.")
        if not extra_fields.get('is_superuser'):
            raise ValueError("Le superutilisateur doit avoir is_superuser=True.")

        return self.create_user(email, password, **extra_fields)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Modèle utilisateur central de la plateforme.
    Trois rôles possibles : client, technicien, admin.
    """

    CLIENT = 'client'
    TECHNICIEN = 'technicien'
    ADMIN = 'admin'

    ROLE_CHOICES = [
        (CLIENT, 'Client'),
        (TECHNICIEN, 'Technicien'),
        (ADMIN, 'Administrateur'),
    ]

    # Clé primaire UUID (plus sécurisée que l'auto-incrément)
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Informations personnelles
    email = models.EmailField(unique=True, verbose_name='Adresse email')
    nom = models.CharField(max_length=100, verbose_name='Nom de famille')
    prenom = models.CharField(max_length=100, verbose_name='Prénom')
    telephone = models.CharField(
        max_length=20, unique=True, null=True, blank=True,
        verbose_name='Numéro de téléphone'
    )
    photo_profil = models.ImageField(
        upload_to='profils/', null=True, blank=True,
        verbose_name='Photo de profil'
    )

    # Rôle et statut
    role = models.CharField(
        max_length=20, choices=ROLE_CHOICES, default=CLIENT,
        verbose_name='Rôle'
    )
    est_verifie = models.BooleanField(default=False, verbose_name='Compte vérifié')
    est_actif = models.BooleanField(default=True, verbose_name='Compte actif')

    # Token Firebase pour les notifications push mobiles
    fcm_token = models.CharField(max_length=500, null=True, blank=True, verbose_name='Token FCM')

    # Double authentification par code email
    two_factor_enabled = models.BooleanField(default=True, verbose_name='Double authentification activée')
    otp_code = models.CharField(max_length=6, null=True, blank=True, verbose_name='Code OTP temporaire')
    otp_expires_at = models.DateTimeField(null=True, blank=True, verbose_name='Expiration du code OTP')
    otp_session_token = models.CharField(max_length=64, null=True, blank=True, verbose_name='Jeton de challenge OTP')
    password_reset_code = models.CharField(max_length=6, null=True, blank=True, verbose_name='Code de réinitialisation')
    password_reset_expires_at = models.DateTimeField(null=True, blank=True, verbose_name='Expiration du code de réinitialisation')
    password_reset_token = models.CharField(max_length=64, null=True, blank=True, verbose_name='Jeton de réinitialisation')

    # Champs requis par Django
    is_staff = models.BooleanField(default=False)
    is_active = models.BooleanField(default=True)

    # Horodatages
    created_at = models.DateTimeField(auto_now_add=True, verbose_name='Date de création')
    updated_at = models.DateTimeField(auto_now=True, verbose_name='Dernière modification')

    USERNAME_FIELD = 'email'
    REQUIRED_FIELDS = ['nom', 'prenom']

    objects = UserManager()

    class Meta:
        db_table = 'users'
        verbose_name = 'Utilisateur'
        verbose_name_plural = 'Utilisateurs'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.prenom} {self.nom} <{self.email}> ({self.get_role_display()})"

    # ── Propriétés utiles ────────────────────────────────────────────────────

    @property
    def nom_complet(self):
        """Retourne le nom complet : Prénom Nom."""
        return f"{self.prenom} {self.nom}"

    @property
    def is_client(self):
        return self.role == self.CLIENT

    @property
    def is_technicien(self):
        return self.role == self.TECHNICIEN

    @property
    def is_admin_user(self):
        return self.role == self.ADMIN


class ClientManager(UserManager):
    def get_queryset(self):
        return super().get_queryset().filter(role=User.CLIENT)

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', User.CLIENT)
        return super().create_user(email, password, **extra_fields)


class TechnicienManager(UserManager):
    def get_queryset(self):
        return super().get_queryset().filter(role=User.TECHNICIEN)

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', User.TECHNICIEN)
        return super().create_user(email, password, **extra_fields)


class Client(User):
    objects = ClientManager()

    class Meta:
        proxy = True
        verbose_name = 'Compte client'
        verbose_name_plural = 'Comptes clients'


class Technicien(User):
    objects = TechnicienManager()

    class Meta:
        proxy = True
        verbose_name = 'Compte technicien'
        verbose_name_plural = 'Comptes techniciens'


class AdminManager(UserManager):
    def get_queryset(self):
        return super().get_queryset().filter(role=User.ADMIN)

    def create_user(self, email, password=None, **extra_fields):
        extra_fields.setdefault('role', User.ADMIN)
        extra_fields.setdefault('is_staff', True)
        return super().create_user(email, password, **extra_fields)


class Administrateur(User):
    objects = AdminManager()

    class Meta:
        proxy = True
        verbose_name = 'Administrateur'
        verbose_name_plural = 'Administrateurs'
