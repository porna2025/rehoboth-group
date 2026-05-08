from django.contrib.admin.sites import AdminSite
from django.apps import apps
from django.test import RequestFactory, TestCase, override_settings
from rest_framework.test import APIClient

from .admin import AdministrateurAdmin, ClientAdmin, TechnicienAdmin, UserAdmin
from .models import Administrateur, Client, Technicien, User


class AdminComptesTests(TestCase):
	@classmethod
	def setUpTestData(cls):
		categorie_model = apps.get_model('techniciens', 'Categorie')
		profil_technicien_model = apps.get_model('techniciens', 'ProfilTechnicien')
		cls.superuser = User.objects.create_superuser(
			email='admin@example.com',
			password='adminpass123',
			nom='Admin',
			prenom='Root',
		)
		cls.admin_user = User.objects.create_user(
			email='manager@example.com',
			password='managerpass123',
			nom='Manager',
			prenom='Plateforme',
			role=User.ADMIN,
			is_staff=True,
		)
		cls.client_user = User.objects.create_user(
			email='client@example.com',
			password='clientpass123',
			nom='Client',
			prenom='Test',
			role=User.CLIENT,
			est_actif=False,
			is_active=False,
			est_verifie=False,
		)
		cls.technicien_user = User.objects.create_user(
			email='technicien@example.com',
			password='techpass123',
			nom='Technicien',
			prenom='Test',
			role=User.TECHNICIEN,
			est_actif=False,
			is_active=False,
		)
		cls.categorie = categorie_model.objects.create(nom='Plomberie')
		cls.profil = profil_technicien_model.objects.create(
			user=cls.technicien_user,
			categorie=cls.categorie,
			specialite='Plombier',
			statut_validation=profil_technicien_model.EN_ATTENTE,
		)

	def setUp(self):
		self.factory = RequestFactory()
		self.site = AdminSite()

	def _build_request(self):
		request = self.factory.post('/admin/')
		request.user = self.superuser
		return request

	def test_client_admin_queryset_ne_contient_que_les_clients(self):
		admin_instance = ClientAdmin(Client, self.site)
		queryset = admin_instance.get_queryset(self._build_request())

		self.assertEqual(queryset.count(), 1)
		self.assertEqual(queryset.first().pk, self.client_user.pk)

	def test_client_admin_valide_le_compte_client(self):
		admin_instance = ClientAdmin(Client, self.site)
		admin_instance.message_user = lambda *args, **kwargs: None

		admin_instance.valider_comptes(
			self._build_request(),
			Client.objects.filter(pk=self.client_user.pk),
		)

		self.client_user.refresh_from_db()
		self.assertTrue(self.client_user.est_verifie)
		self.assertTrue(self.client_user.est_actif)
		self.assertTrue(self.client_user.is_active)

	def test_technicien_admin_valide_le_compte_et_le_profil(self):
		admin_instance = TechnicienAdmin(Technicien, self.site)
		admin_instance.message_user = lambda *args, **kwargs: None

		admin_instance.valider_comptes(
			self._build_request(),
			Technicien.objects.filter(pk=self.technicien_user.pk),
		)

		self.technicien_user.refresh_from_db()
		self.profil.refresh_from_db()

		self.assertTrue(self.technicien_user.est_actif)
		self.assertTrue(self.technicien_user.is_active)
		self.assertTrue(self.technicien_user.est_verifie)
		self.assertEqual(
			self.profil.statut_validation,
			apps.get_model('techniciens', 'ProfilTechnicien').VALIDE,
		)

	def test_client_admin_suspend_et_supprime_le_compte(self):
		admin_instance = ClientAdmin(Client, self.site)
		admin_instance.message_user = lambda *args, **kwargs: None
		request = self._build_request()

		admin_instance.suspendre_comptes(request, Client.objects.filter(pk=self.client_user.pk))
		self.client_user.refresh_from_db()
		self.assertFalse(self.client_user.est_actif)
		self.assertFalse(self.client_user.is_active)

		admin_instance.supprimer_comptes(request, Client.objects.filter(pk=self.client_user.pk))
		self.assertFalse(User.objects.filter(pk=self.client_user.pk).exists())

	def test_user_admin_est_cache_de_l_index(self):
		admin_instance = UserAdmin(User, self.site)
		perms = admin_instance.get_model_perms(self._build_request())

		self.assertEqual(perms, {})

	def test_administrateur_admin_queryset_ne_contient_que_les_admins(self):
		admin_instance = AdministrateurAdmin(Administrateur, self.site)
		queryset = admin_instance.get_queryset(self._build_request())

		self.assertEqual(queryset.count(), 2)
		self.assertEqual(
			set(queryset.values_list('email', flat=True)),
			{'admin@example.com', 'manager@example.com'},
		)


@override_settings(DEBUG=True)
class AuthFlowsTests(TestCase):
	def setUp(self):
		self.client = APIClient()
		self.user = User.objects.create_user(
			email='otp@example.com',
			password='securepass123',
			nom='Otp',
			prenom='User',
			role=User.CLIENT,
			est_actif=True,
			is_active=True,
		)

	def test_connexion_retourne_un_code_otp_de_secours_en_mode_debug(self):
		response = self.client.post(
			'/api/v1/auth/connexion/',
			{'email': self.user.email, 'password': 'securepass123'},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		self.assertTrue(response.data['requires_2fa'])
		self.assertEqual(response.data['email'], self.user.email)
		self.assertIn('debug_otp_code', response.data)
		self.assertTrue(response.data['otp_session_token'])

		self.user.refresh_from_db()
		self.assertEqual(self.user.otp_code, response.data['debug_otp_code'])
		self.assertEqual(self.user.otp_session_token, response.data['otp_session_token'])

	def test_reset_mot_de_passe_retourne_un_code_de_secours_en_mode_debug(self):
		response = self.client.post(
			'/api/v1/auth/mot-de-passe-oublie/',
			{'email': self.user.email},
			format='json',
		)

		self.assertEqual(response.status_code, 200)
		self.assertEqual(response.data['email'], self.user.email)
		self.assertIn('debug_reset_code', response.data)
		self.assertTrue(response.data['reset_token'])

		self.user.refresh_from_db()
		self.assertEqual(self.user.password_reset_code, response.data['debug_reset_code'])
		self.assertEqual(self.user.password_reset_token, response.data['reset_token'])
