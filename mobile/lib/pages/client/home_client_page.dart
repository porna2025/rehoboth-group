import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/technicien_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/demande_provider.dart';
import '../../models/technicien.dart';
import '../../models/demande.dart';

// ─── Couleurs ───────────────────────────────────────────────────────────────
const _kNavy   = Color(0xFF1E293B);
const _kBlue   = Color(0xFF2563EB);
const _kGreen  = Color(0xFF059669);
const _kOrange = Color(0xFFF59E0B);
const _kBg     = Color(0xFFF1F5F9);

// ─── Statuts ────────────────────────────────────────────────────────────────
const _statuts = {
  'en_attente': ('En attente',  Color(0xFFF59E0B), Color(0xFFFFF8E1)),
  'acceptee':   ('Acceptée',   Color(0xFF2563EB), Color(0xFFEFF6FF)),
  'en_route':   ('En route',   Color(0xFF7C3AED), Color(0xFFF5F3FF)),
  'en_cours':   ('En cours',   Color(0xFFEA580C), Color(0xFFFFF7ED)),
  'terminee':   ('Terminée',   Color(0xFF059669), Color(0xFFECFDF5)),
  'annulee':    ('Annulée',    Color(0xFF64748B), Color(0xFFF8FAFC)),
};

class HomeClientPage extends StatefulWidget {
  const HomeClientPage({super.key});

  @override
  State<HomeClientPage> createState() => _HomeClientPageState();
}

