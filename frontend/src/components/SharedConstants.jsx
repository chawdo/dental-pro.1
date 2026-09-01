import { FileText, Edit, Trash2, MessageCircle, X, Sparkles } from 'lucide-react';

export const inputClass = "w-full p-3 rounded-2xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-800 dark:text-slate-100 outline-none focus:ring-2 focus:ring-indigo-500 dark:focus:ring-indigo-400 text-sm transition-all [color-scheme:light] dark:[color-scheme:dark]";

export const IconoFicha = () => <FileText className="w-5 h-5" />;
export const IconoSparkles = () => <Sparkles className="w-5 h-5" />;
export const IconoEditar = () => <Edit className="w-5 h-5" />;
export const IconoEliminar = () => <Trash2 className="w-5 h-5" />;
export const IconoCerrar = () => <X className="w-5 h-5" />;
export const IconoWapp = () => <MessageCircle className="w-5 h-5" />;
