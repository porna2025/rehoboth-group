from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class SilentJWTAuthentication(JWTAuthentication):
    """
    Variante de JWTAuthentication qui retourne None (utilisateur anonyme)
    quand le token est absent, invalide ou expiré — au lieu de lever une
    exception 401.

    Cela permet aux vues AllowAny de fonctionner normalement même si un
    ancien token est présent dans le header Authorization du navigateur.
    Les vues protégées (IsAuthenticated) retournent 403 via la couche de
    permissions, ce qui est le comportement attendu.
    """

    def authenticate(self, request):
        try:
            return super().authenticate(request)
        except (InvalidToken, TokenError):
            return None
