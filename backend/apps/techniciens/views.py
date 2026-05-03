"""
Vues API — Techniciens : profils, catégories, géolocalisation, validation admin
"""

import math
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response

from apps.users.permissions import IsAdmin, IsTechnicien
from .models import ProfilTechnicien, Categorie, DocumentTechnicien, Disponibilite
from .serializers import (
    ProfilTechnicienSerializer,
    CreerProfilSerializer,
    ModifierProfilSerializer,
    CategorieSerializer,
    DocumentSerializer,
    DisponibiliteSerializer,
    MettreAJourPositionSerializer,
)

# ══════════════════════════════════════════════════════════════════════════════
# UTILITAIRE — Formule Haversine (distance GPS)
# ══════════════════════════════════════════════════════════════════════════════


def haversine_km(lat1, lon1, lat2, lon2):
    """
    Calcule la distance en kilomètres entre deux points GPS.
    Utilise la formule Haversine.
    """
    R = 6371  # Rayon de la Terre en km
    d_lat = math.radians(float(lat2) - float(lat1))
    d_lon = math.radians(float(lon2) - float(lon1))
    a = (
        math.sin(d_lat / 2) ** 2 + 
        math.cos(math.radians(float(lat1))) * 
        math.cos(math.radians(float(lat2))) * 
        math.sin(d_lon / 2) ** 2
    )
    c = 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))
    return R * c

# ══════════════════════════════════════════════════════════════════════════════
# CATÉGORIES
# ══════════════════════════════════════════════════════════════════════════════


@api_view(['GET'])
@permission_classes([AllowAny])
def liste_categories(request):
    """
    GET /api/v1/techniciens/categories/
    Lister toutes les catégories de service.
    """
    categories = Categorie.objects.all()
    return Response(CategorieSerializer(categories, many=True).data)


@api_view(['POST'])
@permission_classes([IsAdmin])
def creer_categorie(request):
    """
    POST /api/v1/techniciens/categories/creer/
    Créer une nouvelle catégorie (admin seulement).
    Corps : { nom, description, icone }
    """
    serializer = CategorieSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PUT', 'PATCH', 'DELETE'])
