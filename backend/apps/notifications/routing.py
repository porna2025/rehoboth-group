"""
Routing WebSocket — Notifications, Chat et GPS temps réel
"""

from django.urls import path
from . import consumers

websocket_urlpatterns = [
    # Notifications personnelles : ws://host/ws/notifications/<user_id>/
    path('ws/notifications/<uuid:user_id>/', consumers.NotificationConsumer.as_asgi()),

    # Chat temps réel entre client et technicien : ws://host/ws/chat/<demande_id>/
    path('ws/chat/<uuid:demande_id>/', consumers.ChatConsumer.as_asgi()),

    # Suivi GPS du technicien : ws://host/ws/gps/<technicien_id>/
    path('ws/gps/<uuid:technicien_id>/', consumers.GPSConsumer.as_asgi()),
]
