import 'user.dart';

class Categorie {
  final String id;
  final String nom;
  final String description;
  final String icone;
  final int nbTechniciens;

  const Categorie({
    required this.id,
    required this.nom,
    this.description = '',
    this.icone = '',
    this.nbTechniciens = 0,
  });

  factory Categorie.fromJson(Map<String, dynamic> json) {
    return Categorie(
      id: json['id']?.toString() ?? '',
      nom: json['nom']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      icone: json['icone']?.toString() ?? '',
      nbTechniciens: json['nb_techniciens'] as int? ?? 0,
    );
  }

  @override
  bool operator ==(Object other) =>
      identical(this, other) || other is Categorie && id == other.id;

  @override
  int get hashCode => id.hashCode;
}

class Technicien {
  final String id;
  final User user;
  final Categorie? categorie;
  final String specialite;
  final String description;
  final double? tarifHoraire;
  final String zoneCouverture;
  final int anneesExperience;
  final double? latitude;
  final double? longitude;
  final double noteMoyenne;
  final int nbEvaluations;
  final int nbMissions;
  final bool disponible;
  final String statutValidation;
  final String statutLabel;
  final double solde;
  final String createdAt;

  const Technicien({
    required this.id,
    required this.user,
    this.categorie,
    required this.specialite,
    this.description = '',
    this.tarifHoraire,
    this.zoneCouverture = '',
    this.anneesExperience = 0,
    this.latitude,
    this.longitude,
    this.noteMoyenne = 0,
    this.nbEvaluations = 0,
    this.nbMissions = 0,
    this.disponible = false,
    this.statutValidation = 'en_attente',
    this.statutLabel = '',
    this.solde = 0,
    required this.createdAt,
  });

  factory Technicien.fromJson(Map<String, dynamic> json) {
    return Technicien(
      id: json['id']?.toString() ?? '',
      user: User.fromJson(json['user'] as Map<String, dynamic>),
      categorie: json['categorie'] != null
          ? Categorie.fromJson(json['categorie'] as Map<String, dynamic>)
          : null,
      specialite: json['specialite']?.toString() ?? '',
      description: json['description']?.toString() ?? '',
      tarifHoraire: json['tarif_horaire'] != null
          ? double.tryParse(json['tarif_horaire'].toString())
          : null,
      zoneCouverture: json['zone_couverture']?.toString() ?? '',
      anneesExperience: json['annees_experience'] as int? ?? 0,
      latitude: json['latitude'] != null
          ? double.tryParse(json['latitude'].toString())
          : null,
      longitude: json['longitude'] != null
          ? double.tryParse(json['longitude'].toString())
          : null,
      noteMoyenne:
          double.tryParse(json['note_moyenne']?.toString() ?? '0') ?? 0,
      nbEvaluations: json['nb_evaluations'] as int? ?? 0,
      nbMissions: json['nb_missions'] as int? ?? 0,
      disponible: json['disponible'] as bool? ?? false,
      statutValidation: json['statut_validation']?.toString() ?? 'en_attente',
      statutLabel: json['statut_label']?.toString() ?? '',
      solde: double.tryParse(json['solde']?.toString() ?? '0') ?? 0,
      createdAt: json['created_at']?.toString() ?? '',
    );
  }

  bool get estValide => statutValidation == 'valide';
}
