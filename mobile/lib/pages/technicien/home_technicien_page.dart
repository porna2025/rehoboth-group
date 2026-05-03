import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/technicien_provider.dart';
import '../../providers/notification_provider.dart';

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
      context.read<NotificationProvider>().chargerNotifications();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final techProv = context.watch<TechnicienProvider>();
    final notifProv = context.watch<NotificationProvider>();
    final user = auth.user;
    final profil = techProv.monProfil;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F6FA),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bonjour, ${user?.prenom ?? ''} 👋',
              style: const TextStyle(fontSize: 16),
            ),
            const Text(
              'Espace technicien',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w300),
            ),
          ],
        ),
        actions: [
          Stack(
            children: [
              IconButton(
                icon: const Icon(Icons.notifications_outlined),
                onPressed: () => Navigator.pushNamed(context, '/notifications'),
              ),
              if (notifProv.nonLues > 0)
                Positioned(
                  right: 8,
                  top: 8,
                  child: Container(
                    padding: const EdgeInsets.all(2),
                    decoration: const BoxDecoration(
                      color: Colors.red,
                      shape: BoxShape.circle,
                    ),
                    constraints: const BoxConstraints(
                      minWidth: 16,
                      minHeight: 16,
                    ),
                    child: Text(
                      '${notifProv.nonLues}',
                      style: const TextStyle(
                        color: Colors.white,
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                      ),
                      textAlign: TextAlign.center,
                    ),
                  ),
                ),
            ],
          ),
          IconButton(
            icon: const Icon(Icons.person_outline),
            onPressed: () => Navigator.pushNamed(context, '/profil'),
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: () async {
          await context.read<TechnicienProvider>().chargerMonProfil();
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Carte statut
            if (profil != null)
              _StatutCard(
                disponible: profil.disponible,
                onToggle: (v) async {
                  await techProv.toggleDisponibilite(
                    lat: profil.latitude ?? 0,
                    lng: profil.longitude ?? 0,
                    disponible: v,
                  );
                },
              ),
            const SizedBox(height: 12),
            // Statistiques
            if (profil != null)
              Row(
                children: [
                  Expanded(
                    child: _StatCard(
                      label: 'Missions',
                      value: '${profil.nbMissions}',
                      icon: Icons.task_alt,
                      color: const Color(0xFF2563EB),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _StatCard(
                      label: 'Note',
                      value: profil.noteMoyenne.toStringAsFixed(1),
                      icon: Icons.star,
                      color: Colors.amber,
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _StatCard(
                      label: 'Solde',
                      value: '${profil.solde.toStringAsFixed(0)} F',
                      icon: Icons.wallet,
                      color: Colors.green,
                    ),
                  ),
                ],
              ),
            const SizedBox(height: 20),
            // Actions
            _ActionTile(
              icon: Icons.search,
              title: 'Demandes disponibles',
              subtitle: 'Voir les demandes en attente',
              color: const Color(0xFF059669),
              onTap: () => Navigator.pushNamed(
                context,
                '/missions',
                arguments: 'disponibles',
              ),
            ),
            const SizedBox(height: 8),
            _ActionTile(
              icon: Icons.list_alt,
              title: 'Mes missions',
              subtitle: 'Suivi de vos interventions',
              color: const Color(0xFF7C3AED),
              onTap: () => Navigator.pushNamed(context, '/missions'),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatutCard extends StatelessWidget {
  final bool disponible;
  final ValueChanged<bool> onToggle;

  const _StatutCard({required this.disponible, required this.onToggle});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
      color: disponible ? Colors.green[50] : Colors.grey[50],
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            Icon(
              disponible ? Icons.check_circle : Icons.cancel_outlined,
              color: disponible ? Colors.green : Colors.grey,
              size: 32,
            ),
            const SizedBox(width: 14),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    disponible
                        ? 'Vous êtes disponible'
                        : 'Vous êtes indisponible',
                    style: TextStyle(
                      fontWeight: FontWeight.bold,
                      color: disponible ? Colors.green[800] : Colors.grey[700],
                    ),
                  ),
                  Text(
                    disponible
                        ? 'Vous recevez les nouvelles demandes'
                        : 'Activez pour recevoir des demandes',
                    style: TextStyle(fontSize: 12, color: Colors.grey[600]),
                  ),
                ],
              ),
            ),
            Switch(
              value: disponible,
              onChanged: onToggle,
              activeThumbColor: Colors.green,
            ),
          ],
        ),
      ),
    );
  }
}

class _StatCard extends StatelessWidget {
  final String label;
  final String value;
  final IconData icon;
  final Color color;

  const _StatCard({
    required this.label,
    required this.value,
    required this.icon,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 6),
            Text(
              value,
              style: TextStyle(
                fontWeight: FontWeight.bold,
                fontSize: 18,
                color: color,
              ),
            ),
            Text(
              label,
              style: TextStyle(fontSize: 11, color: Colors.grey[600]),
            ),
          ],
        ),
      ),
    );
  }
}

class _ActionTile extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ActionTile({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.color,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(10),
                decoration: BoxDecoration(
                  color: color.withOpacity(0.12),
                  borderRadius: BorderRadius.circular(10),
                ),
                child: Icon(icon, color: color, size: 26),
              ),
              const SizedBox(width: 14),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    title,
                    style: const TextStyle(
                      fontWeight: FontWeight.bold,
                      fontSize: 15,
                    ),
                  ),
                  Text(
                    subtitle,
                    style: TextStyle(color: Colors.grey[600], fontSize: 12),
                  ),
                ],
              ),
              const Spacer(),
              const Icon(Icons.chevron_right, color: Colors.grey),
            ],
          ),
        ),
      ),
    );
  }
}
