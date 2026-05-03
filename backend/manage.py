#!/usr/bin/env python
"""
Script de gestion Django pour Rehoboth Groupe
Usage : python manage.py <commande>
"""

import os
import sys


def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
    try:
        from django.core.management import execute_from_command_line
    except ImportError as exc:
        raise ImportError(
            "Impossible d'importer Django. Vérifie que Django est installé "
            "et que ton environnement virtuel est activé.\n"
            "Commande : venv\\Scripts\\activate (Windows) ou source venv/bin/activate (Mac/Linux)"
        ) from exc
    execute_from_command_line(sys.argv)


if __name__ == '__main__':
    main()
