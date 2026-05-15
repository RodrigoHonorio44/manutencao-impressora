import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy } from 'firebase/firestore';
import { PackagePlus, Table } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Estoque() {
  const [pecas, setPecas] = useState([]);
  const [form, setForm] = useState({ marca: '', modelo: '', nome: '', qtd: '' });

  // 1. Busca os dados em tempo real do Firebase
  useEffect(() => {
    const q = query(collection(db, "estoque_pecas"), orderBy("data_entrada", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPecas(data);
    });
    return () => unsubscribe();
  }, []);

  // 2. Grava a nova peça no banco
  const handleAdicionar = async (e) => {
    e.preventDefault();
    if (!form.nome || !form.qtd) return toast.error("Preencha o nome e a quantidade!");

    const loading = toast.loading("Registrando no estoque...");
    try {
      await addDoc(collection(db, "estoque_pecas"), {
        ...form,
        qtd: Number(form.qtd),
        data_entrada: serverTimestamp() // Aqui o Firebase gera a data/hora exata
      });
      setForm({ marca: '', modelo: '', nome: '', qtd: '' });
      toast.success("Peça registrada com sucesso!", { id: loading });
    } catch (error) {
      toast.error("Erro ao salvar no banco.", { id: loading });
    }
  };

  return (
    <div className="p-8 space-y-8">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Estoque de Peças</h1>
        <p className="text-slate-500">Controle de insumos concedidos pelos clientes.</p>
      </header>

      {/* Formulário de Entrada */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-blue-600">
          <PackagePlus size={24} />
          <h2 className="font-bold text-slate-800 text-lg">Nova Entrada de Peça</h2>
        </div>

        <form onSubmit={handleAdicionar} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <input 
            placeholder="Marca (HP, Brother...)" 
            className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={form.marca}
            onChange={(e) => setForm({...form, marca: e.target.value})}
          />
          <input 
            placeholder="Modelo da Impressora" 
            className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={form.modelo}
            onChange={(e) => setForm({...form, modelo: e.target.value})}
          />
          <input 
            placeholder="Nome da Peça (Película, Toner...)" 
            className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
            value={form.nome}
            onChange={(e) => setForm({...form, nome: e.target.value})}
          />
          <div className="flex gap-2">
            <input 
              type="number" placeholder="Qtd" 
              className="w-24 p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
              value={form.qtd}
              onChange={(e) => setForm({...form, qtd: e.target.value})}
            />
            <button className="flex-1 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all">
              Salvar
            </button>
          </div>
        </form>
      </section>

      {/* Tabela de Visualização */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 text-slate-500 uppercase text-xs font-bold">
            <tr>
              <th className="p-4">Data</th>
              <th className="p-4">Marca/Modelo</th>
              <th className="p-4">Peça</th>
              <th className="p-4 text-center">Qtd</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pecas.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                <td className="p-4 text-sm text-slate-500">
                  {item.data_entrada?.toDate().toLocaleDateString('pt-BR')}
                </td>
                <td className="p-4">
                  <p className="font-bold text-slate-700">{item.marca}</p>
                  <p className="text-xs text-slate-500 uppercase">{item.modelo}</p>
                </td>
                <td className="p-4 font-medium text-slate-700">{item.nome}</td>
                <td className="p-4 text-center">
                  <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full font-bold text-sm">
                    {item.qtd}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}