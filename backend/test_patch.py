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


from datetime import date, timedelta
from google.genai import types

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

def consultar_agenda(fecha: str, doctor_id: int = None) -> dict:
    """Devuelve las citas de un día (YYYY-MM-DD), horas ocupadas/libres y qué doctor está asignado."""
    citas_query = Cita.objects.filter(fecha=fecha)
    if doctor_id:
        citas_query = citas_query.filter(doctor_id=doctor_id)
    citas = []
    for c in citas_query:
        citas.append({
            "hora": c.hora.strftime('%H:%M') if c.hora else "",
            "paciente": f"{c.paciente.nombre} {c.paciente.apellido}",
            "doctor": f"{c.doctor.nombre} {c.doctor.apellido}" if c.doctor else "Sin asignar",
            "estado": c.estado_asistencia
        })
    return {"fecha": fecha, "citas": citas}

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
                consultar_precios_tratamientos
            ]

            system_instruction = "Eres el Asistente Experto del Centro Odontológico Dental Pro. Tienes herramientas para consultar la base de datos en tiempo real. Si el usuario pregunta algo sobre la clínica, USA LAS HERRAMIENTAS para buscar la información exacta antes de responder. Sé proactivo, si te preguntan por el inventario y hay poco stock, sugiere comprar."

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
                "consultar_precios_tratamientos": consultar_precios_tratamientos
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