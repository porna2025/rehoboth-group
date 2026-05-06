"""
Vues API — Demandes d'intervention et messagerie en temps réel
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from apps.users.permissions import IsClient, IsTechnicien, IsAdmin, IsTechnicienOrAdmin
from apps.notifications.utils import envoyer_notification_push
from .models import Demande, Message, PhotoDemande
from .serializers import (
    DemandeSerializer,
    CreerDemandeSerializer,
    MettreAJourStatutSerializer,
    MessageSerializer,
    EnvoyerMessageSerializer,
)

# ══════════════════════════════════════════════════════════════════════════════
# UTILITAIRE — Notifier les techniciens disponibles
# ══════════════════════════════════════════════════════════════════════════════


def _notifier_techniciens_zone(demande):
    """
    Envoie une notification push à tous les techniciens disponibles
    dans la catégorie et la zone géographique de la demande.
    """
    from apps.techniciens.models import ProfilTechnicien
    from apps.techniciens.views import haversine_km

    techniciens = ProfilTechnicien.objects.filter(
        disponible=True,
        statut_validation=ProfilTechnicien.VALIDE,
        categorie=demande.categorie,
    ).select_related('user')

    notifies = 0
    for profil in techniciens:
        if profil.latitude and profil.longitude and profil.user.fcm_token:
            try:
                distance = haversine_km(
                    float(demande.latitude), float(demande.longitude),
                    float(profil.latitude), float(profil.longitude)
                )
                if distance <= 20:  # Rayon de 20 km
                    envoyer_notification_push(
                        token=profil.user.fcm_token,
                        titre="🔔 Nouvelle demande dans votre zone",
                        corps=(
                            f"{demande.client.nom_complet} a besoin d'aide : "
                            f"{demande.description[:80]}..."
                        ),
                        data={
                            'type': 'nouvelle_demande',
                            'demande_id': str(demande.id),
                        }
                    )
                    notifies += 1
            except Exception:
                continue

    return notifies

# ══════════════════════════════════════════════════════════════════════════════
# VUES CLIENT
# ══════════════════════════════════════════════════════════════════════════════


@api_view(['POST'])
@permission_classes([IsClient])
def creer_demande(request):
    """
    POST /api/v1/demandes/
    Créer une nouvelle demande d'intervention.
    Corps : { categorie_id, description, adresse, latitude, longitude,
              type_intervention, mode, date_souhaitee (si planifié) }
    """
    serializer = CreerDemandeSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        demande = serializer.save()

        # Notifier les techniciens disponibles dans la zone
        try:
            nb = _notifier_techniciens_zone(demande)
        except Exception:
            nb = 0

        response_data = DemandeSerializer(demande).data
        response_data['techniciens_notifies'] = nb
        return Response(response_data, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET'])
@permission_classes([IsClient])
def mes_demandes(request):
    """
    GET /api/v1/demandes/mes-demandes/
    Lister toutes les demandes du client connecté.
    Paramètres : ?statut=en_attente|acceptee|...
    """
    queryset = Demande.objects.filter(
        client=request.user
    ).select_related('technicien', 'categorie').prefetch_related('photos')

    statut = request.query_params.get('statut', '').strip()
    if statut:
        queryset = queryset.filter(statut=statut)

    return Response(DemandeSerializer(queryset, many=True).data)


@api_view(['POST'])
@permission_classes([IsClient])
def annuler_demande(request, pk):
    """
    POST /api/v1/demandes/<uuid>/annuler/
    Annuler une demande (uniquement si en_attente ou acceptee).
    """
    try:
        demande = Demande.objects.get(id=pk, client=request.user)
    except Demande.DoesNotExist:
        return Response({'error': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if demande.statut not in [Demande.EN_ATTENTE, Demande.ACCEPTEE]:
        return Response(
            {'error': "Impossible d'annuler une demande déjà en cours ou terminée."},
            status=status.HTTP_400_BAD_REQUEST
        )

    demande.statut = Demande.ANNULEE
    demande.save(update_fields=['statut', 'updated_at'])

    # Notifier le technicien si assigné
    if demande.technicien and demande.technicien.fcm_token:
        envoyer_notification_push(
            token=demande.technicien.fcm_token,
            titre="❌ Mission annulée",
            corps=f"Le client {demande.client.nom_complet} a annulé la demande.",
            data={'type': 'demande_annulee', 'demande_id': str(demande.id)}
        )

    return Response({'message': 'Demande annulée avec succès.'})

# ══════════════════════════════════════════════════════════════════════════════
# VUES COMMUNES (client + technicien + admin)
# ══════════════════════════════════════════════════════════════════════════════


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detail_demande(request, pk):
    """
    GET /api/v1/demandes/<uuid>/
    Voir le détail d'une demande (accessible par le client, le technicien, ou l'admin).
    """
    from django.db.models import Q
    try:
        if request.user.is_client:
            demande = Demande.objects.get(id=pk, client=request.user)
        elif request.user.is_technicien:
            # Technicien peut voir : ses missions assignées OU les demandes disponibles (en_attente) de sa catégorie
            try:
                profil = request.user.profil_technicien
            except Exception:
                profil = None

            if profil:
                demande = Demande.objects.get(
                    Q(id=pk) & (
                        Q(technicien=request.user) |
                        Q(statut=Demande.EN_ATTENTE, categorie=profil.categorie)
                    )
                )
            else:
                demande = Demande.objects.get(id=pk, technicien=request.user)
        else:
            demande = Demande.objects.get(id=pk)
    except Demande.DoesNotExist:
        return Response({'error': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    return Response(DemandeSerializer(demande).data)

# ══════════════════════════════════════════════════════════════════════════════
# VUES TECHNICIEN
# ══════════════════════════════════════════════════════════════════════════════


@api_view(['GET'])
@permission_classes([IsTechnicien])
def demandes_disponibles(request):
    """
    GET /api/v1/demandes/disponibles/
    Demandes en attente dans la catégorie du technicien connecté.
    """
    try:
        profil = request.user.profil_technicien
    except Exception:
        return Response(
            {'error': 'Profil technicien introuvable. Créez votre profil d\'abord.'},
            status=status.HTTP_404_NOT_FOUND
        )

    queryset = Demande.objects.filter(
        statut=Demande.EN_ATTENTE,
        categorie=profil.categorie,
    ).select_related('client', 'categorie').prefetch_related('photos')

    return Response(DemandeSerializer(queryset, many=True).data)


@api_view(['GET'])
@permission_classes([IsTechnicien])
def mes_missions(request):
    """
    GET /api/v1/demandes/mes-missions/
    Toutes les missions assignées au technicien connecté.
    Paramètres : ?statut=acceptee|en_cours|terminee...
    """
    queryset = Demande.objects.filter(
        technicien=request.user
    ).select_related('client', 'categorie').prefetch_related('photos')

    statut = request.query_params.get('statut', '').strip()
    if statut:
        queryset = queryset.filter(statut=statut)

    return Response(DemandeSerializer(queryset, many=True).data)


@api_view(['POST'])
@permission_classes([IsTechnicien])
def accepter_demande(request, pk):
    """
    POST /api/v1/demandes/<uuid>/accepter/
    Accepter une demande en attente.
    """
    try:
        demande = Demande.objects.get(id=pk, statut=Demande.EN_ATTENTE)
    except Demande.DoesNotExist:
        return Response(
            {'error': 'Demande introuvable ou déjà prise en charge.'},
            status=status.HTTP_404_NOT_FOUND
        )

    # Assigner le technicien et changer le statut
    demande.technicien = request.user
    demande.statut = Demande.ACCEPTEE
    demande.save(update_fields=['technicien', 'statut', 'updated_at'])

    # Incrémenter le compteur de missions
    try:
        profil = request.user.profil_technicien
        profil.nb_missions += 1
        profil.save(update_fields=['nb_missions'])
    except Exception:
        pass

    # Notifier le client
    if demande.client.fcm_token:
        envoyer_notification_push(
            token=demande.client.fcm_token,
            titre="✅ Demande acceptée !",
            corps=f"{request.user.nom_complet} a accepté votre demande.",
            data={'type': 'demande_acceptee', 'demande_id': str(demande.id)}
        )

    return Response(DemandeSerializer(demande).data, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsTechnicienOrAdmin])
def mettre_a_jour_statut(request, pk):
    """
    PATCH /api/v1/demandes/<uuid>/statut/
    Mettre à jour le statut d'une demande.
    Corps : { statut, rapport (optionnel), montant_devis (optionnel) }
    """
    try:
        if request.user.is_technicien:
            demande = Demande.objects.get(id=pk, technicien=request.user)
        else:
            demande = Demande.objects.get(id=pk)
    except Demande.DoesNotExist:
        return Response({'error': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = MettreAJourStatutSerializer(
        data=request.data,
        context={'instance': demande}
    )
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    nouveau_statut = serializer.validated_data['statut']
    demande.statut = nouveau_statut

    if 'rapport' in serializer.validated_data:
        demande.rapport = serializer.validated_data['rapport']
    if 'montant_devis' in serializer.validated_data:
        demande.montant_devis = serializer.validated_data['montant_devis']

    demande.save()

    # Notifications push selon le nouveau statut
    messages_statut = {
        Demande.EN_ROUTE: "🚗 Le technicien est en route vers vous.",
        Demande.EN_COURS: "🔧 L'intervention a débuté.",
        Demande.TERMINEE: "✅ Mission terminée. Vous pouvez maintenant payer et évaluer.",
    }

    if nouveau_statut in messages_statut and demande.client.fcm_token:
        envoyer_notification_push(
            token=demande.client.fcm_token,
            titre="Mise à jour de votre mission",
            corps=messages_statut[nouveau_statut],
            data={
                'type': 'statut_mis_a_jour',
                'statut': nouveau_statut,
                'demande_id': str(demande.id),
            }
        )

    return Response(DemandeSerializer(demande).data)

# ══════════════════════════════════════════════════════════════════════════════
# MESSAGERIE
# ══════════════════════════════════════════════════════════════════════════════


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def messages_demande(request, pk):
    """
    GET /api/v1/demandes/<uuid>/messages/
    Récupérer l'historique des messages d'une demande.
    """
    try:
        if request.user.is_client:
            demande = Demande.objects.get(id=pk, client=request.user)
        elif request.user.is_technicien:
            demande = Demande.objects.get(id=pk, technicien=request.user)
        else:
            demande = Demande.objects.get(id=pk)
    except Demande.DoesNotExist:
        return Response({'error': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    # Marquer comme lus les messages des autres
    Message.objects.filter(
        demande=demande
    ).exclude(expediteur=request.user).update(lu=True)

    messages = demande.messages.select_related('expediteur').all()
    return Response(
        MessageSerializer(messages, many=True, context={'request': request}).data
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def envoyer_message(request, pk):
    """
    POST /api/v1/demandes/<uuid>/messages/envoyer/
    Envoyer un message dans la conversation d'une demande.
    Corps : { contenu }
    """
    try:
        if request.user.is_client:
            demande = Demande.objects.get(id=pk, client=request.user)
        elif request.user.is_technicien:
            demande = Demande.objects.get(id=pk, technicien=request.user)
        else:
            demande = Demande.objects.get(id=pk)
    except Demande.DoesNotExist:
        return Response({'error': 'Demande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if demande.statut in [Demande.TERMINEE, Demande.ANNULEE]:
        return Response(
            {'error': 'Impossible d\'envoyer un message sur une demande terminée ou annulée.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = EnvoyerMessageSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    message = Message.objects.create(
        demande=demande,
        expediteur=request.user,
        contenu=serializer.validated_data['contenu'],
    )

    # Notifier le destinataire par push
    destinataire = None
    if request.user.is_client and demande.technicien:
        destinataire = demande.technicien
    elif request.user.is_technicien:
        destinataire = demande.client

    if destinataire and destinataire.fcm_token:
        envoyer_notification_push(
            token=destinataire.fcm_token,
            titre=f"💬 Message de {request.user.prenom}",
            corps=message.contenu[:80],
            data={'type': 'nouveau_message', 'demande_id': str(demande.id)}
        )

    return Response(
        MessageSerializer(message, context={'request': request}).data,
        status=status.HTTP_201_CREATED
    )

# ══════════════════════════════════════════════════════════════════════════════
# VUES ADMIN
# ══════════════════════════════════════════════════════════════════════════════


@api_view(['GET'])
@permission_classes([IsAdmin])
def toutes_les_demandes(request):
    """
    GET /api/v1/demandes/admin/toutes/
    Lister toutes les demandes avec filtres.
    Paramètres : ?statut=...  &categorie=uuid
    """
    queryset = Demande.objects.select_related(
        'client', 'technicien', 'categorie'
    ).all()

    statut = request.query_params.get('statut', '').strip()
    if statut:
        queryset = queryset.filter(statut=statut)

    categorie_id = request.query_params.get('categorie', '').strip()
    if categorie_id:
        queryset = queryset.filter(categorie_id=categorie_id)

    return Response(DemandeSerializer(queryset, many=True).data)
