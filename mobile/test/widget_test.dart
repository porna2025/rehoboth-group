import 'package:flutter_test/flutter_test.dart';

import 'package:mobile/main.dart';

void main() {
  testWidgets('affiche le splash Rehoboth au demarrage', (
    WidgetTester tester,
  ) async {
    await tester.pumpWidget(const RehobothApp());

    expect(find.text('Rehoboth Groupe'), findsOneWidget);
    expect(find.text('Connexion'), findsNothing);
  });
}
