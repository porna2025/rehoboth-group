import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/technicien_provider.dart';
import '../../models/technicien.dart';
import '../../widgets/star_rating.dart';

class TechnicienDetailPage extends StatefulWidget {
  const TechnicienDetailPage({super.key});

  @override
  State<TechnicienDetailPage> createState() => _TechnicienDetailPageState();
}

class _TechnicienDetailPageState extends State<TechnicienDetailPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final id = ModalRoute.of(context)?.settings.arguments as String?;
      if (id != null) {
        context.read<TechnicienProvider>().chargerDetail(id);
      }
    });
  }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<TechnicienProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Profil technicien'),
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
      ),
      body: prov.isLoading
          ? const Center(child: CircularProgressIndicator())
          : prov.error != null
          ? Center(
              child: Text(
                prov.error!,
                style: const TextStyle(color: Colors.red),
              ),
            )
          : prov.detail == null
          ? const Center(child: Text('Technicien introuvable'))
          : _Body(technicien: prov.detail!),
    );
  }
}

class _Body extends StatelessWidget {
  final Technicien t;
  const _Body({required Technicien technicien}) : t = technicien;

  @override
  Widget build(BuildContext context) {
    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        // En-tête
        Card(
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          child: Padding(
            padding: const EdgeInsets.all(20),
            child: Column(
              children: [
                CircleAvatar(
                  radius: 44,
                  backgroundColor: const Color(0xFF2563EB).withValues(alpha: 0.15),
                  backgroundImage: t.user.photoProfil != null
                      ? NetworkImage(t.user.photoProfil!)
                      : null,
                  child: t.user.photoProfil == null
                      ? Text(
                          t.user.prenom.isNotEmpty
                              ? t.user.prenom[0].toUpperCase()
                              : '?',
                          style: const TextStyle(
                            fontSize: 32,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF2563EB),
                          ),
                        )
                      : null,
                ),
                const SizedBox(height: 12),
                Text(
                  t.user.nomComplet,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                const SizedBox(height: 4),
                Text(t.specialite, style: TextStyle(color: Colors.grey[600])),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    StarRating(note: t.noteMoyenne),
                    const SizedBox(width: 6),
                    Text(
                      '${t.noteMoyenne.toStringAsFixed(1)} (${t.nbEvaluations} avis)',
                    ),
                  ],
                ),
                const SizedBox(height: 8),
                _DispoTag(disponible: t.disponible),
              ],
            ),
          ),
        ),
        const SizedBox(height: 12),
        // Infos
        _InfoSection(
          title: 'Informations',
          children: [
            _InfoRow(
              Icons.work_outline,
              '${t.anneesExperience} an(s) d\'expérience',
            ),
            if (t.categorie != null)
              _InfoRow(Icons.category_outlined, t.categorie!.nom),
            if (t.tarifHoraire != null)
              _InfoRow(
                Icons.attach_money,
                '${t.tarifHoraire!.toStringAsFixed(0)} FCFA/heure',
              ),
            if (t.zoneCouverture.isNotEmpty)
              _InfoRow(Icons.map_outlined, t.zoneCouverture),
            _InfoRow(Icons.task_alt, '${t.nbMissions} mission(s) effectuée(s)'),
          ],
        ),
        if (t.description.isNotEmpty) ...[
          const SizedBox(height: 12),
          _InfoSection(
            title: 'À propos',
            children: [
              Padding(
                padding: const EdgeInsets.only(top: 4),
                child: Text(
                  t.description,
                  style: TextStyle(color: Colors.grey[700]),
                ),
              ),
            ],
          ),
        ],
        const SizedBox(height: 24),
        // Bouton demande
        ElevatedButton.icon(
          onPressed: t.disponible
              ? () =>
                    Navigator.pushNamed(context, '/creer-demande', arguments: t)
              : null,
          icon: const Icon(Icons.add_circle_outline),
          label: const Text('Faire une demande'),
          style: ElevatedButton.styleFrom(
            backgroundColor: const Color(0xFF2563EB),
            foregroundColor: Colors.white,
            minimumSize: const Size(double.infinity, 50),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        if (!t.disponible)
          const Padding(
            padding: EdgeInsets.only(top: 8),
            child: Text(
              'Ce technicien n\'est pas disponible actuellement.',
              textAlign: TextAlign.center,
              style: TextStyle(color: Colors.orange),
            ),
          ),
      ],
    );
  }
}

class _DispoTag extends StatelessWidget {
  final bool disponible;
  const _DispoTag({required this.disponible});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
      decoration: BoxDecoration(
        color: disponible ? Colors.green[50] : Colors.grey[100],
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: disponible ? Colors.green : Colors.grey,
          width: 0.8,
        ),
      ),
      child: Text(
        disponible ? '✓ Disponible' : '✗ Indisponible',
        style: TextStyle(
          color: disponible ? Colors.green[700] : Colors.grey[600],
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}

class _InfoSection extends StatelessWidget {
  final String title;
  final List<Widget> children;
  const _InfoSection({required this.title, required this.children});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              title,
              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 15),
            ),
            const Divider(height: 16),
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
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        children: [
          Icon(icon, size: 18, color: const Color(0xFF2563EB)),
          const SizedBox(width: 10),
          Expanded(
            child: Text(text, style: TextStyle(color: Colors.grey[700])),
          ),
        ],
      ),
    );
  }
}
