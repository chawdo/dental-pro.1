import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { inputClass, IconoSparkles } from './SharedConstants';
import { DetailedTooth } from './DetailedTooth';

const API_BASE_URL = 'https://sistema-clinica-1.onrender.com';

const DRAG_TOOLS = [
  { id: 'bracket', name: 'Bracket', icon: '🔲' },
  { id: 'caries_icon', name: 'Caries (Icono)', icon: '🔴' },
  { id: 'implante_icon', name: 'Implante (Icono)', icon: '🔩' },
  { id: 'endodoncia_icon', name: 'Endodoncia', icon: '⚡' },
];

const estadoColores = {
  Sano: 'bg-slate-200 text-slate-800 dark:bg-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600',
  Caries: 'bg-red-500 text-white border-red-600',
  Ausente: 'bg-slate-800 opacity-50 text-white border-slate-900',
  Prótesis: 'bg-purple-500 text-white border-purple-600',
  Implante: 'bg-emerald-500 text-white border-emerald-600',
  Gingivitis: 'bg-orange-500 text-white border-orange-600',
  Periodontitis: 'bg-yellow-600 text-white border-yellow-700'
};

const Odontograma = ({ pacienteId, modoSeleccion = false, dientesSeleccionados = [], onToggleDiente, tratamientos = [] }) => {
  const [dientes, setDientes] = useState([]);
  const [dienteSeleccionado, setDienteSeleccionado] = useState(null);
  const [mostrarModal, setMostrarModal] = useState(false);
  const [datosClinicos, setDatosClinicos] = useState({
    estado: 'Sano',
    surfaces: { vestibular: 'Sano', mesial: 'Sano', oclusal: 'Sano', distal: 'Sano', lingual: 'Sano' }
  });
  const [tratamientoRecomendado, setTratamientoRecomendado] = useState('');
  const [descripcionGeneral, setDescripcionGeneral] = useState('');

  // Nomenclatura FDI
  const cuadrante1 = [18, 17, 16, 15, 14, 13, 12, 11]; // Superior Derecho
  const cuadrante2 = [21, 22, 23, 24, 25, 26, 27, 28]; // Superior Izquierdo
  const cuadrante4 = [48, 47, 46, 45, 44, 43, 42, 41]; // Inferior Derecho
  const cuadrante3 = [31, 32, 33, 34, 35, 36, 37, 38]; // Inferior Izquierdo

  useEffect(() => {
    if (pacienteId) {
      cargarDientes();
    }
  }, [pacienteId]);

  const cargarDientes = async () => {
    try {
      const token = localStorage.getItem('access_token');
      if (!token) return;

      const res = await axios.get(`${API_BASE_URL}/api/dientes-paciente/?paciente=${pacienteId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDientes(res.data);
    } catch (error) {
      console.error("Error al cargar dientes", error);
    }
  };

  const abrirModal = (numeroDiente) => {
    if (modoSeleccion && onToggleDiente) {
      onToggleDiente(numeroDiente);
      return;
    }

    const dienteExistente = dientes.find(d => d.numero_diente === numeroDiente);
    setDienteSeleccionado(numeroDiente);
    setDatosClinicos(dienteExistente?.datos_clinicos || {
      estado: 'Sano',
      surfaces: { vestibular: 'Sano', mesial: 'Sano', oclusal: 'Sano', distal: 'Sano', lingual: 'Sano' }
    });
    setTratamientoRecomendado(dienteExistente ? dienteExistente.tratamiento_recomendado || '' : '');
    setDescripcionGeneral(dienteExistente ? dienteExistente.descripcion_general || '' : '');
    setMostrarModal(true);
  };

  const handleSurfaceChange = (surface, newStatus) => {
    setDatosClinicos(prev => ({
      ...prev,
      surfaces: { ...prev.surfaces, [surface]: newStatus }
    }));
  };

  const handleEstadoGeneralChange = (newStatus) => {
    setDatosClinicos(prev => ({
      ...prev,
      estado: newStatus
    }));
  };

  const [sugiriendoIA, setSugiriendoIA] = useState(false);

  const sugerirTratamientoIA = async () => {
    try {
      setSugiriendoIA(true);
      const token = localStorage.getItem('access_token');
      const res = await axios.post(`${API_BASE_URL}/api/ia/diagnostico/`, {
        datos_clinicos: datosClinicos
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDescripcionGeneral(res.data.diagnostico);
    } catch (error) {
      console.error("Error al sugerir tratamiento IA", error);
      alert("Error al sugerir tratamiento con IA. Intente de nuevo.");
    } finally {
      setSugiriendoIA(false);
    }
  };

  const handleDropImage = async (numeroDiente, imageType, x, y) => {
    const dienteExistente = dientes.find(d => d.numero_diente === numeroDiente);

    // We update local state in array directly or push a quick update
    // But since the current pattern has a modal state, we'll bypass the modal for D&D and save immediately.

    const token = localStorage.getItem('access_token');
    if (!token) return;
    const config = { headers: { Authorization: `Bearer ${token}` } };

    const currentDatosClinicos = dienteExistente?.datos_clinicos || {
      estado: 'Sano',
      surfaces: { vestibular: 'Sano', mesial: 'Sano', oclusal: 'Sano', distal: 'Sano', lingual: 'Sano' }
    };

    const existingImages = currentDatosClinicos.images || [];
    const updatedImages = [...existingImages, { type: imageType, x, y, scale: 1 }];

    const payload = {
      paciente: pacienteId,
      numero_diente: numeroDiente,
      datos_clinicos: {
        ...currentDatosClinicos,
        images: updatedImages
      },
      tratamiento_recomendado: dienteExistente ? dienteExistente.tratamiento_recomendado : '',
      notas: dienteExistente ? dienteExistente.notas : ''
    };

    try {
      if (dienteExistente) {
        await axios.put(`${API_BASE_URL}/api/dientes-paciente/${dienteExistente.id}/`, payload, config);
      } else {
        await axios.post(`${API_BASE_URL}/api/dientes-paciente/`, payload, config);
      }
      await cargarDientes();
    } catch (error) {
      console.error("Error al guardar imagen drag/drop", error);
    }
  };

  const removeImage = async (indexToRemove) => {
    // Only applied via modal
    setDatosClinicos(prev => {
      const newImages = (prev.images || []).filter((_, idx) => idx !== indexToRemove);
      return { ...prev, images: newImages };
    });
  };

  const handleDragStartTool = (e, toolId) => {
    e.dataTransfer.setData('imageType', toolId);
  };

  const guardarDiente = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('access_token');
      const config = { headers: { Authorization: `Bearer ${token}` } };
      const dienteExistente = dientes.find(d => d.numero_diente === dienteSeleccionado);

      const payload = {
        paciente: pacienteId,
        numero_diente: dienteSeleccionado,
        datos_clinicos: datosClinicos,
        tratamiento_recomendado: tratamientoRecomendado,
        descripcion_general: descripcionGeneral,
        notas: ''
      };

      if (dienteExistente) {
        // PUT
        await axios.put(`${API_BASE_URL}/api/dientes-paciente/${dienteExistente.id}/`, payload, config);
      } else {
        // POST
        await axios.post(`${API_BASE_URL}/api/dientes-paciente/`, payload, config);
      }

      await cargarDientes();
      setMostrarModal(false);
    } catch (error) {
      console.error("Error al guardar diente", error);
    }
  };

  const renderFilaDientes = (dientesArray) => (
    <div className="flex justify-center gap-1 sm:gap-2 lg:gap-4">
      {dientesArray.map(num => {
        const dienteExistente = dientes.find(d => d.numero_diente === num);
        // Map old data if needed or provide default
        const toothData = {
          estado: dienteExistente?.datos_clinicos?.estado || 'Sano',
          images: dienteExistente?.datos_clinicos?.images || [],
          surfaces: dienteExistente?.datos_clinicos?.surfaces || {
            vestibular: 'Sano', mesial: 'Sano', oclusal: 'Sano', distal: 'Sano', lingual: 'Sano'
          }
        };

        return (
          <DetailedTooth
            key={num}
            numero={num}
            toothData={toothData}
            isSelected={modoSeleccion ? dientesSeleccionados.some(d => d.numero === num) : dienteSeleccionado === num}
            onClick={() => abrirModal(num)}
            onDropImage={modoSeleccion ? null : handleDropImage}
          />
        );
      })}
    </div>
  );

  return (
    <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 p-6 mt-6">
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Odontograma</h3>

      {/* Herramientas Drag & Drop */}
      {!modoSeleccion && (
      <div className="mb-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700">
        <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-3">Herramientas (Arrastra al Diente)</h4>
        <div className="flex flex-wrap gap-3">
          {DRAG_TOOLS.map(tool => (
            <div
              key={tool.id}
              draggable
              onDragStart={(e) => handleDragStartTool(e, tool.id)}
              className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg cursor-grab hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-colors shadow-sm select-none"
            >
              <span className="text-lg">{tool.icon}</span>
              <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">{tool.name}</span>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Leyenda */}
      <div className="flex flex-wrap gap-3 mb-6">
        {Object.entries(estadoColores).map(([estado, clase]) => (
          <div key={estado} className="flex items-center gap-2">
            <div className={`w-4 h-4 rounded-full border ${clase.split(' ')[0]} ${clase.split(' ').find(c => c.startsWith('border-'))}`}></div>
            <span className="text-[10px] font-semibold text-slate-600 dark:text-slate-300 uppercase">{estado}</span>
          </div>
        ))}
      </div>

      {/* Grid Odontograma */}
      <div className="overflow-x-auto w-full pb-4">
        <div className="flex flex-col gap-4 bg-indigo-50/50 dark:bg-slate-900/50 p-6 rounded-2xl border border-indigo-100 dark:border-slate-700 min-w-[800px]">
          <div className="flex justify-center gap-4 sm:gap-8 border-b-2 border-slate-200 dark:border-slate-700 pb-4">
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 mb-2">Cuadrante 1</span>
              {renderFilaDientes(cuadrante1)}
            </div>
            <div className="w-0.5 bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex flex-col items-center">
              <span className="text-[10px] font-bold text-slate-400 mb-2">Cuadrante 2</span>
              {renderFilaDientes(cuadrante2)}
            </div>
          </div>

          <div className="flex justify-center gap-4 sm:gap-8 pt-2">
            <div className="flex flex-col items-center">
              {renderFilaDientes(cuadrante4)}
              <span className="text-[10px] font-bold text-slate-400 mt-2">Cuadrante 4</span>
            </div>
            <div className="w-0.5 bg-slate-200 dark:bg-slate-700"></div>
            <div className="flex flex-col items-center">
              {renderFilaDientes(cuadrante3)}
              <span className="text-[10px] font-bold text-slate-400 mt-2">Cuadrante 3</span>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Edición Diente */}
      {mostrarModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-[60] animate-in zoom-in-95">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-2xl w-[95%] md:w-full max-w-sm p-6 max-h-[90vh] overflow-y-auto">
            <h4 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Diente {dienteSeleccionado}</h4>
            <form onSubmit={guardarDiente} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Estado General del Diente</label>
                <select
                  className={`${inputClass} mt-1`}
                  value={datosClinicos.estado}
                  onChange={e => handleEstadoGeneralChange(e.target.value)}
                >
                  {Object.keys(estadoColores).map(estado => (
                    <option key={estado} value={estado}>{estado}</option>
                  ))}
                </select>
              </div>

              {/* Surface selectors */}
              {datosClinicos.estado !== 'Ausente' && (
                <div className="grid grid-cols-2 gap-2 mt-4">
                  {Object.keys(datosClinicos.surfaces || {}).map(surface => (
                    <div key={surface}>
                      <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">{surface}</label>
                      <select
                        className={`${inputClass} text-xs py-1 px-2 mt-1`}
                        value={datosClinicos.surfaces[surface]}
                        onChange={e => handleSurfaceChange(surface, e.target.value)}
                      >
                        {Object.keys(estadoColores).map(estado => (
                          <option key={estado} value={estado}>{estado}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              )}

              {/* Imágenes agregadas por D&D */}
              {datosClinicos.images && datosClinicos.images.length > 0 && (
                <div className="mt-4">
                  <label className="text-xs font-bold text-slate-500 uppercase ml-1 mb-2 block">Iconos Superpuestos</label>
                  <div className="space-y-2">
                    {datosClinicos.images.map((img, idx) => (
                      <div key={idx} className="flex justify-between items-center bg-slate-100 dark:bg-slate-700 px-3 py-2 rounded-lg">
                        <span className="text-xs font-medium text-slate-600 dark:text-slate-300">
                          {DRAG_TOOLS.find(t => t.id === img.type)?.icon} {DRAG_TOOLS.find(t => t.id === img.type)?.name || img.type}
                        </span>
                        <button type="button" onClick={() => removeImage(idx)} className="text-red-500 hover:text-red-700 text-xs font-bold">Quitar</button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-4">
                <label className="text-xs font-bold text-slate-500 uppercase ml-1">Tratamiento Recomendado</label>
                <select
                  className={`${inputClass} mt-1`}
                  value={tratamientoRecomendado}
                  onChange={e => setTratamientoRecomendado(e.target.value)}
                >
                  <option value="">Seleccione o deje en blanco...</option>
                  {tratamientos && tratamientos.map(t => (
                    <option key={t.id} value={t.nombre}>{t.nombre}</option>
                  ))}
                  {tratamientoRecomendado && !tratamientos.some(t => t.nombre === tratamientoRecomendado) && (
                    <option value={tratamientoRecomendado}>{tratamientoRecomendado} (Personalizado)</option>
                  )}
                </select>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between ml-1 mb-1">
                  <label className="text-xs font-bold text-slate-500 uppercase">Descripción General</label>
                  <button
                    type="button"
                    onClick={sugerirTratamientoIA}
                    disabled={sugiriendoIA}
                    className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-800 dark:hover:text-indigo-300 disabled:opacity-50"
                  >
                    <IconoSparkles />
                    {sugiriendoIA ? 'Cargando...' : 'Sugerir Tratamiento con IA'}
                  </button>
                </div>
                <textarea
                  className={`${inputClass} mt-1 min-h-[60px]`}
                  value={descripcionGeneral}
                  onChange={e => setDescripcionGeneral(e.target.value)}
                  placeholder="Descripción del estado o consideraciones..."
                ></textarea>
              </div>

              <div className="flex gap-3 pt-4">
                <button type="button" onClick={() => setMostrarModal(false)} className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-600 dark:text-slate-300 font-bold rounded-xl transition-colors">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md transition-colors">Guardar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Odontograma;