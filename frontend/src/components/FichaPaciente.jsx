import React from 'react';
import { inputClass, IconoEliminar, IconoEditar, IconoCerrar } from './SharedConstants';
import Odontograma from './Odontograma';

const FichaPaciente = ({
  mostrarFicha,
  setMostrarFicha,
  pacienteSeleccionado,
  setPacienteSeleccionado,
  editandoPaciente,
  setEditandoPaciente,
  actualizarPaciente,
  citas,
  tratamientos
}) => {
  if (!mostrarFicha || !pacienteSeleccionado) return null;

  const calcularEdad = (fechaNacimiento) => {
    if (!fechaNacimiento) return '';
    const hoy = new Date();
    const cumpleanos = new Date(fechaNacimiento);
    let edad = hoy.getFullYear() - cumpleanos.getFullYear();
    const m = hoy.getMonth() - cumpleanos.getMonth();
    if (m < 0 || (m === 0 && hoy.getDate() < cumpleanos.getDate())) {
      edad--;
    }
    return `${edad} años`;
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in zoom-in-95">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-[95%] md:w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col border border-slate-100 dark:border-slate-700">
        <div className="bg-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
          <div className="flex items-center gap-4">
             {pacienteSeleccionado.foto ? (
                <img src={pacienteSeleccionado.foto} alt="Foto paciente" className="w-16 h-16 rounded-full object-cover border-2 border-white/20" />
             ) : (
                <div className="w-16 h-16 rounded-full bg-white/20 flex items-center justify-center text-xl font-bold border-2 border-white/20">{pacienteSeleccionado.nombre.charAt(0)}{pacienteSeleccionado.apellido.charAt(0)}</div>
             )}
             <div>
               <h2 className="text-xl font-bold leading-tight">{pacienteSeleccionado.nombre} {pacienteSeleccionado.apellido}</h2>
               <div className="flex items-center gap-2 mt-1">
                 <p className="text-xs text-indigo-200">ID: {pacienteSeleccionado.id}</p>
                 <span className="text-xs bg-indigo-500 px-2 py-0.5 rounded-full">{calcularEdad(pacienteSeleccionado.fecha_nacimiento)}</span>
                 {pacienteSeleccionado.sexo && <span className="text-xs bg-indigo-500 px-2 py-0.5 rounded-full">{pacienteSeleccionado.sexo === 'M' ? 'Masculino' : pacienteSeleccionado.sexo === 'F' ? 'Femenino' : 'Otro'}</span>}
                 {pacienteSeleccionado.tipo_sangre && <span className="text-xs bg-red-400 px-2 py-0.5 rounded-full font-bold">{pacienteSeleccionado.tipo_sangre}</span>}
               </div>
               <p className="text-xs text-indigo-100 mt-1 flex gap-2"><span>📞 {pacienteSeleccionado.telefono}</span> {pacienteSeleccionado.direccion && <span>📍 {pacienteSeleccionado.direccion}</span>}</p>
             </div>
          </div>
          <button onClick={() => setMostrarFicha(false)} className="p-2 bg-white/10 hover:bg-white/20 rounded-full transition-colors"><IconoCerrar /></button>
        </div>

        <div className="p-6 md:p-8 overflow-y-auto flex-1 bg-slate-50 dark:bg-slate-900">
          <form onSubmit={actualizarPaciente}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-slate-800 dark:text-white">Datos Personales</h3>
              {!editandoPaciente ? (
                <button type="button" onClick={() => setEditandoPaciente(true)} className="flex items-center gap-1 text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-indigo-600 dark:text-indigo-400 px-4 py-2 rounded-xl font-bold hover:bg-indigo-50 dark:hover:bg-slate-600 transition-colors"><IconoEditar/> Editar</button>
              ) : (
                <div className="flex gap-2"><button type="submit" className="text-xs bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl font-bold transition-colors">Guardar</button><button type="button" onClick={() => setEditandoPaciente(false)} className="text-xs bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-600 px-4 py-2 rounded-xl font-bold transition-colors">Cancelar</button></div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
              {[{label:'Nombre', k:'nombre'}, {label:'Apellido', k:'apellido'}, {label:'Cédula', k:'cedula'}, {label:'Teléfono', k:'telefono'}, {label:'Email', k:'email'}, {label:'Nacimiento', k:'fecha_nacimiento', type:'date'}, {label:'Sexo', k:'sexo', type:'select', options: ['M', 'F', 'Otro']}, {label:'Tipo de Sangre', k:'tipo_sangre', type:'select', options: ['A+', 'A-', 'O+', 'O-', 'B+', 'B-', 'AB+', 'AB-']}].map(c => (
                <div key={c.k}>
                  <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{c.label}</label>
                  {editandoPaciente ? (
                     c.type === 'select' ? (
                       <select className={`${inputClass} mt-1`} value={pacienteSeleccionado[c.k] || ''} onChange={e => setPacienteSeleccionado({...pacienteSeleccionado, [c.k]: e.target.value})}>
                         <option value="">Seleccionar...</option>
                         {c.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                       </select>
                     ) : (
                       <input type={c.type||'text'} className={`${inputClass} mt-1`} value={pacienteSeleccionado[c.k]} onChange={e => setPacienteSeleccionado({...pacienteSeleccionado, [c.k]: e.target.value})} />
                     )
                  ) : <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 mt-1">{pacienteSeleccionado[c.k] || '-'}</p>}
                </div>
              ))}
              <div className="md:col-span-2">
                 <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Dirección</label>
                 {editandoPaciente ? (
                    <textarea className={`${inputClass} mt-1 h-20 resize-none`} value={pacienteSeleccionado.direccion || ''} onChange={e => setPacienteSeleccionado({...pacienteSeleccionado, direccion: e.target.value})}></textarea>
                 ) : (
                    <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700/50 mt-1">{pacienteSeleccionado.direccion || '-'}</p>
                 )}
              </div>
            </div>
          </form>

          <Odontograma pacienteId={pacienteSeleccionado.id} tratamientos={tratamientos} />

          <h3 className="text-sm font-bold text-slate-800 dark:text-white mb-4 mt-8">Historial Odontológico</h3>
          <div className="space-y-3">
            {citas.filter(c => c.paciente === pacienteSeleccionado.id).length > 0 ? citas.filter(c => c.paciente === pacienteSeleccionado.id).map(cita => {
              const t = tratamientos.find(x => x.id === cita.tratamiento);
              return (
                <div key={cita.id} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-2xl shadow-sm">
                  <div className="flex justify-between items-start mb-2">
                     <span className="font-bold text-indigo-600 dark:text-indigo-400 text-sm">{t?.nombre || cita.motivo || 'Servicio General'}</span>
                     <span className="bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-300 text-[10px] font-bold px-2 py-1 rounded-md">{cita.fecha}</span>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl">{cita.notas_medicas || 'Sin observaciones clínicas registradas en el sistema.'}</p>
                </div>
              );
            }) : (
              <div className="text-center py-8 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-600">
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">El paciente no tiene historial de citas.</p>
              </div>
            )}
          </div>

          <div className="mt-8 flex justify-end gap-3 pt-4 border-t border-slate-200 dark:border-slate-700">
            <button type="button" onClick={() => setMostrarFicha(false)} className="px-6 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-bold rounded-xl transition-colors">
              Cerrar
            </button>
            {editandoPaciente && (
              <button onClick={(e) => {
                 // Trigger the form submit programmatically
                 e.preventDefault();
                 const form = e.target.closest('.p-6').querySelector('form');
                 if (form) form.requestSubmit();
              }} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors">
                Guardar Cambios
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FichaPaciente;
