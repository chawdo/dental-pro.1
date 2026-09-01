import React from 'react';
import { inputClass } from './SharedConstants';

const ModalNuevoPaciente = ({
  mostrarModal,
  setMostrarModal,
  handleSubmit,
  nuevoPaciente,
  setNuevoPaciente
}) => {
  if (!mostrarModal) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in zoom-in-95">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-[95%] md:w-full max-w-md p-6 md:p-8 overflow-y-auto max-h-[90vh]">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Nuevo Paciente</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Nombre</label><input type="text" required className={inputClass + " mt-1"} value={nuevoPaciente.nombre} onChange={e => setNuevoPaciente({...nuevoPaciente, nombre: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, "")})} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Apellido</label><input type="text" required className={inputClass + " mt-1"} value={nuevoPaciente.apellido} onChange={e => setNuevoPaciente({...nuevoPaciente, apellido: e.target.value.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ ]/g, "")})} /></div>
          </div>
          <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Cédula</label><input type="text" required className={inputClass + " mt-1"} value={nuevoPaciente.cedula} onChange={e => setNuevoPaciente({...nuevoPaciente, cedula: e.target.value.replace(/\D/g, "").slice(0,8)})} /></div>
          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Teléfono</label>
            <div className="flex gap-2 mt-1">
              <select className={`${inputClass} !w-[100px] px-1 text-center`} value={nuevoPaciente.prefijo} onChange={e => setNuevoPaciente({...nuevoPaciente, prefijo: e.target.value})}>
                <option>414</option>
                <option>424</option>
                <option>416</option>
                <option>412</option>
              </select>
              <input type="text" placeholder="1234567" required className={`${inputClass} flex-1`} value={nuevoPaciente.numeroBase} onChange={e => setNuevoPaciente({...nuevoPaciente, numeroBase: e.target.value.replace(/\D/g, "").slice(0,7)})} />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Nacimiento</label><input type="date" required className={inputClass + " mt-1"} onChange={e => setNuevoPaciente({...nuevoPaciente, fecha_nacimiento: e.target.value})} /></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Correo</label><input type="email" required className={inputClass + " mt-1"} onChange={e => setNuevoPaciente({...nuevoPaciente, email: e.target.value})} /></div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Sexo</label>
              <select className={inputClass + " mt-1"} value={nuevoPaciente.sexo} onChange={e => setNuevoPaciente({...nuevoPaciente, sexo: e.target.value})}>
                <option value="">Seleccionar...</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tipo de Sangre</label>
              <select className={inputClass + " mt-1"} value={nuevoPaciente.tipo_sangre} onChange={e => setNuevoPaciente({...nuevoPaciente, tipo_sangre: e.target.value})}>
                <option value="">Seleccionar...</option>
                <option value="A+">A+</option>
                <option value="A-">A-</option>
                <option value="O+">O+</option>
                <option value="O-">O-</option>
                <option value="B+">B+</option>
                <option value="B-">B-</option>
                <option value="AB+">AB+</option>
                <option value="AB-">AB-</option>
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Dirección</label>
            <textarea className={inputClass + " mt-1 h-20 resize-none"} value={nuevoPaciente.direccion} onChange={e => setNuevoPaciente({...nuevoPaciente, direccion: e.target.value})}></textarea>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Foto del Paciente</label>
            <input type="file" accept="image/*" className={"block w-full text-sm text-slate-500 dark:text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 dark:file:bg-slate-700 dark:file:text-slate-300 mt-1 cursor-pointer"} onChange={e => setNuevoPaciente({...nuevoPaciente, foto: e.target.files[0]})} />
          </div>

          <div className="flex gap-3 pt-6"><button type="button" onClick={() => setMostrarModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors">Cancelar</button><button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors">Guardar</button></div>
        </form>
      </div>
    </div>
  );
};

export default ModalNuevoPaciente;
