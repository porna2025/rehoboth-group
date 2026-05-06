import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/demande_provider.dart';
import '../../models/demande.dart';

class MissionDetailPage extends StatefulWidget {
  const MissionDetailPage({super.key});

  @override
  State<MissionDetailPage> createState() => _MissionDetailPageState();
}

class _MissionDetailPageState extends State<MissionDetailPage> {
  bool _initialized = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final id = ModalRoute.of(context)?.settings.arguments as String?;
      if (id != null) {
        context.read<DemandeProvider>().chargerDetail(id);
      }
      if (mounted) setState(() => _initialized = true);
    });
  }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<DemandeProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Détail mission'),
        backgroundColor: const Color(0xFF1E293B),
        foregroundColor: Colors.white,
      ),
      body: (!_initialized || prov.isLoading)
          ? const Center(child: CircularProgressIndicator())
          : prov.error != null
          ? Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Text(
                    prov.error!,
                    style: const TextStyle(color: Colors.red),
                    textAlign: TextAlign.center,
                  ),
                  const SizedBox(height: 12),
                  ElevatedButton(
                    onPressed: () {
                      final id = ModalRoute.of(context)?.settings.arguments as String?;
                      if (id != null) context.read<DemandeProvider>().chargerDetail(id);
                    },
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            )
          : prov.detail == null
          ? const Center(child: Text('Mission introuvable'))
          : _Body(demande: prov.detail!),
    );
  }
}

class _Body extends StatefulWidget {
  final Demande demande;
  const _Body({required this.demande});

  @override
  State<_Body> createState() => _BodyState();
}

class _BodyState extends State<_Body> {
  Demande get d => widget.demande;
  final _rapportCtrl = TextEditingController();
  final _montantCtrl = TextEditingController();

  @override
  void dispose() {
    _rapportCtrl.dispose();
    _montantCtrl.dispose();
    super.dispose();
  }

  Future<void> _accepter() async {
    final ok = await context.read<DemandeProvider>().accepterDemande(d.id);
    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Demande acceptée !'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  Future<void> _changerStatut(String statut) async {
    final double? montant = _montantCtrl.text.trim().isNotEmpty
        ? double.tryParse(_montantCtrl.text.trim())
        : null;
    final ok = await context.read<DemandeProvider>().mettreAJourStatut(
      d.id,
      statut: statut,
      rapport: _rapportCtrl.text.trim().isEmpty
          ? null
          : _rapportCtrl.text.trim(),
      montantDevis: montant,
    );
    if (!mounted) return;
    if (ok) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Statut mis à jour'),
          backgroundColor: Colors.green,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // Statut
        _StatutBanner(statut: d.statut, label: d.statutLabel),
        const SizedBox(height: 12),
        // Client
        _Section(
          title: 'Client',
          children: [
            _InfoRow(Icons.person, d.client.nomComplet),
            if (d.client.telephone != null)
              _InfoRow(Icons.phone, d.client.telephone!),
          ],
        ),
        const SizedBox(height: 12),
        // Demande
        _Section(
          title: 'Demande',
          children: [
            _InfoRow(Icons.category_outlined, d.categorie?.nom ?? '—'),
            _InfoRow(Icons.description_outlined, d.description),
            _InfoRow(Icons.location_on_outlined, d.adresse),
            _InfoRow(Icons.flash_on_outlined, d.typeLabel),
            _InfoRow(Icons.home_repair_service_outlined, d.modeLabel),
          ],
        ),
        const SizedBox(height: 12),
        // Actions selon statut
        if (d.enAttente)
          _ActionButton(
            label: 'Accepter la mission',
            icon: Icons.check_circle_outline,
            color: Colors.green,
            onPressed: _accepter,
          ),
        if (d.acceptee) ...[
          _ActionButton(
            label: 'Je suis en route',
            icon: Icons.directions_car,
            color: Colors.blue,
            onPressed: () => _changerStatut('en_route'),
          ),
        ],
        if (d.statut == 'en_route') ...[
          _ActionButton(
            label: 'Démarrer l\'intervention',
            icon: Icons.play_circle_outline,
            color: Colors.purple,
            onPressed: () => _changerStatut('en_cours'),
          ),
        ],
        if (d.enCours) ...[
          const SizedBox(height: 12),
          TextField(
            controller: _montantCtrl,
            keyboardType: TextInputType.number,
            decoration: const InputDecoration(
              labelText: 'Montant du devis (FCFA)',
              prefixIcon: Icon(Icons.attach_money),
              border: OutlineInputBorder(),
            ),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _rapportCtrl,
            maxLines: 3,
            decoration: const InputDecoration(
              labelText: 'Rapport d\'intervention',
              border: OutlineInputBorder(),
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 8),
          _ActionButton(
            label: 'Marquer comme terminé',
            icon: Icons.done_all,
            color: Colors.green,
            onPressed: () => _changerStatut('terminee'),
          ),
        ],
        const SizedBox(height: 12),
        // Chat
        ElevatedButton.icon(
          onPressed: () => Navigator.pushNamed(
            context,
            '/chat',
            arguments: {'demandeId': d.id, 'titre': d.categorie?.nom ?? 'Chat'},
          ),
          icon: const Icon(Icons.chat_bubble_outline),
          label: const Text('Chat avec le client'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF1E293B),
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 48),
          ),
        ),
      ],
    );
  }
}

class _ActionButton extends StatelessWidget {
  final String label;
  final IconData icon;
  final Color color;
  final VoidCallback onPressed;

  const _ActionButton({
    required this.label,
    required this.icon,
    required this.color,
    required this.onPressed,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: ElevatedButton.icon(
        onPressed: onPressed,
        icon: Icon(icon),
        label: Text(label),
        style: ElevatedButton.styleFrom(
          backgroundColor: color,
          foregroundColor: Colors.white,
          minimumSize: const Size(double.infinity, 48),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(10),
          ),
        ),
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
        color: _color.withValues(alpha: 0.12),
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

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String text;
  const _InfoRow(this.icon, this.text);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: const Color(0xFF1E293B)),
          const SizedBox(width: 8),
          Expanded(
            child: Text(text, style: TextStyle(color: Colors.grey[700])),
          ),
        ],
      ),
    );
  }
}
