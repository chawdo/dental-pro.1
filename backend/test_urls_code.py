import json

def generate_urls_patch():
    with open('backend/citas/urls.py', 'r') as f:
        content = f.read()

    search_block = """from .views import PacienteViewSet, CitaViewSet, DoctorViewSet, HorarioDoctorViewSet, DientePacienteViewSet, GenerarDiagnosticoIAView"""

    replace_block = """from .views import PacienteViewSet, CitaViewSet, DoctorViewSet, HorarioDoctorViewSet, DientePacienteViewSet, GenerarDiagnosticoIAView, ChatCopilotoIAView"""

    content = content.replace(search_block, replace_block)

    search_block2 = """urlpatterns = [
    path('ia/diagnostico/', GenerarDiagnosticoIAView.as_view(), name='ia-diagnostico'),"""

    replace_block2 = """urlpatterns = [
    path('ia/diagnostico/', GenerarDiagnosticoIAView.as_view(), name='ia-diagnostico'),
    path('ia/copiloto/', ChatCopilotoIAView.as_view(), name='ia-copiloto'),"""

    with open('backend/test_urls_patch.py', 'w') as f:
        f.write(content.replace(search_block2, replace_block2))

generate_urls_patch()
