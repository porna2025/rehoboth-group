import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:dio/dio.dart';
import '../../services/api_service.dart';

/// Page "Mot de passe oublié" — 2 étapes :
/// Étape 1 : saisie de l'e-mail → envoi du code de réinitialisation
/// Étape 2 : saisie du code + nouveau mot de passe → confirmation
class ForgotPasswordPage extends StatefulWidget {
  const ForgotPasswordPage({super.key});

  @override
  State<ForgotPasswordPage> createState() => _ForgotPasswordPageState();
}

class _ForgotPasswordPageState extends State<ForgotPasswordPage> {
  final _api = ApiService();

  // ── Étape courante ─────────────────────────────────────────────────────────
  int _step = 1; // 1 = e-mail, 2 = code + nouveau mot de passe

  // ── Contrôleurs ───────────────────────────────────────────────────────────
  final _emailCtrl = TextEditingController();
  final _codeCtrl = TextEditingController();
  final _pwdCtrl = TextEditingController();
  final _pwd2Ctrl = TextEditingController();

  // ── État ──────────────────────────────────────────────────────────────────
  bool _loading = false;
  String? _errorMsg;
  String? _infoMsg;
  String? _debugResetCode;
  bool _obscurePwd = true;
  bool _obscurePwd2 = true;

  // Token retourné par le backend à l'étape 1 (sécurisation du reset)
  String _resetToken = '';
  // E-mail confirmé depuis l'étape 1 (pré-rempli étape 2)
  String _confirmedEmail = '';

  @override
  void dispose() {
    _emailCtrl.dispose();
    _codeCtrl.dispose();
    _pwdCtrl.dispose();
    _pwd2Ctrl.dispose();
    super.dispose();
  }

  // ── Extraction d'un message d'erreur lisible ───────────────────────────────
  String _extractError(Object e) {
    if (e is DioException) {
      final data = e.response?.data;
      if (data is Map<String, dynamic>) {
        // Chercher un champ "detail" ou "error" ou "message"
        for (final key in ['detail', 'error', 'message']) {
          if (data[key] is String) return data[key] as String;
        }
        if (data['non_field_errors'] is List &&
            (data['non_field_errors'] as List).isNotEmpty) {
          return (data['non_field_errors'] as List).first.toString();
        }
        // Sinon, concaténer les premières erreurs de champ
        final msgs = <String>[];
        data.forEach((k, v) {
          if (v is List && v.isNotEmpty) msgs.add(v.first.toString());
          if (v is String) msgs.add(v);
        });
        if (msgs.isNotEmpty) return msgs.join(' ');
      }
      if (data is String && data.isNotEmpty) return data;
      switch (e.type) {
        case DioExceptionType.connectionError:
        case DioExceptionType.connectionTimeout:
          return 'Impossible de joindre le serveur.';
        case DioExceptionType.receiveTimeout:
          return 'Le serveur met trop de temps à répondre.';
        default:
          break;
      }
      final status = e.response?.statusCode;
      if (status == 400) return 'Données invalides.';
      if (status == 404) return 'Adresse e-mail introuvable.';
    }
    return 'Une erreur est survenue.';
  }

  // ── Étape 1 : demander le code ─────────────────────────────────────────────
  Future<void> _envoyerCode() async {
    final email = _emailCtrl.text.trim();
    if (email.isEmpty) {
      setState(() => _errorMsg = 'Veuillez saisir votre adresse e-mail.');
      return;
    }

    setState(() {
      _loading = true;
      _errorMsg = null;
      _infoMsg = null;
      _debugResetCode = null;
    });

    try {
      final result = await _api.demanderResetMotDePasse(email);
      _resetToken = result['reset_token']?.toString() ?? '';
      _confirmedEmail = result['email']?.toString() ?? email;
      _infoMsg = result['message']?.toString();
      _debugResetCode = result['debug_reset_code']?.toString();
      setState(() {
        _step = 2;
        _loading = false;
      });
    } catch (e) {
      setState(() {
        _errorMsg = _extractError(e);
        _loading = false;
      });
    }
  }

