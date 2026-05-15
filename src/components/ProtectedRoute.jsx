import { Navigate } from 'react-router-dom';
import { auth } from '../firebase/config';
import { useAuthState } from 'react-firebase-hooks/auth'; // Instale: npm install react-firebase-hooks

export default function ProtectedRoute({ children }) {
  const [user, loading] = useAuthState(auth);

  if (loading) return <div className="flex justify-center items-center h-screen">Carregando...</div>;

  if (!user) {
    // Se não estiver logado, manda de volta para o login
    return <Navigate to="/" />;
  }

  return children;
}