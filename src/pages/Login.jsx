import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { api } from '../services/api';

export default function Login() {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Autenticando...');

    try {
      // Chama o método centralizado do api.js
      const data = await api.login(usuario, password);

      // Guarda as informações de sessão no navegador de forma compatível com o ProtectedRoute e Sidebar
      if (data && data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
        localStorage.setItem('usuario', JSON.stringify(data.user)); // Compatibilidade com outras telas
        localStorage.setItem('token', 'ativo'); // Garante que o token existe para o ProtectedRoute
      } else {
        throw new Error('Dados de usuário inválidos retornados pela API.');
      }

      toast.success('Acesso autorizado! Bem-vindo.', { id: loadingToast });
      navigate('/home', { replace: true });
    } catch (error) {
      toast.error(error.message || 'Falha no login. Verifique as credenciais.', { id: loadingToast });
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-2xl shadow-2xl w-full max-w-md border-t-8 border-blue-600">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-slate-800 tracking-tighter">
            RODHON <span className="text-blue-600">& CO</span>
          </h1>
          <p className="text-slate-400 font-medium mt-2">Sistema de Gestão Técnica</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
              Usuário / E-mail
            </label>
            <input 
              type="text" 
              required
              value={usuario}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
              onChange={(e) => setUsuario(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">
              Senha
            </label>
            <input 
              type="password" 
              required
              value={password}
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all text-slate-800"
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button className="w-full py-4 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-lg shadow-blue-500/30 transition-all transform active:scale-95">
            Entrar no Sistema
          </button>
        </form>
      </div>
    </div>
  );
}