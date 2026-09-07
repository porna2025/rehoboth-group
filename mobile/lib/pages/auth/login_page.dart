import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_svg/flutter_svg.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  final _formKey = GlobalKey<FormState>();
  final _emailCtrl = TextEditingController();
  final _pwCtrl = TextEditingController();
  final _otpCtrl = TextEditingController();
  bool _obscure = true;
  int _resendCountdown = 0;
  Timer? _resendTimer;

  @override
  void dispose() {
    _emailCtrl.dispose();
    _pwCtrl.dispose();
    _otpCtrl.dispose();
    _resendTimer?.cancel();
    super.dispose();
  }

  void _startResendTimer() {
    _resendCountdown = 30;
    _resendTimer?.cancel();
    _resendTimer = Timer.periodic(const Duration(seconds: 1), (t) {
      if (!mounted) {
        t.cancel();
        return;
      }
      setState(() {
        if (_resendCountdown > 0) {
          _resendCountdown--;
        } else {
          t.cancel();
        }
      });
    });
  }

  void _navigateAfterLogin(BuildContext ctx) {
    final user = ctx.read<AuthProvider>().user!;
    if (user.isTechnicien) {
      Navigator.pushReplacementNamed(ctx, '/home-technicien');
    } else {
      Navigator.pushReplacementNamed(ctx, '/home-client');
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    final auth = context.read<AuthProvider>();
    final ok = await auth.connexion(
      email: _emailCtrl.text.trim(),
      password: _pwCtrl.text,
    );
    if (!mounted) return;
    if (ok) {
      _navigateAfterLogin(context);
    } else if (auth.requires2fa) {
      setState(() => _otpCtrl.clear());
      _startResendTimer();
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            auth.debugOtpCode != null
                ? 'Utilisez le code affiché si l\'email tarde à arriver.'
                : 'Un code de vérification a été envoyé à ${auth.otpEmail}',
          ),
          backgroundColor: Colors.blue[700],
          duration: const Duration(seconds: 5),
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.error ?? 'Identifiants incorrects'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _submitOtp() async {
    final code = _otpCtrl.text.trim();
    if (code.length != 6) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Entrez le code à 6 chiffres'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }
    final auth = context.read<AuthProvider>();
    final ok = await auth.verifierOtpConnexion(otpCode: code);
    if (!mounted) return;
    if (ok) {
      _navigateAfterLogin(context);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.error ?? 'Code invalide'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _resendOtp() async {
    final auth = context.read<AuthProvider>();
    final msg = await auth.renvoyerOtp();
    if (!mounted) return;
    _startResendTimer();
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(msg ?? 'Nouveau code envoyé'),
        backgroundColor: Colors.green,
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final loading = auth.isLoading;
    final otpMode = auth.requires2fa;
    return Scaffold(
      backgroundColor: const Color(0xFFF5F6FA),
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                SvgPicture.asset(
                  'assets/rehoboth_logo_small.svg',
                  width: 220,
                  height: 140,
                ),
                const SizedBox(height: 8),
                Text(
                  otpMode
                      ? 'Vérification en deux étapes'
                      : 'Connectez-vous à votre compte',
                  style: TextStyle(color: Colors.grey[600]),
                ),
                const SizedBox(height: 32),
                // Formulaire login OU formulaire OTP
                Card(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(24),
                    child: otpMode
                        ? _buildOtpForm(loading)
                        : Form(key: _formKey, child: _buildLoginForm(loading)),
                  ),
                ),
                const SizedBox(height: 16),
                if (!otpMode)
                  TextButton(
                    onPressed: () => Navigator.pushNamed(context, '/register'),
                    child: const Text("Pas encore de compte ? S'inscrire"),
                  ),
                if (otpMode)
                  TextButton(
                    onPressed: loading
                        ? null
                        : () {
                            _otpCtrl.clear();
                            _resendTimer?.cancel();
                            context.read<AuthProvider>().resetOtpState();
                          },
                    child: const Text('← Retour à la connexion'),
                  ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildLoginForm(bool loading) {
    return Column(
      children: [
        TextFormField(
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(
            labelText: 'Adresse email',
            prefixIcon: Icon(Icons.email_outlined),
          ),
          validator: (v) {
            if (v == null || v.trim().isEmpty) return 'Email requis';
            if (!v.contains('@')) return 'Email invalide';
            return null;
          },
        ),
        const SizedBox(height: 16),
        TextFormField(
          controller: _pwCtrl,
          obscureText: _obscure,
          decoration: InputDecoration(
            labelText: 'Mot de passe',
            prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(
              icon: Icon(_obscure ? Icons.visibility_off : Icons.visibility),
              onPressed: () => setState(() => _obscure = !_obscure),
            ),
          ),
          validator: (v) {
            if (v == null || v.isEmpty) return 'Mot de passe requis';
            return null;
          },
        ),
        const SizedBox(height: 8),
        Align(
          alignment: Alignment.centerRight,
          child: TextButton(
            onPressed: () => Navigator.pushNamed(context, '/forgot-password'),
            child: const Text(
              'Mot de passe oublié ?',
              style: TextStyle(fontSize: 13),
            ),
          ),
        ),
        const SizedBox(height: 8),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: loading ? null : _submit,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: loading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : const Text('Se connecter', style: TextStyle(fontSize: 16)),
          ),
        ),
      ],
    );
  }

  Widget _buildOtpForm(bool loading) {
    final auth = context.watch<AuthProvider>();
    return Column(
      children: [
        // Icône verrou
        Container(
          width: 60,
          height: 60,
          decoration: BoxDecoration(
            color: const Color(0xFF2563EB).withAlpha(26),
            shape: BoxShape.circle,
          ),
          child: const Icon(
            Icons.verified_user_outlined,
            color: Color(0xFF2563EB),
            size: 32,
          ),
        ),
        const SizedBox(height: 16),
        Text(
          'Code envoyé à',
          style: TextStyle(color: Colors.grey[600], fontSize: 13),
        ),
        Text(
          auth.otpEmail ?? '',
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        if (auth.debugOtpCode != null) ...[
          const SizedBox(height: 16),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              color: const Color(0xFFFEF3C7),
              borderRadius: BorderRadius.circular(12),
              border: Border.all(color: const Color(0xFFF59E0B)),
            ),
            child: Column(
              children: [
                const Text(
                  'Code OTP de secours',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF92400E),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  auth.debugOtpCode!,
                  style: const TextStyle(
                    fontSize: 26,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 6,
                    color: Color(0xFF92400E),
                  ),
                ),
              ],
            ),
          ),
        ],
        const SizedBox(height: 24),
        // Champ OTP 6 chiffres
        TextField(
          controller: _otpCtrl,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          style: const TextStyle(
            fontSize: 28,
            fontWeight: FontWeight.bold,
            letterSpacing: 12,
          ),
          decoration: InputDecoration(
            hintText: '______',
            hintStyle: TextStyle(
              color: Colors.grey[400],
              letterSpacing: 12,
              fontSize: 28,
            ),
            counterText: '',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide: const BorderSide(color: Color(0xFF2563EB), width: 2),
            ),
          ),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          height: 48,
          child: ElevatedButton(
            onPressed: loading ? null : _submitOtp,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: loading
                ? const SizedBox(
                    height: 20,
                    width: 20,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : const Text('Vérifier', style: TextStyle(fontSize: 16)),
          ),
        ),
        const SizedBox(height: 12),
        // Bouton renvoyer avec décompte
        TextButton(
          onPressed: (loading || _resendCountdown > 0) ? null : _resendOtp,
          child: Text(
            _resendCountdown > 0
                ? 'Renvoyer le code (${_resendCountdown}s)'
                : 'Renvoyer le code',
          ),
        ),
      ],
    );
  }
}
