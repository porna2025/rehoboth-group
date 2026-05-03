import 'user.dart';
import 'technicien.dart';

class Demande {
  final String id;
  final User client;
  final User? technicien;
  final Categorie? categorie;
  final String description;
  final String adresse;
  final double latitude;
  final double longitude;
  final String typeIntervention;
  final String typeLabel;
  final String mode;
  final String modeLabel;
  final String? dateSouhaitee;
  final String statut;
  final String statutLabel;
  final String rapport;
  final double? montantDevis;
  final String createdAt;
  final String updatedAt;

  const Demande({
    required this.id,
    required this.client,
    this.technicien,
    this.categorie,
    required this.description,
    required this.adresse,
    required this.latitude,
    required this.longitude,
    this.typeIntervention = 'immediat',
    this.typeLabel = '',
    this.mode = 'sur_place',
    this.modeLabel = '',
    this.dateSouhaitee,
    this.statut = 'en_attente',
    this.statutLabel = '',
    this.rapport = '',
    this.montantDevis,
    required this.createdAt,
    required this.updatedAt,
  });

  factory Demande.fromJson(Map<String, dynamic> json) {
    return Demande(
      id: json['id']?.toString() ?? '',
      client: User.fromJson(json['client'] as Map<String, dynamic>),
      technicien: json['technicien'] != null
          ? User.fromJson(json['technicien'] as Map<String, dynamic>)
          : null,
      categorie: json['categorie'] != null
          ? Categorie.fromJson(json['categorie'] as Map<String, dynamic>)
          : null,
      description: json['description']?.toString() ?? '',
      adresse: json['adresse']?.toString() ?? '',
      latitude: double.tryParse(json['latitude']?.toString() ?? '0') ?? 0,
      longitude: double.tryParse(json['longitude']?.toString() ?? '0') ?? 0,
      typeIntervention: json['type_intervention']?.toString() ?? 'immediat',
      typeLabel: json['type_label']?.toString() ?? '',
      mode: json['mode']?.toString() ?? 'sur_place',
      modeLabel: json['mode_label']?.toString() ?? '',
      dateSouhaitee: json['date_souhaitee']?.toString(),
      statut: json['statut']?.toString() ?? 'en_attente',
      statutLabel: json['statut_label']?.toString() ?? '',
      rapport: json['rapport']?.toString() ?? '',
      montantDevis: json['montant_devis'] != null
          ? double.tryParse(json['montant_devis'].toString())
          : null,
      createdAt: json['created_at']?.toString() ?? '',
      updatedAt: json['updated_at']?.toString() ?? '',
    );
  }

  bool get enAttente => statut == 'en_attente';
  bool get acceptee => statut == 'acceptee';
  bool get enCours => statut == 'en_cours';
  bool get terminee => statut == 'terminee';
  bool get annulee => statut == 'annulee';
}

class Message {
  final String id;
  final User expediteur;
  final String contenu;
  final bool lu;
  final bool estMien;
  final String createdAt;

  const Message({
    required this.id,
    required this.expediteur,
    required this.contenu,
    this.lu = false,
    required this.estMien,
    required this.createdAt,
  });

  factory Message.fromJson(Map<String, dynamic> json, {required String monId}) {
    final expediteur = User.fromJson(
      json['expediteur'] as Map<String, dynamic>,
    );
    return Message(
      id: json['id']?.toString() ?? '',
      expediteur: expediteur,
      contenu: json['contenu']?.toString() ?? '',
      lu: json['lu'] as bool? ?? false,
      estMien: expediteur.id == monId,
      createdAt: json['created_at']?.toString() ?? '',
    );
  }
}
