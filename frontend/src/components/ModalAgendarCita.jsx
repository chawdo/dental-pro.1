import React, { useState } from 'react';
import { inputClass } from './SharedConstants';
import Odontograma from './Odontograma';
import { Search } from 'lucide-react';
import axios from 'axios';
import { useEffect } from 'react';

const ModalAgendarCita = ({
  mostrarModalCita,
  setMostrarModalCita,
  guardarCita,
  nuevaCita,
  setNuevaCita,
  pacientes,
  doctores,
  tratamientos,
  busquedaPaciente,
  setBusquedaPaciente,
  mostrarSugerencias,
  setMostrarSugerencias,
  duracionEnTiempoReal,
  costoEnTiempoReal
}) => {

  const [mostrarOdontograma, setMostrarOdontograma] = useState(false);
  const [franjasHorarias, setFranjasHorarias] = useState([]);
  const [cargandoHoras, setCargandoHoras] = useState(false);
  const [horaHover, setHoraHover] = useState(null);
  const API_BASE_URL = 'https://sistema-clinica-1.onrender.com';

  useEffect(() => {
    if (nuevaCita.doctor_id && nuevaCita.fecha) {
      setCargandoHoras(true);

      // Asegurar formato YYYY-MM-DD
      let fechaFormateada = nuevaCita.fecha;
      if (fechaFormateada.includes('/')) {
        const partes = fechaFormateada.split('/');
        if (partes.length === 3) {
          // Si está en formato DD/MM/YYYY
          if (partes[0].length === 2 && partes[2].length === 4) {
            fechaFormateada = `${partes[2]}-${partes[1]}-${partes[0]}`;
          }
          // Si está en formato YYYY/MM/DD
          else if (partes[0].length === 4) {
             fechaFormateada = `${partes[0]}-${partes[1]}-${partes[2]}`;
          }
        }
      }

      // También asegurarse de usar objeto Date en formato universal
      if (!fechaFormateada.includes('-') && !fechaFormateada.includes('/')) {
         try {
           const dateObj = new Date(fechaFormateada);
           fechaFormateada = dateObj.toISOString().split('T')[0];
         } catch(e) {}
      }

      const duracion = duracionEnTiempoReal || 30;
      axios.get(`${API_BASE_URL}/api/citas/horas-disponibles/?doctor_id=${nuevaCita.doctor_id}&fecha=${fechaFormateada}&duracion=${duracion}`)
        .then(res => {
          setFranjasHorarias(res.data);
          setCargandoHoras(false);
        })
        .catch(err => {
          console.error("Error fetching franjas", err);
          setCargandoHoras(false);
        });
    } else {
      setFranjasHorarias([]);
    }
  }, [nuevaCita.doctor_id, nuevaCita.fecha, duracionEnTiempoReal]);

  const getFranjasAfectadas = (horaInicio) => {
    if (!horaInicio || !duracionEnTiempoReal) return [];

    const affected = [];
    let slotsNeeded = Math.ceil(duracionEnTiempoReal / 30);
    if (slotsNeeded < 1) slotsNeeded = 1;

    const startIndex = franjasHorarias.findIndex(f => f.hora === horaInicio);
    if (startIndex === -1) return [];

    for (let i = 0; i < slotsNeeded && (startIndex + i) < franjasHorarias.length; i++) {
      affected.push(franjasHorarias[startIndex + i].hora);
    }
    return affected;
  };

  const afectadasHover = getFranjasAfectadas(horaHover);
  const afectadasSeleccion = getFranjasAfectadas(nuevaCita.hora);

  const calcularHoraFin = () => {
    if (!nuevaCita.hora || !duracionEnTiempoReal) return '';
    const [horas, minutos] = nuevaCita.hora.split(':').map(Number);
    const fecha = new Date();
    fecha.setHours(horas, minutos, 0, 0);
    fecha.setMinutes(fecha.getMinutes() + duracionEnTiempoReal);
    const h = String(fecha.getHours()).padStart(2, '0');
    const m = String(fecha.getMinutes()).padStart(2, '0');
    return `${h}:${m}`;
  };

  if (!mostrarModalCita) return null;


  const tratamientoSeleccionadoObj = tratamientos.find(t => String(t.id) === String(nuevaCita.tratamiento_id));

  const handleToggleDiente = (numeroDiente) => {
    const dientesSeleccionados = nuevaCita.dientes_tratados || [];
    const isSelected = dientesSeleccionados.some(d => d.numero === numeroDiente);

    if (isSelected) {
      setNuevaCita({
        ...nuevaCita,
        dientes_tratados: dientesSeleccionados.filter(d => d.numero !== numeroDiente)
      });
    } else {
      setNuevaCita({
        ...nuevaCita,
        dientes_tratados: [
          ...dientesSeleccionados,
          {
            numero: numeroDiente,
            precio: tratamientoSeleccionadoObj ? parseFloat(tratamientoSeleccionadoObj.precio) : 0,
            duracion: tratamientoSeleccionadoObj ? tratamientoSeleccionadoObj.duracion : 30,
            multiplicador: 1.0
          }
        ]
      });
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in zoom-in-95">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-[95%] md:w-full max-w-md p-6 md:p-8 overflow-y-auto max-h-[90vh]">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Agendar Cita</h2>
        <form onSubmit={guardarCita} className="space-y-4">
          <div className="relative"><label className="text-xs font-bold text-slate-500 uppercase ml-1">Buscar Paciente</label>
            <div className="relative mt-1">
              <span className="absolute left-3 top-3 text-slate-400"><Search className="w-5 h-5" /></span>
              <input type="text" placeholder="Nombre o cédula..." className={inputClass + " pl-10"} value={busquedaPaciente} onChange={e => {setBusquedaPaciente(e.target.value); setMostrarSugerencias(true);}} onFocus={() => setMostrarSugerencias(true)} />
            </div>
            {mostrarSugerencias && busquedaPaciente.length > 0 && (<div className="absolute z-[60] w-full mt-2 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-xl max-h-48 overflow-y-auto">
                {pacientes.filter(p => {
                   const terminos = busquedaPaciente.toLowerCase().split(" ").filter(t => t);
                   const info = `${p.nombre||''} ${p.apellido||''} ${p.cedula||''}`.toLowerCase();
                   return terminos.every(t => info.includes(t));
                }).map(p => (
                    <div key={p.id} onClick={() => { setNuevaCita({...nuevaCita, paciente: p.id}); setBusquedaPaciente(`${p.nombre} ${p.apellido}`); setMostrarSugerencias(false); }} className="p-3 hover:bg-indigo-50 dark:hover:bg-slate-700 cursor-pointer border-b border-slate-50 dark:border-slate-700 last:border-0 transition-colors"><p className="text-sm font-bold text-slate-800 dark:text-slate-200">{p.nombre} {p.apellido}</p><p className="text-[10px] text-slate-400">CI: {p.cedula}</p></div>
                ))}</div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Doctor</label>
              <select required className={inputClass + " mt-1"} value={nuevaCita.doctor_id} onChange={e => setNuevaCita({...nuevaCita, doctor_id: e.target.value})}><option value="">Selecciona...</option>{doctores.map(d => <option key={d.id} value={d.id}>Dr. {d.apellido}</option>)}</select>
            </div>
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Servicio</label>
              <select required className={inputClass + " mt-1"} value={nuevaCita.tratamiento_id} onChange={e => setNuevaCita({...nuevaCita, tratamiento_id: e.target.value, dientes_tratados: []})}><option value="">Selecciona...</option>{tratamientos.map(t => <option key={t.id} value={t.id}>{t.nombre}</option>)}</select>
              {duracionEnTiempoReal > 0 && <p className="text-xs font-bold text-indigo-500 mt-2 pl-1">⏱️ Duración: {duracionEnTiempoReal} min.</p>}

              {nuevaCita.tratamiento_id && (
                <button
                  type="button"
                  onClick={() => setMostrarOdontograma(true)}
                  className="mt-2 w-full py-2 bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold rounded-xl text-xs hover:bg-indigo-100 transition-colors"
                >
                  🦷 {nuevaCita.dientes_tratados?.length > 0 ? `Dientes Seleccionados (${nuevaCita.dientes_tratados.length})` : 'Seleccionar Dientes (Opcional)'}
                </button>
              )}
            </div>
          </div>

          {nuevaCita.dientes_tratados && nuevaCita.dientes_tratados.length > 0 && (
            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 space-y-3 max-h-48 overflow-y-auto">
              <p className="text-xs font-bold text-slate-500 uppercase">Dientes Seleccionados</p>
              <div className="flex flex-wrap gap-2">
                {nuevaCita.dientes_tratados.map((diente) => (
                  <span key={diente.numero} className="px-3 py-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm font-bold text-indigo-600">
                    #{diente.numero}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Fecha</label><input type="date" required min={new Date().toISOString().split("T")[0]} className={inputClass + " mt-1"} value={nuevaCita.fecha} onChange={e => setNuevaCita({...nuevaCita, fecha: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Hora</label>
              <select
                required
                className={inputClass + " mt-1"}
                value={nuevaCita.hora || ''}
                onChange={e => setNuevaCita({ ...nuevaCita, hora: e.target.value })}
              >
                <option value="">Selecciona...</option>
                {franjasHorarias.map((f) => {
                  const isNoCabe = f.estado === 'no_cabe';
                  const isDescanso = f.estado === 'descanso';
                  const isOcupado = f.estado === 'ocupado';
                  const noDisponible = isNoCabe || isDescanso || isOcupado;

                  let optionText = f.hora;
                  let optionClass = "text-slate-800 dark:text-slate-200";

                  if (isNoCabe) {
                    optionText = `${f.hora} Tiempo insuficiente`;
                    optionClass = "text-orange-500 font-medium";
                  } else if (isDescanso) {
                    optionText = `${f.hora} Descanso`;
                    optionClass = "text-gray-500 italic";
                  } else if (isOcupado) {
                    optionText = `${f.hora} Ocupado`;
                    optionClass = "text-red-500 font-medium";
                  } else {
                    optionText = `${f.hora} Disponible`;
                    optionClass = "text-green-600 font-medium";
                  }

                  return (
                    <option key={f.hora} value={f.hora} disabled={noDisponible} className={optionClass}>
                      {optionText}
                    </option>
                  );
                })}
              </select>
              {cargandoHoras && <p className="text-sm text-slate-500 mt-1">Cargando horas...</p>}
              {!cargandoHoras && franjasHorarias.length === 0 && nuevaCita.doctor_id && nuevaCita.fecha && (
                <p className="text-sm text-slate-500 mt-1">El doctor no labora este día</p>
              )}
              {nuevaCita.hora && (
                <div className="p-3 mt-3 rounded-md border text-sm flex items-center bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/20 dark:text-blue-200 dark:border-blue-800/50">
                  ⏱️ Este tratamiento ocupará la agenda desde las {nuevaCita.hora} hasta las {calcularHoraFin()}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-indigo-500 uppercase ml-1">Costo ($)</label><input type="number" readOnly className={`${inputClass} mt-1 font-bold text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/10 border-indigo-100 dark:border-indigo-500/20`} value={costoEnTiempoReal} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Abono ($)</label>
              <input type="number" className={inputClass + " mt-1"} value={nuevaCita.monto_pagado_adelantado}
                onChange={e => {
                   let val = e.target.value;
                   if (val === '') { setNuevaCita({...nuevaCita, monto_pagado_adelantado: ''}); return; }
                   if (parseFloat(val) <= costoEnTiempoReal) setNuevaCita({...nuevaCita, monto_pagado_adelantado: val});
                }}
              />
            </div>
          </div>
          <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Notas</label><textarea placeholder="Observaciones clínicas..." className={`${inputClass} mt-1 min-h-[70px]`} value={nuevaCita.notas_medicas} onChange={e => setNuevaCita({...nuevaCita, notas_medicas: e.target.value})}></textarea></div>
          <div className="flex gap-3 pt-4"><button type="button" onClick={() => setMostrarModalCita(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors">Cancelar</button><button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors">Agendar</button></div>
        </form>
      </div>

      {mostrarOdontograma && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in zoom-in-95">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col p-6 overflow-hidden">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-slate-800 dark:text-white">Seleccionar Dientes</h3>
              <button onClick={() => setMostrarOdontograma(false)} className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200">
                ✕
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pb-4">
              <Odontograma
                pacienteId={nuevaCita.paciente}
                modoSeleccion={true}
                dientesSeleccionados={nuevaCita.dientes_tratados || []}
                onToggleDiente={handleToggleDiente}
                tratamientos={tratamientos}
              />
            </div>

            <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-100 dark:border-slate-700">
              <span className="text-sm font-bold text-slate-500">
                Dientes seleccionados: {(nuevaCita.dientes_tratados || []).length}
              </span>
              <button
                type="button"
                onClick={() => setMostrarOdontograma(false)}
                className="py-2.5 px-6 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors"
              >
                Confirmar Selección
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default ModalAgendarCita;
