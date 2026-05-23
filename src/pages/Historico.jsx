import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { Search, Calendar, FileText, Package, Hash, User, CheckCircle } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Historico() {
  const [busca, setBusca] = useState('');
  const [historico, setHistorico] = useState([]);
  const [carregando, setCarregando] = useState(false);

  const buscarHistorico = async (e) => {
    if (e) e.preventDefault();
    const termoBusca = busca.trim();
    if (!termoBusca) return toast.error("Digite o S/N ou Modelo para buscar!");

    setCarregando(true);
    try {
      const atendimentosRef = collection(db, "atendimentos");
      
      // 1. TENTA BUSCAR PELO NÚMERO DE SÉRIE ORIGINAL
      let q = query(atendimentosRef, where("serial", "==", termoBusca));
      let querySnapshot = await getDocs(q);
      let resultados = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      // 1b. SE NÃO ACHOU, TENTA EM MAIÚSCULAS
      if (resultados.length === 0) {
        q = query(atendimentosRef, where("serial", "==", termoBusca.toUpperCase()));
        querySnapshot = await getDocs(q);
        resultados = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }

      // 2. SE NÃO ACHOU POR S/N, BUSCA PELO MODELO
      if (resultados.length === 0) {
        const qModelo = query(atendimentosRef, where("modelo", "==", termoBusca));
        const snapshotModelo = await getDocs(qModelo);
        resultados = snapshotModelo.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        // 2b. Tenta modelo em maiúsculas se falhar
        if (resultados.length === 0) {
          const qModeloUpper = query(atendimentosRef, where("modelo", "==", termoBusca.toUpperCase()));
          const snapshotModeloUpper = await getDocs(qModeloUpper);
          resultados = snapshotModeloUpper.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        }
      }

      ordenarERenderizar(resultados);

    } catch (error) {
      console.error(error);
      toast.error("Erro ao buscar histórico.");
    } finally {
      setCarregando(false);
    }
  };

  const ordenarERenderizar = (lista) => {
    const listaOrdenada = lista.sort((a, b) => {
      const dataA = a.data_entrada?.seconds || 0;
      const dataB = b.data_entrada?.seconds || 0;
      return dataB - dataA;
    });

    setHistorico(listaOrdenada);
    if (lista.length === 0) toast.error("Nenhum registro encontrado.");
  };

  // NOVO: Função para limpar a busca e resetar a tela
  const handleLimparBusca = () => {
    setBusca('');
    setHistorico([]);
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Histórico do Equipamento</h1>
        <p className="text-slate-500">Consulte o passado de manutenções de qualquer impressora pelo S/N.</p>
      </header>

      {/* Barra de Busca Alterada */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm max-w-2xl">
        <form onSubmit={buscarHistorico} className="flex gap-3">
          <div className="flex-1 relative flex items-center bg-slate-50 border rounded-xl focus-within:ring-2 focus-within:ring-blue-500 pr-2">
            <Search className="text-slate-400 ml-4 mr-3 shrink-0" size={18} />
            <input 
              type="text"
              placeholder="Digite o Número de Série (S/N) ou Modelo exato..."
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="w-full py-3 bg-transparent outline-none text-slate-700 font-medium"
            />
            {/* BOTÃO DE LIMPAR INTEGRADO AO INPUT */}
            {busca && (
              <button 
                type="button"
                onClick={handleLimparBusca}
                className="text-xs text-slate-400 hover:text-slate-600 font-black uppercase tracking-wider px-2 py-1 hover:bg-slate-200 rounded-lg transition-all"
              >
                Limpar
              </button>
            )}
          </div>
          <button 
            type="submit"
            disabled={carregando}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 rounded-xl font-bold transition-all uppercase text-sm disabled:opacity-50"
          >
            {carregando ? 'Buscando...' : 'Buscar'}
          </button>
        </form>
      </section>

      {/* Linha do Tempo / Lista de Manutenções */}
      <div className="space-y-4 max-w-4xl">
        {historico.map((os) => (
          <div key={os.id} className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm space-y-4 relative overflow-hidden">
            <div className={`absolute left-0 top-0 bottom-0 w-2 ${os.status === 'Finalizado' ? 'bg-emerald-500' : 'bg-blue-500'}`} />

            <div className="flex flex-wrap items-center justify-between gap-2 pl-2">
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-[10px] font-black bg-blue-600 text-white px-2 py-1 rounded-lg">
                  <Hash size={12} /> OS: {os.os || 'Sem Número'}
                </span>
                <span className={`text-[10px] font-black px-2.5 py-1 rounded-md uppercase ${
                  os.status === 'Finalizado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                }`}>
                  {os.status}
                </span>
              </div>
              
              <div className="flex items-center gap-4 text-xs text-slate-400 font-medium">
                <span className="flex items-center gap-1"><Calendar size={14}/> Entrada: {os.data_entrada?.toDate().toLocaleDateString('pt-BR')}</span>
                {os.data_finalizacao && (
                  <span className="flex items-center gap-1 text-emerald-600"><CheckCircle size={14}/> Fim: {os.data_finalizacao?.toDate().toLocaleDateString('pt-BR')}</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 pl-4 text-sm">
              <div>
                <p className="font-bold text-slate-800 uppercase text-xs text-blue-600 mb-1">Equipamento</p>
                <p className="font-black text-slate-700 uppercase">{os.marca} - {os.modelo}</p>
                <p className="text-xs text-slate-500 font-mono mt-0.5">S/N: {os.serial}</p>
              </div>
              <div>
                <p className="font-bold text-slate-800 uppercase text-xs text-blue-600 mb-1">Responsável / Cliente</p>
                <p className="font-bold text-slate-700 flex items-center gap-1"><User size={14} className="text-slate-400"/> {os.cliente}</p>
                <p className="text-xs text-slate-500 italic mt-0.5">Defeito relatado: {os.defeito}</p>
              </div>
            </div>

            <div className="space-y-3 pl-2">
              <div>
                <p className="flex items-center gap-1 text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                  <FileText size={14}/> Relatório Técnico do Serviço:
                </p>
                <p className="text-sm text-slate-700 bg-slate-50/50 p-3 rounded-xl border border-dashed border-slate-200 font-medium whitespace-pre-line">
                  {os.relatorio_tecnico || "Nenhum relatório detalhado foi registrado para esta OS."}
                </p>
              </div>

              {os.pecas_utilizadas?.length > 0 && (
                <div>
                  <p className="flex items-center gap-1 text-[11px] font-black text-slate-400 uppercase tracking-wider mb-1">
                    <Package size={14}/> Peças Trocadas:
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {os.pecas_utilizadas.map((p, idx) => (
                      <span key={idx} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 uppercase">
                        {p}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {historico.length === 0 && !carregando && (
          <div className="text-center py-16 bg-white rounded-3xl border border-slate-200 border-dashed">
            <p className="text-slate-400 font-medium">Insira o número de série acima para puxar a ficha completa do equipamento.</p>
          </div>
        )}
      </div>
    </div>
  );
}