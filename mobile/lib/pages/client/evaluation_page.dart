import 'package:flutter/material.dart';
import '../../models/demande.dart';
import '../../services/api_service.dart';
import '../../widgets/star_rating.dart';

class EvaluationPage extends StatefulWidget {
  const EvaluationPage({super.key});

  @override
  State<EvaluationPage> createState() => _EvaluationPageState();
}

class _EvaluationPageState extends State<EvaluationPage> {
  Demande? _demande;
  int _note = 0;
  final _commentaireCtrl = TextEditingController();
  bool _loading = false;
  bool _done = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final arg = ModalRoute.of(context)?.settings.arguments;
      if (arg is Demande) setState(() => _demande = arg);
    });
  }

  @override
  void dispose() {
    _commentaireCtrl.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (_note == 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Donnez une note entre 1 et 5'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }
    setState(() => _loading = true);
    try {
      await ApiService().evaluerTechnicien(
        demandeId: _demande!.id,
        note: _note,
        commentaire: _commentaireCtrl.text.trim(),
      );
      setState(() => _done = true);
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(e.toString()), backgroundColor: Colors.red),
      );
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Évaluer le technicien'),
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
      ),
      body: _done
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Icon(Icons.star, color: Colors.amber, size: 80),
                  const SizedBox(height: 16),
                  const Text(
                    'Merci pour votre évaluation !',
                    style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 24),
                  ElevatedButton(
                    onPressed: () => Navigator.pop(context),
                    child: const Text('Retour'),
                  ),
                ],
              ),
            )
          : _demande == null
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.center,
                children: [
                  if (_demande!.technicien != null)
                    Text(
                      'Évaluez ${_demande!.technicien!.nomComplet}',
                      style: const TextStyle(
                        fontSize: 18,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  const SizedBox(height: 24),
                  const Text(
                    'Note globale',
                    style: TextStyle(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 10),
                  StarRatingInput(
                    value: _note,
                    onChanged: (v) => setState(() => _note = v),
                    size: 40,
                  ),
                  const SizedBox(height: 8),
                  Text(
                    _note == 0
                        ? 'Touchez une étoile'
                        : [
                            '',
                            'Mauvais',
                            'Passable',
                            'Bien',
                            'Très bien',
                            'Excellent',
                          ][_note],
                    style: TextStyle(
                      color: Colors.amber[700],
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                  const SizedBox(height: 24),
                  TextField(
                    controller: _commentaireCtrl,
                    maxLines: 4,
                    decoration: const InputDecoration(
                      labelText: 'Commentaire (optionnel)',
                      hintText: 'Partagez votre expérience…',
                      border: OutlineInputBorder(),
                      alignLabelWithHint: true,
                    ),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    height: 50,
                    child: ElevatedButton(
                      onPressed: _loading ? null : _submit,
                      style: ElevatedButton.styleFrom(
                        backgroundColor: Colors.amber,
                        foregroundColor: Colors.white,
                        shape: RoundedRectangleBorder(
                          borderRadius: BorderRadius.circular(12),
                        ),
                      ),
                      child: _loading
                          ? const SizedBox(
                              height: 20,
                              width: 20,
                              child: CircularProgressIndicator(
                                color: Colors.white,
                                strokeWidth: 2,
                              ),
                            )
                          : const Text(
                              'Envoyer l\'évaluation',
                              style: TextStyle(fontSize: 16),
                            ),
                    ),
                  ),
                ],
              ),
            ),
    );
  }
}
