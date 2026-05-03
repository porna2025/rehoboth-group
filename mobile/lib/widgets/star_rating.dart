import 'package:flutter/material.dart';

class StarRating extends StatelessWidget {
  final double note;
  final int total;
  final double size;
  final Color activeColor;

  const StarRating({
    super.key,
    required this.note,
    this.total = 5,
    this.size = 18,
    this.activeColor = Colors.amber,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(total, (i) {
        final filled = i < note.floor();
        final halfFilled = !filled && i < note;
        return Icon(
          halfFilled
              ? Icons.star_half
              : filled
              ? Icons.star
              : Icons.star_border,
          color: activeColor,
          size: size,
        );
      }),
    );
  }
}

class StarRatingInput extends StatelessWidget {
  final int value;
  final ValueChanged<int> onChanged;
  final double size;

  const StarRatingInput({
    super.key,
    required this.value,
    required this.onChanged,
    this.size = 32,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      mainAxisSize: MainAxisSize.min,
      children: List.generate(5, (i) {
        final selected = i < value;
        return GestureDetector(
          onTap: () => onChanged(i + 1),
          child: Icon(
            selected ? Icons.star : Icons.star_border,
            color: Colors.amber,
            size: size,
          ),
        );
      }),
    );
  }
}
