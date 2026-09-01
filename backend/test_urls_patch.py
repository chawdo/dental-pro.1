from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PacienteViewSet, CitaViewSet, DoctorViewSet, HorarioDoctorViewSet, DientePacienteViewSet, GenerarDiagnosticoIAView, ChatCopilotoIAView
from . import views


# El router crea automáticamente las URLs para nosotros

router = DefaultRouter()
router.register(r'pacientes', PacienteViewSet, basename='paciente')
router.register(r'citas', CitaViewSet, basename='cita')
router.register(r'doctors', DoctorViewSet, basename='doctor')
router.register(r'horarios-doctor', HorarioDoctorViewSet, basename='horario-doctor')
router.register(r'dientes-paciente', DientePacienteViewSet, basename='diente-paciente')

router.register(r'materiales', views.MaterialViewSet)
router.register(r'movimientos-inventario', views.MovimientoInventarioViewSet)
router.register(r'reservas-material', views.ReservaMaterialViewSet)
router.register(r'tratamientos', views.TratamientoViewSet)

urlpatterns = [
    path('ia/diagnostico/', GenerarDiagnosticoIAView.as_view(), name='ia-diagnostico'),
    path('ia/copiloto/', ChatCopilotoIAView.as_view(), name='ia-copiloto'),
    path('', include(router.urls)),
]