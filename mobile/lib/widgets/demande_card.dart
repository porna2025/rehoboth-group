import 'package:flutter/material.dart';
import '../models/demande.dart';

class DemandeCard extends StatelessWidget {
  final Demande demande;
  final VoidCallback? onTap;
  final bool showClient;

  const DemandeCard({
    super.key,
    required this.demande,
    this.onTap,
    this.showClient = false,
  });

  @override
  Widget build(BuildContext context) {
    final d = demande;
    return Card(
      margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 6),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.all(14),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Header
              Row(
                children: [
                  if (d.categorie != null)
                    Text(
                      d.categorie!.icone,
                      style: const TextStyle(fontSize: 22),
                    ),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      d.categorie?.nom ?? 'Demande',
                      style: const TextStyle(
                        fontWeight: FontWeight.bold,
                        fontSize: 15,
                      ),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                  _StatutChip(statut: d.statut, label: d.statutLabel),
                ],
              ),
              const SizedBox(height: 6),
              // Description
              Text(
                d.description,
                maxLines: 2,
                overflow: TextOverflow.ellipsis,
                style: TextStyle(color: Colors.grey[700], fontSize: 13),
              ),
              const SizedBox(height: 6),
              // Adresse
              Row(
                children: [
                  Icon(
                    Icons.location_on_outlined,
                    size: 14,
                    color: Colors.grey[500],
                  ),
                  const SizedBox(width: 4),
                  Expanded(
                    child: Text(
                      d.adresse,
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                      overflow: TextOverflow.ellipsis,
                    ),
                  ),
                ],
              ),
              if (showClient && d.technicien != null) ...[
                const SizedBox(height: 4),
                Row(
                  children: [
                    Icon(
                      Icons.person_outline,
                      size: 14,
                      color: Colors.grey[500],
                    ),
                    const SizedBox(width: 4),
                    Text(
                      d.technicien!.nomComplet,
                      style: TextStyle(color: Colors.grey[500], fontSize: 12),
                    ),
                  ],
                ),
              ],
              if (d.montantDevis != null) ...[
                const SizedBox(height: 4),
                Text(
                  'Devis : ${d.montantDevis!.toStringAsFixed(0)} FCFA',
                  style: const TextStyle(
                    color: Colors.green,
                    fontWeight: FontWeight.w600,
                    fontSize: 13,
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _StatutChip extends StatelessWidget {
  final String statut;
  final String label;
  const _StatutChip({required this.statut, required this.label});

  Color get _color {
    switch (statut) {
      case 'en_attente':
        return Colors.orange;
      case 'acceptee':
        return Colors.blue;
      case 'en_route':
        return Colors.indigo;
      case 'en_cours':
        return Colors.purple;
      case 'terminee':
        return Colors.green;
      case 'annulee':
        return Colors.red;
      default:
        return Colors.grey;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
      decoration: BoxDecoration(
        color: _color.withValues(alpha: 0.12),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: _color, width: 0.8),
      ),
      child: Text(
        label.isNotEmpty ? label : statut,
        style: TextStyle(
          fontSize: 11,
          color: _color,
          fontWeight: FontWeight.w600,
        ),
      ),
    );
  }
}
