import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/demande_provider.dart';
import '../../widgets/demande_card.dart';

class MissionsPage extends StatefulWidget {
  const MissionsPage({super.key});

  @override
  State<MissionsPage> createState() => _MissionsPageState();
}

class _MissionsPageState extends State<MissionsPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  bool _loadingDisponibles = false;
  bool _loadingMissions = false;

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: 2, vsync: this);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final arg = ModalRoute.of(context)?.settings.arguments;
      if (arg == 'disponibles') {
        _tabCtrl.animateTo(0);
      }
      _chargerDisponibles();
      _chargerMissions();
    });
  }

  Future<void> _chargerDisponibles() async {
    if (!mounted) return;
    setState(() => _loadingDisponibles = true);
    await context.read<DemandeProvider>().chargerDemandesDisponibles();
    if (mounted) setState(() => _loadingDisponibles = false);
  }

  Future<void> _chargerMissions({String? statut}) async {
    if (!mounted) return;
    setState(() => _loadingMissions = true);
    await context.read<DemandeProvider>().chargerMesMissions(statut: statut);
    if (mounted) setState(() => _loadingMissions = false);
  }

  @override
  void dispose() {
    _tabCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<DemandeProvider>();
    return Scaffold(
      appBar: AppBar(
        title: const Text('Demandes & Missions'),
        backgroundColor: const Color(0xFF1E293B),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabCtrl,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.white,
          tabs: const [
            Tab(text: 'Disponibles'),
            Tab(text: 'Mes missions'),
          ],
        ),
      ),
      body: TabBarView(
        controller: _tabCtrl,
        children: [
          // Onglet demandes disponibles
          RefreshIndicator(
            onRefresh: () async => _chargerDisponibles(),
            child: _loadingDisponibles
                ? const Center(child: CircularProgressIndicator())
                : prov.demandesDisponibles.isEmpty
                ? const _EmptyState(
                    message: 'Aucune demande disponible actuellement',
                  )
                : ListView.builder(
                    itemCount: prov.demandesDisponibles.length,
                    itemBuilder: (ctx, i) {
                      final d = prov.demandesDisponibles[i];
                      return DemandeCard(
                        demande: d,
                        showClient: true,
                        onTap: () => Navigator.pushNamed(
                          context,
                          '/mission-detail',
                          arguments: d.id,
                        ),
                      );
                    },
                  ),
          ),
          // Onglet mes missions
          RefreshIndicator(
            onRefresh: () async => _chargerMissions(),
            child: _loadingMissions
                ? const Center(child: CircularProgressIndicator())
                : prov.demandes.isEmpty
                ? const _EmptyState(message: 'Aucune mission assignée')
                : ListView.builder(
                    itemCount: prov.demandes.length,
                    itemBuilder: (ctx, i) {
                      final d = prov.demandes[i];
                      return DemandeCard(
                        demande: d,
                        showClient: true,
                        onTap: () => Navigator.pushNamed(
                          context,
                          '/mission-detail',
                          arguments: d.id,
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final String message;
  const _EmptyState({required this.message});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(Icons.inbox_outlined, size: 64, color: Colors.grey),
          const SizedBox(height: 12),
          Text(message, style: const TextStyle(color: Colors.grey)),
        ],
      ),
    );
  }
}
