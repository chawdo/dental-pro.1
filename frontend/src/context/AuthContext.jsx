import { createContext, useState, useContext, useEffect } from 'react';
import axios from 'axios';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [usuario, setUsuario] = useState(null);
    const [loading, setLoading] = useState(true);

    const API_BASE_URL = 'https://sistema-clinica-1.onrender.com';

    useEffect(() => {
        // 1. EL INTERCEPTOR DE SALIDA: Pega el Token en cada petición
        const requestInterceptor = axios.interceptors.request.use(
            (config) => {
                const token = localStorage.getItem('access_token');
                if (token) {
                    // Si hay token, se lo inyectamos a la cabecera
                    config.headers.Authorization = `Bearer ${token}`;
                }
                return config;
            },
            (error) => Promise.reject(error)
        );

        // 2. EL INTERCEPTOR DE ENTRADA: Revisa si Django nos rechaza
        const responseInterceptor = axios.interceptors.response.use(
            (response) => response,
            (error) => {
                // Si Django dice "401 Unauthorized", es que el token venció
                if (error.response && error.response.status === 401) {
                    logout(); // Cerramos la sesión por seguridad
                }
                return Promise.reject(error);
            }
        );

        // 3. Revisar si ya había una sesión activa al abrir la página
        const token = localStorage.getItem('access_token');
        if (token) {
            setUsuario({ logueado: true });
        }
        setLoading(false);

        // Limpieza de interceptores (Buenas prácticas de React)
        return () => {
            axios.interceptors.request.eject(requestInterceptor);
            axios.interceptors.response.eject(responseInterceptor);
        };
    }, []);

    const login = async (username, password) => {
        try {
            // Pedimos el token a tu backend
            const res = await axios.post(`${API_BASE_URL}/api/token/`, {
                username,
                password
            });

            // Guardamos los tokens en el navegador
            localStorage.setItem('access_token', res.data.access);
            localStorage.setItem('refresh_token', res.data.refresh);

            // Actualizamos el estado global
            setUsuario({ logueado: true });
            return { success: true };
        } catch (error) {
            console.error("Error en login:", error.response?.data);
            return { success: false, error: "Credenciales inválidas" };
        }
    };

    const logout = () => {
        // Borramos el rastro del token y limpiamos el estado
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        setUsuario(null);
    };

    return (
        <AuthContext.Provider value={{ usuario, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);