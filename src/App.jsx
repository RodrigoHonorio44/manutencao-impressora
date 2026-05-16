import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Home from './pages/Home';
import Estoque from './pages/Estoque';
import Manutencao from './pages/Manutencao';
import NotasServico from './pages/NotasServico';
import Historico from './pages/Historico'; 
import Manuais from './pages/Manuais'; // IMPORTADA A CENTRAL DE ERROS E MANUAIS AQUI
import Sidebar from './components/Sidebar';
import ProtectedRoute from './components/ProtectedRoute';

// Componente de Layout para não repetir Sidebar e Main em todas as rotas protegidas
const DashboardLayout = ({ children }) => (
  <ProtectedRoute>
    <div className="flex">
      <Sidebar />
      <main className="flex-1 ml-64 min-h-screen bg-slate-50">
        {children}
      </main>
    </div>
  </ProtectedRoute>
);

function App() {
  return (
    <BrowserRouter>
      <Toaster position="top-right" reverseOrder={false} />
      
      <Routes>
        {/* Rota Pública */}
        <Route path="/" element={<Login />} />
        
        {/* Rotas Protegidas */}
        <Route path="/home" element={<DashboardLayout><Home /></DashboardLayout>} />
        <Route path="/manutencao" element={<DashboardLayout><Manutencao /></DashboardLayout>} />
        <Route path="/estoque" element={<DashboardLayout><Estoque /></DashboardLayout>} />
        <Route path="/notas" element={<DashboardLayout><NotasServico /></DashboardLayout>} />
        <Route path="/historico" element={<DashboardLayout><Historico /></DashboardLayout>} />
        <Route path="/manuais" element={<DashboardLayout><Manuais /></DashboardLayout>} /> {/* NOVA ROTA ADICIONADA PARA MANUAIS */}

        {/* Redirecionamento de segurança */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;