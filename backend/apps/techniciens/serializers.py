"""
Sérialiseurs — Techniciens, Catégories, Documents, Disponibilités
"""

from rest_framework import serializers
from apps.users.serializers import UserSerializer
from .models import ProfilTechnicien, Categorie, DocumentTechnicien, Disponibilite


class CategorieSerializer(serializers.ModelSerializer):
    """Sérialiseur des catégories de service."""

    nb_techniciens = serializers.SerializerMethodField()

    class Meta:
        model = Categorie
        fields = ['id', 'nom', 'description', 'icone', 'nb_techniciens']

    def get_nb_techniciens(self, obj):
        return obj.techniciens.filter(statut_validation=ProfilTechnicien.VALIDE).count()


class DocumentSerializer(serializers.ModelSerializer):
    """Sérialiseur des documents technicien."""

    class Meta:
        model = DocumentTechnicien
        fields = ['id', 'type_doc', 'fichier', 'created_at']
        read_only_fields = ['id', 'created_at']


class DisponibiliteSerializer(serializers.ModelSerializer):
    """Sérialiseur des créneaux de disponibilité."""

    jour_label = serializers.CharField(source='get_jour_semaine_display', read_only=True)

    class Meta:
        model = Disponibilite
        fields = ['id', 'jour_semaine', 'jour_label', 'heure_debut', 'heure_fin']

    def validate(self, data):
        if data.get('heure_debut') and data.get('heure_fin'):
            if data['heure_debut'] >= data['heure_fin']:
                raise serializers.ValidationError(
                    "L'heure de début doit être antérieure à l'heure de fin."
                )
        return data


class ProfilTechnicienSerializer(serializers.ModelSerializer):
    """Sérialiseur complet du profil technicien (lecture)."""

    user = UserSerializer(read_only=True)
    categorie = CategorieSerializer(read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    disponibilites = DisponibiliteSerializer(many=True, read_only=True)
    statut_label = serializers.CharField(source='get_statut_validation_display', read_only=True)

    class Meta:
        model = ProfilTechnicien
        fields = [
            'id', 'user', 'categorie', 'specialite', 'description',
            'tarif_horaire', 'zone_couverture', 'annees_experience',
            'latitude', 'longitude',
            'note_moyenne', 'nb_evaluations', 'nb_missions',
            'disponible', 'statut_validation', 'statut_label',
            'solde', 'documents', 'disponibilites',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'note_moyenne', 'nb_evaluations', 'nb_missions',
            'statut_validation', 'solde', 'created_at', 'updated_at',
        ]


class CreerProfilSerializer(serializers.ModelSerializer):
    """Sérialiseur de création du profil technicien."""

    categorie_id = serializers.UUIDField(write_only=True)

    class Meta:
        model = ProfilTechnicien
        fields = [
            'categorie_id', 'specialite', 'description',
            'tarif_horaire', 'zone_couverture', 'annees_experience',
        ]

    def validate_categorie_id(self, value):
        if not Categorie.objects.filter(id=value).exists():
            raise serializers.ValidationError("Catégorie introuvable.")
        return value

    def validate_specialite(self, value):
        if len(value.strip()) < 5:
            raise serializers.ValidationError(
                "La spécialité doit contenir au moins 5 caractères."
            )
        return value.strip()

    def create(self, validated_data):
        categorie_id = validated_data.pop('categorie_id')
        user = self.context['request'].user
        return ProfilTechnicien.objects.create(
            user=user,
            categorie_id=categorie_id,
            **validated_data
        )


class ModifierProfilSerializer(serializers.ModelSerializer):
    """Sérialiseur de modification du profil."""

    categorie_id = serializers.UUIDField(write_only=True, required=False)

    class Meta:
        model = ProfilTechnicien
        fields = [
            'categorie_id', 'specialite', 'description',
            'tarif_horaire', 'zone_couverture', 'annees_experience',
        ]

    def validate_categorie_id(self, value):
        if not Categorie.objects.filter(id=value).exists():
            raise serializers.ValidationError("Catégorie introuvable.")
        return value

    def update(self, instance, validated_data):
        categorie_id = validated_data.pop('categorie_id', None)
        if categorie_id:
            instance.categorie_id = categorie_id
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        return instance


class MettreAJourPositionSerializer(serializers.ModelSerializer):
    """Sérialiseur de mise à jour de la position GPS et disponibilité."""

    class Meta:
        model = ProfilTechnicien
        fields = ['latitude', 'longitude', 'disponible']

    def validate(self, data):
        if 'latitude' in data and data['latitude'] is not None:
            lat = float(data['latitude'])
            if not (-90 <= lat <= 90):
                raise serializers.ValidationError({"latitude": "Latitude invalide (-90 à 90)."})

        if 'longitude' in data and data['longitude'] is not None:
            lng = float(data['longitude'])
            if not (-180 <= lng <= 180):
                raise serializers.ValidationError({"longitude": "Longitude invalide (-180 à 180)."})

        return data
