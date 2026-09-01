from django.db import models
from django.contrib.auth.models import User
from simple_history.models import HistoricalRecords


class Doctor(models.Model):
    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    especialidad = models.CharField(max_length=100)
    foto = models.ImageField(upload_to='doctores/fotos/', blank=True, null=True)

    def __str__(self):
        return f"Dr. {self.nombre} {self.apellido}"


class HorarioDoctor(models.Model):
    DIA_CHOICES = [
        (0, 'Lunes'),
        (1, 'Martes'),
        (2, 'Miércoles'),
        (3, 'Jueves'),
        (4, 'Viernes'),
        (5, 'Sábado'),
        (6, 'Domingo'),
    ]
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='horarios')
    dia_semana = models.IntegerField(choices=DIA_CHOICES)
    hora_inicio = models.TimeField()
    hora_fin = models.TimeField()
    hora_break_inicio = models.TimeField(null=True, blank=True)
    hora_break_fin = models.TimeField(null=True, blank=True)
    es_laborable = models.BooleanField(default=True)

    class Meta:
        unique_together = ['doctor', 'dia_semana']

    def __str__(self):
        return f"{self.doctor} - Día {self.dia_semana} ({self.hora_inicio} a {self.hora_fin})"


class Paciente(models.Model):
    SEXO_CHOICES = [
        ('M', 'Masculino'),
        ('F', 'Femenino'),
        ('Otro', 'Otro'),
    ]
    SANGRE_CHOICES = [
        ('A+', 'A+'),
        ('A-', 'A-'),
        ('O+', 'O+'),
        ('O-', 'O-'),
        ('B+', 'B+'),
        ('B-', 'B-'),
        ('AB+', 'AB+'),
        ('AB-', 'AB-'),
    ]

    nombre = models.CharField(max_length=100)
    apellido = models.CharField(max_length=100)
    cedula = models.CharField(max_length=20, unique=True) # Para que no se repitan
    telefono = models.CharField(max_length=20)
    email = models.EmailField(blank=True, null=True) # Puede quedar vacío
    fecha_nacimiento = models.DateField()
    fecha_registro = models.DateTimeField(auto_now_add=True) # Se pone sola al crear

    sexo = models.CharField(max_length=10, choices=SEXO_CHOICES, blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    tipo_sangre = models.CharField(max_length=3, choices=SANGRE_CHOICES, blank=True, null=True)
    foto = models.ImageField(upload_to='pacientes/fotos/', blank=True, null=True)

    history = HistoricalRecords()

    def __str__(self):

        return f"{self.nombre} {self.apellido}"


class DientePaciente(models.Model):
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='dientes')
    numero_diente = models.IntegerField()
    datos_clinicos = models.JSONField(default=dict, blank=True, null=True)
    tratamiento_recomendado = models.CharField(max_length=200, blank=True, null=True)
    descripcion_general = models.TextField(blank=True, null=True)
    notas = models.TextField(blank=True, null=True)

    history = HistoricalRecords()

    def __str__(self):
        return f"Diente {self.numero_diente} de {self.paciente}"


