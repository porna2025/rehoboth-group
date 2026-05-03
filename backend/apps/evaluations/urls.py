from django.urls import path
from . import views

urlpatterns = [
    path('', views.creer_evaluation, name='creer_evaluation'),
    path('technicien/<uuid:technicien_id>/', views.evaluations_technicien, name='evals_technicien'),
]
