"""
Configuration ASGI pour Django Channels (WebSocket)
Supporte HTTP classique + WebSocket (chat temps réel & GPS)
"""

import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Initialiser Django avant d'importer les modules qui utilisent les modèles
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from channels.security.websocket import AllowedHostsOriginValidator
from apps.notifications import routing

application = ProtocolTypeRouter({
    # Requêtes HTTP normales
    'http': get_asgi_application(),

    # Connexions WebSocket (chat + GPS temps réel)
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(routing.websocket_urlpatterns)
        )
    ),
})