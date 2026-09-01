import React from 'react';
import { inputClass } from './SharedConstants';

const ModalAjustarStock = ({
  mostrarModalMaterial,
  setMostrarModalMaterial,
  guardarMovimiento,
  nuevoMovimiento,
  setNuevoMovimiento,
  materiales
}) => {
  if (!mostrarModalMaterial) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in zoom-in-95">
      <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-[95%] md:w-full max-w-md p-6 md:p-8 overflow-y-auto max-h-[90vh]">
        <h2 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">Ajustar Stock</h2>
        <form onSubmit={guardarMovimiento} className="space-y-5">
          <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Material</label>
            <select required className={inputClass + " mt-1"} value={nuevoMovimiento.material_id} onChange={e => setNuevoMovimiento({...nuevoMovimiento, material_id: e.target.value})}><option value="">Selecciona...</option>{materiales.map(m => <option key={m.id} value={m.id}>{m.nombre} (Actual: {m.stock_total})</option>)}</select>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Tipo</label><select className={`${inputClass} mt-1 font-bold ${nuevoMovimiento.tipo === 'Entrada' ? 'text-green-600 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-500/30' : 'text-red-600 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-500/30'}`} value={nuevoMovimiento.tipo} onChange={e => setNuevoMovimiento({...nuevoMovimiento, tipo: e.target.value})}><option value="Entrada">➕ ENTRADA</option><option value="Salida">➖ SALIDA</option></select></div>
            <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Cantidad</label><input type="number" required min="1" className={inputClass + " mt-1"} value={nuevoMovimiento.cantidad} onChange={e => setNuevoMovimiento({...nuevoMovimiento, cantidad: e.target.value})} /></div>
          </div>
          <div><label className="text-xs font-bold text-slate-500 uppercase ml-1">Nota / Motivo</label><textarea required className={`${inputClass} mt-1 min-h-[80px]`} value={nuevoMovimiento.nota} onChange={e => setNuevoMovimiento({...nuevoMovimiento, nota: e.target.value})}></textarea></div>
          <div className="flex gap-3 pt-4"><button type="button" onClick={() => setMostrarModalMaterial(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors">Cancelar</button><button type="submit" className="flex-1 py-3 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl shadow-md transition-colors">Guardar</button></div>
        </form>
      </div>
    </div>
  );
};

export default ModalAjustarStock;
