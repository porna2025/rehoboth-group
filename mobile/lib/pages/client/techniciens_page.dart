import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/technicien_provider.dart';
import '../../models/technicien.dart';
import '../../widgets/technicien_card.dart';

class TechniciensPage extends StatefulWidget {
  const TechniciensPage({super.key});

  @override
  State<TechniciensPage> createState() => _TechniciensPageState();
}

class _TechniciensPageState extends State<TechniciensPage> {
  Categorie? _categorieInitiale;
  final _searchCtrl = TextEditingController();
  bool _dispoDispo = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final arg = ModalRoute.of(context)?.settings.arguments;
      if (arg is Categorie) {
        _categorieInitiale = arg;
      }
      _charger();
    });
  }

  void _charger() {
    context.read<TechnicienProvider>().chargerTechniciens(
      categorieId: _categorieInitiale?.id,
      disponible: _dispoDispo ? true : null,
      search: _searchCtrl.text.trim().isEmpty ? null : _searchCtrl.text.trim(),
    );
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final prov = context.watch<TechnicienProvider>();
    return Scaffold(
      appBar: AppBar(
        title: Text(
          _categorieInitiale != null
              ? '${_categorieInitiale!.icone} ${_categorieInitiale!.nom}'
              : 'Techniciens',
        ),
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
      ),
      body: Column(
        children: [
          // Barre de recherche
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Rechercher…',
                prefixIcon: const Icon(Icons.search),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear),
                        onPressed: () {
                          _searchCtrl.clear();
                          _charger();
                        },
                      )
                    : null,
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(10),
                  borderSide: BorderSide.none,
                ),
              ),
              onSubmitted: (_) => _charger(),
            ),
          ),
          // Filtre disponibilité
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
            child: Row(
              children: [
                FilterChip(
                  label: const Text('Disponibles maintenant'),
                  selected: _dispoDispo,
                  onSelected: (v) {
                    setState(() => _dispoDispo = v);
                    _charger();
                  },
                ),
              ],
            ),
          ),
          // Liste
          Expanded(
            child: prov.isLoading
                ? const Center(child: CircularProgressIndicator())
                : prov.error != null
                ? Center(
                    child: Column(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          prov.error!,
                          style: const TextStyle(color: Colors.red),
                        ),
                        TextButton(
                          onPressed: _charger,
                          child: const Text('Réessayer'),
                        ),
                      ],
                    ),
                  )
                : prov.techniciens.isEmpty
                ? const Center(child: Text('Aucun technicien trouvé'))
                : RefreshIndicator(
                    onRefresh: () async => _charger(),
                    child: ListView.builder(
                      itemCount: prov.techniciens.length,
                      itemBuilder: (ctx, i) => TechnicienCard(
                        technicien: prov.techniciens[i],
                        onTap: () => Navigator.pushNamed(
                          context,
                          '/technicien-detail',
                          arguments: prov.techniciens[i].id,
                        ),
                      ),
                    ),
                  ),
          ),
        ],
      ),
    );
  }
}
