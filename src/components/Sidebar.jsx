import { useState } from 'react';
import { 
  LayoutDashboard, 
  Package, 
  Printer, 
  FileText, 
  History, 
  LogOut, 
  User, 
  BookOpen, 
  CircleDollarSign, 
  BarChart3, 
  Menu, 
  X 
} from 'lucide-react';
import { auth } from '../firebase/config';
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function Sidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);

  const menuItems = [
    { icon: <LayoutDashboard size={20} />, label: 'Dashboard', path: '/home' },
    { icon: <Printer size={20} />, label: 'Manutenção', path: '/manutencao' },
    { icon: <Package size={20} />, label: 'Estoque Peças', path: '/estoque' },
    { icon: <FileText size={20} />, label: 'Notas de Serviço', path: '/notas' },
    { icon: <CircleDollarSign size={20} />, label: 'Finanças', path: '/financas' },
    { icon: <BarChart3 size={20} />, label: 'Relatório Gastos', path: '/relatorios' },
    { icon: <History size={20} />, label: 'Histórico', path: '/historico' },
    { icon: <BookOpen size={20} />, label: 'Manuais & Erros', path: '/manuais' },
  ];

  const handleLogout = () => {
    auth.signOut().then(() => {
      toast.success('Sessão encerrada.');
      navigate('/');
    });
  };

  const handleNavigation = (path) => {
    navigate(path);
    setIsOpen(false);
  };

  return (
    <>
      {/* BARRA SUPERIOR FIXA NO MOBILE */}
      <header className="md:hidden bg-slate-900 text-white p-4 flex items-center justify-between sticky top-0 z-30 shadow-md w-full">
        <h2 className="text-lg font-black tracking-tighter">
          RODHON <span className="text-blue-500">& CO</span>
        </h2>
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="p-2 bg-slate-800 rounded-xl hover:bg-slate-700 text-slate-200 transition-colors"
          aria-label="Abrir Menu"
        >
          {isOpen ? <X size={22} /> : <Menu size={22} />}
        </button>
      </header>

      {/* OVERLAY ESCURO NO MOBILE */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)} 
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* PAINEL SIDEBAR */}
      <aside 
        className={`fixed top-0 left-0 h-full w-64 bg-slate-900 text-white flex flex-col z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        <div className="p-6 flex items-center justify-between">
          <h2 className="text-2xl font-black tracking-tighter">
            RODHON <span className="text-blue-500">& CO</span>
          </h2>
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden p-1.5 rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X size={20} />
          </button>
        </div>
        
        <nav className="flex-1 px-4 space-y-1 overflow-y-auto">
          {menuItems.map((item) => (
            <button 
              key={item.label}
              onClick={() => handleNavigation(item.path)}
              className={`flex items-center gap-3 w-full p-3.5 rounded-xl transition-all ${
                location.pathname === item.path 
                ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20' 
                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
              }`}
            >
              {item.icon}
              <span className="font-semibold text-sm">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-slate-800">
          <div className="flex items-center gap-3 px-2 mb-4">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center shrink-0">
              <User size={16} />
            </div>
            <span className="text-sm font-medium text-slate-300 truncate">Rodrigo Honório</span>
          </div>
          <button 
            onClick={handleLogout}
            className="flex items-center gap-3 w-full p-3 text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
          >
            <LogOut size={20} />
            <span className="font-bold text-sm">Sair</span>
          </button>
        </div>
      </aside>
    </>
  );
}