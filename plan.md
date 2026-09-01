1. **Define Python Tools in `views.py`**:
   - `obtener_estado_inventario()`: Query `Material` and `ReservaMaterial` models, calculate stock and reserved quantities, return low stock alerts.
   - `consultar_agenda(fecha, doctor_id=None)`: Query `Cita` and `HorarioDoctor` to get appointments and free/busy hours.
   - `obtener_metricas_financieras(dias)`: Query `Cita` (revenue, cancelled appointments) and `Tratamiento` usage in a date range.
   - `consultar_precios_tratamientos()`: Query `Tratamiento` model for service catalogs and prices.
   - These tools will be standalone functions or class methods in `citas/views.py`.

2. **Create the IA View**:
   - Add a new class `ChatCopilotoIAView(APIView)` in `views.py`.
   - Implement `post` method taking user messages (`request.data.get('mensaje')`).
   - Initialize `genai.Client` and `client.chats.create` with `model='gemini-2.5-flash'`.
   - Set the `system_instruction` parameter to: "Eres el Asistente Experto del Centro Odontológico Dental Pro. Tienes herramientas para consultar la base de datos en tiempo real. Si el usuario pregunta algo sobre la clínica, USA LAS HERRAMIENTAS para buscar la información exacta antes de responder. Sé proactivo, si te preguntan por el inventario y hay poco stock, sugiere comprar."
   - Set the `tools` config parameter with the functions defined in step 1.

3. **Implement Tool Loop Execution**:
   - Send the message using `chat.send_message(mensaje)`.
   - Handle the case where `response.function_calls` exists.
   - Loop over `function_calls`, execute the mapped python function dynamically or manually using a dictionary map.
   - Append the `types.Part.from_function_response` to the conversation history and call `chat.send_message` again with the results to let the model generate the final natural language response.
   - Return the final text response to the frontend.

4. **Update `urls.py`**:
   - Add a route for the new view: `path('ia/copiloto/', ChatCopilotoIAView.as_view(), name='ia-copiloto')`

5. **Run Pre-commit Checks**: Run `pre_commit_instructions` to ensure the changes are valid.
6. **Submit Changes**.