  // ── Étape 2 : confirmer le reset ───────────────────────────────────────────
  Future<void> _confirmerReset() async {
    final code = _codeCtrl.text.trim();
    final pwd = _pwdCtrl.text;
    final pwd2 = _pwd2Ctrl.text;

    if (code.isEmpty || pwd.isEmpty || pwd2.isEmpty) {
      setState(() => _errorMsg = 'Veuillez remplir tous les champs.');
      return;
    }
    if (pwd != pwd2) {
      setState(() => _errorMsg = 'Les mots de passe ne correspondent pas.');
      return;
    }

    setState(() {
      _loading = true;
      _errorMsg = null;
      _infoMsg = null;
    });

    try {
      await _api.confirmerResetMotDePasse(
        email: _confirmedEmail,
        resetCode: code,
        resetToken: _resetToken,
        newPassword: pwd,
        newPassword2: pwd2,
      );

      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Mot de passe réinitialisé avec succès !'),
          backgroundColor: Color(0xFF16A34A),
        ),
      );
      Navigator.pushReplacementNamed(context, '/login');
    } catch (e) {
      setState(() {
        _errorMsg = _extractError(e);
        _loading = false;
      });
    }
  }

  // ── UI ─────────────────────────────────────────────────────────────────────

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.grey[50],
      appBar: AppBar(
        backgroundColor: Colors.transparent,
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_ios_new, color: Color(0xFF1E293B)),
          onPressed: () {
            if (_step == 2) {
              setState(() {
                _step = 1;
                _errorMsg = null;
                _codeCtrl.clear();
                _pwdCtrl.clear();
                _pwd2Ctrl.clear();
              });
            } else {
              Navigator.pop(context);
            }
          },
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // ── En-tête ──────────────────────────────────────────────────
              Center(
                child: Container(
                  width: 72,
                  height: 72,
                  decoration: BoxDecoration(
                    color: const Color(0xFF2563EB).withAlpha(26),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.lock_reset_outlined,
                    color: Color(0xFF2563EB),
                    size: 38,
                  ),
                ),
              ),
              const SizedBox(height: 20),
              Center(
                child: Text(
                  'Mot de passe oublié',
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.bold,
                        color: const Color(0xFF1E293B),
                      ),
                ),
              ),
              const SizedBox(height: 8),
              Center(
                child: Text(
                  _step == 1
                      ? 'Saisissez votre adresse e-mail.\nNous vous enverrons un code de réinitialisation.'
                      : 'Entrez le code reçu par e-mail\net définissez votre nouveau mot de passe.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.grey[600], fontSize: 14),
                ),
              ),
              const SizedBox(height: 32),

              // ── Indicateur d'étape ────────────────────────────────────────
              _StepIndicator(currentStep: _step),
              const SizedBox(height: 32),

              // ── Formulaire ────────────────────────────────────────────────
              _step == 1 ? _buildStep1() : _buildStep2(),

              // ── Message d'erreur ──────────────────────────────────────────
              if (_errorMsg != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFFEF2F2),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFFFCA5A5)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.error_outline,
                          color: Color(0xFFDC2626), size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _errorMsg!,
                          style: const TextStyle(
                            color: Color(0xFFDC2626),
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
              if (_infoMsg != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFEFF6FF),
                    borderRadius: BorderRadius.circular(8),
                    border: Border.all(color: const Color(0xFF93C5FD)),
                  ),
                  child: Row(
                    children: [
                      const Icon(Icons.info_outline,
                          color: Color(0xFF2563EB), size: 18),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          _infoMsg!,
                          style: const TextStyle(
                            color: Color(0xFF1D4ED8),
                            fontSize: 13,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  // ── Formulaire étape 1 : e-mail ────────────────────────────────────────────
  Widget _buildStep1() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Adresse e-mail',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _emailCtrl,
          keyboardType: TextInputType.emailAddress,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _loading ? null : _envoyerCode(),
          decoration: InputDecoration(
            hintText: 'exemple@email.com',
            prefixIcon: const Icon(Icons.email_outlined),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide:
                  const BorderSide(color: Color(0xFF2563EB), width: 2),
            ),
            filled: true,
            fillColor: Colors.white,
          ),
        ),
        const SizedBox(height: 24),
        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: _loading ? null : _envoyerCode,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: _loading
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2.5),
                  )
                : const Text('Envoyer le code',
                    style: TextStyle(fontSize: 16)),
          ),
        ),
      ],
    );
  }

  // ── Formulaire étape 2 : code + nouveau mdp ────────────────────────────────
  Widget _buildStep2() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        // E-mail pré-rempli (lecture seule)
        const Text(
          'Adresse e-mail',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: TextEditingController(text: _confirmedEmail),
          readOnly: true,
          decoration: InputDecoration(
            prefixIcon: const Icon(Icons.email_outlined),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            filled: true,
            fillColor: Colors.grey[100],
          ),
        ),
        const SizedBox(height: 16),
        if (_debugResetCode != null) ...[
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
                  'Code de secours',
                  style: TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Color(0xFF92400E),
                  ),
                ),
                const SizedBox(height: 6),
                Text(
                  _debugResetCode!,
                  style: const TextStyle(
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 6,
                    color: Color(0xFF92400E),
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
        ],

        // Code de réinitialisation (6 chiffres)
        const Text(
          'Code de réinitialisation',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _codeCtrl,
          keyboardType: TextInputType.number,
          textAlign: TextAlign.center,
          maxLength: 6,
          inputFormatters: [FilteringTextInputFormatter.digitsOnly],
          style: const TextStyle(
            fontSize: 26,
            fontWeight: FontWeight.bold,
            letterSpacing: 10,
          ),
          decoration: InputDecoration(
            hintText: '______',
            hintStyle: TextStyle(
              color: Colors.grey[400],
              letterSpacing: 10,
              fontSize: 26,
            ),
            counterText: '',
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide:
                  const BorderSide(color: Color(0xFF2563EB), width: 2),
            ),
            filled: true,
            fillColor: Colors.white,
          ),
        ),
        const SizedBox(height: 16),

        // Nouveau mot de passe
        const Text(
          'Nouveau mot de passe',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _pwdCtrl,
          obscureText: _obscurePwd,
          textInputAction: TextInputAction.next,
          decoration: InputDecoration(
            hintText: '••••••••',
            prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(
              icon: Icon(
                  _obscurePwd ? Icons.visibility_off : Icons.visibility),
              onPressed: () =>
                  setState(() => _obscurePwd = !_obscurePwd),
            ),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide:
                  const BorderSide(color: Color(0xFF2563EB), width: 2),
            ),
            filled: true,
            fillColor: Colors.white,
          ),
        ),
        const SizedBox(height: 16),

        // Confirmer mot de passe
        const Text(
          'Confirmer le mot de passe',
          style: TextStyle(
            fontWeight: FontWeight.w600,
            fontSize: 14,
            color: Color(0xFF374151),
          ),
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _pwd2Ctrl,
          obscureText: _obscurePwd2,
          textInputAction: TextInputAction.done,
          onSubmitted: (_) => _loading ? null : _confirmerReset(),
          decoration: InputDecoration(
            hintText: '••••••••',
            prefixIcon: const Icon(Icons.lock_outline),
            suffixIcon: IconButton(
              icon: Icon(
                  _obscurePwd2 ? Icons.visibility_off : Icons.visibility),
              onPressed: () =>
                  setState(() => _obscurePwd2 = !_obscurePwd2),
            ),
            border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(10),
              borderSide:
                  const BorderSide(color: Color(0xFF2563EB), width: 2),
            ),
            filled: true,
            fillColor: Colors.white,
          ),
        ),
        const SizedBox(height: 24),

        SizedBox(
          width: double.infinity,
          height: 50,
          child: ElevatedButton(
            onPressed: _loading ? null : _confirmerReset,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(10),
              ),
            ),
            child: _loading
                ? const SizedBox(
                    height: 22,
                    width: 22,
                    child: CircularProgressIndicator(
                        color: Colors.white, strokeWidth: 2.5),
                  )
                : const Text('Réinitialiser le mot de passe',
                    style: TextStyle(fontSize: 16)),
          ),
        ),
      ],
    );
  }
}

