"""
Permissions personnalisées basées sur le rôle (RBAC)
Utilisées sur toutes les vues API pour contrôler l'accès
"""

from rest_framework.permissions import BasePermission


class IsAdmin(BasePermission):
    """Accès réservé aux administrateurs."""
    message = "Accès refusé. Vous devez être administrateur."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_admin_user
        )


class IsClient(BasePermission):
    """Accès réservé aux clients."""
    message = "Accès refusé. Vous devez être un client."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_client
        )


class IsTechnicien(BasePermission):
    """Accès réservé aux techniciens."""
    message = "Accès refusé. Vous devez être un technicien."

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            request.user.is_technicien
        )


class IsClientOrAdmin(BasePermission):
    """Accès pour les clients et les administrateurs."""

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_client or request.user.is_admin_user)
        )


class IsTechnicienOrAdmin(BasePermission):
    """Accès pour les techniciens et les administrateurs."""

    def has_permission(self, request, view):
        return bool(
            request.user and
            request.user.is_authenticated and
            (request.user.is_technicien or request.user.is_admin_user)
        )


class IsOwnerOrAdmin(BasePermission):
    """Accès au propriétaire de l'objet ou à l'admin."""

    def has_object_permission(self, request, view, obj):
        return bool(
            request.user and
            request.user.is_authenticated and
            (
                getattr(obj, 'user', obj) == request.user or
                obj == request.user or
                request.user.is_admin_user
            )
        )