class Cita(models.Model):
    ESTADOS = [
        ('programada', 'Programada'),
        ('completada', 'Completada'),
        ('cancelada', 'Cancelada'),
    ]
    ESTADO_ASISTENCIA_CHOICES = [
        ('Pendiente', 'Pendiente'),
        ('Completado', 'Completado'),
        ('Cancelado', 'Cancelado'),
        ('No Asistió', 'No Asistió'),
    ]
    # Relaciones
    paciente = models.ForeignKey(Paciente, on_delete=models.CASCADE, related_name='citas')
    # AGREGA ESTA LÍNEA QUE FALTA:
    doctor = models.ForeignKey(Doctor, on_delete=models.CASCADE, related_name='citas', null=True, blank=True)
    # En tu modelo Cita, cambia 'motivo' por 'tratamiento':
    tratamiento = models.ForeignKey('Tratamiento', on_delete=models.SET_NULL, null=True, blank=True, help_text="Tratamiento principal de la cita")



    # Otros campos
    fecha = models.DateField()
    hora = models.TimeField()
    # En tu modelo Cita, cambia 'motivo' por 'tratamiento':
    tratamiento = models.ForeignKey('Tratamiento', on_delete=models.SET_NULL, null=True, blank=True, help_text="Tratamiento principal de la cita")
    dientes_tratados = models.JSONField(default=list, blank=True)
    estado = models.CharField(max_length=20, choices=ESTADOS, default='programada')
    notas_medicas = models.TextField(blank=True, null=True) # <-- Verifica que termine en 's'
    
    # Campos financieros
    costo_total = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    monto_pagado_adelantado = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    monto_pagado_dia = models.DecimalField(max_digits=10, decimal_places=2, default=0.00)
    metodo_pago = models.CharField(max_length=100, default="Efectivo")
    duracion_estimada = models.IntegerField(default=30)
    estado_asistencia = models.CharField(max_length=20, choices=ESTADO_ASISTENCIA_CHOICES, default='Pendiente')

    history = HistoricalRecords()

    def clean(self):
        from django.core.exceptions import ValidationError
        from datetime import datetime, timedelta, date, time

        if not self.doctor or not self.fecha or not self.hora:
            return

        # Ensure fecha and hora are objects
        c_fecha = self.fecha
        if isinstance(c_fecha, str):
            c_fecha = datetime.strptime(c_fecha, '%Y-%m-%d').date()

        c_hora = self.hora
        if isinstance(c_hora, str):
            # Check length to handle HH:MM vs HH:MM:SS
            if len(c_hora) == 5:
                c_hora = datetime.strptime(c_hora, '%H:%M').time()
            else:
                c_hora = datetime.strptime(c_hora, '%H:%M:%S').time()

        # Calcular duracion
        duracion = self.duracion_estimada
        if self.tratamiento:
            duracion = self.tratamiento.duracion or 30
            if self.dientes_tratados:
                duracion += (len(self.dientes_tratados) - 1) * (self.tratamiento.duracion_adicional or 0)

        hora_inicio_dt = datetime.combine(c_fecha, c_hora)
        hora_fin_dt = hora_inicio_dt + timedelta(minutes=duracion)

        # Validar con HorarioDoctor
        dia_semana = c_fecha.weekday()
        horario = HorarioDoctor.objects.filter(doctor=self.doctor, dia_semana=dia_semana).first()

        if not horario or not horario.es_laborable:
            raise ValidationError("El doctor no labora en esta fecha.")

        hora_fin_horario = datetime.combine(c_fecha, horario.hora_fin)
        if hora_fin_dt > hora_fin_horario:
            raise ValidationError("La duración del tratamiento excede el horario laboral del doctor.")

        # Verificar cruce con break
        if horario.hora_break_inicio and horario.hora_break_fin:
            break_ini = datetime.combine(c_fecha, horario.hora_break_inicio)
            break_fin = datetime.combine(c_fecha, horario.hora_break_fin)
            if max(hora_inicio_dt, break_ini) < min(hora_fin_dt, break_fin):
                raise ValidationError("El tratamiento choca con la hora de descanso del doctor.")

        # Verificar cruce con otras citas
        citas_existentes = Cita.objects.filter(
            doctor=self.doctor,
            fecha=c_fecha
        ).exclude(estado_asistencia='Cancelado')

        if self.id:
            citas_existentes = citas_existentes.exclude(id=self.id)

        for cita in citas_existentes:
            if not cita.hora: continue
            c_duracion = cita.duracion_estimada
            if cita.tratamiento:
                c_duracion = cita.tratamiento.duracion or 30
                if cita.dientes_tratados:
                    c_duracion += (len(cita.dientes_tratados) - 1) * (cita.tratamiento.duracion_adicional or 0)

            c_ini = datetime.combine(cita.fecha, cita.hora)
            c_fin = c_ini + timedelta(minutes=c_duracion)

            if max(hora_inicio_dt, c_ini) < min(hora_fin_dt, c_fin):
                raise ValidationError("El tratamiento choca con otra cita programada.")

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"Cita de {self.paciente} con {self.doctor} el {self.fecha}"
    

# --- SISTEMA DE INVENTARIO ---