@permission_classes([IsAdmin])
def modifier_categorie(request, pk):
    """
    PUT/PATCH /api/v1/techniciens/categories/<uuid>/   — Modifier
    DELETE    /api/v1/techniciens/categories/<uuid>/   — Supprimer
    """
    try:
        categorie = Categorie.objects.get(id=pk)
    except Categorie.DoesNotExist:
        return Response({'error': 'Catégorie introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'DELETE':
        categorie.delete()
        return Response({'message': 'Catégorie supprimée.'}, status=status.HTTP_204_NO_CONTENT)

    serializer = CategorieSerializer(categorie, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(serializer.data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ══════════════════════════════════════════════════════════════════════════════
# LISTE DES TECHNICIENS (public avec filtres)
# ══════════════════════════════════════════════════════════════════════════════


@api_view(['GET'])
@permission_classes([AllowAny])
def liste_techniciens(request):
    """
    GET /api/v1/techniciens/
    Liste des techniciens validés avec filtres :
    ?categorie=uuid  &disponible=true  &note_min=4
    &lat=5.36 &lng=-4.00 &rayon=20 (km)  &search=specialite
    """
    queryset = ProfilTechnicien.objects.filter(
        statut_validation=ProfilTechnicien.VALIDE,
        user__est_actif=True,
    ).select_related('user', 'categorie').prefetch_related('documents')

    # ── Filtres ─────────────────────────────────────────────────────────────

    # Filtre par catégorie
    categorie_id = request.query_params.get('categorie', '').strip()
    if categorie_id:
        queryset = queryset.filter(categorie_id=categorie_id)

    # Filtre disponibilité
    if request.query_params.get('disponible', '').lower() == 'true':
        queryset = queryset.filter(disponible=True)

    # Filtre note minimale
    note_min = request.query_params.get('note_min', '')
    if note_min:
        try:
            queryset = queryset.filter(note_moyenne__gte=float(note_min))
        except ValueError:
            pass

    # Recherche par spécialité
    search = request.query_params.get('search', '').strip()
    if search:
        queryset = queryset.filter(specialite__icontains=search)

    # ── Filtre géographique (Haversine) ──────────────────────────────────────
    lat_param = request.query_params.get('lat', '')
    lng_param = request.query_params.get('lng', '')
    rayon = float(request.query_params.get('rayon', 20))

    if lat_param and lng_param:
        try:
            lat_client = float(lat_param)
            lng_client = float(lng_param)

            ids_proches = [
                t.id for t in queryset
                if t.latitude is not None and t.longitude is not None and
                   haversine_km(lat_client, lng_client, t.latitude, t.longitude) <= rayon
            ]
            queryset = queryset.filter(id__in=ids_proches)
        except (ValueError, TypeError):
            pass

    return Response(ProfilTechnicienSerializer(queryset, many=True).data)


@api_view(['GET'])
@permission_classes([AllowAny])
def detail_technicien(request, pk):
    """
    GET /api/v1/techniciens/<id>/
    Voir la fiche complète d'un technicien validé.
    Accepte soit l'ID du profil technicien, soit l'UUID utilisateur du technicien.
    """
    try:
        queryset = ProfilTechnicien.objects.select_related('user', 'categorie') \
            .prefetch_related('documents', 'disponibilites')

        if str(pk).isdigit():
            technicien = queryset.get(id=int(pk), statut_validation=ProfilTechnicien.VALIDE)
        else:
            technicien = queryset.get(user_id=pk, statut_validation=ProfilTechnicien.VALIDE)
    except ProfilTechnicien.DoesNotExist:
        return Response({'error': 'Technicien introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    return Response(ProfilTechnicienSerializer(technicien).data)

# ══════════════════════════════════════════════════════════════════════════════
# MON PROFIL TECHNICIEN
# ══════════════════════════════════════════════════════════════════════════════


@api_view(['POST'])
@permission_classes([IsTechnicien])
def creer_mon_profil(request):
    """
    POST /api/v1/techniciens/profil/creer/
    Créer son profil technicien (une seule fois par compte).
    Corps : { categorie_id, specialite, description, tarif_horaire, zone_couverture, annees_experience }
    """
    if hasattr(request.user, 'profil_technicien'):
        return Response(
            {'error': 'Vous avez déjà un profil technicien.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    serializer = CreerProfilSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        profil = serializer.save()
        return Response(ProfilTechnicienSerializer(profil).data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsTechnicien])
def mon_profil_technicien(request):
    """
    GET   /api/v1/techniciens/profil/  — Voir mon profil
    PUT   /api/v1/techniciens/profil/  — Modifier
    PATCH /api/v1/techniciens/profil/  — Modifier partiellement
    """
    try:
        profil = request.user.profil_technicien
    except ProfilTechnicien.DoesNotExist:
        return Response(
            {'error': 'Profil technicien introuvable. Créez-le d\'abord.'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        return Response(ProfilTechnicienSerializer(profil).data)

    serializer = ModifierProfilSerializer(profil, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(ProfilTechnicienSerializer(profil).data)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['PATCH'])
@permission_classes([IsTechnicien])
def mettre_a_jour_position(request):
    """
    PATCH /api/v1/techniciens/profil/position/
    Met à jour la position GPS et la disponibilité en temps réel.
    Corps : { latitude, longitude, disponible }
    """
    try:
        profil = request.user.profil_technicien
    except ProfilTechnicien.DoesNotExist:
        return Response({'error': 'Profil introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = MettreAJourPositionSerializer(profil, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response({'message': 'Position mise à jour avec succès.'})
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsTechnicien])
@parser_classes([MultiPartParser, FormParser])
def ajouter_document(request):
    """
    POST /api/v1/techniciens/profil/documents/
    Ajouter un document justificatif.
    Corps (multipart) : { type_doc, fichier }
    """
    try:
        profil = request.user.profil_technicien
    except ProfilTechnicien.DoesNotExist:
        return Response({'error': 'Profil introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    serializer = DocumentSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save(technicien=profil)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['GET', 'POST', 'PUT'])
@permission_classes([IsTechnicien])
def mes_disponibilites(request):
    """
    GET  /api/v1/techniciens/profil/disponibilites/  — Voir mes créneaux
    POST /api/v1/techniciens/profil/disponibilites/  — Ajouter/mettre à jour un créneau
    PUT  /api/v1/techniciens/profil/disponibilites/  — Remplacer tous les créneaux (tableau)
    Corps POST : { jour_semaine, heure_debut, heure_fin }
    Corps PUT  : [{ jour_semaine, heure_debut, heure_fin }, ...]
    """
    try:
        profil = request.user.profil_technicien
    except ProfilTechnicien.DoesNotExist:
        return Response({'error': 'Profil introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if request.method == 'GET':
        dispos = profil.disponibilites.all()
        return Response(DisponibiliteSerializer(dispos, many=True).data)

    if request.method == 'PUT':
        # Remplacer tous les créneaux existants
        serializer = DisponibiliteSerializer(data=request.data, many=True)
        if serializer.is_valid():
            profil.disponibilites.all().delete()
            for slot in serializer.validated_data:
                Disponibilite.objects.create(technicien=profil, **slot)
            dispos = profil.disponibilites.all()
            return Response(DisponibiliteSerializer(dispos, many=True).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # POST — ajouter ou mettre à jour un seul créneau
    serializer = DisponibiliteSerializer(data=request.data)
    if serializer.is_valid():
        Disponibilite.objects.update_or_create(
            technicien=profil,
            jour_semaine=serializer.validated_data['jour_semaine'],
            defaults={
                'heure_debut': serializer.validated_data['heure_debut'],
                'heure_fin': serializer.validated_data['heure_fin'],
            }
        )
        return Response({'message': 'Disponibilité enregistrée.'}, status=status.HTTP_201_CREATED)
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ══════════════════════════════════════════════════════════════════════════════
# ADMINISTRATION
# ══════════════════════════════════════════════════════════════════════════════


@api_view(['GET'])
@permission_classes([IsAdmin])
def techniciens_en_attente(request):
    """
    GET /api/v1/techniciens/admin/en-attente/
    Liste des techniciens en attente de validation.
    """
    queryset = ProfilTechnicien.objects.filter(
        statut_validation=ProfilTechnicien.EN_ATTENTE
    ).select_related('user', 'categorie').prefetch_related('documents')

    return Response(ProfilTechnicienSerializer(queryset, many=True).data)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def valider_technicien(request, pk):
    """
    PATCH /api/v1/techniciens/admin/<uuid>/valider/
    Valider ou rejeter un profil technicien.
    Corps : { action: "valider" | "rejeter" }
    """
    try:
        profil = ProfilTechnicien.objects.get(id=pk)
    except ProfilTechnicien.DoesNotExist:
        return Response({'error': 'Technicien introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    action = request.data.get('action', '').strip().lower()
    motif_rejet = request.data.get('motif_rejet', '').strip()

    if action == 'valider':
        profil.statut_validation = ProfilTechnicien.VALIDE
        profil.save(update_fields=['statut_validation'])

        # Notifier le technicien si token FCM disponible
        if profil.user.fcm_token:
            from apps.notifications.utils import envoyer_notification_push
            envoyer_notification_push(
                token=profil.user.fcm_token,
                titre="✅ Profil validé !",
                corps="Votre profil a été validé. Vous pouvez maintenant recevoir des missions.",
                data={'type': 'profil_valide'}
            )

        return Response({'message': 'Technicien validé avec succès.'})

    elif action == 'rejeter':
        profil.statut_validation = ProfilTechnicien.REJETE
        profil.save(update_fields=['statut_validation'])
        return Response({'message': 'Technicien rejeté.'})

    return Response(
        {'error': "Action invalide. Utilisez 'valider' ou 'rejeter'."},
        status=status.HTTP_400_BAD_REQUEST
    )
