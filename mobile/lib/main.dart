import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';

import 'providers/auth_provider.dart';
import 'providers/technicien_provider.dart';
import 'providers/demande_provider.dart';
import 'providers/notification_provider.dart';
import 'services/api_service.dart';

import 'pages/auth/login_page.dart';
import 'pages/auth/register_page.dart';
import 'pages/auth/forgot_password_page.dart';
import 'pages/client/home_client_page.dart';
import 'pages/client/techniciens_page.dart';
import 'pages/client/technicien_detail_page.dart';
import 'pages/client/creer_demande_page.dart';
import 'pages/client/mes_demandes_page.dart';
import 'pages/client/demande_detail_page.dart';
import 'pages/client/paiement_page.dart';
import 'pages/client/evaluation_page.dart';
import 'pages/technicien/home_technicien_page.dart';
import 'pages/technicien/missions_page.dart';
import 'pages/technicien/mission_detail_page.dart';
import 'pages/shared/profil_page.dart';
import 'pages/shared/notifications_page.dart';
import 'pages/shared/chat_page.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(
    const SystemUiOverlayStyle(
      statusBarColor: Colors.transparent,
      statusBarIconBrightness: Brightness.light,
    ),
  );
  runApp(const RehobothApp());
}

class RehobothApp extends StatelessWidget {
  const RehobothApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => AuthProvider()),
        ChangeNotifierProvider(create: (_) => TechnicienProvider()),
        ChangeNotifierProvider(create: (_) => DemandeProvider()),
        ChangeNotifierProvider(create: (_) => NotificationProvider()),
      ],
      child: MaterialApp(
        title: 'Rehoboth Groupe',
        debugShowCheckedModeBanner: false,
        theme: ThemeData(
          colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF2563EB)),
          useMaterial3: true,
          fontFamily: 'Roboto',
        ),
        initialRoute: '/',
        routes: {
          '/': (_) => const _SplashRoute(),
          '/login': (_) => const LoginPage(),
          '/register': (_) => const RegisterPage(),
          '/forgot-password': (_) => const ForgotPasswordPage(),
          '/home-client': (_) => const HomeClientPage(),
          '/home-technicien': (_) => const HomeTechnicienPage(),
          '/techniciens': (_) => const TechniciensPage(),
          '/technicien-detail': (_) => const TechnicienDetailPage(),
          '/creer-demande': (_) => const CreerDemandePage(),
          '/mes-demandes': (_) => const MesDemandesPage(),
          '/demande-detail': (_) => const DemandeDetailPage(),
          '/paiement': (_) => const PaiementPage(),
          '/evaluation': (_) => const EvaluationPage(),
          '/missions': (_) => const MissionsPage(),
          '/mission-detail': (_) => const MissionDetailPage(),
          '/profil': (_) => const ProfilPage(),
          '/notifications': (_) => const NotificationsPage(),
          '/chat': (_) => const ChatPage(),
        },
      ),
    );
  }
}

/// Écran de démarrage : vérifie la session et redirige.
class _SplashRoute extends StatefulWidget {
  const _SplashRoute();

  @override
  State<_SplashRoute> createState() => _SplashRouteState();
}

class _SplashRouteState extends State<_SplashRoute>
    with SingleTickerProviderStateMixin {
  late AnimationController _animCtrl;
  late Animation<double> _fadeAnim;
  late Animation<double> _scaleAnim;

  @override
  void initState() {
    super.initState();
    _animCtrl = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 900),
    );
    _fadeAnim = CurvedAnimation(parent: _animCtrl, curve: Curves.easeIn);
    _scaleAnim = Tween<double>(begin: 0.75, end: 1.0).animate(
      CurvedAnimation(parent: _animCtrl, curve: Curves.elasticOut),
    );
    _animCtrl.forward();
    _check();
  }

  @override
  void dispose() {
    _animCtrl.dispose();
    super.dispose();
  }

  Future<void> _check() async {
    final warmup = ApiService().warmupBackend();
    await Future.delayed(const Duration(milliseconds: 450));
    if (!mounted) return;

    final auth = context.read<AuthProvider>();

    try {
      await warmup;
      await auth.initialiserSession();
      if (!mounted) return;

      final user = auth.user;
      if (user == null) {
        Navigator.pushReplacementNamed(context, '/login');
      } else if (user.isTechnicien) {
        Navigator.pushReplacementNamed(context, '/home-technicien');
      } else {
        Navigator.pushReplacementNamed(context, '/home-client');
      }
    } catch (_) {
      if (mounted) Navigator.pushReplacementNamed(context, '/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: const BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Color(0xFF1D4ED8), Color(0xFF2563EB), Color(0xFF3B82F6)],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: FadeTransition(
              opacity: _fadeAnim,
              child: ScaleTransition(
                scale: _scaleAnim,
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 100,
                      height: 100,
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.15),
                        borderRadius: BorderRadius.circular(28),
                      ),
                      child: const Icon(
                        Icons.home_repair_service,
                        size: 60,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 24),
                    const Text(
                      'Rehoboth Groupe',
                      style: TextStyle(
                        color: Colors.white,
                        fontSize: 28,
                        fontWeight: FontWeight.bold,
                        letterSpacing: 0.5,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Votre service à domicile',
                      style: TextStyle(
                        color: Colors.white.withValues(alpha: 0.8),
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 48),
                    const SizedBox(
                      width: 28,
                      height: 28,
                      child: CircularProgressIndicator(
                        color: Colors.white70,
                        strokeWidth: 2.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }
}

// ─── Placeholder classes removed — real pages imported above ─────────────────