class Material(models.Model):
    UNIDADES_CHOICES = [
        ('Unidades', 'Unidades'),
        ('Pares', 'Pares'),
        ('Dosis_Carpule', 'Dosis (Carpule)'),
        ('Dosis_Spray', 'Dosis (Spray)'),
        ('Tubos', 'Tubos'),
        ('Cajas', 'Cajas'),
    ]
    
    nombre = models.CharField(max_length=150, unique=True, help_text="Ej: Guantes de látex, Anestesia (Carpule), Bisturí...")
    unidad_medida = models.CharField(max_length=20, choices=UNIDADES_CHOICES, default='Unidades')
    stock_total = models.PositiveIntegerField(default=0, help_text="Cantidad total física en el consultorio")

    # Aquí calcularemos lo disponible "al vuelo" más adelante en el serializador
    # Disponible = stock_total - (Suma de reservas activas)

    def __str__(self):
        return f"{self.nombre} - Stock: {self.stock_total}"


class MovimientoInventario(models.Model):
    TIPO_CHOICES = [
        ('Entrada', 'Entrada (Agregar)'),
        ('Salida', 'Salida (Quitar/Ajuste)'),
    ]
    
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='movimientos')
    fecha = models.DateTimeField(auto_now_add=True)
    tipo = models.CharField(max_length=10, choices=TIPO_CHOICES)
    cantidad = models.PositiveIntegerField()
    nota = models.TextField(help_text="¿Por qué se hace este movimiento? Ej: Compra de insumos, material dañado...")
    
    # Registra quién hizo el movimiento
    usuario = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True)

    def __str__(self):

        return f"[{self.tipo}] {self.cantidad} {self.material.unidad_medida} de {self.material.nombre}"
    
    def save(self, *args, **kwargs):
        # Esta magia hace que al guardar un movimiento, se actualice el stock del material
        if not self.pk: # Solo lo hacemos si es un movimiento NUEVO
            if self.tipo == 'Entrada':
                self.material.stock_total += self.cantidad
            elif self.tipo == 'Salida':
                # Evitamos que el stock quede en números negativos
                if self.material.stock_total < self.cantidad:
                    raise ValueError("No hay suficiente stock para esta salida.")
                self.material.stock_total -= self.cantidad
            
            # Guardamos el material con su nuevo stock
            self.material.save()
            
        super().save(*args, **kwargs)


class ReservaMaterial(models.Model):
    # Relacionamos la reserva directamente con la cita
    # IMPORTANTE: Asegúrate de que 'Cita' esté escrito exactamente igual que el nombre de tu modelo de citas
    cita = models.ForeignKey('Cita', on_delete=models.CASCADE, related_name='materiales_reservados')
    material = models.ForeignKey(Material, on_delete=models.CASCADE, related_name='reservas')
    cantidad = models.PositiveIntegerField()

    def __str__(self):
        return f"Reserva de {self.cantidad} {self.material.nombre} para Cita #{self.cita.id}"



class Tratamiento(models.Model):
    nombre = models.CharField(max_length=150, unique=True)
    precio = models.DecimalField(max_digits=10, decimal_places=2)
    duracion = models.PositiveIntegerField(help_text="Duración en minutos")
    precio_adicional = models.DecimalField(max_digits=10, decimal_places=2, default=0.00, help_text="Costo por cada diente extra después del primero")
    duracion_adicional = models.IntegerField(default=0, help_text="Minutos extra por cada diente a partir del segundo")
    receta_adicional = models.TextField(blank=True, null=True, help_text="Información extra para la receta si hay múltiples dientes")

    def __str__(self):
        return self.nombre


class RecetaTratamiento(models.Model):
    tratamiento = models.ForeignKey(Tratamiento, on_delete=models.CASCADE, related_name='materiales_requeridos')
    material = models.ForeignKey(Material, on_delete=models.CASCADE)
    cantidad = models.PositiveIntegerField(help_text="Cantidad de este material que se gasta en el tratamiento")

    class Meta:
        # Evita que agreguemos dos veces el mismo material a una sola receta
        unique_together = ('tratamiento', 'material')

    def __str__(self):
        return f"{self.cantidad} {self.material.unidad_medida} de {self.material.nombre} para {self.tratamiento.nombre}"