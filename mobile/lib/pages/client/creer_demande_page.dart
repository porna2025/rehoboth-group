import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:geolocator/geolocator.dart';
import '../../providers/demande_provider.dart';
import '../../providers/technicien_provider.dart';
import '../../models/technicien.dart';

class CreerDemandePage extends StatefulWidget {
  const CreerDemandePage({super.key});

  @override
  State<CreerDemandePage> createState() => _CreerDemandePageState();
}

class _CreerDemandePageState extends State<CreerDemandePage> {
  final _formKey = GlobalKey<FormState>();
  final _descCtrl = TextEditingController();
  final _adresseCtrl = TextEditingController();

  Technicien? _technicien;
  Categorie? _categorie;
  String _typeIntervention = 'immediat';
  String _mode = 'sur_place';

  double? _latitude;
  double? _longitude;
  bool _localisationEnCours = false;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addPostFrameCallback((_) {
      final arg = ModalRoute.of(context)?.settings.arguments;
      if (arg is Technicien) {
        setState(() {
          _technicien = arg;
          _categorie = arg.categorie;
        });
      }
      if (context.read<TechnicienProvider>().categories.isEmpty) {
        context.read<TechnicienProvider>().chargerCategories();
      }
      _recupererPosition();
    });
  }

  @override
  void dispose() {
    _descCtrl.dispose();
    _adresseCtrl.dispose();
    super.dispose();
  }

  Future<void> _recupererPosition() async {
    setState(() => _localisationEnCours = true);
    try {
      bool serviceEnabled = await Geolocator.isLocationServiceEnabled();
      if (!serviceEnabled) {
        setState(() => _localisationEnCours = false);
        return;
      }

      LocationPermission permission = await Geolocator.checkPermission();
      if (permission == LocationPermission.denied) {
        permission = await Geolocator.requestPermission();
        if (permission == LocationPermission.denied) {
          setState(() => _localisationEnCours = false);
          return;
        }
      }

      if (permission == LocationPermission.deniedForever) {
        setState(() => _localisationEnCours = false);
        return;
      }

      final position = await Geolocator.getCurrentPosition(
        locationSettings: const LocationSettings(
          accuracy: LocationAccuracy.high,
          timeLimit: Duration(seconds: 10),
        ),
      );

      setState(() {
        _latitude = position.latitude;
        _longitude = position.longitude;
        _localisationEnCours = false;
      });
    } catch (_) {
      setState(() => _localisationEnCours = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_categorie == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Veuillez choisir une catégorie'),
          backgroundColor: Colors.orange,
        ),
      );
      return;
    }

    final lat = _latitude ?? 0.0;
    final lng = _longitude ?? 0.0;

    final demande = await context.read<DemandeProvider>().creerDemande(
      categorieId: _categorie!.id,
      description: _descCtrl.text.trim(),
      adresse: _adresseCtrl.text.trim(),
      latitude: lat,
      longitude: lng,
      typeIntervention: _typeIntervention,
      mode: _mode,
    );
    if (!mounted) return;
    if (demande != null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Demande créée avec succès !'),
          backgroundColor: Colors.green,
        ),
      );
      Navigator.pushReplacementNamed(context, '/mes-demandes');
    } else {
      final err = context.read<DemandeProvider>().error;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(err ?? 'Erreur lors de la création'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final techProv = context.watch<TechnicienProvider>();
    final demandeProv = context.watch<DemandeProvider>();

    return Scaffold(
      appBar: AppBar(
        title: const Text('Nouvelle demande'),
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (_technicien != null)
                Card(
                  color: const Color(0xFF2563EB).withOpacity(0.06),
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(10),
                  ),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Row(
                      children: [
                        const Icon(
                          Icons.person_outline,
                          color: Color(0xFF2563EB),
                        ),
                        const SizedBox(width: 8),
                        Text(
                          'Technicien : ${_technicien!.user.nomComplet}',
                          style: const TextStyle(fontWeight: FontWeight.w600),
                        ),
                      ],
                    ),
                  ),
                ),
              const SizedBox(height: 16),
              // Catégorie
              const Text(
                'Catégorie *',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              DropdownButtonFormField<Categorie>(
                value: _categorie,
                hint: const Text('Choisir une catégorie'),
                items: techProv.categories
                    .map(
                      (c) => DropdownMenuItem(
                        value: c,
                        child: Text('${c.icone} ${c.nom}'),
                      ),
                    )
                    .toList(),
                onChanged: (v) => setState(() => _categorie = v),
                decoration: const InputDecoration(
                  border: OutlineInputBorder(),
                  contentPadding: EdgeInsets.symmetric(
                    horizontal: 12,
                    vertical: 8,
                  ),
                ),
                validator: (_) =>
                    _categorie == null ? 'Catégorie requise' : null,
              ),
              const SizedBox(height: 16),
              // Description
              TextFormField(
                controller: _descCtrl,
                maxLines: 4,
                decoration: const InputDecoration(
                  labelText: 'Description du problème *',
                  hintText: 'Décrivez le problème en détail…',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
                validator: (v) {
                  if (v == null || v.trim().length < 10) {
                    return 'Description trop courte (min. 10 caractères)';
                  }
                  return null;
                },
              ),
              const SizedBox(height: 16),
              // Adresse
              TextFormField(
                controller: _adresseCtrl,
                decoration: const InputDecoration(
                  labelText: 'Adresse d\'intervention *',
                  prefixIcon: Icon(Icons.location_on_outlined),
                  border: OutlineInputBorder(),
                ),
                validator: (v) =>
                    (v == null || v.trim().isEmpty) ? 'Adresse requise' : null,
              ),
              const SizedBox(height: 8),
              // Statut GPS
              Row(
                children: [
                  Icon(
                    _latitude != null ? Icons.gps_fixed : Icons.gps_not_fixed,
                    size: 16,
                    color: _latitude != null ? Colors.green : Colors.grey,
                  ),
                  const SizedBox(width: 6),
                  Text(
                    _localisationEnCours
                        ? 'Localisation en cours…'
                        : _latitude != null
                        ? 'Position GPS obtenue ✓'
                        : 'Position GPS non disponible',
                    style: TextStyle(
                      fontSize: 12,
                      color: _latitude != null ? Colors.green : Colors.grey,
                    ),
                  ),
                  if (_latitude == null && !_localisationEnCours)
                    TextButton(
                      onPressed: _recupererPosition,
                      child: const Text(
                        'Réessayer',
                        style: TextStyle(fontSize: 12),
                      ),
                    ),
                ],
              ),
              const SizedBox(height: 16),
              // Type d'intervention
              const Text(
                'Type d\'intervention',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: _SelectChip(
                      label: 'Urgent',
                      icon: Icons.flash_on,
                      selected: _typeIntervention == 'immediat',
                      onTap: () =>
                          setState(() => _typeIntervention = 'immediat'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _SelectChip(
                      label: 'Planifié',
                      icon: Icons.calendar_today,
                      selected: _typeIntervention == 'planifie',
                      onTap: () =>
                          setState(() => _typeIntervention = 'planifie'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              // Mode
              const Text(
                'Mode d\'intervention',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Expanded(
                    child: _SelectChip(
                      label: 'Sur place',
                      icon: Icons.home_repair_service,
                      selected: _mode == 'sur_place',
                      onTap: () => setState(() => _mode = 'sur_place'),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: _SelectChip(
                      label: 'À distance',
                      icon: Icons.video_call,
                      selected: _mode == 'a_distance',
                      onTap: () => setState(() => _mode = 'a_distance'),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 28),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: (demandeProv.isLoading || _localisationEnCours)
                      ? null
                      : _submit,
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF2563EB),
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(
                      borderRadius: BorderRadius.circular(12),
                    ),
                  ),
                  child: demandeProv.isLoading
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            color: Colors.white,
                            strokeWidth: 2,
                          ),
                        )
                      : const Text(
                          'Envoyer la demande',
                          style: TextStyle(fontSize: 16),
                        ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SelectChip extends StatelessWidget {
  final String label;
  final IconData icon;
  final bool selected;
  final VoidCallback onTap;

  const _SelectChip({
    required this.label,
    required this.icon,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 12),
        decoration: BoxDecoration(
          color: selected
              ? const Color(0xFF2563EB).withOpacity(0.1)
              : Colors.grey[100],
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: selected ? const Color(0xFF2563EB) : Colors.grey[300]!,
            width: selected ? 2 : 1,
          ),
        ),
        child: Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              icon,
              size: 18,
              color: selected ? const Color(0xFF2563EB) : Colors.grey[600],
            ),
            const SizedBox(width: 6),
            Text(
              label,
              style: TextStyle(
                color: selected ? const Color(0xFF2563EB) : Colors.grey[700],
                fontWeight: FontWeight.w500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}
