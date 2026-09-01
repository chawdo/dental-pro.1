from django.db.models.signals import pre_save, post_delete
from django.dispatch import receiver
from .models import Cita, ReservaMaterial, MovimientoInventario

@receiver(pre_save, sender=Cita)
def liberar_inventario_cita_cancelada(sender, instance, **kwargs):
    if instance.pk:
        try:
            cita_anterior = Cita.objects.get(pk=instance.pk)
            if cita_anterior.estado_asistencia == 'Pendiente' and instance.estado_asistencia in ['Cancelado', 'No Asistió']:
                # For cancelled/no-show, we just delete the reservation to free it up.
                # No materials were actually consumed.
                ReservaMaterial.objects.filter(cita=instance).delete()
            elif cita_anterior.estado_asistencia == 'Pendiente' and instance.estado_asistencia == 'Completado':
                # If completed, the reserved materials should be actually consumed from stock_total
                reservas = ReservaMaterial.objects.filter(cita=instance)
                for reserva in reservas:
                    material = reserva.material

                    # Create an exit movement for the consumed stock
                    MovimientoInventario.objects.create(
                        material=material,
                        tipo='Salida',
                        cantidad=reserva.cantidad,
                        nota=f"Consumo automático por Cita completada #{instance.id}"
                        # Note: We don't have the user here unfortunately, but that's fine.
                        # MovimientoInventario allows user=None.
                    )
                # After consuming the stock, we can delete the reservation since it's no longer reserved, it's consumed!
                reservas.delete()

        except Cita.DoesNotExist:
            pass

@receiver(post_delete, sender=Cita)
def liberar_inventario_cita_eliminada(sender, instance, **kwargs):
    # CASCADE takes care of deleting ReservaMaterial
    pass
