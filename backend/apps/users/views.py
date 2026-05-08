"""
Vues API — Authentification et gestion des utilisateurs
"""

import logging
import secrets
from threading import Thread
from datetime import timedelta

from django.conf import settings
from django.core.mail import send_mail

logger = logging.getLogger(__name__)
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken

from .models import User
from .serializers import (
    InscriptionSerializer,
    ConnexionSerializer,
    VerificationOTPSerializer,
    RenvoiOTPSerializer,
    ForgotPasswordRequestSerializer,
    ForgotPasswordConfirmSerializer,
    UserSerializer,
    ModifierProfilSerializer,
    ChangerMotDePasseSerializer,
    UserAdminSerializer,
)
from .permissions import IsAdmin

# ══════════════════════════════════════════════════════════════════════════════
# AUTHENTIFICATION
# ══════════════════════════════════════════════════════════════════════════════


def _clear_otp_state(user):
    user.otp_code = None
    user.otp_expires_at = None
    user.otp_session_token = None


def _clear_password_reset_state(user):
    user.password_reset_code = None
    user.password_reset_expires_at = None
    user.password_reset_token = None


def _issue_tokens(user):
    refresh = RefreshToken.for_user(user)
    return {
        'access': str(refresh.access_token),
        'refresh': str(refresh),
    }


def _send_security_email(user, subject, body):
    send_mail(
        subject=subject,
        message=body,
        from_email=getattr(settings, 'DEFAULT_FROM_EMAIL', '') or getattr(settings, 'EMAIL_HOST_USER', '') or 'no-reply@rehoboth-group.local',
        recipient_list=[user.email],
        fail_silently=False,
    )


def _send_security_email_async(user, subject, body, *, log_prefix, fallback_code=None):
    recipient = user.email

    def _deliver():
        try:
            _send_security_email(user, subject, body)
        except Exception as exc:
            logger.error("[%s] Envoi email échoué pour %s : %s", log_prefix, recipient, exc)
            if fallback_code:
                logger.warning("[%s CODE] %s → %s", log_prefix, recipient, fallback_code)

    Thread(target=_deliver, daemon=True).start()


def _send_login_otp(user):
    otp_code = f"{secrets.randbelow(1000000):06d}"
    otp_session_token = secrets.token_hex(24)
    user.otp_code = otp_code
    user.otp_session_token = otp_session_token
    user.otp_expires_at = timezone.now() + timedelta(minutes=10)
    user.save(update_fields=['otp_code', 'otp_session_token', 'otp_expires_at', 'updated_at'])

    subject = 'Votre code de connexion Rehoboth Group'
    body = (
        f'Bonjour {user.prenom},\n\n'
        f'Votre code de vérification est : {otp_code}\n'
        'Ce code expire dans 10 minutes.\n\n'
        'Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email.'
    )

    _send_security_email_async(
        user,
        subject,
        body,
        log_prefix='OTP',
        fallback_code=f"{otp_code} (valide 10 min)",
    )

    return {
        'otp_session_token': otp_session_token,
        'otp_code': otp_code,
    }


def _send_password_reset_code(user):
    reset_code = f"{secrets.randbelow(1000000):06d}"
    reset_token = secrets.token_hex(24)
    user.password_reset_code = reset_code
    user.password_reset_token = reset_token
    user.password_reset_expires_at = timezone.now() + timedelta(minutes=15)
    user.save(update_fields=['password_reset_code', 'password_reset_token', 'password_reset_expires_at', 'updated_at'])

    _send_security_email_async(
        user,
        'Réinitialisation de votre mot de passe Rehoboth Group',
        (
            f'Bonjour {user.prenom},\n\n'
            f'Votre code de réinitialisation est : {reset_code}\n'
            'Ce code expire dans 15 minutes.\n\n'
            'Si vous n\'êtes pas à l\'origine de cette demande, ignorez cet email.'
        ),
        log_prefix='RESET PASSWORD',
        fallback_code=f"{reset_code} (valide 15 min)",
    )

    return {
        'reset_token': reset_token,
        'reset_code': reset_code,
    }


