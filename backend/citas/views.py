from rest_framework import viewsets, permissions
from rest_framework.views import APIView
from rest_framework.response import Response
from .models import Paciente, Cita, Doctor, HorarioDoctor, DientePaciente, Material, MovimientoInventario, ReservaMaterial, Tratamiento
from .serializers import PacienteSerializer, CitaSerializer, DoctorSerializer, HorarioDoctorSerializer, DientePacienteSerializer, MaterialSerializer, MovimientoInventarioSerializer, ReservaMaterialSerializer, TratamientoSerializer
from rest_framework.permissions import IsAuthenticated
from django.db.models import Sum
from rest_framework.exceptions import ValidationError
from django.utils import timezone
from google import genai
import os
import json


from datetime import date, timedelta, datetime
from google.genai import types
from datetime import time
from django.db.models import Q

def obtener_estado_inventario() -> dict:
    """Revisa los materiales, su stock actual y cantidad reservada. Devuelve alertas de stock bajo."""
    materiales = Material.objects.all()
    estado = []
    alertas = []
    for m in materiales:
        reservas = m.reservas.aggregate(total=Sum('cantidad'))['total'] or 0
        disponible = m.stock_total - reservas
        info = {"material": m.nombre, "disponible": disponible, "reservado": reservas}
        estado.append(info)
        if disponible < 10:
            alertas.append(f"Stock bajo de {m.nombre}: {disponible} disponibles")
    return {"estado_inventario": estado, "alertas": alertas}

def consultar_agenda(fecha: str, doctor_id: int | None = None) -> dict:
    """Devuelve las citas de un día (YYYY-MM-DD) y también calcula los huecos libres basándose en el horario de los doctores. Si doctor_id es proporcionado, devuelve las citas y huecos de ese doctor. Si doctor_id no se proporciona, devuelve información general."""
    try:
        fecha_obj = datetime.strptime(fecha, '%Y-%m-%d').date()
    except ValueError:
        return {"error": "Formato de fecha inválido. Usa YYYY-MM-DD."}

    dia_semana = fecha_obj.weekday()

    citas_query = Cita.objects.filter(fecha=fecha)
    if doctor_id:
        citas_query = citas_query.filter(doctor_id=doctor_id)
        doctores = Doctor.objects.filter(id=doctor_id)
    else:
        doctores = Doctor.objects.all()

    citas = []
    for c in citas_query:
        citas.append({
            "hora": c.hora.strftime('%H:%M') if c.hora else "",
            "paciente": f"{c.paciente.nombre} {c.paciente.apellido}",
            "doctor": f"{c.doctor.nombre} {c.doctor.apellido}" if c.doctor else "Sin asignar",
            "duracion": c.duracion_estimada,
            "estado": c.estado_asistencia
        })

    huecos_libres = []
    # Definimos el tamaño del bloque para buscar huecos libres (30 minutos)
    intervalo_minutos = 30

    for doctor in doctores:
        try:
            horario = HorarioDoctor.objects.get(doctor=doctor, dia_semana=dia_semana)
        except HorarioDoctor.DoesNotExist:
            continue # Este doctor no tiene horario hoy, no generamos huecos para él

        if not horario.es_laborable:
            continue

        citas_del_doctor = [c for c in citas_query if c.doctor_id == doctor.id and c.estado_asistencia != 'Cancelado']

        hora_actual = datetime.combine(fecha_obj, horario.hora_inicio)
        hora_fin_laboral = datetime.combine(fecha_obj, horario.hora_fin)

        while hora_actual + timedelta(minutes=intervalo_minutos) <= hora_fin_laboral:
            hora_fin_bloque = hora_actual + timedelta(minutes=intervalo_minutos)
            bloque_libre = True

            # Chequear si está dentro del break
            if horario.hora_break_inicio and horario.hora_break_fin:
                break_inicio = datetime.combine(fecha_obj, horario.hora_break_inicio)
                break_fin = datetime.combine(fecha_obj, horario.hora_break_fin)
                if hora_actual < break_fin and break_inicio < hora_fin_bloque:
                    bloque_libre = False

            # Chequear si se cruza con una cita existente
            if bloque_libre:
                for c in citas_del_doctor:
                    if c.hora:
                        cita_inicio = datetime.combine(fecha_obj, c.hora)
                        cita_fin = cita_inicio + timedelta(minutes=c.duracion_estimada)
                        if hora_actual < cita_fin and cita_inicio < hora_fin_bloque:
                            bloque_libre = False
                            break

            if bloque_libre:
                huecos_libres.append({
                    "doctor": f"{doctor.nombre} {doctor.apellido}",
                    "hora_inicio": hora_actual.time().strftime('%H:%M'),
                    "hora_fin": hora_fin_bloque.time().strftime('%H:%M')
                })

            hora_actual += timedelta(minutes=intervalo_minutos)

    return {
        "fecha": fecha,
        "citas_agendadas": citas,
        "huecos_disponibles_30min": huecos_libres
    }