class _HomeClientPageState extends State<HomeClientPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TechnicienProvider>().chargerCategories();
      context.read<DemandeProvider>().chargerMesDemandes();
      context.read<NotificationProvider>().chargerNotifications();
    });
  }

  Future<void> _refresh() async {
    await Future.wait([
      context.read<TechnicienProvider>().chargerCategories(),
      context.read<DemandeProvider>().chargerMesDemandes(),
      context.read<NotificationProvider>().chargerNotifications(),
    ]);
  }

  @override
  Widget build(BuildContext context) {
    final auth      = context.watch<AuthProvider>();
    final techProv  = context.watch<TechnicienProvider>();
    final demProv   = context.watch<DemandeProvider>();
    final notifProv = context.watch<NotificationProvider>();
    final user      = auth.user;
    final demandes  = demProv.demandes;

    // Stats
    final total     = demandes.length;
    final enCours   = demandes.where((d) => ['acceptee','en_route','en_cours'].contains(d.statut)).length;
    final terminees = demandes.where((d) => d.statut == 'terminee').length;

    return Scaffold(
      backgroundColor: _kBg,
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          slivers: [
            // ── Header ─────────────────────────────────────────────────────
            SliverAppBar(
              expandedHeight: 130,
              pinned: true,
              backgroundColor: _kBlue,
              foregroundColor: Colors.white,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [_kBlue, Color(0xFF1D4ED8)],
                    ),
                  ),
                  padding: const EdgeInsets.fromLTRB(20, 60, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        'Bonjour, ${user?.prenom ?? ''} 👋',
                        style: const TextStyle(color: Colors.white, fontSize: 22, fontWeight: FontWeight.bold),
                      ),
                      const SizedBox(height: 4),
                      const Text('Que recherchez-vous ?', style: TextStyle(color: Colors.white70, fontSize: 13)),
                    ],
                  ),
                ),
              ),
              actions: [
                _NotifButton(count: notifProv.nonLues),
                IconButton(
                  icon: const Icon(Icons.person_outline),
                  onPressed: () => Navigator.pushNamed(context, '/profil'),
                ),
              ],
            ),

            SliverPadding(
              padding: const EdgeInsets.all(16),
              sliver: SliverList(
                delegate: SliverChildListDelegate([

                  // ── Statistiques ──────────────────────────────────────────
                  const _SectionTitle('Tableau de bord'),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(child: _StatCard(icon: '📋', label: 'Total',     value: '$total',     color: _kBlue,   bg: const Color(0xFFEFF6FF))),
                      const SizedBox(width: 10),
                      Expanded(child: _StatCard(icon: '🛠️', label: 'En cours',  value: '$enCours',   color: _kOrange, bg: const Color(0xFFFFF8E1))),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(child: _StatCard(icon: '✅', label: 'Terminées', value: '$terminees', color: _kGreen,  bg: const Color(0xFFECFDF5))),
                      const SizedBox(width: 10),
                      Expanded(child: _StatCard(icon: '🔔', label: 'Alertes',   value: '${notifProv.nonLues}', color: Colors.red, bg: const Color(0xFFFEF2F2))),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ── Actions rapides ───────────────────────────────────────
                  const _SectionTitle('Actions rapides'),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _QuickAction(
                          icon: Icons.add_circle_outline,
                          label: 'Nouvelle demande',
                          color: _kBlue,
                          primary: true,
                          onTap: () => Navigator.pushNamed(context, '/creer-demande'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _QuickAction(
                          icon: Icons.engineering,
                          label: 'Chercher un tech',
                          color: _kGreen,
                          onTap: () => Navigator.pushNamed(context, '/techniciens'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _QuickAction(
                          icon: Icons.list_alt,
                          label: 'Mes demandes',
                          color: const Color(0xFF7C3AED),
                          onTap: () => Navigator.pushNamed(context, '/mes-demandes'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _QuickAction(
                          icon: Icons.notifications_outlined,
                          label: 'Notifications',
                          color: _kNavy,
                          onTap: () => Navigator.pushNamed(context, '/notifications'),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 24),

                  // ── Demandes récentes ─────────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const _SectionTitle('Demandes récentes'),
                      TextButton(
                        onPressed: () => Navigator.pushNamed(context, '/mes-demandes'),
                        child: const Text('Voir tout →', style: TextStyle(color: _kBlue, fontSize: 13)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  if (demProv.isLoading)
                    const Center(child: CircularProgressIndicator())
                  else if (demandes.isEmpty)
                    _EmptyState(
                      message: 'Aucune demande pour l\'instant.',
                      cta: 'Créer une demande',
                      onTap: () => Navigator.pushNamed(context, '/creer-demande'),
                    )
                  else
                    ...demandes.take(5).map((d) => _DemandeRow(
                      demande: d,
                      onTap: () => Navigator.pushNamed(context, '/demande-detail', arguments: d.id),
                    )),

                  const SizedBox(height: 24),

                  // ── Catégories ────────────────────────────────────────────
                  const _SectionTitle('Catégories de services'),
                  const SizedBox(height: 12),
                  if (techProv.isLoading)
                    const Center(child: CircularProgressIndicator())
                  else if (techProv.error != null)
                    Center(child: Text(techProv.error!, style: const TextStyle(color: Colors.red)))
                  else
                    GridView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: techProv.categories.length,
                      gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                        crossAxisCount: 2,
                        mainAxisSpacing: 12,
                        crossAxisSpacing: 12,
                        childAspectRatio: 1.0,
                      ),
                      itemBuilder: (ctx, i) => _CategorieCard(categorie: techProv.categories[i]),
                    ),

                  const SizedBox(height: 24),
                ]),
              ),
            ),
          ],
        ),
      ),
      // ── FAB ────────────────────────────────────────────────────────────────
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, '/creer-demande'),
        backgroundColor: _kBlue,
        foregroundColor: Colors.white,
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle demande'),
      ),
    );
  }
}

// ─── Widgets ─────────────────────────────────────────────────────────────────

class _NotifButton extends StatelessWidget {
  final int count;
  const _NotifButton({required this.count});
  @override
  Widget build(BuildContext context) {
    return Stack(
      children: [
        IconButton(
          icon: const Icon(Icons.notifications_outlined),
          onPressed: () => Navigator.pushNamed(context, '/notifications'),
        ),
        if (count > 0)
          Positioned(
            right: 8, top: 8,
            child: Container(
              padding: const EdgeInsets.all(2),
              decoration: const BoxDecoration(color: Colors.red, shape: BoxShape.circle),
              constraints: const BoxConstraints(minWidth: 16, minHeight: 16),
              child: Text('$count', style: const TextStyle(color: Colors.white, fontSize: 10, fontWeight: FontWeight.bold), textAlign: TextAlign.center),
            ),
          ),
      ],
    );
  }
}

