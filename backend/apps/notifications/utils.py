"""
Utilitaire — Envoi de notifications push via Firebase Cloud Messaging (FCM)
"""

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)


def envoyer_notification_push(token: str, titre: str, corps: str, data: dict=None) -> bool:
    """
    Envoie une notification push via Firebase Cloud Messaging.

    Args:
        token : Token FCM de l'appareil destinataire
        titre : Titre de la notification
        corps : Corps du message
        data  : Données supplémentaires (dict optionnel)

    Returns:
        True si succès, False sinon
    """
    # En développement sans clé Firebase : log et retourner True
    if not settings.FIREBASE_SERVER_KEY:
        logger.info(f"[FCM-DEV] {titre} → {corps} (token: {token[:20] if token else 'None'}...)")
        return True

    if not token:
        logger.warning("[FCM] Token FCM manquant — notification ignorée.")
        return False

    payload = {
        'to': token,
        'notification': {
            'title': titre,
            'body': corps,
            'sound': 'default',
            'badge': 1,
        },
        'data': data or {},
        'priority': 'high',
        'content_available': True,
    }

    try:
        response = requests.post(
            'https://fcm.googleapis.com/fcm/send',
            json=payload,
            headers={
                'Authorization': f"key={settings.FIREBASE_SERVER_KEY}",
                'Content-Type': 'application/json',
            },
            timeout=10,
        )

        if response.status_code == 200:
            result = response.json()
            if result.get('success', 0) > 0:
                logger.info(f"[FCM] ✅ Notification envoyée : {titre}")
                return True
            else:
                logger.warning(f"[FCM] ⚠️ Échec FCM : {result}")
                return False
        else:
            logger.error(f"[FCM] ❌ Erreur HTTP {response.status_code} : {response.text}")
            return False

    except requests.Timeout:
        logger.error("[FCM] ❌ Timeout lors de l'envoi de la notification.")
        return False
    except requests.RequestException as e:
        logger.error(f"[FCM] ❌ Erreur réseau : {e}")
        return False
    except Exception as e:
        logger.error(f"[FCM] ❌ Erreur inattendue : {e}")
        return False
