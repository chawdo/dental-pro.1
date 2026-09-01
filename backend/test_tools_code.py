import json

def generate_views_patch():
    with open('backend/citas/views.py', 'r') as f:
        content = f.read()

    search_block = """class GenerarDiagnosticoIAView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):"""

    replace_block = """from datetime import date, timedelta
from google.genai import types

def obtener_estado_inventario() -> dict:
    \"\"\"Revisa los materiales, su stock actual y cantidad reservada. Devuelve alertas de stock bajo.\"\"\"
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
    \"\"\"Devuelve las citas de un día (YYYY-MM-DD), horas ocupadas/libres y qué doctor está asignado.\"\"\"
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
    \"\"\"Calcula ingresos, tratamientos más vendidos y citas canceladas en un rango de días hacia atrás.\"\"\"
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
    \"\"\"Devuelve el catálogo de servicios y costos.\"\"\"
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

    def post(self, request):"""

    with open('backend/test_patch.py', 'w') as f:
        f.write(content.replace(search_block, replace_block))

generate_views_patch()