def obtener_metricas_financieras(dias: int) -> dict:
    """Calcula ingresos, tratamientos más vendidos y citas canceladas en un rango de días hacia atrás."""
    fecha_inicio = date.today() - timedelta(days=dias)
    citas = Cita.objects.filter(fecha__gte=fecha_inicio)

    ingresos = sum(c.costo_total for c in citas if c.estado_asistencia == 'Completado')
    canceladas = citas.filter(estado_asistencia='Cancelado').count()

    tratamientos_dict = {}
    for c in citas:
        if c.tratamiento:
            nombre = c.tratamiento.nombre
            tratamientos_dict[nombre] = tratamientos_dict.get(nombre, 0) + 1

    return {
        "ingresos_totales": float(ingresos),
        "citas_canceladas": canceladas,
        "tratamientos_vendidos": tratamientos_dict,
        "dias_analizados": dias
    }

def consultar_precios_tratamientos() -> dict:
    """Devuelve el catálogo de servicios y costos."""
    tratamientos = Tratamiento.objects.all()
    catalogo = []
    for t in tratamientos:
        catalogo.append({
            "tratamiento": t.nombre,
            "precio_base": float(t.precio),
            "precio_adicional_por_diente": float(t.precio_adicional)
        })
    return {"catalogo": catalogo}

def consultar_historial_paciente(nombre_paciente: str) -> dict:
    """Busca un paciente por nombre o apellido y devuelve su información básica, sus próximas citas y el estado actual de su odontograma (los dientes afectados). Útil para ver el historial clínico del paciente antes de proponer tratamientos."""
    pacientes = Paciente.objects.filter(
        Q(nombre__icontains=nombre_paciente) | Q(apellido__icontains=nombre_paciente)
    )

    if not pacientes.exists():
        return {"error": f"No se encontró ningún paciente que coincida con '{nombre_paciente}'."}

    resultados = []
    for p in pacientes:
        # Próximas citas (estado Pendiente)
        citas = Cita.objects.filter(paciente=p, estado_asistencia='Pendiente').order_by('fecha', 'hora')
        proximas_citas = [{
            "fecha": c.fecha.strftime('%Y-%m-%d') if c.fecha else "",
            "hora": c.hora.strftime('%H:%M') if c.hora else "",
            "tratamiento": c.tratamiento.nombre if c.tratamiento else "Sin especificar"
        } for c in citas]

        # Odontograma
        dientes = DientePaciente.objects.filter(paciente=p)
        odontograma = [{
            "diente": d.numero_diente,
            "datos_clinicos": d.datos_clinicos,
            "tratamiento_recomendado": d.tratamiento_recomendado,
            "notas": d.notas
        } for d in dientes]

        resultados.append({
            "paciente_id": p.id,
            "nombre_completo": f"{p.nombre} {p.apellido}",
            "telefono": p.telefono,
            "proximas_citas": proximas_citas,
            "odontograma": odontograma
        })

    return {"resultados": resultados}


