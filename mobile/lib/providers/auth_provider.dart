import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../config/api_config.dart';
import '../models/user.dart';
import '../services/api_service.dart';

class AuthProvider extends ChangeNotifier {
  User? _user;
  bool _loading = false;
  String? _error;

  // ── État 2FA ────────────────────────────────────────────────────────
  bool _requires2fa = false;
  String? _otpEmail;
  String? _otpSessionToken;
  String? _debugOtpCode;

  final ApiService _api = ApiService();

  User? get user => _user;
  bool get isLoading => _loading;
  String? get error => _error;
  bool get isConnected => _user != null;
  bool get requires2fa => _requires2fa;
  String? get otpEmail => _otpEmail;
  String? get debugOtpCode => _debugOtpCode;

  void _setLoading(bool v) {
    _loading = v;
    notifyListeners();
  }

  void _setError(String? e) {
    _error = e;
    notifyListeners();
  }

  Future<void> chargerProfil() async {
    _setLoading(true);
    _setError(null);
    try {
      _user = await _api.getProfil();
    } catch (e) {
      _user = null;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> initialiserSession() async {
    _setLoading(true);
    _setError(null);
    try {
      _user = await _api.getCachedUser();
      if (_user != null) {
        notifyListeners();
      }

      final connecte = await _api.estConnecte();
      if (!connecte) {
        _user = null;
        return;
      }

      _user = await _api.getProfil();
    } catch (_) {
      _user = null;
      await _api.deconnexion();
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> connexion({
    required String email,
    required String password,
  }) async {
    _setLoading(true);
    _setError(null);
    _requires2fa = false;
    _otpEmail = null;
    _otpSessionToken = null;
    _debugOtpCode = null;
    try {
      final data = await _api.connexion(email: email, password: password);
      if (data['requires_2fa'] == true) {
        _requires2fa = true;
        _otpEmail = data['email']?.toString();
        _otpSessionToken = data['otp_session_token']?.toString();
        _debugOtpCode = data['debug_otp_code']?.toString();
        notifyListeners();
        return false;
      }
      _user = User.fromJson(data['user'] as Map<String, dynamic>);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(_extractError(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Vérifier le code OTP après connexion avec 2FA activé
  Future<bool> verifierOtpConnexion({required String otpCode}) async {
    if (_otpEmail == null || _otpSessionToken == null) return false;
    _setLoading(true);
    _setError(null);
    try {
      final data = await _api.verifierOtpConnexion(
        email: _otpEmail!,
        otpCode: otpCode,
        otpSessionToken: _otpSessionToken!,
      );
      _user = User.fromJson(data['user'] as Map<String, dynamic>);
      _requires2fa = false;
      _otpEmail = null;
      _otpSessionToken = null;
      _debugOtpCode = null;
      notifyListeners();
      return true;
    } catch (e) {
      _setError(_extractError(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  /// Annuler le flux 2FA et revenir à l'état "non connecté"
  void resetOtpState() {
    _requires2fa = false;
    _otpEmail = null;
    _otpSessionToken = null;
    _debugOtpCode = null;
    _error = null;
    notifyListeners();
  }

  /// Renvoyer un nouveau code OTP (met à jour le session token)
  Future<String?> renvoyerOtp() async {
    if (_otpEmail == null || _otpSessionToken == null) return null;
    try {
      final data = await _api.renvoyerOtpConnexion(
        email: _otpEmail!,
        otpSessionToken: _otpSessionToken!,
      );
      _otpSessionToken = data['otp_session_token']?.toString();
      _debugOtpCode = data['debug_otp_code']?.toString();
      notifyListeners();
      return data['message']?.toString();
    } catch (_) {
      return null;
    }
  }

  Future<bool> inscription({
    required String prenom,
    required String nom,
    required String email,
    required String password,
    required String password2,
    required String role,
    String? telephone,
  }) async {
    _setLoading(true);
    _setError(null);
    try {
      final data = await _api.inscription(
        prenom: prenom,
        nom: nom,
        email: email,
        password: password,
        password2: password2,
        role: role,
        telephone: telephone,
      );
      _user = User.fromJson(data['user'] as Map<String, dynamic>);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(_extractError(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  Future<void> deconnexion() async {
    await _api.deconnexion();
    _user = null;
    _error = null;
    _debugOtpCode = null;
    notifyListeners();
  }

  Future<bool> modifierProfil({
    String? nom,
    String? prenom,
    String? telephone,
  }) async {
    _setLoading(true);
    _setError(null);
    try {
      _user = await _api.modifierProfil(
        nom: nom,
        prenom: prenom,
        telephone: telephone,
      );
      notifyListeners();
      return true;
    } catch (e) {
      _setError(_extractError(e));
      return false;
    } finally {
      _setLoading(false);
    }
  }

  String _extractError(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map<String, dynamic>) {
        // Erreur non_field_errors (login invalide, etc.)
        if (data.containsKey('non_field_errors')) {
          final v = data['non_field_errors'];
          if (v is List && v.isNotEmpty) return v.first.toString();
        }
        // Erreur detail (permission, etc.)
        if (data.containsKey('detail')) return data['detail'].toString();
        // Erreurs de validation par champ : prendre la première
        for (final entry in data.entries) {
          final v = entry.value;
          if (v is List && v.isNotEmpty) return '${entry.key}: ${v.first}';
          if (v is String) return '${entry.key}: $v';
        }
      }
      if (data is String && data.isNotEmpty) return data;
      // Erreur réseau (pas de réponse)
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout ||
          e.type == DioExceptionType.sendTimeout) {
        if (ApiConfig.usesProductionBackend) {
          return 'Le serveur met trop de temps à répondre. Il est peut-être en cours de réveil sur l\'hébergement gratuit. Réessayez dans quelques secondes.';
        }
        return 'Délai de connexion dépassé. Vérifiez votre réseau.';
      }
      if (e.type == DioExceptionType.connectionError) {
        if (ApiConfig.usesProductionBackend) {
          return 'Impossible de joindre le serveur. Vérifiez l\'URL backend configurée et réessayez dans quelques secondes.';
        }
        return 'Impossible de joindre le serveur. Vérifiez l\'adresse IP et le réseau Wi-Fi.';
      }
    }
    final msg = e.toString();
    return msg.length > 120 ? '${msg.substring(0, 120)}…' : msg;
  }
}
