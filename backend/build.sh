#!/usr/bin/env bash
# Script de build exécuté par Render.com à chaque déploiement
set -o errexit

echo "==> Installation des dépendances..."
pip install -r requirements.txt

echo "==> Collecte des fichiers statiques..."
python manage.py collectstatic --no-input

echo "==> Application des migrations..."
python manage.py migrate

echo "==> Création du superuser (si inexistant)..."
python manage.py createsuperuser --no-input || true

echo "==> Build terminé avec succès !"
