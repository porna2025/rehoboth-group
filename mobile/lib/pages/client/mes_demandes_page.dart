import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/demande_provider.dart';
import '../../widgets/demande_card.dart';

class MesDemandesPage extends StatefulWidget {
  const MesDemandesPage({super.key});

  @override
  State<MesDemandesPage> createState() => _MesDemandesPageState();
}

class _MesDemandesPageState extends State<MesDemandesPage>
    with SingleTickerProviderStateMixin {
  late TabController _tabCtrl;
  final _tabs = [
    (label: 'Toutes', statut: null),
    (label: 'En attente', statut: 'en_attente'),
    (label: 'En cours', statut: 'en_cours'),
    (label: 'Terminées', statut: 'terminee'),
  ];

  @override
  void initState() {
    super.initState();
    _tabCtrl = TabController(length: _tabs.length, vsync: this);
    _charger();
  }

  void _charger({String? statut}) {
    context.read<DemandeProvider>().chargerMesDemandes(statut: statut);
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
        title: const Text('Mes demandes'),
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
        bottom: TabBar(
          controller: _tabCtrl,
          isScrollable: true,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white70,
          indicatorColor: Colors.white,
          onTap: (i) => _charger(statut: _tabs[i].statut),
          tabs: _tabs.map((t) => Tab(text: t.label)).toList(),
        ),
      ),
      body: prov.isLoading
          ? const Center(child: CircularProgressIndicator())
          : prov.error != null
          ? Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(prov.error!, style: const TextStyle(color: Colors.red)),
                  TextButton(
                    onPressed: _charger,
                    child: const Text('Réessayer'),
                  ),
                ],
              ),
            )
          : prov.demandes.isEmpty
          ? const Center(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Icon(Icons.inbox_outlined, size: 64, color: Colors.grey),
                  SizedBox(height: 12),
                  Text('Aucune demande', style: TextStyle(color: Colors.grey)),
                ],
              ),
            )
          : RefreshIndicator(
              onRefresh: () async => _charger(),
              child: ListView.builder(
                itemCount: prov.demandes.length,
                itemBuilder: (ctx, i) => DemandeCard(
                  demande: prov.demandes[i],
                  onTap: () => Navigator.pushNamed(
                    context,
                    '/demande-detail',
                    arguments: prov.demandes[i].id,
                  ),
                ),
              ),
            ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => Navigator.pushNamed(context, '/creer-demande'),
        icon: const Icon(Icons.add),
        label: const Text('Nouvelle demande'),
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
      ),
    );
  }
}
