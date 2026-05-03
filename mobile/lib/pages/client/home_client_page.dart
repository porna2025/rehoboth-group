import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';
import '../../providers/technicien_provider.dart';
import '../../providers/notification_provider.dart';
import '../../models/technicien.dart';

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
      context.read<NotificationProvider>().chargerNotifications();
    });
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final techProv = context.watch<TechnicienProvider>();
    final notifProv = context.watch<NotificationProvider>();
    final user = auth.user;

    return Scaffold(
      backgroundColor: const Color(0xFFF5F6FA),
      appBar: AppBar(
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Bonjour, ${user?.prenom ?? ''} 👋',
              style: const TextStyle(fontSize: 16),
            ),
            const Text(
              'Que recherchez-vous ?',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w300),
            ),
          ],
        ),
        actions: [
          // Notifications
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
          final techProv = context.read<TechnicienProvider>();
          final notifProv = context.read<NotificationProvider>();
          await techProv.chargerCategories();
          await notifProv.chargerNotifications();
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // Mes demandes
            _ActionCard(
              icon: Icons.list_alt,
              title: 'Mes demandes',
              subtitle: 'Suivre vos interventions',
              color: const Color(0xFF7C3AED),
              onTap: () => Navigator.pushNamed(context, '/mes-demandes'),
            ),
            const SizedBox(height: 8),
            _ActionCard(
              icon: Icons.search,
              title: 'Trouver un technicien',
              subtitle: 'Rechercher par spécialité',
              color: const Color(0xFF059669),
              onTap: () => Navigator.pushNamed(context, '/techniciens'),
            ),
            const SizedBox(height: 24),
            // Catégories
            const Text(
              'Catégories de services',
              style: TextStyle(
                fontSize: 17,
                fontWeight: FontWeight.bold,
                color: Color(0xFF1E293B),
              ),
            ),
            const SizedBox(height: 12),
            if (techProv.isLoading)
              const Center(child: CircularProgressIndicator())
            else if (techProv.error != null)
              Center(
                child: Text(
                  techProv.error!,
                  style: const TextStyle(color: Colors.red),
                ),
              )
            else
              GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: techProv.categories.length,
                gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: 2,
                  mainAxisSpacing: 12,
                  crossAxisSpacing: 12,
                  childAspectRatio: 1.3,
                ),
                itemBuilder: (ctx, i) =>
                    _CategorieCard(categorie: techProv.categories[i]),
              ),
          ],
        ),
      ),
    );
  }
}

class _ActionCard extends StatelessWidget {
  final IconData icon;
  final String title;
  final String subtitle;
  final Color color;
  final VoidCallback onTap;

  const _ActionCard({
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

class _CategorieCard extends StatelessWidget {
  final Categorie categorie;
  const _CategorieCard({required this.categorie});

  @override
  Widget build(BuildContext context) {
    return Card(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () =>
            Navigator.pushNamed(context, '/techniciens', arguments: categorie),
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Text(
                categorie.icone.isNotEmpty ? categorie.icone : '🔧',
                style: const TextStyle(fontSize: 32),
              ),
              const SizedBox(height: 6),
              Text(
                categorie.nom,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  fontWeight: FontWeight.w600,
                  fontSize: 13,
                ),
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
              ),
              Text(
                '${categorie.nbTechniciens} technicien(s)',
                style: TextStyle(color: Colors.grey[500], fontSize: 11),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
