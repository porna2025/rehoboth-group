import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/demande_provider.dart';
import '../../models/demande.dart';

class DemandeDetailPage extends StatefulWidget {
  const DemandeDetailPage({super.key});

  @override
  State<DemandeDetailPage> createState() => _DemandeDetailPageState();
}

class _DemandeDetailPageState extends State<DemandeDetailPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final id = ModalRoute.of(context)?.settings.arguments as String?;
      if (id != null) {
        context.read<DemandeProvider>().chargerDetail(id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<DemandeProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Détail de la demande'),
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
      ),
      body: prov.isLoading
          ? const Center(child: CircularProgressIndicator())
          : prov.detail == null
          ? const Center(child: Text('Demande introuvable'))
          : _Body(demande: prov.detail!),
    );
  }
}

class _Body extends StatelessWidget {
  final Demande d;
  const _Body({required Demande demande}) : d = demande;

  @override
  Widget build(BuildContext context) {
    final user = context.read<AuthProvider>().user;
    final isClient = user?.isClient ?? true;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Statut
        _StatutBanner(statut: d.statut, label: d.statutLabel),
        const SizedBox(height: 12),
        // Infos principales
        _Section(
          title: 'Demande',
          children: [
            _Row(Icons.category_outlined, d.categorie?.nom ?? '—'),
            _Row(Icons.description_outlined, d.description),
            _Row(Icons.location_on_outlined, d.adresse),
            _Row(Icons.flash_on_outlined, d.typeLabel),
            _Row(Icons.home_repair_service_outlined, d.modeLabel),
            if (d.montantDevis != null)
              _Row(
                Icons.attach_money,
                'Devis : ${d.montantDevis!.toStringAsFixed(0)} FCFA',
              ),
            if (d.rapport.isNotEmpty)
              _Row(Icons.assignment_outlined, d.rapport),
          ],
        ),
        const SizedBox(height: 12),
        // Technicien
        if (d.technicien != null)
          _Section(
            title: 'Technicien assigné',
            children: [
              _Row(Icons.person, d.technicien!.nomComplet),
              if (d.technicien!.telephone != null)
                _Row(Icons.phone, d.technicien!.telephone!),
            ],
          ),
        const SizedBox(height: 20),
        // Actions client
        if (isClient) ...[
          if (d.enAttente)
            OutlinedButton.icon(
              icon: const Icon(Icons.cancel_outlined, color: Colors.red),
              label: const Text(
                'Annuler la demande',
                style: TextStyle(color: Colors.red),
              ),
              onPressed: () => _annuler(context),
            ),
          if (d.terminee && d.montantDevis != null) ...[
            const SizedBox(height: 8),
            ElevatedButton.icon(
              icon: const Icon(Icons.payment),
              label: const Text('Payer'),
              onPressed: () =>
                  Navigator.pushNamed(context, '/paiement', arguments: d),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.green,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
              ),
            ),
          ],
          if (d.terminee) ...[
            const SizedBox(height: 8),
            ElevatedButton.icon(
              icon: const Icon(Icons.star_outline),
              label: const Text('Évaluer le technicien'),
              onPressed: () =>
                  Navigator.pushNamed(context, '/evaluation', arguments: d),
              style: ElevatedButton.styleFrom(
                backgroundColor: Colors.amber,
                foregroundColor: Colors.white,
                minimumSize: const Size(double.infinity, 48),
              ),
            ),
          ],
        ],
        const SizedBox(height: 8),
        // Chat
        if (d.technicien != null)
          ElevatedButton.icon(
            icon: const Icon(Icons.chat_bubble_outline),
            label: const Text('Chat'),
            onPressed: () => Navigator.pushNamed(
              context,
              '/chat',
              arguments: {'demandeId': d.id, 'titre': d.categorie?.nom ?? ''},
            ),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
      ],
    );
  }

  void _annuler(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Annuler la demande ?'),
        content: const Text('Cette action est irréversible.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Non'),
          ),
          TextButton(
            onPressed: () async {
              Navigator.pop(ctx);
              final ok = await context.read<DemandeProvider>().annulerDemande(
                d.id,
              );
              if (ok && context.mounted) {
                Navigator.pop(context);
              }
            },
            child: const Text(
              'Oui, annuler',
              style: TextStyle(color: Colors.red),
            ),
          ),
        ],
      ),
    );
  }
}

class _StatutBanner extends StatelessWidget {
  final String statut;
  final String label;
  const _StatutBanner({required this.statut, required this.label});

  Color get _color {
    switch (statut) {
      case 'en_attente':
        return Colors.orange;
      case 'acceptee':
        return Colors.blue;
      case 'en_route':
        return Colors.indigo;
      case 'en_cours':
        return Colors.purple;
      case 'terminee':
        return Colors.green;
      case 'annulee':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: _color.withOpacity(0.12),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: _color, width: 0.8),
      ),
      child: Text(
        label.isNotEmpty ? label : statut,
        textAlign: TextAlign.center,
        style: TextStyle(
          color: _color,
          fontWeight: FontWeight.bold,
          fontSize: 15,
        ),
      ),
    );
  }
}

class _Section extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _Section({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(14),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
            ),
            const Divider(height: 14),
            ...children,
          ],
        ),
      ),
    );
  }
}

class _Row extends StatelessWidget {
  final IconData icon;
  final String text;
  const _Row(this.icon, this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: const Color(0xFF2563EB)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text, style: TextStyle(color: Colors.grey[700])),
          ),
        ],
      ),
    );
  }
}
