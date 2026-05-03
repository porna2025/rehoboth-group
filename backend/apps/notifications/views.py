"""
Views — Notifications
Endpoints REST pour consulter et marquer les notifications comme lues.
Toutes les routes nécessitent une authentification JWT.
"""

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.pagination import PageNumberPagination

from .models import Notification
from .serializers import NotificationSerializer


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

class NotificationPagination(PageNumberPagination):
    """25 notifications par page."""
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


def _notification_appartient_utilisateur(notification, user):
    """Vérifie que la notification appartient bien à l'utilisateur connecté."""
    return notification.destinataire_id == user.id


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mes_notifications(request):
    """
    GET /api/v1/notifications/
    Retourne la liste paginée des notifications de l'utilisateur connecté,
    de la plus récente à la plus ancienne.
    Paramètre optionnel : ?non_lues=true  → filtre uniquement les non-lues.
    """
    qs = Notification.objects.filter(destinataire=request.user)

    non_lues_only = request.query_params.get('non_lues', '').lower() == 'true'
    if non_lues_only:
        qs = qs.filter(lu=False)

    paginator = NotificationPagination()
    page = paginator.paginate_queryset(qs, request)
    serializer = NotificationSerializer(page, many=True)
    return paginator.get_paginated_response(serializer.data)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def compteur_non_lues(request):
    """
    GET /api/v1/notifications/non-lues/
    Retourne le nombre de notifications non-lues de l'utilisateur connecté.
    """
    count = Notification.objects.filter(
        destinataire=request.user, lu=False
    ).count()
    return Response({'non_lues': count})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def marquer_lue(request, pk):
    """
    POST /api/v1/notifications/<uuid:pk>/lire/
    Marque une notification comme lue.
    """
    try:
        notification = Notification.objects.get(pk=pk)
    except Notification.DoesNotExist:
        return Response(
            {'detail': 'Notification introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not _notification_appartient_utilisateur(notification, request.user):
        return Response(
            {'detail': 'Action non autorisée.'},
            status=status.HTTP_403_FORBIDDEN
        )

    if not notification.lu:
        notification.lu = True
        notification.save(update_fields=['lu'])

    return Response(NotificationSerializer(notification).data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def marquer_tout_lue(request):
    """
    POST /api/v1/notifications/lire-tout/
    Marque toutes les notifications non-lues de l'utilisateur comme lues.
    """
    updated = Notification.objects.filter(
        destinataire=request.user, lu=False
    ).update(lu=True)
    return Response({'marquees_lues': updated})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def supprimer_notification(request, pk):
    """
    DELETE /api/v1/notifications/<uuid:pk>/supprimer/
    Supprime une notification appartenant à l'utilisateur connecté.
    """
    try:
        notification = Notification.objects.get(pk=pk)
    except Notification.DoesNotExist:
        return Response(
            {'detail': 'Notification introuvable.'},
            status=status.HTTP_404_NOT_FOUND
        )

    if not _notification_appartient_utilisateur(notification, request.user):
        return Response(
            {'detail': 'Action non autorisée.'},
            status=status.HTTP_403_FORBIDDEN
        )

    notification.delete()
    return Response(status=status.HTTP_204_NO_CONTENT)
