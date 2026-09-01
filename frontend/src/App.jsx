// --- VERSIÓN 14.2: CORRECCIÓN DE CRASHEO, TAMAÑO DE TELÉFONO Y CORREO OBLIGATORIO ---

import './index.css'
import { useEffect, useState, useMemo } from 'react'
import axios from 'axios'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import html2pdf from 'html2pdf.js';
import { useAuth } from './context/AuthContext';
import Login from './Login';
import ModalAjustarStock from './components/ModalAjustarStock';
import ModalNuevoPaciente from './components/ModalNuevoPaciente';
import ModalAgendarCita from './components/ModalAgendarCita';
import ModalEditarCita from './components/ModalEditarCita';
import FichaPaciente from './components/FichaPaciente';
import ChatAsistente from './components/ChatAsistente';
import { inputClass, IconoEditar, IconoEliminar, IconoFicha, IconoWapp } from './components/SharedConstants';
import { Search, Building2, ChevronLeft, ChevronRight, Info, DollarSign, CheckCircle2, AlertCircle, LogOut, Sun, Moon, CalendarDays, BarChart3, Package, Menu, X } from 'lucide-react';

// Estilo base para los inputs (Adaptado a diseño limpio y modo nocturno estándar)
// --- ICONOS SVG (SIMBOLOGÍA UX SUGERIDA POR EL PROFESOR) ---
function App() {
  const API_BASE_URL = 'https://sistema-clinica-1.onrender.com';
  const { usuario, loading, logout } = useAuth();

  const [doctores, setDoctores] = useState([]);
  const [pacientes, setPacientes] = useState([]);
  const [citas, setCitas] = useState([]);
  const [tratamientos, setTratamientos] = useState([]);
  const [materiales, setMateriales] = useState([]);
  
  const [modoOscuro, setModoOscuro] = useState(false);
  const [vistaActual, setVistaActual] = useState("agenda"); 
  
  const [busqueda, setBusqueda] = useState(""); 
  const [busquedaCita, setBusquedaCita] = useState(""); 
  const [busquedaPaciente, setBusquedaPaciente] = useState("");
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [menuAbierto, setMenuAbierto] = useState(false);
  const [paginaPacientes, setPaginaPacientes] = useState(1);
  const [paginaCitas, setPaginaCitas] = useState(1);
  const [configOrden, setConfigOrden] = useState({ llave: 'bruto', direccion: 'desc' });

  const [mostrarModalCita, setMostrarModalCita] = useState(false);
  const [mostrarModal, setMostrarModal] = useState(false); 
  const [mostrarFicha, setMostrarFicha] = useState(false);
  const [editandoCita, setEditandoCita] = useState(false);
  const [editandoPaciente, setEditandoPaciente] = useState(false);
  const [mostrarModalMaterial, setMostrarModalMaterial] = useState(false);

  const [pacienteSeleccionado, setPacienteSeleccionado] = useState(null);
  const [citaSeleccionada, setCitaSeleccionada] = useState({ doctor_id: "", duracion: 0 });

  const [nuevoPaciente, setNuevoPaciente] = useState({ nombre: '', apellido: '', cedula: '', prefijo: '414', numeroBase: '', email: '', fecha_nacimiento: '', sexo: '', tipo_sangre: '', direccion: '', foto: null });
  const [nuevaCita, setNuevaCita] = useState({ paciente: '', fecha: '', hora: '', tratamiento_id: '', notas_medicas: '', doctor_id: '', monto_pagado_adelantado: '', monto_pagado_dia: '', metodo_pago: 'Efectivo', dientes_tratados: [] });
  const [nuevoMovimiento, setNuevoMovimiento] = useState({ material_id: '', tipo: 'Entrada', cantidad: 0, nota: '' });

  useEffect(() => {
    if (modoOscuro) document.documentElement.classList.add('dark');
    else document.documentElement.classList.remove('dark');
  }, [modoOscuro]);

  const obtenerCitas = () => axios.get(`${API_BASE_URL}/api/citas/`).then(res => setCitas(res.data));

  useEffect(() => {
    if (vistaActual === 'agenda' && usuario) {
      obtenerCitas();
    }
  }, [vistaActual, usuario]);

  useEffect(() => {
    if (!usuario) return;
    const cargarDatosIniciales = async () => {
        try {
            const [resDoctores, resPacientes, resCitas, resMateriales, resTratamientos] = await Promise.all([
                axios.get(`${API_BASE_URL}/api/doctors/`),
                axios.get(`${API_BASE_URL}/api/pacientes/`),
                axios.get(`${API_BASE_URL}/api/citas/`),
                axios.get(`${API_BASE_URL}/api/materiales/`),
                axios.get(`${API_BASE_URL}/api/tratamientos/`)
            ]);
            setDoctores(resDoctores.data);
            setPacientes(resPacientes.data);
            setCitas(resCitas.data);
            setMateriales(resMateriales.data);
            setTratamientos(resTratamientos.data);
        } catch (error) { console.error("Error:", error); }
    };
    cargarDatosIniciales();
  }, [usuario]);

  // BUSCADOR MULTICRITERIO INTELIGENTE DE CITAS
  const citasFiltradas = useMemo(() => {
    return citas.filter(cita => {
      const p = pacientes.find(pac => pac.id === cita.paciente);
      if (!p) return false;

      let pasaFecha = true;
      if (fechaInicio && fechaFin) pasaFecha = cita.fecha >= fechaInicio && cita.fecha <= fechaFin;
      else if (fechaInicio) pasaFecha = cita.fecha >= fechaInicio;
      else if (fechaFin) pasaFecha = cita.fecha <= fechaFin;

      const terminos = busquedaCita.toLowerCase().split(" ").filter(t => t !== "");
      const infoPaciente = `${p.nombre} ${p.apellido} ${p.cedula}`.toLowerCase();
      const pasaBusqueda = terminos.every(termino => infoPaciente.includes(termino));

      return pasaFecha && pasaBusqueda;
    });
  }, [citas, pacientes, busquedaCita, fechaInicio, fechaFin]);

  // BUSCADOR MULTICRITERIO DE PACIENTES
  const pacientesFiltrados = useMemo(() => {
    return pacientes.filter(p => {
      const terminos = busqueda.toLowerCase().split(" ").filter(t => t !== "");
      const info = `${p.nombre} ${p.apellido} ${p.cedula} ${p.telefono} ${p.email}`.toLowerCase();
      return terminos.every(t => info.includes(t));
    });
  }, [pacientes, busqueda]);

  // DATOS PARA FINANZAS Y GRÁFICOS
  const datosProcesados = tratamientos.map(serv => {
    const citasDelServicio = citasFiltradas.filter(c => c.tratamiento === serv.id || c.motivo === serv.nombre);
    const cantidad = citasDelServicio.length;
    const bruto = citasDelServicio.reduce((acc, c) => acc + parseFloat(c.costo_total || 0), 0);
    const recaudado = citasDelServicio.reduce((acc, c) => acc + (parseFloat(c.monto_pagado_adelantado || 0) + parseFloat(c.monto_pagado_dia || 0)), 0);
    const deuda = Math.max(0, bruto - recaudado);
    
    return { nombre: serv.nombre, nombreCorto: serv.nombre.length > 15 ? serv.nombre.substring(0, 15) + "..." : serv.nombre, cantidad, bruto, recaudado, deuda };
  });

  const datosOrdenados = [...datosProcesados].sort((a, b) => {
    if (a[configOrden.llave] < b[configOrden.llave]) return configOrden.direccion === 'asc' ? -1 : 1;
    if (a[configOrden.llave] > b[configOrden.llave]) return configOrden.direccion === 'asc' ? 1 : -1;
    return 0;
  });

  const citasManana = citas.filter(c => c.fecha === new Date(Date.now() + 86400000).toISOString().split('T')[0]);

  // FUNCIONES DE API
  const obtenerMateriales = () => axios.get(`${API_BASE_URL}/api/materiales/`).then(res => setMateriales(res.data));
  const obtenerPacientes = () => axios.get(`${API_BASE_URL}/api/pacientes/`).then(res => setPacientes(res.data));

  // --- ESCUDO DE SEGURIDAD PARA EVITAR PANTALLA EN BLANCO ---
  const idTratSeguro = nuevaCita.tratamiento_id ? String(nuevaCita.tratamiento_id) : "";
  const tratamientoSeleccionadoObj = tratamientos.find(t => String(t.id) === idTratSeguro);

  const duracionEnTiempoReal = useMemo(() => {
    if (!tratamientoSeleccionadoObj) return 0;
    if (nuevaCita.dientes_tratados && nuevaCita.dientes_tratados.length > 0) {
      const numDientes = nuevaCita.dientes_tratados.length;
      const duracionBase = parseInt(tratamientoSeleccionadoObj.duracion || 0);
      const duracionAdicional = parseInt(tratamientoSeleccionadoObj.duracion_adicional || 0);
      return duracionBase + (duracionAdicional * (numDientes - 1));
    }
    return tratamientoSeleccionadoObj.duracion;
  }, [tratamientoSeleccionadoObj, nuevaCita.dientes_tratados]);

  const costoEnTiempoReal = useMemo(() => {
    if (!tratamientoSeleccionadoObj) return 0;
    if (nuevaCita.dientes_tratados && nuevaCita.dientes_tratados.length > 0) {
      const numDientes = nuevaCita.dientes_tratados.length;
      const precioBase = parseFloat(tratamientoSeleccionadoObj.precio || 0);
      const precioAdicional = parseFloat(tratamientoSeleccionadoObj.precio_adicional || 0);
      return precioBase + (precioAdicional * (numDientes - 1));
    }
    return parseFloat(tratamientoSeleccionadoObj.precio);
  }, [tratamientoSeleccionadoObj, nuevaCita.dientes_tratados]);

  const guardarCita = (e) => {
    e.preventDefault();

    // 1. ESCUDO: Validar que realmente se hizo clic en un paciente de la lista
    if (!nuevaCita.paciente) {
      alert("⚠️ Por favor, selecciona un paciente haciendo clic en la lista de sugerencias.");
      return;
    }

    const tratSeleccionado = tratamientos.find(t => t.id.toString() === nuevaCita.tratamiento_id.toString());
    const costo = costoEnTiempoReal;
    const duracion = duracionEnTiempoReal;
    
    const montoAdelantadoFinal = parseFloat(nuevaCita.monto_pagado_adelantado) || 0;

    const citaParaEnviar = { 
      ...nuevaCita, 
      doctor: nuevaCita.doctor_id, 
      tratamiento: nuevaCita.tratamiento_id, 
      dientes_tratados: nuevaCita.dientes_tratados,
      costo_total: costo, 
      duracion_estimada: duracion, 
      monto_pagado_adelantado: montoAdelantadoFinal,
      monto_pagado_dia: 0 // 2. ESCUDO: Forzamos 0 para que Django no colapse
    };
    
    delete citaParaEnviar.doctor_id; 
    delete citaParaEnviar.tratamiento_id;
    
    axios.post(`${API_BASE_URL}/api/citas/`, citaParaEnviar)
      .then(() => { 
          obtenerCitas(); 
          obtenerMateriales(); 
          setMostrarModalCita(false); 
          setNuevaCita({ paciente: '', fecha: '', hora: '', tratamiento_id: '', notas_medicas: '', doctor_id: '', monto_pagado_adelantado: '', monto_pagado_dia: '', metodo_pago: 'Efectivo', dientes_tratados: [] });
          setBusquedaPaciente(''); 
      })
      .catch(err => {
          // 3. MEJORA: Mostramos el error REAL que envía Django
          const errorReal = err.response?.data;
          if (errorReal && errorReal.error) {
             alert("📦 Inventario: " + errorReal.error);
          } else {
             alert("⚠️ Error del servidor: " + JSON.stringify(errorReal || err.message));
          }
      });
  };







  const actualizarCita = async (e) => {
    e.preventDefault();
    const montoDiaFinal = parseFloat(citaSeleccionada.monto_pagado_dia) || 0;
    const citaData = {
      ...citaSeleccionada,
      costo_total: parseFloat(citaSeleccionada.costo_total),
      monto_pagado_adelantado: parseFloat(citaSeleccionada.monto_pagado_adelantado),
      monto_pagado_dia: montoDiaFinal,
      estado_asistencia: citaSeleccionada.estado_asistencia || "Pendiente"
    };

    try {
      await axios.put(`${API_BASE_URL}/api/citas/${citaSeleccionada.id}/`, citaData);
      await obtenerCitas();
      setEditandoCita(false);
      alert("Cita actualizada");
    } catch (err) {
        console.error(err);
        if (err.response && err.response.data) {
          const mensajes = Object.values(err.response.data).flat().join('\n');
          alert(`Error al actualizar la cita:\n${mensajes}`);
        } else {
          alert("Error de conexión o servidor al actualizar la cita.");
        }
    }
  };

  const eliminarCita = (id) => {
    if (window.confirm("¿Anular cita permanentemente?")) axios.delete(`${API_BASE_URL}/api/citas/${id}/`).then(() => obtenerCitas()); 
  };

  const obtenerEstadoHora = (horaRevision) => {
    if (!nuevaCita.doctor_id || !nuevaCita.fecha || !horaRevision) return 'text-slate-400';
    const [hRev, mRev] = horaRevision.split(':');
    const inicioNueva = parseInt(hRev) * 60 + parseInt(mRev);
    const finNueva = inicioNueva + (duracionEnTiempoReal || 30);
    if (finNueva > 1020) return 'text-red-500'; 
    
    const ocupado = citas.some(c => {
      if (!c.hora || !c.fecha || !c.doctor) return false;
      if (c.fecha.split('T')[0] !== nuevaCita.fecha || String(c.doctor?.id || c.doctor) !== String(nuevaCita.doctor_id)) return false;
      const [hC, mC] = c.hora.split(':');
      const iniEx = parseInt(hC) * 60 + parseInt(mC);
      const finEx = iniEx + (parseInt(c.duracion_estimada) || 30);
      return inicioNueva < finEx && finNueva > iniEx;
    });
    return ocupado ? 'text-red-500 font-bold dark:text-red-400' : 'text-green-600 font-bold dark:text-green-400';
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    const formData = new FormData();
    formData.append('nombre', nuevoPaciente.nombre);
    formData.append('apellido', nuevoPaciente.apellido);
    formData.append('cedula', nuevoPaciente.cedula);
    formData.append('telefono', `${nuevoPaciente.prefijo || "414"}${nuevoPaciente.numeroBase || ""}`);
    formData.append('email', nuevoPaciente.email);
    formData.append('fecha_nacimiento', nuevoPaciente.fecha_nacimiento);
    formData.append('sexo', nuevoPaciente.sexo);
    formData.append('tipo_sangre', nuevoPaciente.tipo_sangre);
    formData.append('direccion', nuevoPaciente.direccion);
    if (nuevoPaciente.foto) {
      formData.append('foto', nuevoPaciente.foto);
    }

    axios.post(`${API_BASE_URL}/api/pacientes/`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    })
      .then(() => { obtenerPacientes(); setMostrarModal(false); setNuevoPaciente({ nombre: '', apellido: '', cedula: '', prefijo: '414', numeroBase: '', email: '', fecha_nacimiento: '', sexo: '', tipo_sangre: '', direccion: '', foto: null }); })
      .catch(err => { let msj = "Error:\n"; for (let c in err.response?.data) msj += `${c}: ${err.response.data[c]}\n`; alert(msj); });
  };

  const actualizarPaciente = (e) => { e.preventDefault(); axios.put(`${API_BASE_URL}/api/pacientes/${pacienteSeleccionado.id}/`, pacienteSeleccionado).then(() => { obtenerPacientes(); setEditandoPaciente(false); alert("Paciente actualizado"); }); };
  const eliminarPaciente = (id) => { if (window.confirm("¿Eliminar paciente por completo?")) axios.delete(`${API_BASE_URL}/api/pacientes/${id}/`).then(() => { obtenerPacientes(); obtenerCitas(); }); };
  
  const guardarMovimiento = (e) => {
    e.preventDefault();
    axios.post(`${API_BASE_URL}/api/movimientos-inventario/`, { material: nuevoMovimiento.material_id, tipo: nuevoMovimiento.tipo, cantidad: parseInt(nuevoMovimiento.cantidad), nota: nuevoMovimiento.nota })
      .then(() => { obtenerMateriales(); setMostrarModalMaterial(false); setNuevoMovimiento({ material_id: '', tipo: 'Entrada', cantidad: 0, nota: '' }); alert("Stock actualizado"); })
      .catch(err => alert("Error: " + (err.response?.data?.message || "Revisa los datos.")));
  };

  const obtenerAnalisisIA = () => {
    const deudaTotal = citas.reduce((acc, c) => acc + (parseFloat(c.costo_total) - (parseFloat(c.monto_pagado_adelantado || 0) + parseFloat(c.monto_pagado_dia || 0))), 0);
    if (pacientes.length === 0) return "Aún no tengo datos para analizar.";
    let sugerencia = deudaTotal > 500 ? "Mora alta detectada." : citas.length < pacientes.length ? "Pacientes inactivos. Sugiere chequeo." : "Operatividad óptima.";
    return `IA: ${pacientes.length} Pacientes. Deuda: $${Math.max(0, deudaTotal).toFixed(2)}. ${sugerencia}`;
  };

  const generarPDF = () => {
    if (!citaSeleccionada) return;
    html2pdf().from(document.getElementById('recibo-dental-pro')).set({ margin: 0.5, filename: `Recibo_${String(citaSeleccionada.id).substring(0, 6)}.pdf`, image: { type: 'jpeg', quality: 0.98 }, html2canvas: { scale: 3, useCORS: true }, jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' } }).save();
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 text-indigo-500 font-bold text-xl">Cargando Sistema...</div>;
  if (!usuario) return <Login />;

  return (
    <div className="min-h-screen p-4 md:p-8 transition-colors duration-500 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 font-sans">
      
      {/* MENÚ DE NAVEGACIÓN */}
      <nav className="flex flex-col md:flex-row md:flex-nowrap items-center justify-between gap-4 mb-8 bg-white dark:bg-slate-800 p-3 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 w-full max-w-7xl mx-auto">
        <div className="flex items-center justify-between w-full md:w-auto">
          <div className="flex items-center gap-2">
            <div className="bg-indigo-600 p-2.5 rounded-2xl text-white shadow-md">
              <Building2 className="w-6 h-6" />
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-indigo-900 dark:text-white">Dental<span className="text-indigo-500">Pro</span></span>
          </div>
          <div className="flex md:hidden items-center gap-3">
            <button onClick={() => setModoOscuro(!modoOscuro)} className="p-2.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" title="Cambiar Tema">
              {modoOscuro ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button onClick={() => setMenuAbierto(!menuAbierto)} className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors">
              {menuAbierto ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        <div className={`${menuAbierto ? 'flex' : 'hidden'} md:flex flex-col md:flex-row items-center gap-2 bg-slate-100 dark:bg-slate-900 p-1.5 rounded-2xl w-full md:w-auto justify-center`}>
          <button
            onClick={() => { setVistaActual("agenda"); setMenuAbierto(false); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all w-full md:w-auto justify-center ${vistaActual === 'agenda' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <CalendarDays className="w-4 h-4" />
            Agenda
          </button>

          <button
            onClick={() => { setVistaActual("reportes"); setMenuAbierto(false); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all w-full md:w-auto justify-center ${vistaActual === 'reportes' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <BarChart3 className="w-4 h-4" />
            Finanzas
          </button>

          <button
            onClick={() => { setVistaActual("inventario"); setMenuAbierto(false); }}
            className={`flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all w-full md:w-auto justify-center ${vistaActual === 'inventario' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
          >
            <Package className="w-4 h-4" />
            Inventario
          </button>
        </div>

        <div className={`${menuAbierto ? 'flex' : 'hidden'} md:flex items-center justify-center gap-3 w-full md:w-auto`}>
          <button onClick={() => setModoOscuro(!modoOscuro)} className="hidden md:block p-2.5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors" title="Cambiar Tema">
            {modoOscuro ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>
          <button onClick={logout} className="flex md:inline-flex w-full md:w-auto items-center justify-center gap-2 p-2.5 rounded-xl md:rounded-full bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/50 transition-colors" title="Cerrar Sesión">
            <LogOut className="w-5 h-5" />
            <span className="md:hidden font-bold">Cerrar Sesión</span>
          </button>
        </div>
      </nav>
      
      {vistaActual === "agenda" && (
        <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in">
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* COLUMNA IZQUIERDA: PACIENTES */}
            <div className="lg:col-span-1 space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Pacientes</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Directorio clínico</p>
                </div>
                <button onClick={() => setMostrarModal(true)} className="bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 font-bold py-2 px-4 rounded-xl hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors text-sm">+ Nuevo</button>
              </div>

              <div className="bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden flex flex-col h-[650px]">
                <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                  <div className="relative">
                    <span className="absolute left-3 top-2.5 text-slate-400"><Search className="w-5 h-5" /></span>
                    <input type="text" placeholder="Buscar paciente..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-700 dark:text-slate-200 transition-all" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
                  </div>
                </div>
                
                <div className="flex-1 overflow-y-auto p-2 space-y-2">
                  {pacientesFiltrados.slice((paginaPacientes - 1) * 6, paginaPacientes * 6).map(p => (
                    <div key={p.id} className="flex justify-between items-center p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group border border-transparent hover:border-slate-100 dark:hover:border-slate-700">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 font-bold text-sm">
                          {p.nombre.charAt(0)}{p.apellido.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">{p.nombre} {p.apellido}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400">{p.telefono}</p>
                        </div>
                      </div>
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => { setPacienteSeleccionado(p); setMostrarFicha(true); setEditandoPaciente(false); }} title="Ver Ficha" className="p-2 rounded-full text-slate-400 hover:text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-500/10 transition-colors"><IconoFicha /></button>
                        <button onClick={() => eliminarPaciente(p.id)} title="Eliminar Paciente" className="p-2 rounded-full text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 transition-colors"><IconoEliminar /></button>
                      </div>
                    </div>
                  ))}
                  {pacientesFiltrados.length === 0 && <p className="text-center text-slate-400 text-sm py-10">No hay pacientes.</p>}
                </div>
                
                <div className="p-3 border-t border-slate-100 dark:border-slate-700 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
                  <button disabled={paginaPacientes === 1} onClick={() => setPaginaPacientes(p => p - 1)} className="p-2 text-slate-500 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <span className="text-xs font-bold text-slate-500">Pág {paginaPacientes} de {Math.ceil(pacientesFiltrados.length / 6) || 1}</span>
                  <button disabled={paginaPacientes >= Math.ceil(pacientesFiltrados.length / 6)} onClick={() => setPaginaPacientes(p => p + 1)} className="p-2 text-slate-500 disabled:opacity-30 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            {/* COLUMNA DERECHA: AGENDA Y CITAS */}
            <div className="lg:col-span-2 space-y-6">
              
              {/* HEADER Y FILTROS DE CITAS */}
              <div className="bg-white dark:bg-slate-800 rounded-3xl p-5 border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col xl:flex-row gap-4 justify-between items-center">
                <div>
                  <h2 className="text-xl font-bold text-slate-800 dark:text-white">Citas Programadas</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Próximos tratamientos</p>
                </div>
                
                <div className="flex flex-col sm:flex-row gap-3 w-full xl:w-auto">
                  {/* Buscador de Citas Ampliado */}
                  <div className="relative flex-1 sm:min-w-[200px]">
                    <span className="absolute left-3 top-2.5 text-slate-400"><Search className="w-5 h-5" /></span>
                    <input type="text" placeholder="Buscar cita..." className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-none outline-none focus:ring-2 focus:ring-indigo-500 text-sm text-slate-700 dark:text-slate-200 transition-all" value={busquedaCita} onChange={(e) => setBusquedaCita(e.target.value)} />
                  </div>
                  
                  {/* Selector de Fechas Compacto */}
                  <div className="flex items-center bg-slate-50 dark:bg-slate-900 rounded-xl px-2 py-1">
                     <input type="date" title="Desde" className="bg-transparent text-xs text-slate-600 dark:text-slate-300 outline-none w-28 [color-scheme:light] dark:[color-scheme:dark] cursor-pointer" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}/>
                     <span className="text-slate-300 dark:text-slate-600 mx-1">-</span>
                     <input type="date" title="Hasta" className="bg-transparent text-xs text-slate-600 dark:text-slate-300 outline-none w-28 [color-scheme:light] dark:[color-scheme:dark] cursor-pointer" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}/>
                     {(fechaInicio || fechaFin) && <button onClick={() => { setFechaInicio(""); setFechaFin(""); }} className="ml-1 text-slate-400 hover:text-red-500">✕</button>}
                  </div>

                  <button onClick={() => setMostrarModalCita(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-2.5 px-6 rounded-xl shadow-md shadow-indigo-200 dark:shadow-none transition-all text-sm whitespace-nowrap">
                    + Agendar
                  </button>
                </div>
              </div>

              {/* LISTA DE CITAS (GRID) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {citasFiltradas.length > 0 ? (
                  citasFiltradas.slice((paginaCitas - 1) * 6, paginaCitas * 6).map(cita => {
                    const p = pacientes.find(pac => pac.id === cita.paciente);
                    const doc = doctores.find(d => d.id === cita.doctor);
                    const treat = tratamientos.find(t => t.id === cita.tratamiento);
                    const pagado = parseFloat(cita.monto_pagado_adelantado || 0) + parseFloat(cita.monto_pagado_dia || 0);
                    const deuda = parseFloat(cita.costo_total || 0) - pagado;
                    const isPagado = deuda <= 0 && parseFloat(cita.costo_total || 0) > 0;
                    
                    const statusConfig = isPagado ? { bg: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400', dot: 'bg-green-500', text: 'Pagado' } : pagado > 0 ? { bg: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400', dot: 'bg-amber-500', text: 'Abonado' } : { bg: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400', dot: 'bg-red-500', text: 'Pendiente' };

                    const isCanceladoONoAsistio = cita.estado_asistencia === 'Cancelado' || cita.estado_asistencia === 'No Asistió';

                    return (
                      <div key={cita.id} className={`bg-white dark:bg-slate-800 p-5 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm hover:shadow-md transition-all relative flex flex-col group ${isCanceladoONoAsistio ? 'opacity-60 grayscale' : ''}`}>
                        
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex gap-2">
                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border ${statusConfig.bg}`}>
                              <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.dot}`}></span> {statusConfig.text}
                            </div>
                            <div className={`px-2.5 py-1 rounded-full text-[10px] font-bold flex items-center gap-1.5 border ${isCanceladoONoAsistio ? 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-700 dark:text-slate-300 dark:border-slate-600' : 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800'}`}>
                              {cita.estado_asistencia || 'Pendiente'}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{cita.fecha}</p>
                            <p className="text-xs text-indigo-500 font-semibold">{cita.hora}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-slate-700 flex items-center justify-center text-xl shadow-inner shrink-0">🦷</div>
                          <div className="min-w-0">
                            <h3 className="font-bold text-slate-800 dark:text-white leading-tight truncate w-full">{p?.nombre} {p?.apellido}</h3>
                            <p className="text-xs text-slate-500 dark:text-slate-400 truncate w-full">{treat?.nombre || cita.motivo}</p>
                          </div>
                        </div>

                        <div className="mt-auto bg-slate-50 dark:bg-slate-900/50 p-3 rounded-2xl flex justify-between items-center border border-slate-100 dark:border-slate-700/50">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center text-[10px]">👨‍⚕️</div>
                            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate max-w-[80px]">{doc?.apellido || 'N/A'}</span>
                          </div>
                          
                          {/* BOTONES DE ACCIÓN SIMBÓLICOS */}
                          <div className="flex gap-1">
                            <button onClick={() => {setCitaSeleccionada(cita); setEditandoCita(true);}} title="Editar/Cobrar" className="p-2 rounded-xl text-slate-400 hover:text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-500/20 transition-colors"><IconoEditar /></button>
                            <button onClick={() => window.open(`https://wa.me/${p?.telefono?.replace(/\D/g,'')}?text=Hola ${p?.nombre}, le recordamos su cita en Dental Pro el ${cita.fecha} a las ${cita.hora}.`, '_blank')} title="Notificar WhatsApp" className="p-2 rounded-xl text-slate-400 hover:text-green-500 hover:bg-green-50 dark:hover:bg-green-500/20 transition-colors"><IconoWapp /></button>
                            <button onClick={() => eliminarCita(cita.id)} title="Anular Cita" className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/20 transition-colors"><IconoEliminar /></button>
                          </div>
                        </div>

                      </div>
                    );
                  })
                ) : (
                  <div className="col-span-full py-20 text-center bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-slate-200 dark:border-slate-700">
                    <div className="text-4xl mb-3 opacity-50">🗓️</div>
                    <p className="text-sm font-semibold text-slate-500 dark:text-slate-400">No hay citas registradas en esta fecha.</p>
                  </div>
                )}
              </div>

              {/* PAGINACIÓN CITAS */}
              {citasFiltradas.length > 6 && (
                <div className="flex justify-center items-center gap-4 mt-6">
                  <button disabled={paginaCitas === 1} onClick={() => setPaginaCitas(p => p - 1)} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700">ANTERIOR</button>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Pág {paginaCitas} de {Math.ceil(citasFiltradas.length / 6)}</span>
                  <button disabled={paginaCitas >= Math.ceil(citasFiltradas.length / 6)} onClick={() => setPaginaCitas(p => p + 1)} className="px-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold text-slate-600 dark:text-slate-300 disabled:opacity-30 shadow-sm transition-colors hover:bg-slate-50 dark:hover:bg-slate-700">SIGUIENTE</button>
                </div>
              )}
            </div>

          </div>
        </div>
      )}

      {/* VISTA REPORTES (FINANZAS) */}
      {vistaActual === "reportes" && (
        <div className="max-w-7xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
          
          <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white dark:bg-slate-800 p-5 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700">
            <div>
              <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Financiero</h2>
              <p className="text-sm text-slate-500 dark:text-slate-400">Resumen y métricas de clínica</p>
            </div>
            
            {/* Buscador de Fechas Finanzas */}
            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-700 w-full md:w-auto">
               <div className="flex flex-col px-3"><label className="text-[9px] font-bold text-indigo-500 uppercase">Desde</label><input type="date" className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none w-28 md:w-auto [color-scheme:light] dark:[color-scheme:dark] cursor-pointer" value={fechaInicio} onChange={(e) => setFechaInicio(e.target.value)}/></div>
               <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700"></div>
               <div className="flex flex-col px-3"><label className="text-[9px] font-bold text-indigo-500 uppercase">Hasta</label><input type="date" className="bg-transparent text-sm font-semibold text-slate-700 dark:text-slate-200 outline-none w-28 md:w-auto [color-scheme:light] dark:[color-scheme:dark] cursor-pointer" value={fechaFin} onChange={(e) => setFechaFin(e.target.value)}/></div>
               {(fechaInicio || fechaFin) && <button onClick={() => { setFechaInicio(""); setFechaFin(""); }} className="p-2 hover:bg-red-50 dark:hover:bg-red-500/20 text-red-400 rounded-xl mr-1 transition-colors"><IconoEliminar /></button>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-indigo-600 p-6 rounded-3xl shadow-md text-white relative overflow-hidden flex flex-col justify-center">
              <div className="absolute -right-4 -top-4 opacity-20"><Info className="w-24 h-24" /></div>
              <p className="text-xs font-bold text-indigo-200 uppercase tracking-widest mb-1 relative z-10">Citas Filtro</p>
              <p className="text-4xl font-black relative z-10">{citasFiltradas.length}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-1"><div className="p-2 bg-blue-50 dark:bg-blue-500/10 rounded-xl text-blue-500"><DollarSign className="w-4 h-4" /></div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Total Bruto</p></div>
              <p className="text-3xl font-black text-slate-800 dark:text-white">${citasFiltradas.reduce((acc, c) => acc + parseFloat(c.costo_total || 0), 0).toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-1"><div className="p-2 bg-green-50 dark:bg-green-500/10 rounded-xl text-green-500"><CheckCircle2 className="w-4 h-4" /></div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Recaudado</p></div>
              <p className="text-3xl font-black text-slate-800 dark:text-white">${citasFiltradas.reduce((acc, c) => acc + (parseFloat(c.monto_pagado_adelantado || 0) + parseFloat(c.monto_pagado_dia || 0)), 0).toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-1"><div className="p-2 bg-red-50 dark:bg-red-500/10 rounded-xl text-red-500"><AlertCircle className="w-4 h-4" /></div><p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Deuda</p></div>
              <p className="text-3xl font-black text-slate-800 dark:text-white">${Math.max(0, citasFiltradas.reduce((acc, c) => acc + parseFloat(c.costo_total || 0), 0) - citasFiltradas.reduce((acc, c) => acc + (parseFloat(c.monto_pagado_adelantado || 0) + parseFloat(c.monto_pagado_dia || 0)), 0)).toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-800 p-6 md:p-8 rounded-[32px] shadow-sm border border-slate-100 dark:border-slate-700 h-[350px] md:h-[400px]">
             <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-6">Comparativa de Tratamientos (Ingresos vs Deuda)</h3>
             <ResponsiveContainer width="100%" height="90%">
               <BarChart data={datosOrdenados} margin={{ top: 0, right: 0, left: -20, bottom: 0 }} barGap={6}>
                 <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={modoOscuro ? '#334155' : '#f1f5f9'} />
                 <XAxis dataKey="nombreCorto" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} interval={0} angle={-30} textAnchor="end" height={60}/>
                 <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 11, fontWeight: 600}} />
                 <Tooltip cursor={{fill: modoOscuro ? '#1e293b' : '#f8fafc', opacity: 0.5}} contentStyle={{ borderRadius: '16px', border: 'none', backgroundColor: modoOscuro ? '#0f172a' : 'white', color: modoOscuro ? '#f8fafc' : '#0f172a', padding: '12px', boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)' }} />
                 <Bar dataKey="recaudado" name="Recaudado" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={14} />
                 <Bar dataKey="deuda" name="Por Cobrar" fill="#cbd5e1" radius={[6, 6, 0, 0]} barSize={14} />
               </BarChart>
             </ResponsiveContainer>
          </div>

          {/* TABLA DE FINANZAS RESTAURADA Y ESTILIZADA */}
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                  <tr className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                    <th className="p-5">Servicio / Tratamiento</th>
                    {[ { label: 'Cant. Citas', key: 'cantidad'}, { label: 'Bruto', key: 'bruto'}, { label: 'Recaudado', key: 'recaudado', color: 'text-green-600 dark:text-green-500' }, { label: 'Deuda', key: 'deuda', color: 'text-red-500 dark:text-red-500' }].map(col => (
                      <th key={col.key} onClick={() => setConfigOrden({ llave: col.key, direccion: configOrden.llave === col.key && configOrden.direccion === 'desc' ? 'asc' : 'desc' })} className={`p-5 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-700/50 text-right transition-colors ${col.color || ''}`}>
                        <div className="flex items-center justify-end gap-1">{col.label} <span className="text-[8px]">{configOrden.llave === col.key ? (configOrden.direccion === 'desc' ? '▼' : '▲') : '↕'}</span></div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {datosOrdenados.map((item, i) => (
                    <tr key={i} className={`hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors ${item.cantidad === 0 ? 'opacity-40' : ''}`}>
                      <td className="p-5 text-sm font-bold text-slate-700 dark:text-slate-200">{item.nombre}</td>
                      <td className="p-5 text-sm font-semibold text-slate-500 dark:text-slate-400 text-center">{item.cantidad}</td>
                      <td className="p-5 text-sm font-bold text-slate-700 dark:text-slate-200 text-right">${item.bruto.toFixed(2)}</td>
                      <td className="p-5 text-sm font-bold text-green-600 text-right">${item.recaudado.toFixed(2)}</td>
                      <td className="p-5 text-sm font-bold text-red-500 text-right">${item.deuda.toFixed(2)}</td>
                    </tr>
                  ))}
                  {datosOrdenados.length === 0 && <tr><td colSpan="5" className="p-10 text-center text-slate-400 text-sm">No hay datos financieros.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* VISTA INVENTARIO */}
      {vistaActual === "inventario" && (
        <div className="max-w-6xl mx-auto space-y-6 animate-in slide-in-from-bottom-4">
          <div className="flex flex-col sm:flex-row justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 gap-4">
            <div><h2 className="text-2xl font-bold text-slate-800 dark:text-white">Inventario Dental</h2><p className="text-sm text-slate-500 dark:text-slate-400">Control de insumos y materiales</p></div>
            <button onClick={() => setMostrarModalMaterial(true)} className="w-full sm:w-auto bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-6 rounded-xl transition-all shadow-md shadow-amber-200 dark:shadow-none text-sm whitespace-nowrap">+ Ajustar Stock</button>
          </div>
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
            <div className="overflow-x-auto w-full">
              <table className="w-full text-left border-collapse min-w-[600px]">
                <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-700">
                  <tr className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest"><th className="p-5">Insumo</th><th className="p-5 text-center">Total en Clínica</th><th className="p-5 text-center">Reservas (Citas)</th><th className="p-5 text-center">Disponible Real</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-700/50">
                  {materiales.map(mat => (
                    <tr key={mat.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                      <td className="p-5"><p className="font-bold text-slate-700 dark:text-slate-200">{mat.nombre}</p><p className="text-[10px] text-slate-400 uppercase">{mat.unidad_medida}</p></td>
                      <td className="p-5 text-center font-black text-slate-600 dark:text-slate-300">{mat.stock_total}</td>
                      <td className="p-5 text-center font-black text-blue-500">{mat.cantidad_reservada}</td>
                      <td className="p-5 text-center font-black text-green-600">{mat.cantidad_disponible}</td>
                    </tr>
                  ))}
                  {materiales.length === 0 && <tr><td colSpan="4" className="p-10 text-center text-slate-400 text-sm">No hay materiales registrados.</td></tr>}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* --- MODALES --- */}


      {/* --- MODALES --- */}
      <ModalAjustarStock
        mostrarModalMaterial={mostrarModalMaterial}
        setMostrarModalMaterial={setMostrarModalMaterial}
        guardarMovimiento={guardarMovimiento}
        nuevoMovimiento={nuevoMovimiento}
        setNuevoMovimiento={setNuevoMovimiento}
        materiales={materiales}
      />

      <ModalNuevoPaciente
        mostrarModal={mostrarModal}
        setMostrarModal={setMostrarModal}
        handleSubmit={handleSubmit}
        nuevoPaciente={nuevoPaciente}
        setNuevoPaciente={setNuevoPaciente}
      />

      <ModalAgendarCita
        mostrarModalCita={mostrarModalCita}
        setMostrarModalCita={setMostrarModalCita}
        guardarCita={guardarCita}
        nuevaCita={nuevaCita}
        setNuevaCita={setNuevaCita}
        pacientes={pacientes}
        doctores={doctores}
        tratamientos={tratamientos}
        busquedaPaciente={busquedaPaciente}
        setBusquedaPaciente={setBusquedaPaciente}
        mostrarSugerencias={mostrarSugerencias}
        setMostrarSugerencias={setMostrarSugerencias}
        duracionEnTiempoReal={duracionEnTiempoReal}
        costoEnTiempoReal={costoEnTiempoReal}
      />

      <ModalEditarCita
        editandoCita={editandoCita}
        setEditandoCita={setEditandoCita}
        actualizarCita={actualizarCita}
        citaSeleccionada={citaSeleccionada}
        setCitaSeleccionada={setCitaSeleccionada}
        doctores={doctores}
        tratamientos={tratamientos}
        generarPDF={generarPDF}
      />

      <FichaPaciente
        mostrarFicha={mostrarFicha}
        setMostrarFicha={setMostrarFicha}
        pacienteSeleccionado={pacienteSeleccionado}
        setPacienteSeleccionado={setPacienteSeleccionado}
        editandoPaciente={editandoPaciente}
        setEditandoPaciente={setEditandoPaciente}
        actualizarPaciente={actualizarPaciente}
        citas={citas}
        tratamientos={tratamientos}
      />

      {/* --- MOLDE PDF INVISIBLE --- */}
      <div style={{ position: 'absolute', left: '-9999px', top: '0' }}>
        <div id="recibo-dental-pro" style={{ width: '700px', padding: '40px', background: 'white', fontFamily: 'Arial' }}>
          <div style={{ borderBottom: '2px solid #4f46e5', paddingBottom: '20px', display: 'flex', justifyContent: 'space-between' }}>
            <div><h1 style={{ color: '#4f46e5', margin: 0 }}>DENTAL PRO</h1><p style={{ fontSize: '12px', margin: 0, color: '#64748b' }}>Cuidado Dental Profesional</p></div>
            <div style={{ textAlign: 'right' }}><h2 style={{ margin: 0, color: '#1e293b' }}>RECIBO DE PAGO</h2><p style={{ color: '#64748b' }}>Ref: #{String(citaSeleccionada?.id || "").substring(0, 8)}</p></div>
          </div>
          <div style={{ margin: '30px 0' }}><p style={{ fontSize: '18px', fontWeight: 'bold', margin: 0, color: '#1e293b' }}>Paciente: {pacientes.find(p => p.id === citaSeleccionada?.paciente)?.nombre} {pacientes.find(p => p.id === citaSeleccionada?.paciente)?.apellido}</p><p style={{ color: '#64748b' }}>C.I.: {pacientes.find(p => p.id === citaSeleccionada?.paciente)?.cedula}</p><p style={{ color: '#64748b' }}>Fecha de Cita: {citaSeleccionada?.fecha}</p></div>
          <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #e2e8f0' }}><tr style={{ background: '#f8fafc', color: '#475569' }}><th style={{ padding: '12px', textAlign: 'left', borderBottom: '1px solid #e2e8f0' }}>Descripción del Servicio</th><th style={{ padding: '12px', textAlign: 'right', borderBottom: '1px solid #e2e8f0' }}>Importe USD</th></tr><tr><td style={{ padding: '15px 12px', color: '#1e293b', fontWeight: 'bold' }}>{tratamientos.find(t => t.id === citaSeleccionada?.tratamiento)?.nombre || 'Tratamiento Médico'}</td><td style={{ padding: '15px 12px', textAlign: 'right', color: '#1e293b', fontWeight: 'bold' }}>${citaSeleccionada?.costo_total}</td></tr></table>
          <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <div style={{ width: '300px', background: '#f8fafc', padding: '15px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#475569' }}><span>Subtotal:</span><span>${citaSeleccionada?.costo_total}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '5px 0', color: '#16a34a', fontWeight: 'bold' }}><span>Total Pagado:</span><span>${(parseFloat(citaSeleccionada?.monto_pagado_adelantado || 0) + parseFloat(citaSeleccionada?.monto_pagado_dia || 0))}</span></div>
              <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '15px', marginTop: '10px', borderTop: '2px solid #cbd5e1', fontWeight: 'bold', fontSize: '18px', color: '#0f172a' }}><span>Restante por Cobrar:</span><span style={{ color: '#ef4444' }}>${(parseFloat(citaSeleccionada?.costo_total || 0) - (parseFloat(citaSeleccionada?.monto_pagado_adelantado || 0) + parseFloat(citaSeleccionada?.monto_pagado_dia || 0)))}</span></div>
            </div>
          </div>
          <div style={{ marginTop: '60px', textAlign: 'center', color: '#94a3b8', fontSize: '12px' }}><p>Este documento es un comprobante de pago emitido por Dental Pro.</p></div>
        </div>
      </div>

      <ChatAsistente API_BASE_URL={API_BASE_URL} />
          
    </div>
  )
}

export default App;