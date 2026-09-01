from django.test import TestCase
from django.utils import timezone
from datetime import date, datetime, timedelta
from rest_framework.exceptions import ValidationError
from .models import Paciente, Doctor, HorarioDoctor, Cita, Tratamiento, Material, MovimientoInventario
from .serializers import CitaSerializer
import datetime as dt

class CitaSerializerValidationTest(TestCase):
    def setUp(self):
        self.paciente = Paciente.objects.create(
            nombre="Juan",
            apellido="Perez",
            cedula="12345678",
            telefono="04141234567",
            fecha_nacimiento=date(1990, 1, 1),
            sexo="M",
            tipo_sangre="O+"
        )
        self.doctor = Doctor.objects.create(
            nombre="Dr. Smith",
            apellido="Doe",
            especialidad="General"
        )
        self.hoy = date.today()
        self.ayer = self.hoy - timedelta(days=1)
        self.manana = self.hoy + timedelta(days=1)

        # Crear horario para hoy
        HorarioDoctor.objects.create(
            doctor=self.doctor,
            dia_semana=self.hoy.weekday(),
            hora_inicio=dt.time(8, 0),
            hora_fin=dt.time(17, 0),
            es_laborable=True
        )
        # Crear horario para ayer
        HorarioDoctor.objects.create(
            doctor=self.doctor,
            dia_semana=self.ayer.weekday(),
            hora_inicio=dt.time(8, 0),
            hora_fin=dt.time(17, 0),
            es_laborable=True
        )
        # Crear horario para manana
        HorarioDoctor.objects.create(
            doctor=self.doctor,
            dia_semana=self.manana.weekday(),
            hora_inicio=dt.time(8, 0),
            hora_fin=dt.time(17, 0),
            es_laborable=True
        )
        self.tratamiento = Tratamiento.objects.create(
            nombre="Limpieza",
            precio=50,
            duracion=30
        )
        self.ahora = datetime.now().time()

        # Una hora futura para evitar fallos por tiempo (23:59:00 o lo que sea)
        # Esto es rudimentario, así que sumaremos una hora a "ahora" o usaremos un dummy si es casi medianoche
        if self.ahora.hour < 23:
            self.hora_futura = datetime.strptime(f"{self.ahora.hour + 1:02d}:00", "%H:%M").time()
        else:
            self.hora_futura = datetime.strptime("23:59", "%H:%M").time()

    def test_create_cita_in_past_fails(self):
        data = {
            "paciente": self.paciente.id,
            "doctor": self.doctor.id,
            "fecha": self.ayer.strftime("%Y-%m-%d"),
            "hora": "10:00:00",
            "tratamiento": self.tratamiento.id,
        }
        serializer = CitaSerializer(data=data)
        self.assertFalse(serializer.is_valid())
        self.assertIn('fecha', serializer.errors)

    def test_update_cita_preserves_past_date(self):
        # Create a cita in the past directly using models (bypassing serializer validation)
        cita = Cita.objects.create(
            paciente=self.paciente,
            doctor=self.doctor,
            fecha=self.ayer,
            hora="10:00:00",
            tratamiento=self.tratamiento
        )

        data = {
            "paciente": self.paciente.id,
            "doctor": self.doctor.id,
            "fecha": self.ayer.strftime("%Y-%m-%d"),
            "hora": "10:00:00",
            "tratamiento": self.tratamiento.id,
            "monto_pagado_dia": 50,  # Updating some other field
        }
        serializer = CitaSerializer(instance=cita, data=data, partial=True)
        self.assertTrue(serializer.is_valid(), msg=f"Serializer errors: {serializer.errors}")

    def test_update_cita_change_to_past_date_fails(self):
        cita = Cita.objects.create(
            paciente=self.paciente,
            doctor=self.doctor,
            fecha=self.manana,
            hora="10:00:00",
            tratamiento=self.tratamiento
        )

        data = {
            "paciente": self.paciente.id,
            "doctor": self.doctor.id,
            "fecha": self.ayer.strftime("%Y-%m-%d"),
            "hora": "10:00:00",
            "tratamiento": self.tratamiento.id,
        }
        serializer = CitaSerializer(instance=cita, data=data, partial=True)
        self.assertFalse(serializer.is_valid())
        self.assertIn('fecha', serializer.errors)


class MovimientoInventarioTest(TestCase):
    def setUp(self):
        self.material = Material.objects.create(
            nombre="Guantes",
            unidad_medida="Pares",
            stock_total=10
        )

    def test_salida_mayor_al_stock_raises_value_error(self):
        movimiento = MovimientoInventario(
            material=self.material,
            tipo='Salida',
            cantidad=15,
            nota="Test de salida mayor al stock"
        )

        with self.assertRaises(ValueError) as context:
            movimiento.save()

        self.assertEqual(str(context.exception), "No hay suficiente stock para esta salida.")

        # Verify that the stock was not modified
        self.material.refresh_from_db()
        self.assertEqual(self.material.stock_total, 10)

    def test_salida_valida_actualiza_stock(self):
        movimiento = MovimientoInventario(
            material=self.material,
            tipo='Salida',
            cantidad=4,
            nota="Test de salida valida"
        )
        movimiento.save()

        self.material.refresh_from_db()
        self.assertEqual(self.material.stock_total, 6)

    def test_entrada_valida_actualiza_stock(self):
        movimiento = MovimientoInventario(
            material=self.material,
            tipo='Entrada',
            cantidad=5,
            nota="Test de entrada valida"
        )
        movimiento.save()

        self.material.refresh_from_db()
        self.assertEqual(self.material.stock_total, 15)
