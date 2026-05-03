"""
Vues API — Paiements et retraits
"""

import logging
import uuid as uuid_module
from decimal import Decimal

from rest_framework import serializers, status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from django.conf import settings

from apps.users.permissions import IsClient, IsAdmin, IsTechnicien
from apps.demandes.models import Demande
from .models import Paiement, Retrait

logger = logging.getLogger(__name__)


def _cinetpay_configured():
    return bool(getattr(settings, 'CINETPAY_API_KEY', '').strip()) and bool(
        str(getattr(settings, 'CINETPAY_SITE_ID', '')).strip()
    )

# ══════════════════════════════════════════════════════════════════════════════
# SÉRIALISEURS (dans views.py pour simplifier)
# ══════════════════════════════════════════════════════════════════════════════


class PaiementSerializer(serializers.ModelSerializer):
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)
    methode_label = serializers.CharField(source='get_methode_display', read_only=True)

    class Meta:
        model = Paiement
        fields = [
            'id', 'demande', 'montant', 'commission', 'montant_technicien',
            'methode', 'methode_label', 'statut', 'statut_label',
            'transaction_id', 'telephone_paiement', 'created_at',
        ]
        read_only_fields = [
            'id', 'commission', 'montant_technicien',
            'statut', 'transaction_id', 'created_at',
        ]


class RetraitSerializer(serializers.ModelSerializer):
    statut_label = serializers.CharField(source='get_statut_display', read_only=True)

    class Meta:
        model = Retrait
        fields = ['id', 'montant', 'telephone', 'statut', 'statut_label', 'created_at']
        read_only_fields = ['id', 'statut', 'created_at']


class InitierPaiementSerializer(serializers.Serializer):
    demande_id = serializers.UUIDField()
    montant = serializers.DecimalField(max_digits=12, decimal_places=2, min_value=1)
    methode = serializers.ChoiceField(choices=Paiement.METHODE_CHOICES)
    telephone_paiement = serializers.CharField(required=False, allow_blank=True, max_length=20)
    # Canal Mobile Money : ORANGE_MONEY_CI | WAVE_IVOIRE | MOBILE_MONEY (défaut — tout opérateur)
    canal = serializers.ChoiceField(
        choices=['ORANGE_MONEY_CI', 'WAVE_IVOIRE', 'MTN', 'MOOV', 'MOBILE_MONEY'],
        required=False,
        default='MOBILE_MONEY',
    )

    def validate_montant(self, value):
        if float(value) <= 0:
            raise serializers.ValidationError("Le montant doit être supérieur à 0.")
        return value

# ══════════════════════════════════════════════════════════════════════════════
# VUES
# ══════════════════════════════════════════════════════════════════════════════


