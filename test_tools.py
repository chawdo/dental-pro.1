import json
from google import genai
from google.genai import types

def obtener_estado_inventario() -> dict:
    """Revisa los materiales, su stock actual y cantidad reservada. Devuelve alertas de stock bajo."""
    return {"status": "ok"}

def consultar_agenda(fecha: str, doctor_id: int = None) -> dict:
    """Devuelve las citas de un día, horas ocupadas/libres y qué doctor está asignado."""
    return {"status": "ok"}

def obtener_metricas_financieras(dias: int) -> dict:
    """Calcula ingresos, tratamientos más vendidos y citas canceladas en un rango de días."""
    return {"status": "ok"}

def consultar_precios_tratamientos() -> dict:
    """Devuelve el catálogo de servicios y costos."""
    return {"status": "ok"}
