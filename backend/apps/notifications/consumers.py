"""
Consumers WebSocket — Chat temps réel et suivi GPS
Utilisés par Django Channels via ASGI
"""

import json
import logging
from channels.generic.websocket import AsyncWebsocketConsumer

logger = logging.getLogger(__name__)


class ChatConsumer(AsyncWebsocketConsumer):
    """
    WebSocket pour le chat en temps réel entre client et technicien.
    URL : ws://localhost:8000/ws/chat/<demande_id>/

    Le message reçu doit avoir le format :
    { "message": "texte", "expediteur": "Prénom Nom", "user_id": "uuid" }
    """

    async def connect(self):
        self.demande_id = self.scope['url_route']['kwargs']['demande_id']
        self.room_group_name = f'chat_{self.demande_id}'

        # Rejoindre le groupe de la demande
        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

        logger.info(f"[WS-Chat] Connexion établie — demande {self.demande_id}")

        # Confirmer la connexion au client
        await self.send(text_data=json.dumps({
            'type': 'connection',
            'message': 'Connecté au chat.',
            'room': self.demande_id,
        }))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )
        logger.info(f"[WS-Chat] Déconnexion — demande {self.demande_id} (code: {close_code})")

    async def receive(self, text_data):
        """Reçoit un message et le diffuse à tout le groupe."""
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            logger.warning("[WS-Chat] JSON invalide reçu.")
            return

        message = data.get('message', '').strip()
        expediteur = data.get('expediteur', '')
        user_id = data.get('user_id', '')

        if not message:
            return

        # Diffuser à tous les membres du groupe (client + technicien)
        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'chat_message',
                'message': message,
                'expediteur': expediteur,
                'user_id': user_id,
            }
        )

    # Handler appelé lors de la diffusion au groupe
    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'type': 'message',
            'message': event['message'],
            'expediteur': event['expediteur'],
            'user_id': event['user_id'],
        }))


class GPSConsumer(AsyncWebsocketConsumer):
    """
    WebSocket pour le suivi GPS en temps réel du technicien.
    URL : ws://localhost:8000/ws/gps/<technicien_id>/

    Le technicien envoie sa position :
    { "latitude": 5.36, "longitude": -4.00, "timestamp": "..." }
    Le client reçoit la position en temps réel.
    """

    async def connect(self):
        self.technicien_id = self.scope['url_route']['kwargs']['technicien_id']
        self.room_group_name = f'gps_{self.technicien_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()
        logger.info(f"[WS-GPS] Connexion établie — technicien {self.technicien_id}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        """Reçoit la position du technicien et la diffuse au groupe."""
        try:
            data = json.loads(text_data)
        except json.JSONDecodeError:
            return

        latitude = data.get('latitude')
        longitude = data.get('longitude')
        timestamp = data.get('timestamp', '')

        if latitude is None or longitude is None:
            return

        await self.channel_layer.group_send(
            self.room_group_name,
            {
                'type': 'position_update',
                'latitude': latitude,
                'longitude': longitude,
                'timestamp': timestamp,
            }
        )

    async def position_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'position',
            'latitude': event['latitude'],
            'longitude': event['longitude'],
            'timestamp': event['timestamp'],
        }))


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket pour les notifications en temps réel d'un utilisateur.
    URL : ws://localhost:8000/ws/notifications/<user_id>/
    Utilisé pour informer l'utilisateur des événements en temps réel.
    """

    async def connect(self):
        self.user_id = self.scope['url_route']['kwargs']['user_id']
        self.room_group_name = f'notif_{self.user_id}'

        await self.channel_layer.group_add(
            self.room_group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_group_name,
            self.channel_name
        )

    async def receive(self, text_data):
        # Les clients ne peuvent qu'écouter (pas d'envoi)
        pass

    async def envoyer_notification(self, event):
        """Handler appelé par le serveur pour pousser une notification."""
        await self.send(text_data=json.dumps({
            'type': 'notification',
            'titre': event.get('titre', ''),
            'message': event.get('message', ''),
            'data': event.get('data', {}),
        }))
