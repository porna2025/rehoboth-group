import 'package:flutter/material.dart';
import '../../models/demande.dart';
import '../../services/api_service.dart';

class PaiementPage extends StatefulWidget {
  const PaiementPage({super.key});

  @override
  State<PaiementPage> createState() => _PaiementPageState();
}

class _PaiementPageState extends State<PaiementPage> {
  Demande? _demande;
  String _methode = 'mobile_money';
  final _telCtrl = TextEditingController();
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
    _telCtrl.dispose();
    super.dispose();
  }

  Future<void> _payer() async {
    if (_demande == null || _demande!.montantDevis == null) return;
    setState(() => _loading = true);
    try {
      await ApiService().initierPaiement(
        demandeId: _demande!.id,
        montant: _demande!.montantDevis!,
        methode: _methode,
        telephone: _telCtrl.text.trim().isEmpty ? null : _telCtrl.text.trim(),
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
        title: const Text('Paiement'),
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
      ),
      body: _done
          ? _SuccessView(
              onDone: () => Navigator.popUntil(
                context,
                ModalRoute.withName('/home-client'),
              ),
            )
          : _demande == null
          ? const Center(child: CircularProgressIndicator())
          : ListView(
              padding: const EdgeInsets.all(16),
              children: [
                // Récapitulatif
                Card(
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      children: [
                        const Icon(
                          Icons.receipt_long_outlined,
                          size: 40,
                          color: Color(0xFF2563EB),
                        ),
                        const SizedBox(height: 8),
                        Text(
                          '${_demande!.montantDevis!.toStringAsFixed(0)} FCFA',
                          style: const TextStyle(
                            fontSize: 28,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        Text(
                          _demande!.categorie?.nom ?? 'Service',
                          style: TextStyle(color: Colors.grey[600]),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                // Méthode de paiement
                const Text(
                  'Méthode de paiement',
                  style: TextStyle(fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 8),
                _MethodeChip(
                  label: 'Mobile Money (Orange/Wave/MTN)',
                  icon: Icons.phone_android,
                  selected: _methode == 'mobile_money',
                  onTap: () => setState(() => _methode = 'mobile_money'),
                ),
                const SizedBox(height: 8),
                _MethodeChip(
                  label: 'Espèces à la livraison',
                  icon: Icons.money,
                  selected: _methode == 'especes',
                  onTap: () => setState(() => _methode = 'especes'),
                ),
                const SizedBox(height: 16),
                if (_methode == 'mobile_money') ...[
                  TextFormField(
                    controller: _telCtrl,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Numéro de téléphone',
                      prefixIcon: Icon(Icons.phone),
                      border: OutlineInputBorder(),
                    ),
                  ),
                  const SizedBox(height: 16),
                ],
                SizedBox(
                  width: double.infinity,
                  height: 50,
                  child: ElevatedButton(
                    onPressed: _loading ? null : _payer,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: Colors.green,
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
                            'Confirmer le paiement',
                            style: TextStyle(fontSize: 16),
                          ),
                  ),
                ),
              ],
            ),
    );
  }
}

class _MethodeChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _MethodeChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
        decoration: BoxDecoration(
          color: selected ? Colors.green[50] : Colors.grey[100],
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? Colors.green : Colors.grey[300]!,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          children: [
            Icon(icon, color: selected ? Colors.green : Colors.grey[600]),
            const SizedBox(width: 10),
            Text(
              label,
              style: TextStyle(
                fontWeight: FontWeight.w500,
                color: selected ? Colors.green[800] : Colors.grey[700],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _SuccessView extends StatelessWidget {
  final VoidCallback onDone;
  const _SuccessView({required this.onDone});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.check_circle, color: Colors.green, size: 80),
          const SizedBox(height: 16),
          const Text(
            'Paiement initié !',
            style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold),
          ),
          const SizedBox(height: 8),
          const Text('Votre demande de paiement a été envoyée.'),
          const SizedBox(height: 24),
          ElevatedButton(
            onPressed: onDone,
            child: const Text('Retour à l\'accueil'),
          ),
        ],
      ),
    );
  }
}