class _SectionTitle extends StatelessWidget {
  final String text;
  const _SectionTitle(this.text);
  @override
  Widget build(BuildContext context) {
    return Text(text, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: _kNavy));
  }
}

class _StatCard extends StatelessWidget {
  final String icon;
  final String label;
  final String value;
  final Color color;
  final Color bg;
  const _StatCard({required this.icon, required this.label, required this.value, required this.color, required this.bg});
  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      color: Colors.white,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(10)),
              child: Text(icon, style: const TextStyle(fontSize: 20)),
            ),
            const SizedBox(height: 12),
            Text(value, style: TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: color)),
            const SizedBox(height: 2),
            Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
          ],
        ),
      ),
    );
  }
}

class _QuickAction extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color color;
  final bool primary;
  final VoidCallback onTap;
  const _QuickAction({required this.icon, required this.label, required this.color, required this.onTap, this.primary = false});
  @override
  Widget build(BuildContext context) {
    return Material(
      color: primary ? color : Colors.white,
      borderRadius: BorderRadius.circular(14),
      elevation: primary ? 2 : 0,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 12),
          child: Row(
            children: [
              Icon(icon, color: primary ? Colors.white : color, size: 22),
              const SizedBox(width: 8),
              Expanded(
                child: Text(
                  label,
                  style: TextStyle(
                    color: primary ? Colors.white : _kNavy,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ),
              Icon(Icons.chevron_right, color: primary ? Colors.white70 : Colors.grey[400], size: 18),
            ],
          ),
        ),
      ),
    );
  }
}

class _DemandeRow extends StatelessWidget {
  final Demande demande;
  final VoidCallback onTap;
  const _DemandeRow({required this.demande, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final (label, color, bg) = _statuts[demande.statut] ?? ('Inconnu', Colors.grey, const Color(0xFFF8FAFC));
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(10),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 12),
        decoration: const BoxDecoration(
          border: Border(bottom: BorderSide(color: Color(0xFFE2E8F0))),
        ),
        child: Row(
          children: [
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    demande.categorie?.nom ?? '—',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    demande.description,
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(_formatDate(demande.createdAt), style: const TextStyle(color: Colors.grey, fontSize: 11)),
                ],
              ),
            ),
            const SizedBox(width: 12),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(color: bg, borderRadius: BorderRadius.circular(20)),
              child: Text(label, style: TextStyle(color: color, fontSize: 11, fontWeight: FontWeight.w600)),
            ),
            const SizedBox(width: 8),
            const Icon(Icons.chevron_right, color: Colors.grey, size: 18),
          ],
        ),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final String message;
  final String? cta;
  final VoidCallback? onTap;
  const _EmptyState({required this.message, this.cta, this.onTap});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Column(
        children: [
          Text(message, style: const TextStyle(color: Colors.grey, fontSize: 14)),
          if (cta != null && onTap != null) ...[
            const SizedBox(height: 12),
            ElevatedButton(
              onPressed: onTap,
              style: ElevatedButton.styleFrom(backgroundColor: _kBlue, foregroundColor: Colors.white),
              child: Text(cta!),
            ),
          ],
        ],
      ),
    );
  }
}

class _CategorieCard extends StatelessWidget {
  final Categorie categorie;
  const _CategorieCard({required this.categorie});

  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      color: Colors.white,
      child: InkWell(
        borderRadius: BorderRadius.circular(14),
        onTap: () => Navigator.pushNamed(context, '/techniciens', arguments: categorie),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFEFF6FF),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Text(
                  categorie.icone.isNotEmpty ? categorie.icone : '🔧',
                  style: const TextStyle(fontSize: 24),
                ),
              ),
              const SizedBox(height: 6),
              Text(
                categorie.nom,
                textAlign: TextAlign.center,
                style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                '${categorie.nbTechniciens} tech.',
                style: const TextStyle(color: Colors.grey, fontSize: 10),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

String _formatDate(String iso) {
  try {
    final dt = DateTime.parse(iso).toLocal();
    return '${dt.day.toString().padLeft(2,'0')}/${dt.month.toString().padLeft(2,'0')}/${dt.year}';
  } catch (_) {
    return iso;
  }
}
