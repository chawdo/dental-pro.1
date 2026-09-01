from django.contrib import admin
from .models import Paciente, Material, MovimientoInventario, ReservaMaterial,Tratamiento, RecetaTratamiento

# Configuración para que el panel se vea más profesional
class PacienteAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'apellido', 'cedula', 'telefono') # Columnas que verás en la lista
    search_fields = ('nombre', 'apellido', 'cedula')            # Barra de búsqueda
    list_filter = ('fecha_registro',)                           # Filtros laterales

admin.site.register(Paciente, PacienteAdmin)

from .models import Cita # Asegúrate de importar Cita

@admin.register(Cita)
class CitaAdmin(admin.ModelAdmin):
    list_display = ('paciente', 'fecha', 'hora', 'estado')
    list_filter = ('estado', 'fecha')
    search_fields = ('paciente__nombre', 'paciente__apellido') # Busca por nombre del paciente vinculado


from .models import Doctor, HorarioDoctor # Asegúrate de importar Doctor

class HorarioDoctorInline(admin.TabularInline):
    model = HorarioDoctor
    extra = 7

@admin.register(Doctor)
class DoctorAdmin(admin.ModelAdmin):
    inlines = [HorarioDoctorInline]


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'stock_total', 'unidad_medida')
    search_fields = ('nombre',)

@admin.register(MovimientoInventario)
class MovimientoInventarioAdmin(admin.ModelAdmin):
    list_display = ('material', 'tipo', 'cantidad', 'fecha', 'usuario')
    list_filter = ('tipo', 'fecha')
    search_fields = ('material__nombre', 'nota')

@admin.register(ReservaMaterial)
class ReservaMaterialAdmin(admin.ModelAdmin):
    list_display = ('material', 'cantidad', 'cita')


class RecetaTratamientoInline(admin.TabularInline):
    model = RecetaTratamiento
    extra = 1 

@admin.register(Tratamiento)
class TratamientoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'precio', 'duracion')
    inlines = [RecetaTratamientoInline] # Conecta la receta aquí