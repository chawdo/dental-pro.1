import React from 'react';
import { inputClass } from './SharedConstants';
import { Download } from 'lucide-react';

const ModalEditarCita = ({
  editandoCita,
  setEditandoCita,
  actualizarCita,
  citaSeleccionada,
  setCitaSeleccionada,
  doctores,
  tratamientos,
  generarPDF
}) => {
  if (!editandoCita || !citaSeleccionada) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in zoom-in-95">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-[95%] md:w-full max-w-md p-6 md:p-8 overflow-y-auto max-h-[90vh]">
        <div className="flex justify-between items-center mb-6"><h2 className="text-2xl font-bold text-slate-800 dark:text-white">Editar Cita</h2><button type="button" onClick={generarPDF} className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 p-2 rounded-xl hover:bg-indigo-100 transition-colors" title="Descargar PDF"><Download className="w-5 h-5" /></button></div>
        <form onSubmit={actualizarCita} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Doctor</label><select className={inputClass + " mt-1"} value={citaSeleccionada.doctor || ""} onChange={e => setCitaSeleccionada({...citaSeleccionada, doctor: parseInt(e.target.value)})}><option value="">Selecciona...</option>{doctores.map(d => <option key={d.id} value={d.id}>Dr. {d.apellido}</option>)}</select></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Tratamiento</label><select className={inputClass + " mt-1"} value={citaSeleccionada.tratamiento || ""} onChange={e => { const obj = tratamientos.find(s => s.id === parseInt(e.target.value)); setCitaSeleccionada({...citaSeleccionada, tratamiento: parseInt(e.target.value), costo_total: obj?.precio || citaSeleccionada.costo_total}); }}><option value="">Selecciona...</option>{tratamientos.map(s => <option key={s.id} value={s.id}>{s.nombre}</option>)}</select></div>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-700 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Costo Total ($)</label><input type="number" step="0.01" className={`${inputClass} mt-1 font-bold bg-white dark:bg-slate-800`} value={citaSeleccionada.costo_total} onChange={e => { if (e.target.value >= 0) setCitaSeleccionada({...citaSeleccionada, costo_total: e.target.value})}} /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Pagado Previo ($)</label><input type="number" disabled className={`${inputClass} mt-1 bg-slate-200 dark:bg-slate-700 opacity-60 font-bold`} value={citaSeleccionada.monto_pagado_adelantado} /></div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div><label className="text-[10px] font-bold text-green-600 dark:text-green-500 uppercase">Cobrar Hoy ($)</label>
                 <input type="number" step="0.01" className={`${inputClass} mt-1 font-bold border-green-200 dark:border-green-500/30 bg-green-50 dark:bg-green-900/10 text-green-700 dark:text-green-400 focus:ring-green-500`} value={citaSeleccionada.monto_pagado_dia ?? ''}
                   onChange={e => {
                     let val = e.target.value;
                     if (val === '') { setCitaSeleccionada({...citaSeleccionada, monto_pagado_dia: ''}); return; }
                     const max = (parseFloat(citaSeleccionada.costo_total)||0) - (parseFloat(citaSeleccionada.monto_pagado_adelantado)||0);
                     if (parseFloat(val) <= max) setCitaSeleccionada({...citaSeleccionada, monto_pagado_dia: val});
                   }}
                 />
              </div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase">Método</label><select className={`${inputClass} mt-1 bg-white dark:bg-slate-800`} value={citaSeleccionada.metodo_pago || 'Efectivo'} onChange={e => setCitaSeleccionada({...citaSeleccionada, metodo_pago: e.target.value})}><option>Efectivo</option><option>Pago Móvil</option><option>Zelle</option></select></div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Reprogramar Fecha</label><input type="date" className={inputClass + " mt-1"} value={citaSeleccionada.fecha} onChange={e => setCitaSeleccionada({...citaSeleccionada, fecha: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Reprogramar Hora</label><input type="time" className={inputClass + " mt-1"} value={citaSeleccionada.hora} onChange={e => setCitaSeleccionada({...citaSeleccionada, hora: e.target.value})} /></div>
          </div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Estado de Asistencia</label>
            <select
              className={inputClass + " mt-1"}
              value={citaSeleccionada.estado_asistencia || "Pendiente"}
              onChange={e => setCitaSeleccionada({...citaSeleccionada, estado_asistencia: e.target.value})}
            >
              <option value="Pendiente">Pendiente</option>
              <option value="Completado">Completado</option>
              <option value="Cancelado">Cancelado</option>
              <option value="No Asistió">No Asistió</option>
            </select>
          </div>
          <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Notas Médicas</label><textarea className={`${inputClass} mt-1 min-h-[80px]`} value={citaSeleccionada.notas_medicas || ""} onChange={e => setCitaSeleccionada({...citaSeleccionada, notas_medicas: e.target.value})}></textarea></div>
          <div className="flex gap-3 pt-4"><button type="button" onClick={() => setEditandoCita(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors">Cancelar</button><button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors">Guardar Cambios</button></div>
        </form>
      </div>
    </div>
  );
};

export default ModalEditarCita;
