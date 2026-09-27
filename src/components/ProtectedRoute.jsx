import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  // Verifica se existe um utilizador ou token guardado no localStorage
  const usuario = localStorage.getItem('usuario') || localStorage.getItem('token');

  if (!usuario) {
    // Se não estiver logado, manda de volta para o login
    return <Navigate to="/" replace />;
  }

  return children;
}