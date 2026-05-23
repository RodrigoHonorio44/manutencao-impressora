import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { DollarSign, CalendarDays, BarChart3, Users, Printer, FileText, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function Financas() {
  const agora = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(agora.getMonth()); // 0 = Jan, 11 = Dez
  const [anoSelecionado, setAnoSelecionado] = useState(agora.getFullYear());
  const [abaAtiva, setAbaAtiva] = useState('faturadas'); // 'faturadas' ou 'pendentes'
  
  const [dadosFiltrados, setDadosFiltrados] = useState({
    totalFaturado: 0,
    qtdNotas: 0,
    ticketMedio: 0,
    notasFaturadas: [],
    notasPendentes: [],
    rankingClientes: []
  });

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  const anos = Array.from({ length: 4 }, (_, i) => agora.getFullYear() - i);

  useEffect(() => {
    const qFaturamento = query(collection(db, "historico_notas"));
    
    const unsubscribe = onSnapshot(qFaturamento, (snapshot) => {
      let somaPeriodo = 0;
      let contagemNotas = 0;
      const faturadas = [];
      const pendentes = [];
      const mapaClientes = {};

      snapshot.docs.forEach(doc => {
        const dados = doc.data();
        
        // Data de base para o filtro por mês/ano
        const dataReferencia = dados.data_faturamento?.toDate() || dados.data_fechamento?.toDate();
        
        if (dataReferencia) {
          const m = dataReferencia.getMonth();
          const a = dataReferencia.getFullYear();

          if (m === Number(mesSelecionado) && a === Number(anoSelecionado)) {
            const notaTratada = {
              id: doc.id,
              ...dados,
              data_formatada: dataReferencia.toLocaleDateString('pt-BR')
            };

            if (dados.status === 'faturado') {
              somaPeriodo += dados.valor_total || 0;
              contagemNotas += 1;
              faturadas.push(notaTratada);

              // Ranking computa apenas o que de fato foi faturado
              dados.servicos?.forEach(s => {
                if (s.cliente) {
                  mapaClientes[s.cliente] = (mapaClientes[s.cliente] || 0) + 70;
                }
              });
            } else {
              pendentes.push(notaTratada);
            }
          }
        }
      });

      const rankingOrdenado = Object.keys(mapaClientes).map(nome => ({
        nome,
        total: mapaClientes[nome]
      })).sort((a, b) => b.total - a.total);

      // Ordenação: mais recentes primeiro
      const ordenarPorData = (arr) => arr.sort((a, b) => {
        const dA = a.data_faturamento?.toDate() || a.data_fechamento?.toDate();
        const dB = b.data_faturamento?.toDate() || b.data_fechamento?.toDate();
        return dB - dA;
      });

      setDadosFiltrados({
        totalFaturado: somaPeriodo,
        qtdNotas: contagemNotas,
        ticketMedio: contagemNotas > 0 ? (somaPeriodo / contagemNotas) : 0,
        notasFaturadas: ordenarPorData(faturadas),
        notasPendentes: ordenarPorData(pendentes),
        rankingClientes: rankingOrdenado
      });
    });

    return () => unsubscribe();
  }, [mesSelecionado, anoSelecionado]);

  // Função para mudar o status da nota para Faturado
  const faturarNota = async (id) => {
    try {
      const notaRef = doc(db, "historico_notas", id);
      await updateDoc(notaRef, {
        status: 'faturado',
        data_faturamento: new Date()
      });
      toast.success("Nota faturada com sucesso! Lançamento enviado ao caixa.");
    } catch (error) {
      console.error(error);
      toast.error("Erro ao faturar a nota.");
    }
  };

  const executarReimpressaoHTML = (itens, total, dataNota, status) => {
    const win = window.open('', 'PRINT', 'height=750,width=900,top=100,left=100,toolbar=no');
    if (!win) {
      toast.error("Bloqueador de pop-ups ativo! Permita para imprimir.");
      return;
    }

    const ehFaturado = status === 'faturado';

    win.document.write(`
      <html>
        <head>
          <title>Nota de Serviço - RODHON & CO</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 50px; background-color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .invoice-card { max-width: 800px; margin: 0 auto; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #e2e8f0; padding-bottom: 25px; margin-bottom: 30px; }
            .brand-section h1 { font-size: 26px; font-weight: 900; color: #0f172a; letter-spacing: -0.025em; }
            .brand-section p { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 500; }
            .meta-section { text-align: right; }
            .meta-title { font-size: 11px; font-weight: 800; color: ${ehFaturado ? '#10b981' : '#f59e0b'}; text-transform: uppercase; letter-spacing: 0.05em; }
            .meta-value { font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 2px; }
            .table-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 35px; }
            th { background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 12px 16px; text-align: left; }
            td { border-bottom: 1px solid #e2e8f0; padding: 14px 16px; font-size: 13px; vertical-align: top; }
            .eq-name { font-weight: 700; color: #0f172a; font-size: 13.5px; }
            .eq-serial { font-family: monospace; font-size: 11.5px; color: #64748b; margin-top: 2px; }
            .client-name { font-weight: 600; color: #334155; }
            .price-col { font-weight: 700; text-align: right; color: #0f172a; }
            .summary-container { display: flex; justify-content: flex-end; margin-bottom: 50px; page-break-inside: avoid; }
            .total-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 24px; min-width: 260px; text-align: right; }
            .total-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
            .total-amount { font-size: 24px; font-weight: 900; color: ${ehFaturado ? '#10b981' : '#f59e0b'}; margin-top: 4px; }
          </style>
        </head>
        <body>
          <div class="invoice-card">
            <div class="header-container">
              <div class="brand-section">
                <h1>RODHON & CO</h1>
                <p>Laboratório de Manutenção Avançada & Suporte Técnico</p>
              </div>
              <div class="meta-section">
                <div class="meta-title">${ehFaturado ? 'Nota Faturada' : 'Aguardando Faturamento'}</div>
                <div class="meta-value">${dataNota}</div>
              </div>
            </div>

            <div class="table-title">Itens da Ordem de Serviço</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 50%;">Equipamento / Série</th>
                  <th style="width: 30%;">Cliente</th>
                  <th style="width: 20%; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itens?.map(item => `
                  <tr>
                    <td>
                      <div class="eq-name">${item.marca} ${item.modelo}</div>
                      <div class="eq-serial">S/N: ${item.serial}</div>
                    </td>
                    <td><div class="client-name">${item.cliente}</div></td>
                    <td class="price-col">R$ 70,00</td>
                  </tr>
                `).join('') || ''}
              </tbody>
            </table>

            <div class="summary-container">
              <div class="total-box">
                <div class="total-label">${ehFaturado ? 'Faturamento Liquidado' : 'Valor a Faturar'}</div>
                <div class="total-amount">R$ ${total.toFixed(2)}</div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const listaExibida = abaAtiva === 'faturadas' ? dadosFiltrados.notasFaturadas : dadosFiltrados.notasPendentes;

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-6">
      
      {/* HEADER DA TELA COM FILTROS */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Relatórios & Finanças</h1>
          <p className="text-slate-500 font-medium">Controle o fluxo de caixa de notas liquidadas e gerencie cobranças pendentes.</p>
        </div>

        {/* SELECTORES DE FILTRO */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full md:w-auto">
            <select 
              value={mesSelecionado} 
              onChange={(e) => setMesSelecionado(Number(e.target.value))}
              className="bg-transparent font-bold text-xs text-slate-700 px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              {meses.map((m, index) => (
                <option key={index} value={index}>{m}</option>
              ))}
            </select>

            <select 
              value={anoSelecionado} 
              onChange={(e) => setAnoSelecionado(Number(e.target.value))}
              className="bg-transparent font-bold text-xs text-slate-700 px-3 py-1.5 focus:outline-none cursor-pointer border-l border-slate-200"
            >
              {anos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* METRICAS DO PERÍODO FILTRADO (Apenas o que de fato está Faturado) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento Recebido</p>
            <h3 className="text-3xl font-black text-emerald-600">R$ {dadosFiltrados.totalFaturado.toFixed(2)}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Lotes Liquidados</p>
            <h3 className="text-3xl font-black text-slate-800">{dadosFiltrados.qtdNotas.toString().padStart(2, '0')}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
            <FileText size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio Líquido</p>
            <h3 className="text-3xl font-black text-slate-800">R$ {dadosFiltrados.ticketMedio.toFixed(2)}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-500">
            <BarChart3 size={24} />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1: RANKING DE FATURAMENTO POR CLIENTE */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-1 flex flex-col">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Users size={16} className="text-slate-400" /> Recebido por Cliente
          </h3>
          
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[480px] pr-2">
            {dadosFiltrados.rankingClientes.map((cli, idx) => (
              <div key={idx} className="flex items-center justify-between p-3.5 bg-slate-50 border border-slate-100 rounded-2xl">
                <div>
                  <span className="text-[10px] bg-slate-200 text-slate-700 px-1.5 py-0.5 rounded font-black mr-2">#{idx + 1}</span>
                  <span className="font-bold text-slate-700 text-xs uppercase">{cli.nome}</span>
                </div>
                <span className="font-black text-slate-800 text-xs">R$ {cli.total.toFixed(2)}</span>
              </div>
            ))}

            {dadosFiltrados.rankingClientes.length === 0 && (
              <p className="text-slate-400 italic text-center text-xs py-10">Nenhum faturamento liquidado neste período.</p>
            )}
          </div>
        </div>

        {/* COLUNA 2: HISTÓRICO GERENCIA DE NOTAS (COM ALTERAÇÃO DE ABAS) */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          
          {/* SELETOR DE ABAS INTERNAS */}
          <div className="flex border-b border-slate-200 mb-4 justify-between items-center">
            <div className="flex gap-4">
              <button
                onClick={() => setAbaAtiva('faturadas')}
                className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 px-1 ${
                  abaAtiva === 'faturadas' 
                    ? 'border-emerald-500 text-emerald-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Faturadas ({dadosFiltrados.notasFaturadas.length})
              </button>
              <button
                onClick={() => setAbaAtiva('pendentes')}
                className={`pb-3 text-xs font-black uppercase tracking-wider transition-all border-b-2 px-1 ${
                  abaAtiva === 'pendentes' 
                    ? 'border-amber-500 text-amber-600' 
                    : 'border-transparent text-slate-400 hover:text-slate-600'
                }`}
              >
                Aguardando Faturamento ({dadosFiltrados.notasPendentes.length})
              </button>
            </div>
            
            <span className="text-[11px] font-bold text-slate-400 hidden sm:inline">
              Mês de {meses[mesSelecionado]}
            </span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[420px] pr-2">
            {listaExibida.map((nota) => (
              <div key={nota.id} className="p-4 border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all rounded-2xl flex justify-between items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase tracking-wider text-white ${
                      nota.status === 'faturado' ? 'bg-emerald-600' : 'bg-amber-500'
                    }`}>
                      {nota.status === 'faturado' ? `Faturado em ${nota.data_formatada}` : `Gerado em ${nota.data_formatada}`}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      ID: {nota.id.substring(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-blue-600">
                      ({nota.qtd_itens} {nota.qtd_itens === 1 ? 'item' : 'itens'})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate max-w-sm sm:max-w-md">
                    {nota.servicos?.map(s => `${s.marca} (${s.cliente})`).join(', ')}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <span className="font-black text-slate-800 text-sm mr-2">R$ {nota.valor_total?.toFixed(2)}</span>
                  
                  {/* Botão de Ação: Faturar Nota (Aparece apenas na aba de pendentes) */}
                  {nota.status !== 'faturado' && (
                    <button
                      onClick={() => faturarNota(nota.id)}
                      className="p-2 bg-amber-50 hover:bg-emerald-50 border border-amber-200 hover:border-emerald-200 rounded-xl text-amber-600 hover:text-emerald-600 transition-all"
                      title="Faturar Nota Agora"
                    >
                      <CheckCircle2 size={14} />
                    </button>
                  )}

                  <button
                    onClick={() => executarReimpressaoHTML(nota.servicos, nota.valor_total, nota.data_extenso || nota.data_formatada, nota.status)}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    title="Imprimir Via"
                  >
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            ))}

            {listaExibida.length === 0 && (
              <p className="text-slate-400 italic text-center text-xs py-10">
                Nenhum lote de nota encontrado nesta categoria para o período selecionado.
              </p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}