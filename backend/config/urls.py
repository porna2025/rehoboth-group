"""
URLs principales de la plateforme Rehoboth Groupe
"""

from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    # Interface d'administration Django
    path('admin/', admin.site.urls),

    # API v1 — Authentification & Utilisateurs
    path('api/v1/auth/', include('apps.users.urls')),

    # API v1 — Techniciens & Catégories
    path('api/v1/techniciens/', include('apps.techniciens.urls')),

    # API v1 — Demandes & Messagerie
    path('api/v1/demandes/', include('apps.demandes.urls')),

    # API v1 — Paiements
    path('api/v1/paiements/', include('apps.paiements.urls')),

    # API v1 — Évaluations
    path('api/v1/evaluations/', include('apps.evaluations.urls')),

    # API v1 — Notifications & Dashboard
    path('api/v1/notifications/', include('apps.notifications.urls')),
]

# Servir les médias en développement uniquement
if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
