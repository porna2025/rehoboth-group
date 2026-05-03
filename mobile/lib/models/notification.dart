class AppNotification {
  final String id;
  final String typeNotif;
  final String titre;
  final String message;
  final String? objetId;
  final String? objetType;
  final bool lu;
  final String createdAt;

  const AppNotification({
    required this.id,
    required this.typeNotif,
    required this.titre,
    required this.message,
    this.objetId,
    this.objetType,
    this.lu = false,
    required this.createdAt,
  });

  factory AppNotification.fromJson(Map<String, dynamic> json) {
    return AppNotification(
      id: json['id']?.toString() ?? '',
      typeNotif: json['type_notif']?.toString() ?? 'systeme',
      titre: json['titre']?.toString() ?? '',
      message: json['message']?.toString() ?? '',
      objetId: json['objet_id']?.toString(),
      objetType: json['objet_type']?.toString(),
      lu: json['lu'] as bool? ?? false,
      createdAt: json['created_at']?.toString() ?? '',
    );
  }
}
