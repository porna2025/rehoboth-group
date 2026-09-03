# Mobile Rehoboth

## Configuration API

Le mobile n'est plus lié à une IP locale en dur. Pour choisir le backend, utilisez les `dart-define`.

Développement sur émulateur Android :

```bash
flutter run --dart-define=API_SERVER_IP=10.0.2.2
```

Téléphone physique sur Wi-Fi local :

```bash
flutter run --dart-define=API_SERVER_IP=192.168.1.40
```

Backend déployé :

```bash
flutter run --dart-define=API_BASE_URL=https://votre-backend.onrender.com --dart-define=API_IS_PRODUCTION=true
```

Le mobile est maintenant configuré pour mieux supporter un backend gratuit qui se met en veille :

- timeouts réseau par défaut portés à 60 secondes ;
- warmup `/health/` mutualisé pour éviter plusieurs réveils inutiles ;
- messages d'erreur plus adaptés quand le backend de production dort.

Vous pouvez ajuster ces valeurs sans modifier le code :

```bash
flutter run \
	--dart-define=API_BASE_URL=https://votre-backend.onrender.com \
	--dart-define=API_IS_PRODUCTION=true \
	--dart-define=API_CONNECT_TIMEOUT_SECONDS=60 \
	--dart-define=API_RECEIVE_TIMEOUT_SECONDS=60 \
	--dart-define=API_WARMUP_COOLDOWN_MINUTES=20
```

## Build Android de distribution

APK de test :

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://votre-backend.onrender.com --dart-define=API_IS_PRODUCTION=true
```

App Bundle pour Play Store :

```bash
flutter build appbundle --release --dart-define=API_BASE_URL=https://votre-backend.onrender.com --dart-define=API_IS_PRODUCTION=true
```

## Notes de déploiement

- L'identifiant Android est maintenant `com.rehobothgroup.mobile`.
- En `release`, Android coupe le trafic HTTP clair. Utilisez un backend HTTPS.
- Le build `release` utilise encore la signature debug par défaut. Avant publication Play Store, ajoutez votre keystore de signature.
