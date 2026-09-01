from django.apps import AppConfig

class CitasConfig(AppConfig):
    name = 'citas'

    def ready(self):
        import citas.signals
