"""
Serializers — Notifications
"""

from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    type_notif_libelle = serializers.CharField(
        source='get_type_notif_display', read_only=True
    )
    destinataire_email = serializers.EmailField(
        source='destinataire.email', read_only=True
    )

    class Meta:
        model = Notification
        fields = [
            'id',
            'destinataire',
            'destinataire_email',
            'type_notif',
            'type_notif_libelle',
            'titre',
            'message',
            'objet_id',
            'objet_type',
            'lu',
            'created_at',
        ]
        read_only_fields = ['id', 'destinataire', 'created_at']
