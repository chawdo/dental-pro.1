from rest_framework import serializers
from .models import Paciente, Cita, Doctor, HorarioDoctor, DientePaciente
from rest_framework.validators import UniqueValidator
from datetime import date,datetime,timedelta
from django.utils import timezone
from django.db.models import Sum
from .models import Material, MovimientoInventario, ReservaMaterial, Tratamiento

class HorarioDoctorSerializer(serializers.ModelSerializer):
    class Meta:
        model = HorarioDoctor
        fields = '__all__'


class DientePacienteSerializer(serializers.ModelSerializer):
    class Meta:
        model = DientePaciente
        fields = '__all__'


class DoctorSerializer(serializers.ModelSerializer):
    horarios = HorarioDoctorSerializer(many=True, read_only=True)

    class Meta:
        model = Doctor
        fields = '__all__'


class PacienteSerializer(serializers.ModelSerializer):
    dientes = DientePacienteSerializer(many=True, read_only=True)
    # 1. Definimos la cédula aquí, que es donde realmente pertenece
    cedula = serializers.CharField(
        max_length=15,
        validators=[UniqueValidator(queryset=Paciente.objects.all(), message="Esta cédula ya existe.")]
    )

    class Meta:
        model = Paciente
        fields = '__all__'

    # 2. La validación de letras debe estar AQUÍ
    def validate_cedula(self, value):
        cedula_str = str(value).strip()
        if not cedula_str.isdigit():
            raise serializers.ValidationError("La cédula debe contener solo números.")
        return cedula_str
    # --- VALIDACIÓN DE TELÉFONO ---
    def validate_telefono(self, value):
        tel_str = str(value).strip()

        # 1. Verificar que sean solo números
        if not tel_str.isdigit():
            raise serializers.ValidationError("El teléfono debe contener solo números, sin guiones ni espacios.")

        # 2. Verificar longitud (Opcional: 11 dígitos para Venezuela 0412, 0414, etc.)
        if len(tel_str) < 10:
            raise serializers.ValidationError("El número de teléfono es demasiado corto.")
        
        if len(tel_str) > 11:
            raise serializers.ValidationError("El número de teléfono es demasiado largo.")

        return tel_str
        

    
    def validate_nombre(self, value):
        # Quitamos los espacios para la verificación, pero permitimos que el nombre los tenga
        if not value.replace(" ", "").isalpha():
            raise serializers.ValidationError("El nombre solo debe contener letras.")
        return value
    
    def validate_fecha_nacimiento(self, value):
        if value > date.today():
            raise serializers.ValidationError("La fecha de nacimiento no puede ser una fecha futura.")
        return value

