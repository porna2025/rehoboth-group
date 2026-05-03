"""
Vues API — Évaluations des techniciens
"""

from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

from apps.users.permissions import IsClient
from apps.demandes.models import Demande
from .models import Evaluation


class EvaluationSerializer(serializers.ModelSerializer):
    client_nom = serializers.CharField(source='client.nom_complet', read_only=True)
    technicien_nom = serializers.CharField(source='technicien.nom_complet', read_only=True)
    etoiles = serializers.SerializerMethodField()

    class Meta:
        model = Evaluation
        fields = [
            'id', 'note', 'etoiles', 'commentaire',
            'client_nom', 'technicien_nom', 'created_at',
        ]
        read_only_fields = ['id', 'client_nom', 'technicien_nom', 'created_at']

    def get_etoiles(self, obj):
        return '★' * obj.note + '☆' * (5 - obj.note)

    def validate_note(self, value):
        if not 1 <= value <= 5:
            raise serializers.ValidationError("La note doit être un entier entre 1 et 5.")
        return value


@api_view(['POST'])
@permission_classes([IsClient])
def creer_evaluation(request):
    """
    POST /api/v1/evaluations/
    Évaluer un technicien après une mission terminée.
    Corps : { demande_id, note (1-5), commentaire (optionnel) }
    """
    demande_id = request.data.get('demande_id')
    note = request.data.get('note')
    commentaire = str(request.data.get('commentaire', '')).strip()

    if not demande_id:
        return Response({'error': 'demande_id est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)

    if note is None:
        return Response({'error': 'La note est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        note = int(note)
        if not 1 <= note <= 5:
            raise ValueError
    except (ValueError, TypeError):
        return Response({'error': 'La note doit être un entier entre 1 et 5.'}, status=status.HTTP_400_BAD_REQUEST)

    # Vérifier que la demande est terminée et appartient au client
    try:
        demande = Demande.objects.get(
            id=demande_id,
            client=request.user,
            statut=Demande.TERMINEE,
        )
    except Demande.DoesNotExist:
        return Response(
            {'error': 'Demande introuvable ou non terminée.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Vérifier qu'elle n'a pas déjà été évaluée
    if hasattr(demande, 'evaluation'):
        return Response(
            {'error': 'Vous avez déjà évalué cette mission.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not demande.technicien:
        return Response(
            {'error': 'Aucun technicien assigné à cette mission.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    evaluation = Evaluation.objects.create(
        demande=demande,
        client=request.user,
        technicien=demande.technicien,
        note=note,
        commentaire=commentaire,
    )

    return Response(EvaluationSerializer(evaluation).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([AllowAny])
def evaluations_technicien(request, technicien_id):
    """
    GET /api/v1/evaluations/technicien/<uuid>/
    Récupérer tous les avis d'un technicien (accès public).
    """
    evaluations = Evaluation.objects.filter(
        technicien_id=technicien_id
    ).select_related('client').order_by('-created_at')

    # Statistiques
    total = evaluations.count()
    moyenne = sum(e.note for e in evaluations) / total if total > 0 else 0

    return Response({
        'total': total,
        'moyenne': round(moyenne, 2),
        'avis': EvaluationSerializer(evaluations, many=True).data,
    })