class ChatCopilotoIAView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            mensaje = request.data.get('mensaje')
            if not mensaje:
                return Response({"error": "No se proporcionó un mensaje."}, status=400)

            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                return Response({"error": "API key de Gemini no configurada."}, status=500)

            client = genai.Client(api_key=api_key)

            tools = [
                obtener_estado_inventario,
                consultar_agenda,
                obtener_metricas_financieras,
                consultar_precios_tratamientos,
                consultar_historial_paciente
            ]

            fecha_actual_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            system_instruction = f"Eres el Asistente Experto del Centro Odontológico Dental Pro. La fecha y hora de hoy es {fecha_actual_str}. Tienes herramientas para consultar la base de datos en tiempo real. Si el usuario pregunta algo sobre la clínica, USA LAS HERRAMIENTAS para buscar la información exacta antes de responder. Sé proactivo, si te preguntan por el inventario y hay poco stock, sugiere comprar."

            # Initialize chat
            chat = client.chats.create(
                model='gemini-2.5-flash',
                config=types.GenerateContentConfig(
                    tools=tools,
                    system_instruction=system_instruction,
                    temperature=0.2
                )
            )

            # Map function names to actual functions for dynamic calling
            function_map = {
                "obtener_estado_inventario": obtener_estado_inventario,
                "consultar_agenda": consultar_agenda,
                "obtener_metricas_financieras": obtener_metricas_financieras,
                "consultar_precios_tratamientos": consultar_precios_tratamientos,
                "consultar_historial_paciente": consultar_historial_paciente
            }

            # Send initial message
            response = chat.send_message(mensaje)

            # Tool loop execution
            # Gemini might return function calls instead of text
            while response.function_calls:
                function_responses = []
                for fc in response.function_calls:
                    func_name = fc.name
                    args = fc.args if fc.args else {}

                    if func_name in function_map:
                        try:
                            # Call the python function
                            result = function_map[func_name](**args)

                            # Create function response part
                            func_resp_part = types.Part.from_function_response(
                                name=func_name,
                                response={"result": result}
                            )
                            function_responses.append(func_resp_part)
                        except Exception as e:
                            # If function fails, let the model know
                            err_resp = types.Part.from_function_response(
                                name=func_name,
                                response={"error": str(e)}
                            )
                            function_responses.append(err_resp)

                if function_responses:
                    # Send function responses back to the model
                    response = chat.send_message(function_responses)
                else:
                    break

            return Response({"respuesta": response.text.strip()}, status=200)

        except Exception as e:
            print(f"Error de Gemini Copiloto: {str(e)}")
            return Response({"error": str(e)}, status=500)


class GenerarDiagnosticoIAView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        try:
            datos_dentales = request.data.get('datos_clinicos')
            if not datos_dentales:
                return Response({"error": "No se proporcionaron datos clínicos."}, status=400)

            print("Buscando API KEY...")
            api_key = os.environ.get('GEMINI_API_KEY')
            if not api_key:
                return Response({"error": "API key de Gemini no configurada."}, status=500)

            client = genai.Client(api_key=api_key)

            prompt = f"Actúa como un odontólogo experto. Basado en el siguiente estado dental del paciente {json.dumps(datos_dentales)}, redacta una sugerencia de tratamiento profesional, breve y directa (máximo 3 líneas). No des saludos ni advertencias, solo el diagnóstico y tratamiento."

            response = client.models.generate_content(
                model='gemini-2.5-flash',
                contents=prompt
            )

            return Response({"diagnostico": response.text.strip()}, status=200)

        except Exception as e:
            print(f"Error de Gemini: {str(e)}")
            return Response({"error": str(e)}, status=500)


class HorarioDoctorViewSet(viewsets.ModelViewSet):
    queryset = HorarioDoctor.objects.select_related('doctor').all()
    serializer_class = HorarioDoctorSerializer
    permission_classes = [permissions.IsAuthenticated]


class DientePacienteViewSet(viewsets.ModelViewSet):
    queryset = DientePaciente.objects.select_related('paciente').all()
    serializer_class = DientePacienteSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset()
        paciente_id = self.request.query_params.get('paciente')
        if paciente_id is not None:
            queryset = queryset.filter(paciente_id=paciente_id)
        return queryset


class DoctorViewSet(viewsets.ModelViewSet):
    queryset = Doctor.objects.prefetch_related('horarios').all()
    serializer_class = DoctorSerializer
    permission_classes = [permissions.IsAuthenticated]


