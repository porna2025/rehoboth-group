import 'dart:convert';

import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import '../config/api_config.dart';
import '../models/user.dart';
import '../models/technicien.dart';
import '../models/demande.dart';

/// Service API centralisé — toutes les communications avec le backend Django
/// Pattern Singleton : une seule instance partagée dans toute l'app

class ApiService {
  static final ApiService _instance = ApiService._internal();
  static Future<void>? _warmupInFlight;
  static DateTime? _lastWarmupAt;

  factory ApiService() => _instance;
  ApiService._internal() {
    _initDio();
  }

  late Dio _dio;
  final _storage = const FlutterSecureStorage();
  String? _accessTokenCache;
  String? _refreshTokenCache;
  bool _tokenCacheLoaded = false;

  static const _accessTokenKey = 'access_token';
  static const _refreshTokenKey = 'refresh_token';
  static const _cachedUserKey = 'cached_user';

  // ── Initialisation Dio ────────────────────────────────────────────────────

  void _initDio() {
    _dio = Dio(
      BaseOptions(
        baseUrl: ApiConfig.baseUrl,
        connectTimeout: Duration(seconds: ApiConfig.connectTimeout),
        receiveTimeout: Duration(seconds: ApiConfig.receiveTimeout),
        headers: {'Content-Type': 'application/json'},
      ),
    );

    // Intercepteur : injecter automatiquement le token JWT
    _dio.interceptors.add(
      InterceptorsWrapper(
        onRequest: (options, handler) async {
          final token = await getAccessToken();
          if (token != null && token.isNotEmpty) {
            options.headers['Authorization'] = 'Bearer $token';
          }
          return handler.next(options);
        },

        onError: (DioException error, handler) async {
          // Si 401 : essayer de rafraîchir le token
          if (error.response?.statusCode == 401) {
            final success = await _refreshToken();
            if (success) {
              // Rejouer la requête originale avec le nouveau token
              final token = await getAccessToken();
              error.requestOptions.headers['Authorization'] = 'Bearer $token';
              try {
                final response = await _dio.fetch(error.requestOptions);
                return handler.resolve(response);
              } catch (e) {
                return handler.next(error);
              }
            }
          }
          return handler.next(error);
        },
      ),
    );
  }

  // ── Rafraîchissement du token JWT ─────────────────────────────────────────

  Future<void> _ensureTokenCacheLoaded() async {
    if (_tokenCacheLoaded) return;
    _accessTokenCache = await _storage.read(key: _accessTokenKey);
    _refreshTokenCache = await _storage.read(key: _refreshTokenKey);
    _tokenCacheLoaded = true;
  }

  Future<void> _saveTokens({required String access, required String refresh}) async {
    _accessTokenCache = access;
    _refreshTokenCache = refresh;
    _tokenCacheLoaded = true;
    await Future.wait([
      _storage.write(key: _accessTokenKey, value: access),
      _storage.write(key: _refreshTokenKey, value: refresh),
    ]);
  }

  Future<void> _clearSessionStorage() async {
    _accessTokenCache = null;
    _refreshTokenCache = null;
    _tokenCacheLoaded = true;
    await Future.wait([
      _storage.delete(key: _accessTokenKey),
      _storage.delete(key: _refreshTokenKey),
      _storage.delete(key: _cachedUserKey),
    ]);
  }

  Future<bool> _refreshToken() async {
    try {
      await _ensureTokenCacheLoaded();
      final refresh = _refreshTokenCache;
      if (refresh == null || refresh.isEmpty) return false;

      // Requête directe sans intercepteurs pour éviter la boucle infinie
      final response = await Dio().post(
        '${ApiConfig.baseUrl}/auth/token/refresh/',
        data: {'refresh': refresh},
      );

      final newAccessToken = response.data['access']?.toString() ?? '';
      if (newAccessToken.isEmpty) return false;

      _accessTokenCache = newAccessToken;
      await _storage.write(key: _accessTokenKey, value: newAccessToken);
      return true;
    } catch (_) {
      // Refresh échoué → déconnecter l'utilisateur
      await _clearSessionStorage();
      return false;
    }
  }

