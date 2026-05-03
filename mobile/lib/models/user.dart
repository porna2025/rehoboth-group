class User {
  final String id;
  final String email;
  final String nom;
  final String prenom;
  final String? telephone;
  final String role;
  final String? photoProfil;
  final bool estVerifie;
  final bool estActif;
  final String nomComplet;
  final String createdAt;

  const User({
    required this.id,
    required this.email,
    required this.nom,
    required this.prenom,
    this.telephone,
    required this.role,
    this.photoProfil,
    required this.estVerifie,
    required this.estActif,
    required this.nomComplet,
    required this.createdAt,
  });

  factory User.fromJson(Map<String, dynamic> json) {
    return User(
      id: json['id']?.toString() ?? '',
      email: json['email']?.toString() ?? '',
      nom: json['nom']?.toString() ?? '',
      prenom: json['prenom']?.toString() ?? '',
      telephone: json['telephone']?.toString(),
      role: json['role']?.toString() ?? 'client',
      photoProfil: json['photo_profil']?.toString(),
      estVerifie: json['est_verifie'] as bool? ?? false,
      estActif: json['est_actif'] as bool? ?? true,
      nomComplet:
          json['nom_complet']?.toString() ??
          '${json['prenom'] ?? ''} ${json['nom'] ?? ''}'.trim(),
      createdAt: json['created_at']?.toString() ?? '',
    );
  }

  bool get isClient => role == 'client';
  bool get isTechnicien => role == 'technicien';
  bool get isAdmin => role == 'admin';
}
