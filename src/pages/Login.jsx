import { useState } from 'react';
import { auth } from '../firebase/config';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading('Autenticando...');
    try {
      await signInWithEmailAndPassword(auth, email, password);
      toast.success('Acesso autorizado! Bem-vindo.', { id: loadingToast });
      navigate('/home');
    } catch (error) {
      toast.error('Falha no login. Verifique e-mail e senha.', { id: loadingToast });
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
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">E-mail Corporativo</label>
            <input 
              type="email" 
              required
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1 ml-1">Senha</label>
            <input 
              type="password" 
              required
              className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 transition-all"
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