// ── Widget indicateur d'étape ──────────────────────────────────────────────────
class _StepIndicator extends StatelessWidget {
  final int currentStep;
  const _StepIndicator({required this.currentStep});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        _stepCircle(1, 'E-mail'),
        Expanded(
          child: Container(
            height: 2,
            color: currentStep == 2
                ? const Color(0xFF2563EB)
                : Colors.grey[300],
          ),
        ),
        _stepCircle(2, 'Réinitialisation'),
      ],
    );
  }

  Widget _stepCircle(int step, String label) {
    final isActive = currentStep >= step;
    return Column(
      children: [
        Container(
          width: 32,
          height: 32,
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFF2563EB) : Colors.grey[300],
            shape: BoxShape.circle,
          ),
          child: Center(
            child: isActive && currentStep > step
                ? const Icon(Icons.check, color: Colors.white, size: 16)
                : Text(
                    '$step',
                    style: TextStyle(
                      color: isActive ? Colors.white : Colors.grey[600],
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                    ),
                  ),
          ),
        ),
        const SizedBox(height: 4),
        Text(
          label,
          style: TextStyle(
            fontSize: 11,
            color: isActive ? const Color(0xFF2563EB) : Colors.grey[500],
            fontWeight:
                isActive ? FontWeight.w600 : FontWeight.normal,
          ),
        ),
      ],
    );
  }
}