class PacienteViewSet(viewsets.ModelViewSet):
    queryset = Paciente.objects.prefetch_related('dientes').all()
    serializer_class = PacienteSerializer
    permission_classes = [permissions.IsAuthenticated]

class CitaViewSet(viewsets.ModelViewSet):
    queryset = Cita.objects.select_related('paciente', 'doctor').all()
    serializer_class = CitaSerializer
    permission_classes = [permissions.IsAuthenticated]


    def perform_create(self, serializer):
        # Obtenemos el tratamiento que React está intentando agendar
        tratamiento = serializer.validated_data.get('tratamiento')
        dientes_tratados = serializer.validated_data.get('dientes_tratados', [])
        
        # Calcular el multiplicador total de materiales
        multiplicador_total = 1.0
        if dientes_tratados:
            multiplicador_total = sum(float(diente.get('multiplicador', 1.0)) for diente in dientes_tratados)
        elif not dientes_tratados:
            multiplicador_total = 1.0

        multiplicador_total = float(multiplicador_total)

        # 1. FASE DE VERIFICACIÓN (Antes de guardar la cita)
        if tratamiento:
            recetas = tratamiento.materiales_requeridos.all()
            for receta in recetas:
                material = receta.material
                # Calculamos cuánto hay reservado de este material actualmente
                reservas_actuales = material.reservas.aggregate(total=Sum('cantidad'))['total'] or 0
                disponible = material.stock_total - reservas_actuales
                
                cantidad_requerida = int(receta.cantidad * multiplicador_total)

                # Si lo que exige la receta es más de lo que hay disponible, CANCELAMOS TODO
                if disponible < cantidad_requerida:
                    raise ValidationError({
                        "error": f"Inventario insuficiente: El tratamiento requiere {cantidad_requerida} de '{material.nombre}', pero solo quedan {disponible} disponibles."
                    })

        # 2. Si pasa la prueba de fuego y hay stock, guardamos la cita
        cita = serializer.save()

        # 3. Y registramos las reservas de material para esta cita
        if cita.tratamiento:
            recetas = cita.tratamiento.materiales_requeridos.all()
            for receta in recetas:
                cantidad_reservar = int(receta.cantidad * multiplicador_total)
                ReservaMaterial.objects.create(
                    cita=cita,
                    material=receta.material,
                    cantidad=cantidad_reservar
                )

    def get_queryset(self):
        # Cancelamos citas expiradas antes de retornar el queryset
        Cita.objects.filter(
            fecha__lt=timezone.localdate(),
            estado_asistencia='Pendiente'
        ).update(
            estado_asistencia='Cancelado',
            estado='cancelada'
        )

        queryset = Cita.objects.select_related('paciente', 'doctor').all()
        fecha = self.request.query_params.get('fecha')
        if fecha:
            queryset = queryset.filter(fecha=fecha)
        return queryset
    
class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    permission_classes = [IsAuthenticated] # Solo usuarios logueados pueden ver/editar


class MovimientoInventarioViewSet(viewsets.ModelViewSet):
    queryset = MovimientoInventario.objects.select_related('material', 'usuario').all().order_by('-fecha')# Ordenados del más nuevo al más viejo
    serializer_class = MovimientoInventarioSerializer
    permission_classes = [IsAuthenticated]

    # 🔥 AQUÍ ESTÁ LA MAGIA DE LA AUDITORÍA 🔥
    # Interceptamos la creación del movimiento para inyectar al usuario que está logueado
    def perform_create(self, serializer):
        serializer.save(usuario=self.request.user)


class ReservaMaterialViewSet(viewsets.ModelViewSet):
    queryset = ReservaMaterial.objects.select_related('material').all()
    serializer_class = ReservaMaterialSerializer
    permission_classes = [IsAuthenticated]

class TratamientoViewSet(viewsets.ModelViewSet):
    queryset = Tratamiento.objects.all()
    serializer_class = TratamientoSerializer
    permission_classes = [IsAuthenticated]

