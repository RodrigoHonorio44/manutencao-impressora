import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyB6CwavqGIREB4PcOpuioDX1eAw__B7Hys",
  authDomain: "manutecao-impressora.firebaseapp.com",
  projectId: "manutecao-impressora",
  storageBucket: "manutecao-impressora.firebasestorage.app",
  messagingSenderId: "783344674362",
  appId: "1:783344674362:web:42e5bc60269a58a9683703"
};

// Inicializa o App
const app = initializeApp(firebaseConfig);

// Exporta os serviços para usar nos componentes
export const db = getFirestore(app);
export const auth = getAuth(app);