class CitaSerializer(serializers.ModelSerializer):
    paciente_nombre = serializers.ReadOnlyField(source='paciente.nombre')
    doctor_nombre = serializers.ReadOnlyField(source='doctor.nombre')
    estado_asistencia = serializers.ChoiceField(choices=Cita.ESTADO_ASISTENCIA_CHOICES, required=False)

    class Meta:
        model = Cita
        fields = '__all__'

    def validate(self, data):
        fecha_cita = data.get('fecha')
        hora_cita = data.get('hora')
        doctor = data.get('doctor')
        
        hoy = date.today()
        ahora = datetime.now().time()

        # Chequear si la cita es nueva, o si la fecha/hora están cambiando en una actualización
        fecha_cambiada = self.instance is None or self.instance.fecha != fecha_cita
        hora_cambiada = self.instance is None or self.instance.hora != hora_cita
        fecha_hora_cambiada = fecha_cambiada or hora_cambiada

        # 1. Validación de fecha pasada (Solo si es nueva cita o si cambia la fecha a una pasada)
        if fecha_cambiada and fecha_cita < hoy:
            raise serializers.ValidationError({
                "fecha": "No puedes programar una cita en un día que ya pasó."
            })

        # 2. Validación si es HOY (Solo si cambia fecha o hora)
        if fecha_hora_cambiada and fecha_cita == hoy:
            if hora_cita <= ahora:
                raise serializers.ValidationError({
                    "hora": "Para citas de hoy, la hora debe ser posterior a la actual."
                })
        
        # 3. Validación de choque (Se ejecuta para cualquier fecha)
        # El .exclude(id=...) evita errores al editar una cita ya existente
        existe_choque = Cita.objects.filter(
            doctor=doctor,
            fecha=fecha_cita,
            hora=hora_cita
        ).exclude(id=self.instance.id if self.instance else None).exists()

        if existe_choque:
            raise serializers.ValidationError({
                "hora": "Este doctor ya tiene una cita programada a esa hora."
            })

        # 4. Validar contra el Horario del Doctor (Nuevo sistema)
        if doctor and fecha_cita and hora_cita:
            dia_semana = fecha_cita.weekday()
            try:
                horario_doctor = HorarioDoctor.objects.get(doctor=doctor, dia_semana=dia_semana)
            except HorarioDoctor.DoesNotExist:
                raise serializers.ValidationError({
                    "fecha": f"El doctor no tiene horario configurado para este día."
                })

            if not horario_doctor.es_laborable:
                raise serializers.ValidationError({
                    "fecha": f"El doctor no labora este día."
                })

            # Calcular hora de fin de la cita
            duracion = data.get('duracion_estimada', 30)
            if self.instance and 'duracion_estimada' not in data:
                 duracion = self.instance.duracion_estimada
            hora_fin_cita = (datetime.combine(date.today(), hora_cita) + timedelta(minutes=duracion)).time()

            # Validar que esté dentro de la jornada laboral
            if hora_cita < horario_doctor.hora_inicio or hora_fin_cita > horario_doctor.hora_fin:
                raise serializers.ValidationError({
                    "hora": f"El horario de la cita ({hora_cita.strftime('%H:%M')} a {hora_fin_cita.strftime('%H:%M')}) excede el horario laboral del doctor ({horario_doctor.hora_inicio.strftime('%H:%M')} a {horario_doctor.hora_fin.strftime('%H:%M')})."
                })

            # Validar que no se cruce con el descanso
            if horario_doctor.hora_break_inicio and horario_doctor.hora_break_fin:
                 # Check for intersection between [hora_cita, hora_fin_cita] and [hora_break_inicio, hora_break_fin]
                 # Intervalos se cruzan si (inicio_A < fin_B) y (inicio_B < fin_A)
                 if hora_cita < horario_doctor.hora_break_fin and horario_doctor.hora_break_inicio < hora_fin_cita:
                      raise serializers.ValidationError({
                          "hora": f"El horario de la cita se cruza con el descanso del doctor ({horario_doctor.hora_break_inicio.strftime('%H:%M')} a {horario_doctor.hora_break_fin.strftime('%H:%M')})."
                      })

        # --- ESTA ES LA CLAVE DE LA SOLUCIÓN ---
        # Debe estar al mismo nivel que los "if" principales (4 espacios)
        return data
    


class MaterialSerializer(serializers.ModelSerializer):
    # Campos calculados al vuelo (no existen físicamente en la base de datos)
    cantidad_reservada = serializers.SerializerMethodField()
    cantidad_disponible = serializers.SerializerMethodField()

    class Meta:
        model = Material
        fields = ['id', 'nombre', 'unidad_medida', 'stock_total', 'cantidad_reservada', 'cantidad_disponible']

    def get_cantidad_reservada(self, obj):
        # Sumamos todas las cantidades de la tabla ReservaMaterial asociadas a este material
        reserva = obj.reservas.aggregate(total=Sum('cantidad'))['total']
        return reserva if reserva is not None else 0

    def get_cantidad_disponible(self, obj):
        # Disponible = Total físico - Lo que está reservado para citas
        reservado = self.get_cantidad_reservada(obj)
        return obj.stock_total - reservado


class MovimientoInventarioSerializer(serializers.ModelSerializer):
    # Agregamos estos campos de solo lectura para que a React le llegue el nombre
    # del material y del usuario, en lugar de solo un ID numérico aburrido.
    material_nombre = serializers.ReadOnlyField(source='material.nombre')
    usuario_nombre = serializers.ReadOnlyField(source='usuario.username')

    class Meta:
        model = MovimientoInventario
        fields = ['id', 'material', 'material_nombre', 'fecha', 'tipo', 'cantidad', 'nota', 'usuario', 'usuario_nombre']


class ReservaMaterialSerializer(serializers.ModelSerializer):
    material_nombre = serializers.ReadOnlyField(source='material.nombre')
    
    class Meta:
        model = ReservaMaterial
        fields = ['id', 'cita', 'material', 'material_nombre', 'cantidad']


class TratamientoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tratamiento
        fields = ['id', 'nombre', 'precio', 'duracion', 'precio_adicional', 'duracion_adicional', 'receta_adicional']