class HorasDisponiblesView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        doctor_id = request.query_params.get('doctor_id')
        fecha_str = request.query_params.get('fecha')
        duracion_str = request.query_params.get('duracion')

        if not doctor_id or not fecha_str:
            return Response({"error": "Faltan parámetros doctor_id o fecha"}, status=400)

        try:
            duracion_estimada = int(duracion_str) if duracion_str else 30
        except ValueError:
            duracion_estimada = 30

        try:
            fecha_obj = datetime.strptime(fecha_str, '%Y-%m-%d').date()
        except ValueError:
            return Response({"error": "Formato de fecha inválido. Use YYYY-MM-DD"}, status=400)

        dia_semana = fecha_obj.weekday()

        print(f"--- DEBUG HORARIOS ---")
        print(f"Doctor ID: {doctor_id}")
        print(f"Fecha recibida: {fecha_str}")
        print(f"Día de la semana calculado (0=Lun, 6=Dom): {dia_semana}")

        try:
            horario = HorarioDoctor.objects.get(doctor_id=doctor_id, dia_semana=dia_semana)
        except HorarioDoctor.DoesNotExist:
            print(f"No se encontró horario para el doctor {doctor_id} el día {dia_semana}")
            return Response([])

        if not horario.es_laborable:
            return Response([])

        # Generar franjas horarias de 30 minutos
        franjas = []
        hora_actual = horario.hora_inicio
        hora_fin_obj = horario.hora_fin

        # Obtener citas existentes
        citas_existentes = Cita.objects.filter(
            doctor_id=doctor_id,
            fecha=fecha_obj
        ).exclude(estado_asistencia='Cancelado')

        # Procesar tiempos ocupados
        tiempos_ocupados = []
        for cita in citas_existentes:
            if not cita.hora or not cita.tratamiento:
                continue

            # Calcular duración
            duracion = cita.tratamiento.duracion or 30
            if cita.dientes_tratados:
                duracion += (len(cita.dientes_tratados) - 1) * (cita.tratamiento.duracion_adicional or 0)

            ini_dt = datetime.combine(fecha_obj, cita.hora)
            fin_dt = ini_dt + timedelta(minutes=duracion)

            tiempos_ocupados.append((ini_dt.time(), fin_dt.time()))

        # Helper to check intersections
        def se_solapan(inicio1, fin1, inicio2, fin2):
            return max(inicio1, inicio2) < min(fin1, fin2)

        while hora_actual < hora_fin_obj:
            franja_fin = (datetime.combine(date.today(), hora_actual) + timedelta(minutes=30)).time()

            estado = None

            # 1. Validación de Estado Fijo (Paso 1)
            # Verificar si es descanso
            if horario.hora_break_inicio and horario.hora_break_fin:
                if hora_actual >= horario.hora_break_inicio and hora_actual < horario.hora_break_fin:
                    estado = 'descanso'

            # Verificar si hay una cita agendada exactamente en este slot_time
            if not estado:
                for ocupado_ini, ocupado_fin in tiempos_ocupados:
                    if hora_actual >= ocupado_ini and hora_actual < ocupado_fin:
                        estado = 'ocupado'
                        break

            # 2. Validación de Proyección (Paso 2 - Solo si superó el Paso 1)
            if not estado:
                hora_fin_estimada = (datetime.combine(date.today(), hora_actual) + timedelta(minutes=duracion_estimada)).time()

                # Condición A: Fin de jornada
                if hora_fin_estimada > hora_fin_obj:
                    estado = 'no_cabe'

                # Condición B: Choque con descanso
                elif horario.hora_break_inicio and horario.hora_break_fin:
                    if hora_actual < horario.hora_break_inicio and hora_fin_estimada > horario.hora_break_inicio:
                        estado = 'no_cabe'

                # Condición C: Choque con próxima cita
                if not estado:
                    for ocupado_ini, ocupado_fin in tiempos_ocupados:
                        # Si existe alguna Cita agendada cuyo inicio sea > slot_time pero < hora_fin_estimada
                        if ocupado_ini > hora_actual and ocupado_ini < hora_fin_estimada:
                            estado = 'no_cabe'
                            break

            # 3. Disponible (Paso 3)
            if not estado:
                estado = 'disponible'

            franjas.append({
                "hora": hora_actual.strftime('%H:%M'),
                "estado": estado
            })

            hora_actual = franja_fin

        return Response(franjas)
