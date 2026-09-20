import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { Printer, Clock, CheckCircle2, PackageCheck, PlusCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function Home() {
  const navigate = useNavigate();
  const [estatisticas, setEstatisticas] = useState({
    naBancada: 0,
    aguardandoPeca: 0,
    concluidosMes: 0,
    itensEstoque: 0
  });
  const [ultimasImpressoras, setUltimasImpressoras] = useState([]);

  useEffect(() => {
    // 1. Consulta para bancada e chamados ativos
    const qAtivos = query(
      collection(db, "atendimentos"),
      where("status", "not-in", ["Finalizado", "Faturado"])
    );

    const unsubscribeAtivos = onSnapshot(qAtivos, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const bancada = docs.filter(d => d.status === 'Em Análise' || d.status === 'Em Manutenção').length;
      const aguardando = docs.filter(d => d.status === 'Aguardando Peça').length;

      setEstatisticas(prev => ({
        ...prev,
        naBancada: bancada,
        aguardandoPeca: aguardando
      }));

      // Ordenar por data de entrada para mostrar as últimas na Home
      const ordenadas = docs.sort((a, b) => (b.data_entrada?.seconds || 0) - (a.data_entrada?.seconds || 0));
      setUltimasImpressoras(ordenadas.slice(0, 5));
    });

    return () => unsubscribeAtivos();
  }, []);

  return (
    <div className="p-4 md:p-8 space-y-8 bg-slate-50 min-h-screen w-full max-w-full overflow-x-hidden">
      {/* CABEÇALHO */}
      <header>
        <h1 className="text-2xl md:text-3xl font-black text-slate-800 tracking-tight">Painel de Controle</h1>
        <p className="text-slate-500 font-medium text-sm mt-1">Olá, Rodrigo. Veja o resumo da sua assistência hoje.</p>
      </header>

      {/* GRID DE CARDS (RESPONSIVO PARA PC E NOTEBOOK) */}
      <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Printer size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Na Bancada</p>
            <h3 className="text-2xl font-black text-slate-800">{String(estatisticas.naBancada).padStart(2, '0')}</h3>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Clock size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Aguardando Peça</p>
            <h3 className="text-2xl font-black text-slate-800">{String(estatisticas.aguardandoPeca).padStart(2, '0')}</h3>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <CheckCircle2 size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Concluídos (Mês)</p>
            <h3 className="text-2xl font-black text-slate-800">30</h3>
          </div>
        </div>

        {/* Card 4 */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
            <PackageCheck size={28} />
          </div>
          <div>
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">Itens em Estoque</p>
            <h3 className="text-2xl font-black text-slate-800">04</h3>
          </div>
        </div>
      </section>

      {/* SEÇÃO PRINCIPAL (TABELA + BANNER LATERAL ALINHADOS NO PC) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        {/* LADO ESQUERDO: LISTA DE IMPRESSORAS (2 COLUNAS NO DESKTOP) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm min-h-[320px] flex flex-col justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-800 mb-4">Últimas Impressoras Recebidas</h2>

            {ultimasImpressoras.length > 0 ? (
              <div className="divide-y divide-slate-100">
                {ultimasImpressoras.map((item) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-bold text-blue-600 uppercase italic">{item.marca} {item.modelo}</p>
                      <p className="text-sm font-bold text-slate-800 capitalize">{item.cliente}</p>
                      <p className="text-[11px] text-slate-400 font-mono">S/N: {item.serial}</p>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-16 text-center">
                <p className="text-slate-400 font-medium italic text-sm">Nenhuma entrada em andamento na bancada.</p>
              </div>
            )}
          </div>
        </div>

        {/* LADO DIREITO: CARD DE AÇÃO (1 COLUNA NO DESKTOP) */}
        <div className="bg-slate-900 text-white p-6 md:p-8 rounded-2xl shadow-xl flex flex-col justify-between min-h-[320px]">
          <div>
            <h3 className="text-2xl font-black tracking-tight mb-2">Pronto para começar?</h3>
            <p className="text-slate-400 text-sm font-medium leading-relaxed">
              Registre uma nova entrada de equipamento ou atualize o seu estoque de peças.
            </p>
          </div>

          <div className="mt-8">
            <button 
              onClick={() => navigate('/manutencao')}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-6 rounded-xl shadow-lg shadow-blue-500/20 transition-all uppercase text-xs tracking-wider"
            >
              <PlusCircle size={18} /> Nova Ordem de Serviço
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}