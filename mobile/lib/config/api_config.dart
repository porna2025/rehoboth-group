/// Configuration de l'API backend
///
/// Pour téléphone physique : remplacer l'IP par l'adresse IPv4 de votre PC
///   sur le réseau Wi-Fi local (ex: 192.168.1.X).
///   Trouver l'IP :  Windows → `ipconfig`  /  Linux/Mac → `ip a`
///
/// Pour émulateur Android : utiliser 10.0.2.2 (alias de localhost)
///
/// Pour émulateur iOS      : utiliser localhost ou 127.0.0.1
class ApiConfig {
  // ─── Modifiez UNIQUEMENT cette ligne selon votre environnement ────────────
  static const String _serverIp = '192.168.1.40'; // ← votre IP Wi-Fi du PC
  // ─────────────────────────────────────────────────────────────────────────

  static const int _port = 8000;

  static String get baseUrl => 'http://$_serverIp:$_port/api/v1';

  static const int connectTimeout = 15; // secondes
  static const int receiveTimeout = 30; // secondes
}
