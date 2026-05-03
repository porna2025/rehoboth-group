import 'package:flutter/material.dart';
import '../models/technicien.dart';
import '../services/api_service.dart';

class TechnicienProvider extends ChangeNotifier {
  List<Categorie> _categories = [];
  List<Technicien> _techniciens = [];
  Technicien? _detail;
  Technicien? _monProfil;
  bool _loading = false;
  String? _error;

  final ApiService _api = ApiService();

  List<Categorie> get categories => _categories;
  List<Technicien> get techniciens => _techniciens;
  Technicien? get detail => _detail;
  Technicien? get monProfil => _monProfil;
  bool get isLoading => _loading;
  String? get error => _error;

  void _setLoading(bool v) {
    _loading = v;
    notifyListeners();
  }

  void _setError(String? e) {
    _error = e;
    notifyListeners();
  }

  Future<void> chargerCategories() async {
    _setLoading(true);
    _setError(null);
    try {
      _categories = await _api.getCategories();
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<void> chargerTechniciens({
    String? categorieId,
    bool? disponible,
    double? noteMin,
    String? search,
  }) async {
    _setLoading(true);
    _setError(null);
    try {
      _techniciens = await _api.getTechniciens(
        categorieId: categorieId,
        disponible: disponible,
        noteMin: noteMin,
        search: search,
      );
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<void> chargerDetail(String id) async {
    _setLoading(true);
    _setError(null);
    try {
      _detail = await _api.getTechnicien(id);
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<void> chargerMonProfil() async {
    _setLoading(true);
    _setError(null);
    try {
      _monProfil = await _api.getMonProfilTechnicien();
    } catch (e) {
      _setError(e.toString());
    } finally {
      _setLoading(false);
    }
  }

  Future<bool> toggleDisponibilite({
    required double lat,
    required double lng,
    required bool disponible,
  }) async {
    try {
      await _api.mettreAJourPosition(
        lat: lat,
        lng: lng,
        disponible: disponible,
      );
      if (_monProfil != null) {
        _monProfil = Technicien(
          id: _monProfil!.id,
          user: _monProfil!.user,
          categorie: _monProfil!.categorie,
          specialite: _monProfil!.specialite,
          description: _monProfil!.description,
          tarifHoraire: _monProfil!.tarifHoraire,
          zoneCouverture: _monProfil!.zoneCouverture,
          anneesExperience: _monProfil!.anneesExperience,
          latitude: lat,
          longitude: lng,
          noteMoyenne: _monProfil!.noteMoyenne,
          nbEvaluations: _monProfil!.nbEvaluations,
          nbMissions: _monProfil!.nbMissions,
          disponible: disponible,
          statutValidation: _monProfil!.statutValidation,
          statutLabel: _monProfil!.statutLabel,
          solde: _monProfil!.solde,
          createdAt: _monProfil!.createdAt,
        );
        notifyListeners();
      }
      return true;
    } catch (_) {
      return false;
    }
  }
}