  // ── Méthodes de stockage sécurisé ─────────────────────────────────────────

  Future<String?> getAccessToken() async {
    await _ensureTokenCacheLoaded();
    return _accessTokenCache;
  }

  Future<String?> getRefreshToken() async {
    await _ensureTokenCacheLoaded();
    return _refreshTokenCache;
  }

  Future<bool> estConnecte() async {
    final token = await getAccessToken();
    return token != null && token.isNotEmpty;
  }

  Future<void> cacheUser(User user) async {
    await _storage.write(key: _cachedUserKey, value: jsonEncode(user.toJson()));
  }

  Future<User?> getCachedUser() async {
    final raw = await _storage.read(key: _cachedUserKey);
    if (raw == null || raw.isEmpty) return null;
    try {
      return User.fromJson(jsonDecode(raw) as Map<String, dynamic>);
    } catch (_) {
      await _storage.delete(key: _cachedUserKey);
      return null;
    }
  }

  Future<void> warmupBackend() async {
    final now = DateTime.now();
    final lastWarmupAt = _lastWarmupAt;
    if (lastWarmupAt != null) {
      final minutesSinceLastWarmup =
          now.difference(lastWarmupAt).inMinutes;
      if (minutesSinceLastWarmup < ApiConfig.warmupCooldownMinutes) {
        return;
      }
    }

    final inFlight = _warmupInFlight;
    if (inFlight != null) {
      return inFlight;
    }

    final warmup = (() async {
      try {
        await _dio.get('/health/');
      } catch (_) {
        // Ignorer : l'objectif est seulement de réveiller le backend si besoin.
      } finally {
        _lastWarmupAt = DateTime.now();
        _warmupInFlight = null;
      }
    })();

    _warmupInFlight = warmup;
    return warmup;
  }

  // ── Utilitaire : normalise une réponse liste ou paginée DRF ──────────────
  // DRF peut retourner soit une List directe, soit {count, results:[...]}
  List<dynamic> _toList(dynamic data) {
    if (data is List) return data;
    if (data is Map<String, dynamic> && data.containsKey('results')) {
      return data['results'] as List? ?? [];
    }
    return [];
  }

  // ══════════════════════════════════════════════════════════════════════════
  // AUTHENTIFICATION
  // ══════════════════════════════════════════════════════════════════════════

  /// Connexion → retourne l'utilisateur + tokens, ou {requires_2fa: true} si OTP nécessaire
  Future<Map<String, dynamic>> connexion({
    required String email,
    required String password,
    String? fcmToken,
  }) async {
    final payload = <String, dynamic>{
      'email': email,
      'password': password,
    };
    if (fcmToken != null && fcmToken.isNotEmpty) {
      payload['fcm_token'] = fcmToken;
    }

    final response = await _dio.post(
      '/auth/connexion/',
      data: payload,
    );

    final data = response.data as Map<String, dynamic>;

    // 2FA requis : pas encore de tokens
    if (data['requires_2fa'] == true) return data;

    // Sauvegarder les tokens de façon sécurisée
    await _saveTokens(
      access: data['tokens']['access'].toString(),
      refresh: data['tokens']['refresh'].toString(),
    );
    await cacheUser(User.fromJson(data['user'] as Map<String, dynamic>));

    return data;
  }

  /// Vérifier le code OTP de connexion
  Future<Map<String, dynamic>> verifierOtpConnexion({
    required String email,
    required String otpCode,
    required String otpSessionToken,
  }) async {
    final response = await _dio.post(
      '/auth/connexion/verifier-otp/',
      data: {
        'email': email,
        'otp_code': otpCode,
        'otp_session_token': otpSessionToken,
      },
    );
    final data = response.data as Map<String, dynamic>;
    await _saveTokens(
      access: data['tokens']['access'].toString(),
      refresh: data['tokens']['refresh'].toString(),
    );
    await cacheUser(User.fromJson(data['user'] as Map<String, dynamic>));
    return data;
  }

