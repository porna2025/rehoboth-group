import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/technicien_provider.dart';
import '../../providers/notification_provider.dart';
import '../../providers/demande_provider.dart';
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

class HomeTechnicienPage extends StatefulWidget {
  const HomeTechnicienPage({super.key});

  @override
  State<HomeTechnicienPage> createState() => _HomeTechnicienPageState();
}

class _HomeTechnicienPageState extends State<HomeTechnicienPage> {
  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      context.read<TechnicienProvider>().chargerMonProfil();
      context.read<DemandeProvider>().chargerMesMissions();
      context.read<NotificationProvider>().chargerNotifications();
    });
  }

  Future<void> _refresh() async {
    await Future.wait([
      context.read<TechnicienProvider>().chargerMonProfil(),
      context.read<DemandeProvider>().chargerMesMissions(),
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
    final profil    = techProv.monProfil;
    final missions  = demProv.demandes;

    // Stats calculées
    final assignees = missions.where((m) => m.statut == 'acceptee' || m.statut == 'en_route').length;
    final enCours   = missions.where((m) => m.statut == 'en_cours').length;
    final terminees = missions.where((m) => m.statut == 'terminee').length;
    final solde     = profil?.solde ?? 0.0;

    return Scaffold(
      backgroundColor: _kBg,
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: CustomScrollView(
          slivers: [
            // ── AppBar avec header ──────────────────────────────────────────
            SliverAppBar(
              expandedHeight: 140,
              pinned: true,
              backgroundColor: _kNavy,
              foregroundColor: Colors.white,
              flexibleSpace: FlexibleSpaceBar(
                background: Container(
                  decoration: const BoxDecoration(
                    gradient: LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [_kNavy, Color(0xFF334155)],
                    ),
                  ),
                  padding: const EdgeInsets.fromLTRB(20, 60, 20, 16),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.end,
                    children: [
                      Text(
                        'Bonjour, ${user?.prenom ?? ''} 👷',
                        style: const TextStyle(
                          color: Colors.white,
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                      const SizedBox(height: 4),
                      if (profil != null)
                        _StatusBadge(statut: profil.statutValidation)
                      else
                        const Text(
                          'Espace technicien',
                          style: TextStyle(color: Colors.white70, fontSize: 13),
                        ),
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

                  // ── Alerte validation ─────────────────────────────────────
                  if (profil != null && profil.statutValidation != 'valide')
                    _AlertBanner(
                      message: '⚠️ Votre profil est en cours de validation. Vous pourrez recevoir des missions une fois validé.',
                    ),

                  // ── Toggle disponibilité ──────────────────────────────────
                  if (profil != null)
                    _StatutToggleCard(
                      disponible: profil.disponible,
                      onToggle: (v) => techProv.toggleDisponibilite(
                        lat: profil.latitude ?? 0,
                        lng: profil.longitude ?? 0,
                        disponible: v,
                      ),
                    ),

                  const SizedBox(height: 20),

                  // ── Statistiques ──────────────────────────────────────────
                  const _SectionTitle('Tableau de bord'),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(child: _StatCard(icon: '📋', label: 'Assignées',  value: '$assignees', color: _kBlue,   bg: Color(0xFFEFF6FF))),
                      const SizedBox(width: 10),
                      Expanded(child: _StatCard(icon: '🛠️', label: 'En cours',   value: '$enCours',   color: _kOrange, bg: Color(0xFFFFF8E1))),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(child: _StatCard(icon: '✅', label: 'Terminées',  value: '$terminees', color: _kGreen,  bg: Color(0xFFECFDF5))),
                      const SizedBox(width: 10),
                      Expanded(child: _StatCard(icon: '💰', label: 'Solde (F)',  value: solde.toStringAsFixed(0), color: _kGreen, bg: Color(0xFFECFDF5))),
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
                          icon: Icons.search,
                          label: 'Disponibles',
                          color: _kGreen,
                          primary: true,
                          onTap: () => Navigator.pushNamed(context, '/missions', arguments: 'disponibles'),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: _QuickAction(
                          icon: Icons.list_alt,
                          label: 'Mes missions',
                          color: Color(0xFF7C3AED),
                          onTap: () => Navigator.pushNamed(context, '/missions'),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: _QuickAction(
                          icon: Icons.person_outline,
                          label: 'Mon profil',
                          color: _kBlue,
                          onTap: () => Navigator.pushNamed(context, '/profil'),
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

                  // ── Missions récentes ─────────────────────────────────────
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const _SectionTitle('Missions récentes'),
                      TextButton(
                        onPressed: () => Navigator.pushNamed(context, '/missions'),
                        child: const Text('Voir tout →', style: TextStyle(color: _kBlue, fontSize: 13)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 4),
                  if (demProv.isLoading)
                    const Center(child: CircularProgressIndicator())
                  else if (missions.isEmpty)
                    _EmptyState(message: 'Aucune mission pour l\'instant.')
                  else
                    ...missions.take(5).map((m) => _MissionRow(
                      mission: m,
                      onTap: () => Navigator.pushNamed(context, '/mission-detail', arguments: m.id),
                    )),

                  const SizedBox(height: 24),
                ]),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

// ─── Widgets réutilisables ───────────────────────────────────────────────────

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

class _StatusBadge extends StatelessWidget {
  final String statut;
  const _StatusBadge({required this.statut});
  @override
  Widget build(BuildContext context) {
    final labels = {
      'en_attente': ('En attente de validation', Color(0xFFF59E0B)),
      'valide':     ('✅ Profil validé',          Color(0xFF059669)),
      'rejete':     ('❌ Profil rejeté',          Colors.red),
    };
    final (label, color) = labels[statut] ?? (statut, Colors.grey);
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.2),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(label, style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600)),
    );
  }
}

class _AlertBanner extends StatelessWidget {
  final String message;
  const _AlertBanner({required this.message});
  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 16),
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
      decoration: BoxDecoration(
        color: const Color(0xFFFFF3CD),
        borderRadius: BorderRadius.circular(10),
        border: Border.all(color: const Color(0xFFF59E0B).withValues(alpha: 0.5)),
      ),
      child: Text(message, style: const TextStyle(fontSize: 13, color: Color(0xFF856404))),
    );
  }
}

class _StatutToggleCard extends StatelessWidget {
  final bool disponible;
  final ValueChanged<bool> onToggle;
  const _StatutToggleCard({required this.disponible, required this.onToggle});
  @override
  Widget build(BuildContext context) {
    return Card(
      elevation: 0,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      color: disponible ? const Color(0xFFECFDF5) : const Color(0xFFF8FAFC),
      child: Padding(
        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
        child: Row(
          children: [
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(
                color: disponible ? const Color(0xFF059669).withValues(alpha: 0.12) : Colors.grey.withValues(alpha: 0.12),
                borderRadius: BorderRadius.circular(10),
              ),
              child: Icon(
                disponible ? Icons.wifi_tethering : Icons.wifi_tethering_off,
                color: disponible ? const Color(0xFF059669) : Colors.grey,
                size: 24,
              ),
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    disponible ? 'Disponible pour les missions' : 'Indisponible',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 14,
                      color: disponible ? const Color(0xFF059669) : Colors.grey[700],
                    ),
                  ),
                  Text(
                    disponible ? 'Vous recevez de nouvelles demandes' : 'Activez pour recevoir des demandes',
                    style: const TextStyle(fontSize: 12, color: Colors.grey),
                  ),
                ],
              ),
            ),
            Switch(
              value: disponible,
              onChanged: onToggle,
              activeThumbColor: const Color(0xFF059669),
            ),
          ],
        ),
      ),
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
                    color: primary ? Colors.white : const Color(0xFF1E293B),
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

class _MissionRow extends StatelessWidget {
  final Demande mission;
  final VoidCallback onTap;
  const _MissionRow({required this.mission, required this.onTap});
  @override
  Widget build(BuildContext context) {
    final (label, color, bg) = _statuts[mission.statut] ?? ('Inconnu', Colors.grey, const Color(0xFFF8FAFC));
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
                    mission.categorie?.nom ?? '—',
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    mission.description,
                    style: const TextStyle(color: Colors.grey, fontSize: 12),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _formatDate(mission.createdAt),
                    style: const TextStyle(color: Colors.grey, fontSize: 11),
                  ),
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
  const _EmptyState({required this.message});
  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 24),
      child: Center(
        child: Text(message, style: const TextStyle(color: Colors.grey, fontSize: 14)),
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
