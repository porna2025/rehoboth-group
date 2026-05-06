import 'package:flutter/material.dart';
import 'package:dio/dio.dart';
import '../models/demande.dart';
import '../services/api_service.dart';

class DemandeProvider extends ChangeNotifier {
  List<Demande> _demandes = [];
  List<Demande> _demandesDisponibles = [];
  Demande? _detail;
  List<Message> _messages = [];
  bool _loading = false;
  bool _sendingMessage = false;
  String? _error;

  final ApiService _api = ApiService();

  List<Demande> get demandes => _demandes;
  List<Demande> get demandesDisponibles => _demandesDisponibles;
  Demande? get detail => _detail;
  List<Message> get messages => _messages;
  bool get isLoading => _loading;
  bool get isSendingMessage => _sendingMessage;
  String? get error => _error;

  void _setLoading(bool v) {
    _loading = v;
    notifyListeners();
  }

  void _setError(String? e) {
    _error = e;
    notifyListeners();
  }

  Future<void> chargerMesDemandes({String? statut}) async {
    _setLoading(true);
    _setError(null);
    try {
      _demandes = await _api.getMesDemandes(statut: statut);
    } catch (e) {
      _setError(_extractError(e));
    } finally {
      _setLoading(false);
    }
  }

  Future<void> chargerMesMissions({String? statut}) async {
    _setLoading(true);
    _setError(null);
    try {
      _demandes = await _api.getMesMissions(statut: statut);
    } catch (e) {
      _setError(_extractError(e));
    } finally {
      _setLoading(false);
    }
  }

  Future<void> chargerDemandesDisponibles() async {
    _setLoading(true);
    _setError(null);
    try {
      _demandesDisponibles = await _api.getDemandesDisponibles();
    } catch (e) {
      _setError(_extractError(e));
    } finally {
      _setLoading(false);
    }
  }

  Future<void> chargerDetail(String id) async {
    _detail = null;
    _setLoading(true);
    _setError(null);
    try {
      _detail = await _api.getDetailDemande(id);
    } catch (e) {
      _setError(_extractError(e));
    } finally {
      _setLoading(false);
    }
  }

  Future<Demande?> creerDemande({
    required String categorieId,
    required String description,
    required String adresse,
    required double latitude,
    required double longitude,
    String typeIntervention = 'immediat',
    String mode = 'sur_place',
    String? dateSouhaitee,
  }) async {
    _setLoading(true);
    _setError(null);
    try {
      final demande = await _api.creerDemande(
        categorieId: categorieId,
        description: description,
        adresse: adresse,
        latitude: latitude,
        longitude: longitude,
        typeIntervention: typeIntervention,
        mode: mode,
        dateSouhaitee: dateSouhaitee,
      );
      _demandes.insert(0, demande);
      notifyListeners();
      return demande;
    } catch (e) {
      _setError(_extractError(e));
      return null;
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> accepterDemande(String id) async {
    _setError(null);
    try {
      final updated = await _api.accepterDemande(id);
      _detail = updated;
      _updateInList(updated);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(_extractError(e));
      return false;
    }
  }

  Future<bool> mettreAJourStatut(
    String id, {
    required String statut,
    String? rapport,
    double? montantDevis,
  }) async {
    _setError(null);
    try {
      final updated = await _api.mettreAJourStatut(
        id,
        statut: statut,
        rapport: rapport,
        montantDevis: montantDevis,
      );
      _detail = updated;
      _updateInList(updated);
      notifyListeners();
      return true;
    } catch (e) {
      _setError(_extractError(e));
      return false;
    }
  }

  Future<bool> annulerDemande(String id) async {
    _setError(null);
    try {
      await _api.annulerDemande(id);
      _demandes.removeWhere((d) => d.id == id);
      if (_detail?.id == id) _detail = null;
      notifyListeners();
      return true;
    } catch (e) {
      _setError(_extractError(e));
      return false;
    }
  }

  Future<void> chargerMessages(String demandeId, String monId) async {
    _setLoading(true);
    _setError(null);
    try {
      _messages = await _api.getMessages(demandeId, monId);
    } catch (e) {
      _setError(_extractError(e));
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> envoyerMessage(
    String demandeId,
    String contenu,
    String monId,
  ) async {
    _sendingMessage = true;
    notifyListeners();
    try {
      final msg = await _api.envoyerMessage(demandeId, contenu, monId);
      _messages.add(msg);
      notifyListeners();
      return true;
    } catch (_) {
      return false;
    } finally {
      _sendingMessage = false;
      notifyListeners();
    }
  }

  void _updateInList(Demande updated) {
    final idx = _demandes.indexWhere((d) => d.id == updated.id);
    if (idx != -1) _demandes[idx] = updated;
  }

  String _extractError(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map<String, dynamic>) {
        if (data.containsKey('non_field_errors')) {
          final v = data['non_field_errors'];
          if (v is List && v.isNotEmpty) return v.first.toString();
        }
        if (data.containsKey('error')) return data['error'].toString();
        if (data.containsKey('detail')) return data['detail'].toString();
        for (final entry in data.entries) {
          final v = entry.value;
          if (v is List && v.isNotEmpty) return v.first.toString();
          if (v is String) return v;
        }
      }
      if (e.response?.statusCode == 403) return 'Accès non autorisé.';
      if (e.response?.statusCode == 404) return 'Ressource introuvable.';
      if (e.type == DioExceptionType.connectionError) {
        return 'Impossible de joindre le serveur.';
      }
      if (e.type == DioExceptionType.connectionTimeout ||
          e.type == DioExceptionType.receiveTimeout) {
        return 'Délai de connexion dépassé.';
      }
    }
    return 'Une erreur est survenue.';
  }
}
