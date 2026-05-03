"""
Service CinetPay — Intégration paiements Mobile Money
Supporte : Orange Money CI, Wave CI, MTN, Moov Money

Référence API : https://docs.cinetpay.com
"""

import logging
import requests
from django.conf import settings

logger = logging.getLogger(__name__)

# ── Endpoints CinetPay ─────────────────────────────────────────────────────────
CINETPAY_INIT_URL  = 'https://api-checkout.cinetpay.com/v2/payment'
CINETPAY_CHECK_URL = 'https://api-checkout.cinetpay.com/v2/payment/check'

# Mapping opérateur → canal CinetPay
CANAUX_OPERATEUR = {
    'orange_money': 'ORANGE_MONEY_CI',
    'wave':         'WAVE_IVOIRE',
    'mtn':          'MTN',
    'moov':         'MOOV',
    'mobile_money': 'MOBILE_MONEY',  # Laisse l'utilisateur choisir sur la page CinetPay
}


class CinetPayError(Exception):
    """Levée quand l'API CinetPay retourne une erreur métier."""


def _get_credentials():
    api_key = getattr(settings, 'CINETPAY_API_KEY', '')
    site_id = getattr(settings, 'CINETPAY_SITE_ID', '')
    if not api_key or not site_id:
        raise CinetPayError(
            "Clés CinetPay manquantes. Définissez CINETPAY_API_KEY et CINETPAY_SITE_ID dans .env"
        )
    return api_key, site_id


def initier_paiement_cinetpay(paiement, client, canal='MOBILE_MONEY'):
    """
    Crée une session de paiement CinetPay et retourne l'URL de paiement.

    Args:
        paiement  : instance Paiement (non encore REUSSI, doit avoir un id)
        client    : instance User (le client qui paie)
        canal     : canal CinetPay ('ORANGE_MONEY_CI', 'WAVE_IVOIRE', 'MOBILE_MONEY', ...)

    Returns:
        dict { 'payment_url': str, 'payment_token': str }

    Raises:
        CinetPayError si l'API retourne une erreur
    """
    api_key, site_id = _get_credentials()

    frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:5173')
    backend_url  = getattr(settings, 'BACKEND_URL',  'http://localhost:8000')

    # ID de transaction : préfixe RH- + 8 premiers chars de l'UUID paiement
    transaction_id = f"RH-{str(paiement.id)[:8].upper()}"

    # Résoudre le canal depuis la clé opérateur si nécessaire
    canal_cinetpay = CANAUX_OPERATEUR.get(canal.lower(), canal)

    payload = {
        'apikey':      api_key,
        'site_id':     int(site_id) if str(site_id).isdigit() else site_id,
        'transaction_id':  transaction_id,
        'amount':          int(float(paiement.montant)),
        'currency':        'XOF',
        'alternative_currency': '',
        'description':     f'Paiement mission Rehoboth #{str(paiement.demande_id)[:8].upper()}',
        # Informations client
        'customer_id':           str(client.id),
        'customer_name':         getattr(client, 'nom',    '') or '',
        'customer_surname':      getattr(client, 'prenom', '') or '',
        'customer_email':        client.email,
        'customer_phone_number': getattr(client, 'telephone', '') or getattr(settings, 'MERCHANT_PHONE', ''),
        'customer_address': 'Abidjan',
        'customer_city':    'Abidjan',
        'customer_country': 'CI',
        'customer_state':   'CI',
        'customer_zip_code': '00225',
        # URLs de callback
        'notify_url': f'{backend_url}/api/v1/paiements/cinetpay/notify/',
        'return_url': f'{frontend_url}/paiement/succes?txn={transaction_id}',
        'channels': canal_cinetpay,
        'metadata': f'{{"paiement_id":"{str(paiement.id)}"}}',
        'lang': 'fr',
    }

    try:
        resp = requests.post(CINETPAY_INIT_URL, json=payload, timeout=20)
        resp.raise_for_status()
        data = resp.json()
    except requests.Timeout:
        raise CinetPayError("Délai d'attente dépassé — CinetPay ne répond pas.")
    except requests.RequestException as exc:
        logger.error('CinetPay réseau erreur: %s', exc)
        raise CinetPayError(f'Erreur réseau CinetPay : {exc}')

    code = str(data.get('code', ''))
    if code == '201':
        # Persister le transaction_id généré
        paiement.transaction_id = transaction_id
        paiement.save(update_fields=['transaction_id'])
        return data['data']  # { payment_url, payment_token }
    else:
        logger.error('CinetPay erreur code=%s message=%s', code, data.get('message'))
        raise CinetPayError(data.get('message', f'Erreur CinetPay (code {code})'))


def verifier_paiement_cinetpay(transaction_id):
    """
    Vérifie le statut d'un paiement auprès de CinetPay.

    Returns:
        dict avec au moins { 'status': 'ACCEPTED' | 'REFUSED' | 'PENDING' | ... }

    Raises:
        CinetPayError en cas d'erreur réseau / API
    """
    api_key, site_id = _get_credentials()

    payload = {
        'apikey':         api_key,
        'site_id':        int(site_id) if str(site_id).isdigit() else site_id,
        'transaction_id': transaction_id,
    }

    try:
        resp = requests.post(CINETPAY_CHECK_URL, json=payload, timeout=15)
        resp.raise_for_status()
        data = resp.json()
    except requests.Timeout:
        raise CinetPayError("Délai d'attente dépassé — CinetPay ne répond pas.")
    except requests.RequestException as exc:
        logger.error('CinetPay check erreur: %s', exc)
        raise CinetPayError(f'Erreur réseau CinetPay : {exc}')

    code = str(data.get('code', ''))
    if code == '00':
        return data.get('data', {})
    else:
        raise CinetPayError(data.get('message', f'Erreur vérification CinetPay (code {code})'))
