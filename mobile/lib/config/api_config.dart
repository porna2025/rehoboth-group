class ApiConfig {
  static const String _configuredBaseUrl =
      String.fromEnvironment('API_BASE_URL', defaultValue: '');
  static const String _serverIp =
      String.fromEnvironment('API_SERVER_IP', defaultValue: '10.0.2.2');
  static const int _port = int.fromEnvironment('API_PORT', defaultValue: 8000);
  static const bool _isProductionBackend =
      bool.fromEnvironment('API_IS_PRODUCTION', defaultValue: false);

  static String get baseUrl {
    final configured = _configuredBaseUrl.trim();
    if (configured.isNotEmpty) {
      final sanitized = configured.replaceFirst(RegExp(r'/$'), '');
      return sanitized.endsWith('/api/v1') ? sanitized : '$sanitized/api/v1';
    }
    return 'http://$_serverIp:$_port/api/v1';
  }

  static const int connectTimeout = int.fromEnvironment(
    'API_CONNECT_TIMEOUT_SECONDS',
    defaultValue: 60,
  );
  static const int receiveTimeout = int.fromEnvironment(
    'API_RECEIVE_TIMEOUT_SECONDS',
    defaultValue: 60,
  );
  static const int warmupCooldownMinutes = int.fromEnvironment(
    'API_WARMUP_COOLDOWN_MINUTES',
    defaultValue: 20,
  );

  static bool get usesProductionBackend {
    if (_isProductionBackend) return true;
    final configured = _configuredBaseUrl.trim();
    return configured.startsWith('https://');
  }
}
