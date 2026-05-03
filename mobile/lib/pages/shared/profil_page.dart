import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../providers/auth_provider.dart';

class ProfilPage extends StatefulWidget {
  const ProfilPage({super.key});

  @override
  State<ProfilPage> createState() => _ProfilPageState();
}

class _ProfilPageState extends State<ProfilPage> {
  bool _editMode = false;
  final _nomCtrl = TextEditingController();
  final _prenomCtrl = TextEditingController();
  final _telCtrl = TextEditingController();

  @override
  void initState() {
    super.initState();
    final user = context.read<AuthProvider>().user;
    if (user != null) {
      _nomCtrl.text = user.nom;
      _prenomCtrl.text = user.prenom;
      _telCtrl.text = user.telephone ?? '';
    }
  }

  @override
  void dispose() {
    _nomCtrl.dispose();
    _prenomCtrl.dispose();
    _telCtrl.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    final auth = context.read<AuthProvider>();
    final ok = await auth.modifierProfil(
      nom: _nomCtrl.text.trim(),
      prenom: _prenomCtrl.text.trim(),
      telephone: _telCtrl.text.trim().isEmpty ? null : _telCtrl.text.trim(),
    );
    if (!mounted) return;
    if (ok) {
      setState(() => _editMode = false);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Profil mis à jour'),
          backgroundColor: Colors.green,
        ),
      );
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(auth.error ?? 'Erreur'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _deconnexion() async {
    final confirm = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Déconnexion'),
        content: const Text('Voulez-vous vraiment vous déconnecter ?'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx, false),
            child: const Text('Non'),
          ),
          TextButton(
            onPressed: () => Navigator.pop(ctx, true),
            child: const Text('Oui', style: TextStyle(color: Colors.red)),
          ),
        ],
      ),
    );
    if (confirm == true && mounted) {
      final authProv = context.read<AuthProvider>();
      await authProv.deconnexion();
      if (mounted) {
        Navigator.pushNamedAndRemoveUntil(context, '/login', (_) => false);
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    final auth = context.watch<AuthProvider>();
    final user = auth.user;
    if (user == null) {
      return const Scaffold(body: Center(child: CircularProgressIndicator()));
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Mon profil'),
        backgroundColor: const Color(0xFF2563EB),
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: Icon(_editMode ? Icons.close : Icons.edit),
            onPressed: () => setState(() => _editMode = !_editMode),
          ),
        ],
      ),
      body: ListView(
        padding: const EdgeInsets.all(16),
        children: [
          // Avatar
          Center(
            child: Column(
              children: [
                CircleAvatar(
                  radius: 48,
                  backgroundColor: const Color(0xFF2563EB).withOpacity(0.15),
                  backgroundImage: user.photoProfil != null
                      ? NetworkImage(user.photoProfil!)
                      : null,
                  child: user.photoProfil == null
                      ? Text(
                          user.prenom.isNotEmpty
                              ? user.prenom[0].toUpperCase()
                              : '?',
                          style: const TextStyle(
                            fontSize: 36,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF2563EB),
                          ),
                        )
                      : null,
                ),
                const SizedBox(height: 10),
                Text(
                  user.nomComplet,
                  style: const TextStyle(
                    fontSize: 20,
                    fontWeight: FontWeight.bold,
                  ),
                ),
                _RoleBadge(role: user.role),
              ],
            ),
          ),
          const SizedBox(height: 24),
          // Infos / édition
          Card(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            child: Padding(
              padding: const EdgeInsets.all(16),
              child: _editMode
                  ? _EditForm(
                      nomCtrl: _nomCtrl,
                      prenomCtrl: _prenomCtrl,
                      telCtrl: _telCtrl,
                      loading: auth.isLoading,
                      onSave: _save,
                    )
                  : Column(
                      children: [
                        _InfoTile(
                          icon: Icons.email_outlined,
                          label: user.email,
                        ),
                        if (user.telephone != null)
                          _InfoTile(icon: Icons.phone, label: user.telephone!),
                        _InfoTile(
                          icon: user.estVerifie
                              ? Icons.verified
                              : Icons.cancel_outlined,
                          label: user.estVerifie
                              ? 'Compte vérifié'
                              : 'Compte non vérifié',
                          color: user.estVerifie ? Colors.green : Colors.orange,
                        ),
                      ],
                    ),
            ),
          ),
          const SizedBox(height: 24),
          // Déconnexion
          OutlinedButton.icon(
            icon: const Icon(Icons.logout, color: Colors.red),
            label: const Text(
              'Se déconnecter',
              style: TextStyle(color: Colors.red),
            ),
            onPressed: _deconnexion,
            style: OutlinedButton.styleFrom(
              side: const BorderSide(color: Colors.red),
              minimumSize: const Size(double.infinity, 48),
            ),
          ),
        ],
      ),
    );
  }
}

class _RoleBadge extends StatelessWidget {
  final String role;
  const _RoleBadge({required this.role});

  @override
  Widget build(BuildContext context) {
    final labels = {
      'client': 'Client',
      'technicien': 'Technicien',
      'admin': 'Administrateur',
    };
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Chip(
        label: Text(labels[role] ?? role),
        backgroundColor: const Color(0xFF2563EB).withOpacity(0.1),
        labelStyle: const TextStyle(color: Color(0xFF2563EB)),
      ),
    );
  }
}

class _InfoTile extends StatelessWidget {
  final IconData icon;
  final String label;
  final Color? color;

  const _InfoTile({required this.icon, required this.label, this.color});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(
        children: [
          Icon(icon, size: 20, color: color ?? const Color(0xFF2563EB)),
          const SizedBox(width: 12),
          Text(label, style: TextStyle(color: Colors.grey[700])),
        ],
      ),
    );
  }
}

class _EditForm extends StatelessWidget {
  final TextEditingController nomCtrl;
  final TextEditingController prenomCtrl;
  final TextEditingController telCtrl;
  final bool loading;
  final VoidCallback onSave;

  const _EditForm({
    required this.nomCtrl,
    required this.prenomCtrl,
    required this.telCtrl,
    required this.loading,
    required this.onSave,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Row(
          children: [
            Expanded(
              child: TextField(
                controller: prenomCtrl,
                decoration: const InputDecoration(labelText: 'Prénom'),
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: TextField(
                controller: nomCtrl,
                decoration: const InputDecoration(labelText: 'Nom'),
              ),
            ),
          ],
        ),
        const SizedBox(height: 12),
        TextField(
          controller: telCtrl,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: 'Téléphone'),
        ),
        const SizedBox(height: 20),
        SizedBox(
          width: double.infinity,
          height: 44,
          child: ElevatedButton(
            onPressed: loading ? null : onSave,
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF2563EB),
              foregroundColor: Colors.white,
            ),
            child: loading
                ? const SizedBox(
                    height: 18,
                    width: 18,
                    child: CircularProgressIndicator(
                      color: Colors.white,
                      strokeWidth: 2,
                    ),
                  )
                : const Text('Enregistrer'),
          ),
        ),
      ],
    );
  }
}
