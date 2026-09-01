import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import { Bot, SendHorizonal } from 'lucide-react';
import { IconoCerrar } from './SharedConstants';

const ChatAsistente = ({ API_BASE_URL }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [mensajes, setMensajes] = useState([{ texto: "¡Hola! Soy el Asistente Dental Pro. ¿En qué puedo ayudarte hoy?", emisor: "ia" }]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const endOfMessagesRef = useRef(null);

    // Auto-scroll al final cuando hay nuevos mensajes
    useEffect(() => {
        if (endOfMessagesRef.current) {
            endOfMessagesRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [mensajes]);

    const handleSend = async (e) => {
        if (e) e.preventDefault();
        if (!input.trim() || isLoading) return;

        const mensajeUsuario = { texto: input, emisor: "usuario" };
        setMensajes(prev => [...prev, mensajeUsuario]);
        const currentInput = input;
        setInput("");
        setIsLoading(true);

        try {
            const res = await axios.post(`${API_BASE_URL}/api/ia/copiloto/`, {
                mensaje: currentInput
            });

            const mensajeIA = { texto: res.data.respuesta, emisor: "ia" };
            setMensajes(prev => [...prev, mensajeIA]);
        } catch (error) {
            console.error("Error al comunicarse con el asistente:", error);
            const errorMessage = error.response?.data?.error || "Lo siento, ocurrió un error al comunicarme con el servidor.";
            setMensajes(prev => [...prev, { texto: errorMessage, emisor: "ia" }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
            {/* Ventana de Chat */}
            {isOpen && (
                <div className="w-80 sm:w-96 h-[400px] mb-4 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl flex flex-col overflow-hidden border border-slate-200 dark:border-slate-700 animate-in slide-in-from-bottom-2 fade-in duration-200">
                    {/* Cabecera */}
                    <div className="bg-indigo-600 text-white p-4 flex justify-between items-center">
                        <div className="flex items-center gap-2">
                            <Bot className="w-6 h-6" />
                            <h3 className="font-bold">Asistente Dental Pro</h3>
                        </div>
                        <button
                            onClick={() => setIsOpen(false)}
                            className="hover:bg-indigo-700 p-1 rounded-full transition-colors"
                            aria-label="Cerrar chat"
                        >
                            <IconoCerrar />
                        </button>
                    </div>

                    {/* Área de mensajes */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 dark:bg-slate-900/50">
                        {mensajes.map((msg, idx) => (
                            <div key={idx} className={`flex ${msg.emisor === 'usuario' ? 'justify-end' : 'justify-start'}`}>
                                <div className={`max-w-[85%] rounded-2xl p-3 text-sm shadow-sm ${
                                    msg.emisor === 'usuario'
                                        ? 'bg-indigo-600 text-white rounded-br-none'
                                        : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-bl-none'
                                }`}>
                                    {msg.texto}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="flex justify-start">
                                <div className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 text-slate-500 text-xs italic px-4 py-2 rounded-2xl rounded-bl-none shadow-sm flex items-center gap-2">
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce"></div>
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                    <div className="w-2 h-2 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                                </div>
                            </div>
                        )}
                        <div ref={endOfMessagesRef} />
                    </div>

                    {/* Input */}
                    <form onSubmit={handleSend} className="p-3 bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 flex gap-2">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder="Escribe un mensaje..."
                            className="flex-1 p-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm outline-none focus:ring-2 focus:ring-indigo-500 dark:text-white"
                            disabled={isLoading}
                        />
                        <button
                            type="submit"
                            disabled={!input.trim() || isLoading}
                            className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors flex items-center justify-center"
                            aria-label="Enviar"
                        >
                            <SendHorizonal className="w-5 h-5" />
                        </button>
                    </form>
                </div>
            )}

            {/* Botón Flotante */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="w-14 h-14 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg shadow-indigo-200 dark:shadow-none flex items-center justify-center transition-transform hover:scale-105 active:scale-95 z-50"
                aria-label="Abrir asistente"
            >
                {isOpen ? <IconoCerrar /> : <Bot className="w-7 h-7" />}
            </button>
        </div>
    );
};

export default ChatAsistente;
