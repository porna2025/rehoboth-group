import 'package:flutter/material.dart';
import '../models/notification.dart';
import '../services/api_service.dart';

class NotificationProvider extends ChangeNotifier {
  List<AppNotification> _notifications = [];
  bool _loading = false;
  int _nonLues = 0;

  final ApiService _api = ApiService();

  List<AppNotification> get notifications => _notifications;
  bool get isLoading => _loading;
  int get nonLues => _nonLues;

  void _setLoading(bool v) {
    _loading = v;
    notifyListeners();
  }

  Future<void> chargerNotifications() async {
    _setLoading(true);
    try {
      final raw = await _api.getNotifications();
      _notifications = raw
          .map((e) => AppNotification.fromJson(e as Map<String, dynamic>))
          .toList();
      _nonLues = _notifications.where((n) => !n.lu).length;
    } catch (_) {
      // silence — notifications non bloquantes
    } finally {
      _setLoading(false);
    }
  }

  Future<void> marquerLue(String id) async {
    try {
      await _api.marquerNotificationLue(id);
      final idx = _notifications.indexWhere((n) => n.id == id);
      if (idx != -1) {
        final old = _notifications[idx];
        _notifications[idx] = AppNotification(
          id: old.id,
          typeNotif: old.typeNotif,
          titre: old.titre,
          message: old.message,
          objetId: old.objetId,
          objetType: old.objetType,
          lu: true,
          createdAt: old.createdAt,
        );
        _nonLues = _notifications.where((n) => !n.lu).length;
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<void> marquerToutesLues() async {
    try {
      await _api.marquerToutesNotificationsLues();
      _notifications = _notifications
          .map(
            (n) => AppNotification(
              id: n.id,
              typeNotif: n.typeNotif,
              titre: n.titre,
              message: n.message,
              objetId: n.objetId,
              objetType: n.objetType,
              lu: true,
              createdAt: n.createdAt,
            ),
          )
          .toList();
      _nonLues = 0;
      notifyListeners();
    } catch (_) {}
  }
}
