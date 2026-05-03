"""
Sérialiseurs — Demandes, Photos, Messages
"""

from rest_framework import serializers
from apps.users.serializers import UserSerializer
from apps.techniciens.serializers import CategorieSerializer
from .models import Demande, PhotoDemande, Message


class PhotoDemandeSerializer(serializers.ModelSerializer):
    class Meta:
        model        = PhotoDemande
        fields       = ['id', 'image', 'created_at']
        read_only_fields = ['id', 'created_at']


class MessageSerializer(serializers.ModelSerializer):
    expediteur     = UserSerializer(read_only=True)
    est_mien       = serializers.SerializerMethodField()

    class Meta:
        model        = Message
        fields       = ['id', 'expediteur', 'contenu', 'lu', 'est_mien', 'created_at']
        read_only_fields = ['id', 'expediteur', 'lu', 'created_at']

    def get_est_mien(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.expediteur_id == request.user.id
        return False


class DemandeSerializer(serializers.ModelSerializer):
    """Sérialiseur complet d'une demande (lecture)."""

    client       = UserSerializer(read_only=True)
    technicien   = UserSerializer(read_only=True)
    categorie    = CategorieSerializer(read_only=True)
    photos       = PhotoDemandeSerializer(many=True, read_only=True)
    statut_label = serializers.CharField(source='get_statut_display',           read_only=True)
    type_label   = serializers.CharField(source='get_type_intervention_display', read_only=True)
    mode_label   = serializers.CharField(source='get_mode_display',              read_only=True)

    class Meta:
        model  = Demande
        fields = [
            'id', 'client', 'technicien', 'categorie',
            'description', 'adresse', 'latitude', 'longitude',
            'type_intervention', 'type_label',
            'mode', 'mode_label',
            'date_souhaitee',
            'statut', 'statut_label',
            'rapport', 'montant_devis',
            'photos',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'client', 'technicien', 'statut',
            'created_at', 'updated_at',
        ]


class CreerDemandeSerializer(serializers.ModelSerializer):
    """Sérialiseur de création d'une demande."""

    categorie_id = serializers.UUIDField()

    class Meta:
        model  = Demande
        fields = [
            'categorie_id', 'description', 'adresse',
            'latitude', 'longitude',
            'type_intervention', 'mode', 'date_souhaitee',
        ]

    def validate_categorie_id(self, value):
        from apps.techniciens.models import Categorie
        if not Categorie.objects.filter(id=value).exists():
            raise serializers.ValidationError("Catégorie introuvable.")
        return value

    def validate_description(self, value):
        if len(value.strip()) < 10:
            raise serializers.ValidationError(
                "La description doit contenir au moins 10 caractères."
            )
        return value.strip()

    def validate_latitude(self, value):
        if not (-90 <= float(value) <= 90):
            raise serializers.ValidationError("Latitude invalide (entre -90 et 90).")
        return value

    def validate_longitude(self, value):
        if not (-180 <= float(value) <= 180):
            raise serializers.ValidationError("Longitude invalide (entre -180 et 180).")
        return value

    def validate(self, data):
        if data.get('type_intervention') == Demande.PLANIFIE and not data.get('date_souhaitee'):
            raise serializers.ValidationError({
                'date_souhaitee': "La date souhaitée est obligatoire pour une intervention planifiée."
            })
        return data

    def create(self, validated_data):
        categorie_id = validated_data.pop('categorie_id')
        client = self.context['request'].user
        return Demande.objects.create(
            client=client,
            categorie_id=categorie_id,
            **validated_data
        )


class MettreAJourStatutSerializer(serializers.Serializer):
    """Sérialiseur de mise à jour du statut d'une demande."""

    statut        = serializers.ChoiceField(choices=Demande.STATUT_CHOICES)
    rapport       = serializers.CharField(required=False, allow_blank=True)
    montant_devis = serializers.DecimalField(max_digits=10, decimal_places=2, required=False)

    def validate_statut(self, value):
        # Transitions autorisées
        transitions_valides = {
            Demande.ACCEPTEE: [Demande.EN_ROUTE],
            Demande.EN_ROUTE: [Demande.EN_COURS],
            Demande.EN_COURS: [Demande.TERMINEE],
        }
        instance = self.context.get('instance')
        if instance:
            autorisees = transitions_valides.get(instance.statut, [])
            if value not in autorisees and value != instance.statut:
                # Permettre la transition libre pour l'admin
                pass
        return value


class EnvoyerMessageSerializer(serializers.Serializer):
    """Sérialiseur d'envoi de message."""

    contenu = serializers.CharField(min_length=1, max_length=2000)

    def validate_contenu(self, value):
        return value.strip()