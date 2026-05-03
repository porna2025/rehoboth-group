"""
Sérialiseurs pour l'authentification et la gestion des utilisateurs
"""

from rest_framework import serializers
from django.contrib.auth import authenticate
from .models import User


class InscriptionSerializer(serializers.ModelSerializer):
    """Sérialiseur d'inscription — valide et crée un nouvel utilisateur."""

    password = serializers.CharField(write_only=True, min_length=8, style={'input_type': 'password'})
    password2 = serializers.CharField(write_only=True, style={'input_type': 'password'})

    class Meta:
        model = User
        fields = ['email', 'nom', 'prenom', 'telephone', 'role', 'password', 'password2']

    def validate_email(self, value):
        if User.objects.filter(email=value.lower()).exists():
            raise serializers.ValidationError("Un compte avec cet email existe déjà.")
        return value.lower()

    def validate_role(self, value):
        if value == User.ADMIN:
            raise serializers.ValidationError(
                "Impossible de créer un compte administrateur via l'API."
            )
        return value

    def validate(self, data):
        if data['password'] != data['password2']:
            raise serializers.ValidationError({
                "password": "Les deux mots de passe ne correspondent pas."
            })
        return data

    def create(self, validated_data):
        validated_data.pop('password2')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class ConnexionSerializer(serializers.Serializer):
    """Sérialiseur de connexion — vérifie les identifiants."""

    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email', '').lower()
        password = data.get('password', '')

        if not email or not password:
            raise serializers.ValidationError("Email et mot de passe obligatoires.")

        user = authenticate(request=self.context.get('request'), email=email, password=password)

        if user is None:
            raise serializers.ValidationError({
                "non_field_errors": ["Email ou mot de passe incorrect."]
            })

        if not user.est_actif:
            raise serializers.ValidationError({
                "non_field_errors": ["Ce compte a été suspendu. Contactez l'administrateur."]
            })

        data['user'] = user
        return data


class VerificationOTPSerializer(serializers.Serializer):
    """Sérialiseur de validation du code OTP de connexion."""

    email = serializers.EmailField()
    otp_code = serializers.CharField(min_length=6, max_length=6)
    otp_session_token = serializers.CharField(min_length=16, max_length=64)

    def validate(self, data):
        email = data.get('email', '').lower()
        otp_code = data.get('otp_code', '').strip()
        otp_session_token = data.get('otp_session_token', '').strip()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                'non_field_errors': ["Challenge de connexion introuvable."]
            })

        if not user.est_actif:
            raise serializers.ValidationError({
                'non_field_errors': ["Ce compte a été suspendu. Contactez l'administrateur."]
            })

        if not user.otp_code or not user.otp_session_token or not user.otp_expires_at:
            raise serializers.ValidationError({
                'non_field_errors': ["Aucun code de vérification en attente pour ce compte."]
            })

        from django.utils import timezone

        if user.otp_session_token != otp_session_token:
            raise serializers.ValidationError({
                'non_field_errors': ["Session de vérification invalide. Reconnectez-vous."]
            })

        if timezone.now() > user.otp_expires_at:
            raise serializers.ValidationError({
                'non_field_errors': ["Le code de vérification a expiré. Reconnectez-vous."]
            })

        if user.otp_code != otp_code:
            raise serializers.ValidationError({
                'non_field_errors': ["Code de vérification incorrect."]
            })

        data['user'] = user
        return data


class RenvoiOTPSerializer(serializers.Serializer):
    """Sérialiseur de renvoi d'un code OTP de connexion."""

    email = serializers.EmailField()
    otp_session_token = serializers.CharField(min_length=16, max_length=64)

    def validate(self, data):
        email = data.get('email', '').lower()
        otp_session_token = data.get('otp_session_token', '').strip()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                'non_field_errors': ["Challenge de connexion introuvable."]
            })

        if not user.otp_session_token or user.otp_session_token != otp_session_token:
            raise serializers.ValidationError({
                'non_field_errors': ["Session OTP invalide. Reconnectez-vous."]
            })

        data['user'] = user
        return data


class ForgotPasswordRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class ForgotPasswordConfirmSerializer(serializers.Serializer):
    email = serializers.EmailField()
    reset_code = serializers.CharField(min_length=6, max_length=6)
    reset_token = serializers.CharField(min_length=16, max_length=64)
    new_password = serializers.CharField(min_length=8, write_only=True)
    new_password2 = serializers.CharField(write_only=True)

    def validate(self, data):
        email = data.get('email', '').lower()
        reset_code = data.get('reset_code', '').strip()
        reset_token = data.get('reset_token', '').strip()

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            raise serializers.ValidationError({
                'non_field_errors': ["Demande de réinitialisation introuvable."]
            })

        if data['new_password'] != data['new_password2']:
            raise serializers.ValidationError({
                'new_password': "Les deux mots de passe ne correspondent pas."
            })

        if not user.password_reset_code or not user.password_reset_token or not user.password_reset_expires_at:
            raise serializers.ValidationError({
                'non_field_errors': ["Aucune réinitialisation en attente pour ce compte."]
            })

        from django.utils import timezone

        if user.password_reset_token != reset_token:
            raise serializers.ValidationError({
                'non_field_errors': ["Session de réinitialisation invalide."]
            })

        if timezone.now() > user.password_reset_expires_at:
            raise serializers.ValidationError({
                'non_field_errors': ["Le code de réinitialisation a expiré."]
            })

        if user.password_reset_code != reset_code:
            raise serializers.ValidationError({
                'non_field_errors': ["Code de réinitialisation incorrect."]
            })

        data['user'] = user
        return data


class UserSerializer(serializers.ModelSerializer):
    """Sérialiseur principal — lecture du profil utilisateur."""

    nom_complet = serializers.ReadOnlyField()
    photo_profil = serializers.SerializerMethodField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'nom', 'prenom', 'telephone',
            'role', 'photo_profil', 'est_verifie', 'est_actif', 'two_factor_enabled',
            'nom_complet', 'created_at',
        ]
        read_only_fields = ['id', 'est_verifie', 'created_at']

    def get_photo_profil(self, obj):
        """Retourne l'URL de la photo ou None."""
        if obj.photo_profil:
            try:
                return obj.photo_profil.url
            except Exception:
                return None
        return None


class ModifierProfilSerializer(serializers.ModelSerializer):
    """Sérialiseur de modification du profil."""

    class Meta:
        model = User
        fields = ['nom', 'prenom', 'telephone', 'photo_profil']


class ChangerMotDePasseSerializer(serializers.Serializer):
    """Sérialiseur de changement de mot de passe."""

    ancien_mot_de_passe = serializers.CharField(write_only=True)
    nouveau_mot_de_passe = serializers.CharField(write_only=True, min_length=8)

    def validate_ancien_mot_de_passe(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("L'ancien mot de passe est incorrect.")
        return value

    def validate_nouveau_mot_de_passe(self, value):
        user = self.context['request'].user
        if user.check_password(value):
            raise serializers.ValidationError(
                "Le nouveau mot de passe doit être différent de l'ancien."
            )
        return value

    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['nouveau_mot_de_passe'])
        user.save(update_fields=['password', 'updated_at'])
        return user


class UserAdminSerializer(serializers.ModelSerializer):
    """Sérialiseur admin — accès à tous les champs."""

    nom_complet = serializers.ReadOnlyField()

    class Meta:
        model = User
        fields = [
            'id', 'email', 'nom', 'prenom', 'telephone',
            'role', 'est_verifie', 'est_actif', 'two_factor_enabled', 'nom_complet',
            'fcm_token', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
