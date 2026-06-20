import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, where } from 'firebase/firestore';
import { Printer, Package, Clock, CheckCircle, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    naBancada: 0,
    aguardandoPeca: 0,
    concluidosMes: 0,
    totalEstoque: 0
  });
  const [ultimasImpressoras, setUltimasImpressoras] = useState([]);

  useEffect(() => {
    // 1. Monitorar Atendimentos (Bancada Ativa e Concluídos do Mês)
    const qAtendimentos = query(collection(db, "atendimentos"));
    const unsubAtendimentos = onSnapshot(qAtendimentos, (snapshot) => {
      const docs = snapshot.docs.map(d => d.data());
      
      // Conta na bancada apenas se NÃO estiver Finalizado E NÃO estiver Faturado
      const bancada = docs.filter(d => d.status !== 'Finalizado' && d.status !== 'Faturado').length;
      const pendentes = docs.filter(d => d.status === 'Aguardando Peça').length;
      
      // Considera "Finalizado" OU "Faturado" para somar os concluídos do mês atual
      const agora = new Date();
      const concluidos = docs.filter(d => {
        const statusValidoConclusao = d.status === 'Finalizado' || d.status === 'Faturado';
        if (!statusValidoConclusao || !d.data_finalizacao) return false;
        
        const dataF = d.data_finalizacao.toDate();
        return dataF.getMonth() === agora.getMonth() && dataF.getFullYear() === agora.getFullYear();
      }).length;

      setStats(prev => ({ 
        ...prev, 
        naBancada: bancada, 
        aguardandoPeca: pendentes, 
        concluidosMes: concluidos 
      }));
    });

  // 2. Monitorar Estoque (Soma real das quantidades)
    const qEstoque = query(collection(db, "estoque_pecas"));
    const unsubEstoque = onSnapshot(qEstoque, (snapshot) => {
      const total = snapshot.docs.reduce((acc, doc) => acc + (Number(doc.data().qtd) || 0), 0);
      setStats(prev => ({ ...prev, totalEstoque: total }));
    });

    // 3. Buscar as últimas impressoras ativas na bancada (Oculta Faturadas/Finalizadas)
    // Query simplificada para evitar bugs de ordenação e necessidade de índices complexos
    const qRecentes = query(
      collection(db, "atendimentos"), 
      where("status", "not-in", ["Finalizado", "Faturado"])
    );
    
    const unsubRecentes = onSnapshot(qRecentes, (snapshot) => {
      const dadosTratados = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Ordena cronologicamente por data de entrada de forma garantida no cliente
      dadosTratados.sort((a, b) => (b.data_entrada?.seconds || 0) - (a.data_entrada?.seconds || 0));
      
      // Seleciona apenas as 3 mais recentes no topo
      setUltimasImpressoras(dadosTratados.slice(0, 3));
    }, (error) => {
      console.error("Erro ao buscar recentes:", error);
    });

    return () => {
      unsubAtendimentos();
      unsubEstoque();
      unsubRecentes();
    };
  }, []);

  // Formatação dos cards para o mapeamento
  const statCards = [
    { label: 'Na Bancada', value: stats.naBancada, icon: <Printer />, color: 'bg-blue-500' },
    { label: 'Aguardando Peça', value: stats.aguardandoPeca, icon: <Clock />, color: 'bg-amber-500' },
    { label: 'Concluídos (Mês)', value: stats.concluidosMes, icon: <CheckCircle />, color: 'bg-emerald-500' },
    { label: 'Itens em Estoque', value: stats.totalEstoque, icon: <Package />, color: 'bg-slate-700' },
  ];

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-slate-800">Painel de Controle</h1>
        <p className="text-slate-500">Olá, Rodrigo. Veja o resumo da sua assistência hoje.</p>
      </header>

      {/* Cards de Estatísticas Reais */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        {statCards.map((item, index) => (
          <div key={index} className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
            <div className={`w-12 h-12 ${item.color} text-white rounded-xl flex items-center justify-center mb-4 shadow-lg`}>
              {item.icon}
            </div>
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.label}</p>
            <h3 className="text-3xl font-black text-slate-800 mt-1">
              {item.value.toString().padStart(2, '0')}
            </h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Lista de Últimas Entradas Reais */}
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
            Últimas Impressoras Recebidas
          </h3>
          <div className="space-y-4">
            {ultimasImpressoras.length > 0 ? ultimasImpressoras.map((imp) => (
              <div key={imp.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div>
                  <p className="font-bold text-slate-700 text-sm uppercase">{imp.marca} {imp.modelo}</p>
                  <p className="text-[10px] text-slate-400 font-mono font-bold uppercase">S/N: {imp.serial}</p>
                </div>
                <span className={`px-3 py-1 text-[10px] font-black rounded-full uppercase ${
                  imp.status === 'Aguardando Peça' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'
                }`}>
                  {imp.status}
                </span>
              </div>
            )) : (
              <p className="text-slate-400 text-center py-4 italic text-sm">Nenhuma entrada em andamento na bancada.</p>
            )}
          </div>
        </div>

        {/* Atalhos Rápidos */}
        <div className="bg-slate-900 p-8 rounded-3xl text-white flex flex-col justify-center relative overflow-hidden shadow-xl shadow-slate-300">
          <div className="relative z-10">
            <h3 className="text-3xl font-black mb-2">Pronto para começar?</h3>
            <p className="text-slate-400 mb-8 max-w-xs font-medium">Registre uma nova entrada de equipamento ou update seu estoque de peças.</p>
            <button 
              onClick={() => navigate('/manutencao')}
              className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black transition-all transform hover:scale-105 flex items-center gap-2 uppercase text-sm tracking-wider"
            >
              <Plus size={20} /> Nova Ordem de Serviço
            </button>
          </div>
          <Printer size={200} className="absolute -right-10 -bottom-10 text-slate-800 opacity-30 rotate-12" />
        </div>
      </div>
    </div>
  );
}