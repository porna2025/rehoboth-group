import 'package:flutter/material.dart';
import '../models/technicien.dart';
import '../widgets/star_rating.dart';

class TechnicienCard extends StatelessWidget {
  final Technicien technicien;
  final VoidCallback? onTap;

  const TechnicienCard({super.key, required this.technicien, this.onTap});

  @override
  Widget build(BuildContext context) {
    final t = technicien;
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(12),
          child: Row(
            children: [
              // Avatar
              CircleAvatar(
                radius: 28,
                backgroundColor: Theme.of(context).colorScheme.primaryContainer,
                backgroundImage: t.user.photoProfil != null
                    ? NetworkImage(t.user.photoProfil!)
                    : null,
                child: t.user.photoProfil == null
                    ? Text(
                        t.user.prenom.isNotEmpty
                            ? t.user.prenom[0].toUpperCase()
                            : '?',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                        ),
                      )
                    : null,
              ),
              const SizedBox(width: 12),
              // Infos
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            t.user.nomComplet,
                            style: const TextStyle(
                              fontWeight: FontWeight.bold,
                              fontSize: 15,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        _DisponibiliteChip(disponible: t.disponible),
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(
                      t.specialite,
                      style: TextStyle(color: Colors.grey[600], fontSize: 13),
                      overflow: TextOverflow.ellipsis,
                    ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        StarRating(note: t.noteMoyenne, size: 14),
                        const SizedBox(width: 4),
                        Text(
                          '${t.noteMoyenne.toStringAsFixed(1)} (${t.nbEvaluations})',
                          style: const TextStyle(fontSize: 12),
                        ),
                        const Spacer(),
                        if (t.tarifHoraire != null)
                          Text(
                            '${t.tarifHoraire!.toStringAsFixed(0)} FCFA/h',
                            style: const TextStyle(
                              fontWeight: FontWeight.w600,
                              fontSize: 12,
                              color: Colors.green,
                            ),
                          ),
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _DisponibiliteChip extends StatelessWidget {
  final bool disponible;
  const _DisponibiliteChip({required this.disponible});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
      decoration: BoxDecoration(
        color: disponible ? Colors.green[50] : Colors.grey[100],
        borderRadius: BorderRadius.circular(20),
        border: Border.all(
          color: disponible ? Colors.green : Colors.grey,
          width: 0.8,
        ),
      ),
      child: Text(
        disponible ? 'Disponible' : 'Indisponible',
        style: TextStyle(
          fontSize: 11,
          color: disponible ? Colors.green[700] : Colors.grey[600],
          fontWeight: FontWeight.w500,
        ),
      ),
    );
  }
}