  /// Renvoyer un nouveau code OTP
  Future<Map<String, dynamic>> renvoyerOtpConnexion({
    required String email,
    required String otpSessionToken,
  }) async {
    final response = await _dio.post(
      '/auth/connexion/renvoyer-otp/',
      data: {
        'email': email,
        'otp_session_token': otpSessionToken,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Demander la réinitialisation du mot de passe → envoie un code par e-mail
  /// Retourne : { message, email, reset_token }
  Future<Map<String, dynamic>> demanderResetMotDePasse(String email) async {
    final response = await _dio.post(
      '/auth/mot-de-passe-oublie/',
      data: {'email': email},
    );
    return response.data as Map<String, dynamic>;
  }

  /// Confirmer la réinitialisation du mot de passe avec le code reçu
  Future<Map<String, dynamic>> confirmerResetMotDePasse({
    required String email,
    required String resetCode,
    required String resetToken,
    required String newPassword,
    required String newPassword2,
  }) async {
    final response = await _dio.post(
      '/auth/mot-de-passe-oublie/confirmer/',
      data: {
        'email': email,
        'reset_code': resetCode,
        'reset_token': resetToken,
        'new_password': newPassword,
        'new_password2': newPassword2,
      },
    );
    return response.data as Map<String, dynamic>;
  }

  /// Inscription → retourne l'utilisateur + tokens
  Future<Map<String, dynamic>> inscription({
    required String prenom,
    required String nom,
    required String email,
    required String password,
    required String password2,
    required String role,
    String? telephone,
  }) async {
    final response = await _dio.post(
      '/auth/inscription/',
      data: {
        'prenom': prenom,
        'nom': nom,
        'email': email,
        'password': password,
        'password2': password2,
        'role': role,
        if (telephone != null && telephone.isNotEmpty) 'telephone': telephone,
      },
    );

    final data = response.data as Map<String, dynamic>;
    await _saveTokens(
      access: data['tokens']['access'].toString(),
      refresh: data['tokens']['refresh'].toString(),
    );
    await cacheUser(User.fromJson(data['user'] as Map<String, dynamic>));

    return data;
  }

  /// Déconnexion
  Future<void> deconnexion() async {
    try {
      final refresh = await getRefreshToken();
      if (refresh != null) {
        await _dio.post('/auth/deconnexion/', data: {'refresh': refresh});
      }
    } catch (_) {
      /* ignorer les erreurs réseau */
    }
    await _clearSessionStorage();
  }

  /// Récupérer le profil de l'utilisateur connecté
  Future<User> getProfil() async {
    final response = await _dio.get('/auth/profil/');
    final user = User.fromJson(response.data as Map<String, dynamic>);
    await cacheUser(user);
    return user;
  }

  /// Modifier son profil
  Future<User> modifierProfil({
    String? nom,
    String? prenom,
    String? telephone,
  }) async {
    final payload = <String, dynamic>{};
    if (nom != null && nom.isNotEmpty) payload['nom'] = nom;
    if (prenom != null && prenom.isNotEmpty) payload['prenom'] = prenom;
    if (telephone != null && telephone.isNotEmpty) {
      payload['telephone'] = telephone;
    }

    final response = await _dio.patch(
      '/auth/profil/',
      data: payload,
    );
    final user = User.fromJson(response.data as Map<String, dynamic>);
    await cacheUser(user);
    return user;
  }

  /// Changer le mot de passe
  Future<void> changerMotDePasse({
    required String ancienMdp,
    required String nouveauMdp,
  }) async {
    await _dio.post(
      '/auth/changer-mot-de-passe/',
      data: {
        'ancien_mot_de_passe': ancienMdp,
        'nouveau_mot_de_passe': nouveauMdp,
      },
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // TECHNICIENS
  // ══════════════════════════════════════════════════════════════════════════

  /// Liste des catégories de service
  Future<List<Categorie>> getCategories() async {
    final response = await _dio.get('/techniciens/categories/');
    return _toList(response.data)
        .map((e) => Categorie.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Rechercher des techniciens avec filtres
  Future<List<Technicien>> getTechniciens({
    String? categorieId,
    bool? disponible,
    double? noteMin,
    double? lat,
    double? lng,
    double rayon = 20,
    String? search,
  }) async {
    final params = <String, dynamic>{'rayon': rayon};
    if (categorieId != null && categorieId.isNotEmpty) {
      params['categorie'] = categorieId;
    }
    if (disponible == true) params['disponible'] = 'true';
    if (noteMin != null) params['note_min'] = noteMin;
    if (lat != null) params['lat'] = lat;
    if (lng != null) params['lng'] = lng;
    if (search != null && search.isNotEmpty) params['search'] = search;

    final response = await _dio.get('/techniciens/', queryParameters: params);
    return _toList(response.data)
        .map((e) => Technicien.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Détail d'un technicien
  Future<Technicien> getTechnicien(String id) async {
    final response = await _dio.get('/techniciens/$id/');
    return Technicien.fromJson(response.data as Map<String, dynamic>);
  }

  /// Mon profil technicien
  Future<Technicien?> getMonProfilTechnicien() async {
    try {
      final response = await _dio.get('/techniciens/profil/');
      return Technicien.fromJson(response.data as Map<String, dynamic>);
    } on DioException catch (e) {
      if (e.response?.statusCode == 404) return null;
      rethrow;
    }
  }

  /// Créer mon profil technicien
  Future<Technicien> creerMonProfil({
    required String categorieId,
    required String specialite,
    String? description,
    double? tarifHoraire,
    String? zoneCouverture,
    int anneesExperience = 0,
  }) async {
    final payload = <String, dynamic>{
      'categorie_id': categorieId,
      'specialite': specialite,
      'annees_experience': anneesExperience,
    };
    if (description != null && description.isNotEmpty) {
      payload['description'] = description;
    }
    if (tarifHoraire != null) payload['tarif_horaire'] = tarifHoraire;
    if (zoneCouverture != null && zoneCouverture.isNotEmpty) {
      payload['zone_couverture'] = zoneCouverture;
    }

    final response = await _dio.post(
      '/techniciens/profil/creer/',
      data: payload,
    );
    return Technicien.fromJson(response.data as Map<String, dynamic>);
  }

  /// Mettre à jour position GPS et disponibilité
  Future<void> mettreAJourPosition({
    required double lat,
    required double lng,
    required bool disponible,
  }) async {
    await _dio.patch(
      '/techniciens/profil/position/',
      data: {'latitude': lat, 'longitude': lng, 'disponible': disponible},
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // DEMANDES
  // ══════════════════════════════════════════════════════════════════════════

  /// Créer une demande
  Future<Demande> creerDemande({
    required String categorieId,
    required String description,
    required String adresse,
    required double latitude,
    required double longitude,
    String typeIntervention = 'immediat',
    String mode = 'sur_place',
    String? dateSouhaitee,
  }) async {
    final payload = <String, dynamic>{
      'categorie_id': categorieId,
      'description': description,
      'adresse': adresse,
      'latitude': latitude,
      'longitude': longitude,
      'type_intervention': typeIntervention,
      'mode': mode,
    };
    if (dateSouhaitee != null && dateSouhaitee.isNotEmpty) {
      payload['date_souhaitee'] = dateSouhaitee;
    }

    final response = await _dio.post(
      '/demandes/',
      data: payload,
    );
    return Demande.fromJson(response.data as Map<String, dynamic>);
  }

  /// Mes demandes (client)
  Future<List<Demande>> getMesDemandes({String? statut}) async {
    final params = statut != null ? {'statut': statut} : null;
    final response = await _dio.get(
      '/demandes/mes-demandes/',
      queryParameters: params,
    );
    return _toList(response.data)
        .map((e) => Demande.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Détail d'une demande
  Future<Demande> getDetailDemande(String id) async {
    final response = await _dio.get('/demandes/$id/');
    return Demande.fromJson(response.data as Map<String, dynamic>);
  }

  /// Demandes disponibles (technicien)
  Future<List<Demande>> getDemandesDisponibles() async {
    final response = await _dio.get('/demandes/disponibles/');
    return _toList(response.data)
        .map((e) => Demande.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Mes missions (technicien)
  Future<List<Demande>> getMesMissions({String? statut}) async {
    final params = statut != null ? {'statut': statut} : null;
    final response = await _dio.get(
      '/demandes/mes-missions/',
      queryParameters: params,
    );
    return _toList(response.data)
        .map((e) => Demande.fromJson(e as Map<String, dynamic>))
        .toList();
  }

  /// Accepter une demande
  Future<Demande> accepterDemande(String id) async {
    final response = await _dio.post('/demandes/$id/accepter/');
    return Demande.fromJson(response.data as Map<String, dynamic>);
  }

  /// Mettre à jour le statut d'une demande
  Future<Demande> mettreAJourStatut(
    String id, {
    required String statut,
    String? rapport,
    double? montantDevis,
  }) async {
    final payload = <String, dynamic>{'statut': statut};
    if (rapport != null && rapport.isNotEmpty) payload['rapport'] = rapport;
    if (montantDevis != null) payload['montant_devis'] = montantDevis;

    final response = await _dio.patch(
      '/demandes/$id/statut/',
      data: payload,
    );
    return Demande.fromJson(response.data as Map<String, dynamic>);
  }

  /// Annuler une demande (client)
  Future<void> annulerDemande(String id) async {
    await _dio.post('/demandes/$id/annuler/');
  }

  // ══════════════════════════════════════════════════════════════════════════
  // MESSAGERIE
  // ══════════════════════════════════════════════════════════════════════════

  /// Récupérer les messages d'une demande
  Future<List<Message>> getMessages(String demandeId, String monId) async {
    final response = await _dio.get('/demandes/$demandeId/messages/');
    return _toList(response.data)
        .map((e) => Message.fromJson(e as Map<String, dynamic>, monId: monId))
        .toList();
  }

  /// Envoyer un message
  Future<Message> envoyerMessage(
    String demandeId,
    String contenu,
    String monId,
  ) async {
    final response = await _dio.post(
      '/demandes/$demandeId/messages/envoyer/',
      data: {'contenu': contenu},
    );
    return Message.fromJson(
      response.data as Map<String, dynamic>,
      monId: monId,
    );
  }

  // ══════════════════════════════════════════════════════════════════════════
  // PAIEMENTS
  // ══════════════════════════════════════════════════════════════════════════

  /// Initier un paiement
  Future<Map<String, dynamic>> initierPaiement({
    required String demandeId,
    required double montant,
    required String methode,
    String? telephone,
  }) async {
    final payload = <String, dynamic>{
      'demande_id': demandeId,
      'montant': montant,
      'methode': methode,
    };
    if (telephone != null && telephone.isNotEmpty) {
      payload['telephone_paiement'] = telephone;
    }

    final response = await _dio.post(
      '/paiements/initier/',
      data: payload,
    );
    return response.data as Map<String, dynamic>;
  }

  /// Mes revenus (technicien)
  Future<Map<String, dynamic>> getMesRevenus() async {
    final response = await _dio.get('/paiements/mes-revenus/');
    return response.data as Map<String, dynamic>;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // ÉVALUATIONS
  // ══════════════════════════════════════════════════════════════════════════

  /// Évaluer un technicien
  Future<void> evaluerTechnicien({
    required String demandeId,
    required int note,
    String? commentaire,
  }) async {
    await _dio.post(
      '/evaluations/',
      data: {
        'demande_id': demandeId,
        'note': note,
        if (commentaire != null && commentaire.isNotEmpty)
          'commentaire': commentaire,
      },
    );
  }

  /// Évaluations d'un technicien
  Future<Map<String, dynamic>> getEvaluationsTechnicien(
    String technicienId,
  ) async {
    final response = await _dio.get('/evaluations/technicien/$technicienId/');
    return response.data as Map<String, dynamic>;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // NOTIFICATIONS
  // ══════════════════════════════════════════════════════════════════════════

  /// Liste des notifications de l'utilisateur connecté
  Future<List<dynamic>> getNotifications() async {
    final response = await _dio.get('/notifications/');
    return response.data as List<dynamic>;
  }

  /// Marquer une notification comme lue
  Future<void> marquerNotificationLue(String id) async {
    await _dio.post('/notifications/$id/lire/');
  }

  /// Marquer toutes les notifications comme lues
  Future<void> marquerToutesNotificationsLues() async {
    await _dio.post('/notifications/lire-tout/');
  }
}