@api_view(['POST'])
@permission_classes([AllowAny])
def inscription(request):
    """
    POST /api/v1/auth/inscription/
    Créer un nouveau compte client ou technicien.
    Corps : { email, nom, prenom, telephone, role, password, password2 }
    """
    serializer = InscriptionSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.save()

        # Générer les tokens JWT
        refresh = RefreshToken.for_user(user)

        return Response({
            'message': f'Compte créé avec succès. Bienvenue {user.prenom} !',
            'user': UserSerializer(user).data,
            'tokens': {
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            }
        }, status=status.HTTP_201_CREATED)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def connexion(request):
    """
    POST /api/v1/auth/connexion/
    Connexion et retour des tokens JWT.
    Corps : { email, password, fcm_token (optionnel) }
    """
    serializer = ConnexionSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        user = serializer.validated_data['user']

        # Enregistrer le token FCM pour les notifications push
        fcm_token = request.data.get('fcm_token', '').strip()
        if fcm_token and user.fcm_token != fcm_token:
            user.fcm_token = fcm_token
            user.save(update_fields=['fcm_token'])

        if user.two_factor_enabled:
            otp_payload = _send_login_otp(user)

            response_data = {
                'requires_2fa': True,
                'message': f"Un code de vérification a été envoyé à {user.email}.",
                'otp_session_token': otp_payload['otp_session_token'],
                'email': user.email,
            }

            if settings.DEBUG:
                response_data['debug_otp_code'] = otp_payload['otp_code']
                response_data['message'] = (
                    f"Utilisez le code affiché à l'écran si l'email tarde à arriver pour {user.email}."
                )

            return Response(response_data, status=status.HTTP_200_OK)

        return Response({
            'user': UserSerializer(user).data,
            'tokens': _issue_tokens(user),
        }, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def verifier_otp_connexion(request):
    """
    POST /api/v1/auth/connexion/verifier-otp/
    Valider le code OTP et émettre les JWT.
    Corps : { email, otp_code, otp_session_token, fcm_token (optionnel) }
    """
    serializer = VerificationOTPSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']

        fcm_token = request.data.get('fcm_token', '').strip()
        if fcm_token and user.fcm_token != fcm_token:
            user.fcm_token = fcm_token

        _clear_otp_state(user)
        if fcm_token and user.fcm_token == fcm_token:
            user.save(update_fields=['fcm_token', 'otp_code', 'otp_expires_at', 'otp_session_token', 'updated_at'])
        else:
            user.save(update_fields=['otp_code', 'otp_expires_at', 'otp_session_token', 'updated_at'])

        return Response({
            'user': UserSerializer(user).data,
            'tokens': _issue_tokens(user),
        }, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def renvoyer_otp_connexion(request):
    """
    POST /api/v1/auth/connexion/renvoyer-otp/
    Renvoyer un nouveau code OTP de connexion.
    Corps : { email, otp_session_token }
    """
    serializer = RenvoiOTPSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        try:
            otp_payload = _send_login_otp(user)
        except Exception:
            return Response(
                {'error': "Impossible de renvoyer le code de vérification. Réessayez plus tard."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE
            )

        response_data = {
            'message': f"Un nouveau code a été envoyé à {user.email}.",
            'otp_session_token': otp_payload['otp_session_token'],
            'email': user.email,
        }

        if settings.DEBUG and not otp_payload['email_sent']:
            response_data['debug_otp_code'] = otp_payload['otp_code']
            response_data['message'] = (
                f"Email indisponible. Utilisez le code affiché à l'écran pour {user.email}."
            )

        return Response(response_data, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_request(request):
    """
    POST /api/v1/auth/mot-de-passe-oublie/
    Envoie un code de réinitialisation à l'email de l'utilisateur.
    Corps : { email }
    """
    serializer = ForgotPasswordRequestSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    email = serializer.validated_data['email'].lower()

    try:
        user = User.objects.get(email=email)
    except User.DoesNotExist:
        if settings.DEBUG:
            return Response(
                {'error': "Aucun compte n'est associé à cette adresse email."},
                status=status.HTTP_404_NOT_FOUND
            )
        return Response({
            'message': "Si un compte existe avec cette adresse, un code de réinitialisation a été envoyé.",
            'email': email,
            'reset_token': '',
        }, status=status.HTTP_200_OK)

    try:
        reset_payload = _send_password_reset_code(user) if user.est_actif else {'reset_token': '', 'reset_code': ''}
    except Exception:
        return Response(
            {'error': "Impossible de préparer la réinitialisation du mot de passe. Réessayez plus tard."},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    reset_token = reset_payload['reset_token']

    response_data = {
        'message': "Si un compte existe avec cette adresse, un code de réinitialisation a été envoyé.",
        'email': email,
        'reset_token': reset_token,
    }

    if settings.DEBUG and reset_payload['reset_code']:
        response_data['debug_reset_code'] = reset_payload['reset_code']
        response_data['message'] = (
            f"Utilisez le code affiché à l'écran si l'email tarde à arriver pour {email}."
        )

    return Response(response_data, status=status.HTTP_200_OK)


@api_view(['POST'])
@permission_classes([AllowAny])
def forgot_password_confirm(request):
    """
    POST /api/v1/auth/mot-de-passe-oublie/confirmer/
    Valide le code reçu puis définit un nouveau mot de passe.
    Corps : { email, reset_code, reset_token, new_password, new_password2 }
    """
    serializer = ForgotPasswordConfirmSerializer(data=request.data)
    if serializer.is_valid():
        user = serializer.validated_data['user']
        user.set_password(serializer.validated_data['new_password'])
        _clear_password_reset_state(user)
        _clear_otp_state(user)
        user.save(update_fields=['password', 'password_reset_code', 'password_reset_expires_at', 'password_reset_token', 'otp_code', 'otp_expires_at', 'otp_session_token', 'updated_at'])
        return Response({'message': 'Mot de passe réinitialisé avec succès.'}, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def deconnexion(request):
    """
    POST /api/v1/auth/deconnexion/
    Invalider le refresh token.
    Corps : { refresh }
    """
    try:
        refresh_token = request.data.get('refresh', '')
        if refresh_token:
            token = RefreshToken(refresh_token)
            token.blacklist()
    except Exception:
        pass  # Ignorer les erreurs de blacklist

    # Effacer le token FCM
    user = request.user
    _clear_otp_state(user)
    _clear_password_reset_state(user)
    if user.fcm_token:
        user.fcm_token = None
        user.save(update_fields=['fcm_token', 'otp_code', 'otp_expires_at', 'otp_session_token', 'password_reset_code', 'password_reset_expires_at', 'password_reset_token', 'updated_at'])
    else:
        user.save(update_fields=['otp_code', 'otp_expires_at', 'otp_session_token', 'password_reset_code', 'password_reset_expires_at', 'password_reset_token', 'updated_at'])

    return Response({'message': 'Déconnexion réussie.'}, status=status.HTTP_200_OK)

# ══════════════════════════════════════════════════════════════════════════════
# PROFIL
# ══════════════════════════════════════════════════════════════════════════════


@api_view(['GET', 'PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def mon_profil(request):
    """
    GET    /api/v1/auth/profil/  — Voir mon profil
    PUT    /api/v1/auth/profil/  — Modifier mon profil (tous les champs)
    PATCH  /api/v1/auth/profil/  — Modifier partiellement
    """
    user = request.user

    if request.method == 'GET':
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    # Modification
    serializer = ModifierProfilSerializer(user, data=request.data, partial=True)
    if serializer.is_valid():
        serializer.save()
        return Response(UserSerializer(user).data, status=status.HTTP_200_OK)

    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def changer_mot_de_passe(request):
    """
    POST /api/v1/auth/changer-mot-de-passe/
    Corps : { ancien_mot_de_passe, nouveau_mot_de_passe }
    """
    serializer = ChangerMotDePasseSerializer(
        data=request.data,
        context={'request': request}
    )
    if serializer.is_valid():
        serializer.save()
        return Response(
            {'message': 'Mot de passe modifié avec succès.'},
            status=status.HTTP_200_OK
        )
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

# ══════════════════════════════════════════════════════════════════════════════
# ADMINISTRATION
# ══════════════════════════════════════════════════════════════════════════════


@api_view(['GET'])
@permission_classes([IsAdmin])
def liste_utilisateurs(request):
    """
    GET /api/v1/auth/admin/utilisateurs/
    Lister tous les utilisateurs avec filtre optionnel par rôle.
    Paramètres : ?role=client|technicien|admin  &search=nom_ou_email
    """
    queryset = User.objects.all().order_by('-created_at')

    # Filtre par rôle
    role = request.query_params.get('role', '')
    if role in [User.CLIENT, User.TECHNICIEN, User.ADMIN]:
        queryset = queryset.filter(role=role)

    # Recherche par nom ou email
    search = request.query_params.get('search', '').strip()
    if search:
        from django.db.models import Q
        queryset = queryset.filter(
            Q(nom__icontains=search) | 
            Q(prenom__icontains=search) | 
            Q(email__icontains=search)
        )

    return Response(UserAdminSerializer(queryset, many=True).data, status=status.HTTP_200_OK)


@api_view(['GET'])
@permission_classes([IsAdmin])
def detail_utilisateur(request, pk):
    """
    GET /api/v1/auth/admin/utilisateurs/<uuid>/
    Voir le détail d'un utilisateur.
    """
    try:
        user = User.objects.get(id=pk)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    return Response(UserAdminSerializer(user).data)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def suspendre_utilisateur(request, pk):
    """
    PATCH /api/v1/auth/admin/utilisateurs/<uuid>/suspendre/
    Suspendre ou réactiver un compte utilisateur.
    """
    try:
        user = User.objects.get(id=pk)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if user.is_admin_user:
        return Response(
            {'error': 'Impossible de suspendre un compte administrateur.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    # Inverser le statut actif
    user.est_actif = not user.est_actif
    user.is_active = user.est_actif
    user.save(update_fields=['est_actif', 'is_active'])

    action = 'réactivé' if user.est_actif else 'suspendu'
    return Response({
        'message': f'Compte {action} avec succès.',
        'est_actif': user.est_actif,
    }, status=status.HTTP_200_OK)


@api_view(['PATCH'])
@permission_classes([IsAdmin])
def valider_utilisateur(request, pk):
    """
    PATCH /api/v1/auth/admin/utilisateurs/<uuid>/valider/
    Valider le compte d'un utilisateur (est_verifie=True, est_actif=True).
    """
    try:
        user = User.objects.get(id=pk)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if user.is_admin_user:
        return Response(
            {'error': 'Impossible de valider un compte administrateur via cette action.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.est_verifie = True
    user.est_actif   = True
    user.is_active   = True
    user.save(update_fields=['est_verifie', 'est_actif', 'is_active'])

    # Si c'est un technicien, valider aussi le profil
    if user.role == User.TECHNICIEN:
        from django.apps import apps
        ProfilTechnicien = apps.get_model('techniciens', 'ProfilTechnicien')
        ProfilTechnicien.objects.filter(user=user).update(statut_validation='valide')

    return Response({
        'message': 'Compte validé avec succès.',
        'est_verifie': user.est_verifie,
        'est_actif':   user.est_actif,
    }, status=status.HTTP_200_OK)


@api_view(['DELETE'])
@permission_classes([IsAdmin])
def supprimer_utilisateur(request, pk):
    """
    DELETE /api/v1/auth/admin/utilisateurs/<uuid>/
    Supprimer définitivement un compte utilisateur (non-admin uniquement).
    """
    try:
        user = User.objects.get(id=pk)
    except User.DoesNotExist:
        return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

    if user.is_admin_user:
        return Response(
            {'error': 'Impossible de supprimer un compte administrateur.'},
            status=status.HTTP_400_BAD_REQUEST
        )

    user.delete()
    return Response({'message': 'Compte supprimé avec succès.'}, status=status.HTTP_204_NO_CONTENT)
