import { LayoutDashboard, Package, Printer, FileText, LogOut, User } from 'lucide-react';
import { auth } from '../firebase/config';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/home' },
    { icon: <Printer size={20} />, label: 'Manutenção', path: '/manutencao' },
    { icon: <Package size={20} />, label: 'Estoque Peças', path: '/estoque' },
    { icon: <FileText size={20} />, label: 'Notas de Serviço', path: '/notas' },
  ];

  const handleLogout = () => {
    auth.signOut().then(() => {
      toast.success('Sessão encerrada.');
      navigate('/');
    });
  };

  return (
    <div className="h-screen w-64 bg-slate-900 text-white flex flex-col fixed left-0 top-0 shadow-xl z-50">
      <div className="p-6">
        <h2 className="text-2xl font-black tracking-tighter">
          RODHON <span className="text-blue-500">& CO</span>
        </h2>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {menuItems.map((item) => (
          <button 
            key={item.label}
            onClick={() => navigate(item.path)}
            className={`flex items-center gap-3 w-full p-3.5 rounded-xl transition-all ${
              location.pathname === item.path 
              ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {item.icon}
            <span className="font-semibold">{item.label}</span>
          </button>
        ))}
      </nav>

      <div className="p-4 border-t border-slate-800">
        <div className="flex items-center gap-3 px-2 mb-4">
          <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
            <User size={16} />
          </div>
          <span className="text-sm font-medium text-slate-300 truncate">Rodrigo Honório</span>
        </div>
        <button 
          onClick={handleLogout}
          className="flex items-center gap-3 w-full p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
        >
          <LogOut size={20} />
          <span className="font-bold">Sair</span>
        </button>
      </div>
    </div>
  );
}