@api_view(['POST'])
@permission_classes([IsClient])
def initier_paiement(request):
    """
    POST /api/v1/paiements/initier/
    Initier le paiement d'une mission terminée.
    Corps : { demande_id, montant, methode, telephone_paiement (si mobile_money) }
    """
    serializer = InitierPaiementSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    data = serializer.validated_data

    # Vérifier que la demande est terminée et appartient au client
    try:
        demande = Demande.objects.get(
            id=data['demande_id'],
            client=request.user,
            statut=Demande.TERMINEE,
        )
    except Demande.DoesNotExist:
        return Response(
            {'error': 'Demande introuvable, non terminée ou ne vous appartient pas.'},
            status=status.HTTP_404_NOT_FOUND
        )

    existing_paiement = getattr(demande, 'paiement', None)

    # Bloquer uniquement les missions déjà réglées avec succès
    if existing_paiement and existing_paiement.statut == Paiement.REUSSI:
        return Response(
            {'error': 'Cette mission a déjà été payée.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Réutiliser le paiement existant si la précédente tentative a échoué
    if existing_paiement:
        paiement = existing_paiement
        paiement.client = request.user
        paiement.montant = data['montant']
        paiement.methode = data['methode']
        paiement.telephone_paiement = data.get('telephone_paiement', '')
        paiement.transaction_id = ''
        paiement.statut = Paiement.EN_ATTENTE
    else:
        paiement = Paiement(
            demande=demande,
            client=request.user,
            montant=data['montant'],
            methode=data['methode'],
            telephone_paiement=data.get('telephone_paiement', ''),
        )

    paiement.calculer_commission()
    paiement.save()

    # ── Paiement Mobile Money via CinetPay (Orange Money CI / Wave CI / MTN) ──
    if paiement.methode == Paiement.MOBILE_MONEY:
        if settings.DEBUG and not _cinetpay_configured():
            paiement.statut = Paiement.REUSSI
            paiement.transaction_id = f"DEV-MM-{str(uuid_module.uuid4())[:8].upper()}"
            paiement.save(update_fields=['statut', 'transaction_id'])
            _crediter_technicien(paiement, demande)
            _notifier_technicien_paiement(paiement, demande)
            return Response({
                **PaiementSerializer(paiement).data,
                'payment_url': '',
                'payment_token': '',
                'message': 'Paiement Mobile Money simulé en mode développement.',
            }, status=status.HTTP_201_CREATED)

        from .services import initier_paiement_cinetpay, CinetPayError
        canal = data.get('canal', 'MOBILE_MONEY')
        try:
            result = initier_paiement_cinetpay(paiement, request.user, canal)
        except CinetPayError as exc:
            paiement.statut = Paiement.ECHOUE
            paiement.save(update_fields=['statut'])
            return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

        return Response({
            **PaiementSerializer(paiement).data,
            'payment_url':   result.get('payment_url'),
            'payment_token': result.get('payment_token'),
        }, status=status.HTTP_201_CREATED)

    # ── Paiement en espèces / carte : validation immédiate ──
    paiement.statut = Paiement.REUSSI
    prefix = 'CARTE' if paiement.methode == 'carte' else 'ESP'
    paiement.transaction_id = f"{prefix}-{str(uuid_module.uuid4())[:8].upper()}"
    paiement.save(update_fields=['statut', 'transaction_id'])

    _crediter_technicien(paiement, demande)
    _notifier_technicien_paiement(paiement, demande)

    return Response(PaiementSerializer(paiement).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsClient])
def mes_paiements(request):
    """
    GET /api/v1/paiements/mes-paiements/
    Historique des paiements du client connecté.
    """
    paiements = Paiement.objects.filter(client=request.user).order_by('-created_at')
    return Response(PaiementSerializer(paiements, many=True).data)


@api_view(['GET'])
@permission_classes([IsTechnicien])
def mes_revenus(request):
    """
    GET /api/v1/paiements/mes-revenus/
    Solde et historique des revenus du technicien connecté.
    """
    try:
        profil = request.user.profil_technicien
    except Exception:
        return Response({'error': 'Profil technicien introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    paiements = Paiement.objects.filter(
        demande__technicien=request.user,
        statut=Paiement.REUSSI,
    ).order_by('-created_at')

    total_encaisse = sum(float(p.montant_technicien) for p in paiements)

    return Response({
        'solde_disponible': float(profil.solde),
        'total_encaisse': total_encaisse,
        'nb_paiements': paiements.count(),
        'historique': PaiementSerializer(paiements, many=True).data,
    })


@api_view(['POST'])
@permission_classes([IsTechnicien])
def demander_retrait(request):
    """
    POST /api/v1/paiements/retrait/
    Demander un retrait vers son numéro Mobile Money.
    Corps : { montant, telephone }
    """
    try:
        profil = request.user.profil_technicien
    except Exception:
        return Response({'error': 'Profil technicien introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    montant = request.data.get('montant')
    telephone = str(request.data.get('telephone', '')).strip()

    if not montant:
        return Response({'error': 'Le montant est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        montant = float(montant)
    except (ValueError, TypeError):
        return Response({'error': 'Montant invalide.'}, status=status.HTTP_400_BAD_REQUEST)

    if montant <= 0:
        return Response({'error': 'Le montant doit être supérieur à 0.'}, status=status.HTTP_400_BAD_REQUEST)

    if montant > float(profil.solde):
        return Response(
            {'error': f'Solde insuffisant. Votre solde disponible : {float(profil.solde):,.0f} FCFA.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if not telephone:
        return Response({'error': 'Le numéro de téléphone est obligatoire.'}, status=status.HTTP_400_BAD_REQUEST)

    # Créer la demande de retrait et déduire du solde
    retrait = Retrait.objects.create(
        technicien=request.user,
        montant=montant,
        telephone=telephone,
    )
    profil.solde -= montant
    profil.save(update_fields=['solde'])

    return Response(RetraitSerializer(retrait).data, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAdmin])
def rapport_financier(request):
    """
    GET /api/v1/paiements/admin/rapport/
    Rapport financier global pour l'administrateur.
    """
    paiements_reussis = Paiement.objects.filter(statut=Paiement.REUSSI)

    total_volume = sum(float(p.montant)            for p in paiements_reussis)
    total_commission = sum(float(p.commission)         for p in paiements_reussis)
    total_techniciens = sum(float(p.montant_technicien) for p in paiements_reussis)

    retraits_en_attente = Retrait.objects.filter(statut=Retrait.EN_ATTENTE)

    return Response({
        'total_transactions': paiements_reussis.count(),
        'volume_total': total_volume,
        'revenu_plateforme': total_commission,
        'paye_aux_techniciens': total_techniciens,
        'retraits_en_attente': retraits_en_attente.count(),
        'montant_retraits_attente': sum(float(r.montant) for r in retraits_en_attente),
        'paiements': PaiementSerializer(paiements_reussis, many=True).data,
    })


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def traiter_retrait(request, pk):
    """
    PATCH /api/v1/paiements/admin/retraits/<uuid>/traiter/
    Marquer un retrait comme effectué ou refusé.
    Corps : { action: "effectuer" | "refuser" }
    """
    try:
        retrait = Retrait.objects.get(id=pk, statut=Retrait.EN_ATTENTE)
    except Retrait.DoesNotExist:
        return Response({'error': 'Retrait introuvable ou déjà traité.'}, status=status.HTTP_404_NOT_FOUND)

    action = request.data.get('action', '').strip().lower()

    if action == 'effectuer':
        retrait.statut = Retrait.EFFECTUE
        retrait.save(update_fields=['statut'])
        return Response({'message': 'Retrait marqué comme effectué.'})

    elif action == 'refuser':
        # Rembourser le solde
        try:
            profil = retrait.technicien.profil_technicien
            profil.solde += retrait.montant
            profil.save(update_fields=['solde'])
        except Exception:
            pass
        retrait.statut = Retrait.REFUSE
        retrait.save(update_fields=['statut'])
        return Response({'message': 'Retrait refusé. Solde remboursé.'})

    return Response(
        {'error': "Action invalide. Utilisez 'effectuer' ou 'refuser'."},
        status=status.HTTP_400_BAD_REQUEST
    )


# ══════════════════════════════════════════════════════════════════════════════
# HELPERS INTERNES
# ══════════════════════════════════════════════════════════════════════════════

def _crediter_technicien(paiement, demande):
    """Crédite le solde du technicien après un paiement réussi."""
    if demande.technicien:
        try:
            profil = demande.technicien.profil_technicien
            profil.solde = Decimal(profil.solde) + Decimal(paiement.montant_technicien)
            profil.save(update_fields=['solde'])
        except Exception:
            logger.exception('Impossible de créditer le technicien pour le paiement %s', paiement.id)


def _notifier_technicien_paiement(paiement, demande):
    """Envoie une notification push au technicien."""
    if demande.technicien and getattr(demande.technicien, 'fcm_token', None):
        try:
            from apps.notifications.utils import envoyer_notification_push
            envoyer_notification_push(
                token=demande.technicien.fcm_token,
                titre="💰 Paiement reçu !",
                corps=f"Vous avez reçu {float(paiement.montant_technicien):,.0f} FCFA pour votre mission.",
                data={'type': 'paiement_recu', 'demande_id': str(demande.id)},
            )
        except Exception:
            logger.exception('Impossible d\'envoyer la notification pour le paiement %s', paiement.id)


# ══════════════════════════════════════════════════════════════════════════════
# WEBHOOK CINETPAY
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([AllowAny])
def cinetpay_notify(request):
    """
    POST /api/v1/paiements/cinetpay/notify/
    Webhook appelé par CinetPay après un paiement (succès ou échec).
    Pas d'authentification — CinetPay ne peut pas envoyer un JWT.
    """
    transaction_id = request.data.get('cpm_trans_id') or request.data.get('transaction_id', '')

    if not transaction_id:
        return Response({'error': 'transaction_id manquant'}, status=status.HTTP_400_BAD_REQUEST)

    try:
        paiement = Paiement.objects.get(transaction_id=transaction_id)
    except Paiement.DoesNotExist:
        logger.warning('Webhook CinetPay — paiement introuvable : %s', transaction_id)
        return Response({'error': 'Paiement introuvable'}, status=status.HTTP_404_NOT_FOUND)

    # Si déjà traité, ne pas retraiter
    if paiement.statut == Paiement.REUSSI:
        return Response({'message': 'Déjà traité'})

    # Vérifier le statut auprès de CinetPay (évite les faux webhooks)
    from .services import verifier_paiement_cinetpay, CinetPayError
    try:
        cinetpay_data = verifier_paiement_cinetpay(transaction_id)
    except CinetPayError as exc:
        logger.error('Webhook CinetPay — vérification impossible : %s', exc)
        return Response({'error': str(exc)}, status=status.HTTP_502_BAD_GATEWAY)

    cinetpay_status = cinetpay_data.get('status', '')

    if cinetpay_status == 'ACCEPTED':
        paiement.statut = Paiement.REUSSI
        paiement.save(update_fields=['statut'])
        demande = paiement.demande
        _crediter_technicien(paiement, demande)
        _notifier_technicien_paiement(paiement, demande)
        logger.info('Paiement %s confirmé via CinetPay', transaction_id)

    elif cinetpay_status in ('REFUSED', 'CANCELLED'):
        paiement.statut = Paiement.ECHOUE
        paiement.save(update_fields=['statut'])
        logger.info('Paiement %s refusé/annulé via CinetPay', transaction_id)

    return Response({'message': 'OK'})


@api_view(['GET'])
@permission_classes([IsClient])
def verifier_paiement(request, transaction_id):
    """
    GET /api/v1/paiements/verifier/<transaction_id>/
    Permet au frontend de vérifier le statut d'un paiement CinetPay.
    """
    try:
        paiement = Paiement.objects.get(
            transaction_id=transaction_id,
            client=request.user,
        )
    except Paiement.DoesNotExist:
        return Response({'error': 'Paiement introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    # Si pas encore confirmé, demander à CinetPay
    if paiement.statut == Paiement.EN_ATTENTE and paiement.methode == Paiement.MOBILE_MONEY:
        from .services import verifier_paiement_cinetpay, CinetPayError
        try:
            cinetpay_data = verifier_paiement_cinetpay(transaction_id)
            cinetpay_status = cinetpay_data.get('status', '')

            if cinetpay_status == 'ACCEPTED':
                paiement.statut = Paiement.REUSSI
                paiement.save(update_fields=['statut'])
                demande = paiement.demande
                _crediter_technicien(paiement, demande)
                _notifier_technicien_paiement(paiement, demande)

            elif cinetpay_status in ('REFUSED', 'CANCELLED'):
                paiement.statut = Paiement.ECHOUE
                paiement.save(update_fields=['statut'])

        except CinetPayError:
            pass  # On renvoie juste le statut actuel

    return Response(PaiementSerializer(paiement).data)
