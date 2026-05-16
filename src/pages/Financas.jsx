import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, onSnapshot } from 'firebase/firestore';
import { DollarSign, CalendarDays, BarChart3, Users, Printer, FileText } from 'lucide-react';

export default function Financas() {
  const agora = new Date();
  const [mesSelecionado, setMesSelecionado] = useState(agora.getMonth()); // 0 = Jan, 11 = Dez
  const [anoSelecionado, setAnoSelecionado] = useState(agora.getFullYear());
  
  const [dadosFiltrados, setDadosFiltrados] = useState({
    totalFaturado: 0,
    qtdNotas: 0,
    ticketMedio: 0,
    notasDoPeriodo: [],
    rankingClientes: []
  });

  const meses = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
  ];

  // Gera uma lista de anos (do ano atual até 3 anos atrás)
  const anos = Array.from({ length: 4 }, (_, i) => agora.getFullYear() - i);

  useEffect(() => {
    const qFaturamento = query(collection(db, "historico_notas"));
    
    // Escuta em tempo real o histórico de notas
    const unsubscribe = onSnapshot(qFaturamento, (snapshot) => {
      let somaPeriodo = 0;
      let contagemNotas = 0;
      const notasEncontradas = [];
      const mapaClientes = {};

      snapshot.docs.forEach(doc => {
        const dados = doc.data();
        const dataFechamento = dados.data_fechamento?.toDate();
        
        if (dataFechamento) {
          const m = dataFechamento.getMonth();
          const a = dataFechamento.getFullYear();

          // Verifica se bate com o mês e ano selecionados nos filtros
          if (m === Number(mesSelecionado) && a === Number(anoSelecionado)) {
            somaPeriodo += dados.valor_total || 0;
            contagemNotas += 1;
            
            notasEncontradas.push({
              id: doc.id,
              ...dados,
              data_formatada: dataFechamento.toLocaleDateString('pt-BR')
            });

            // Agrupa faturamento por cliente para o ranking
            dados.servicos?.forEach(s => {
              if (s.cliente) {
                // Cada serviço/OS individual tem um valor fixo estimado de R$ 70,00 no seu modelo
                mapaClientes[s.cliente] = (mapaClientes[s.cliente] || 0) + 70;
              }
            });
          }
        }
      });

      // Transforma o mapa de clientes em um array ordenado do maior para o menor faturamento
      const rankingOrdenado = Object.keys(mapaClientes).map(nome => ({
        nome,
        total: mapaClientes[nome]
      })).sort((a, b) => b.total - a.total);

      setDadosFiltrados({
        totalFaturado: somaPeriodo,
        qtdNotas: contagemNotas,
        ticketMedio: contagemNotas > 0 ? (somaPeriodo / contagemNotas) : 0,
        notasDoPeriodo: notasEncontradas.sort((a, b) => b.data_fechamento?.toDate() - a.data_fechamento?.toDate()), // Mais recentes primeiro
        rankingClientes: rankingOrdenado
      });
    });

    return () => unsubscribe();
  }, [mesSelecionado, anoSelecionado]);

  const executarReimpressaoHTML = (itens, total, dataNota) => {
    const win = window.open('', 'PRINT', 'height=750,width=900');
    // ... (Mantém a mesma lógica de estilização e estrutura HTML do seu NotasServico)
    win.document.write(`
      <html>
        <head>
          <title>Nota de Serviço - RODHON & CO</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 50px; }
            .invoice-card { max-width: 800px; margin: 0 auto; }
            .header-container { display: flex; justify-content: space-between; border-bottom: 2px solid #e2e8f0; padding-bottom: 25px; margin-bottom: 30px; }
            .brand-section h1 { font-size: 26px; font-weight: 900; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 35px; }
            th { background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; padding: 12px 16px; text-align: left; font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; }
            td { border-bottom: 1px solid #e2e8f0; padding: 14px 16px; font-size: 13px; }
            .price-col { font-weight: 700; text-align: right; }
            .total-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 24px; text-align: right; float: right; min-width: 260px; }
            .total-amount { font-size: 24px; font-weight: 900; color: #10b981; }
          </style>
        </head>
        <body>
          <div class="invoice-card">
            <div class="header-container">
              <div>
                <h1>RODHON & CO</h1>
                <p>Laboratório de Manutenção Avançada</p>
              </div>
              <div style="text-align: right;">
                <div style="font-size: 11px; font-weight: 800; color: #3b82f6;">Reimpressão de Nota</div>
                <div style="font-size: 15px; font-weight: 700;">${dataNota}</div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>Equipamento</th>
                  <th>Cliente</th>
                  <th style="text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itens.map(item => `
                  <tr>
                    <td><strong>${item.marca} ${item.modelo}</strong><br><small style="color:#64748b">S/N: ${item.serial}</small></td>
                    <td>${item.cliente}</td>
                    <td class="price-col">R$ 70,00</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <div class="total-box">
              <small style="font-size: 11px; font-weight: 800; color: #64748b; uppercase">Total do Lote</small>
              <div class="total-amount">R$ ${total.toFixed(2)}</div>
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen space-y-6">
      
      {/* HEADER DA TELA COM FILTROS */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Relatórios & Finanças</h1>
          <p className="text-slate-500 font-medium">Analise o histórico financeiro, ticket médio e faturamento por cliente.</p>
        </div>

        {/* SELECTORES DE FILTRO */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="flex items-center gap-2 bg-slate-100 p-1.5 rounded-2xl border border-slate-200 w-full md:w-auto">
            <select 
              value={mesSelecionado} 
              onChange={(e) => setMesSelecionado(e.target.value)}
              className="bg-transparent font-bold text-xs text-slate-700 px-3 py-1.5 focus:outline-none cursor-pointer"
            >
              {meses.map((m, index) => (
                <option key={index} value={index}>{m}</option>
              ))}
            </select>

            <select 
              value={anoSelecionado} 
              onChange={(e) => setAnoSelecionado(e.target.value)}
              className="bg-transparent font-bold text-xs text-slate-700 px-3 py-1.5 focus:outline-none cursor-pointer border-l border-slate-200"
            >
              {anos.map((a) => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>
      </header>

      {/* METRICAS DO PERÍODO FILTRADO */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Faturamento no Período</p>
            <h3 className="text-3xl font-black text-emerald-600">R$ {dadosFiltrados.totalFaturado.toFixed(2)}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-500">
            <DollarSign size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Notas Emitidas</p>
            <h3 className="text-3xl font-black text-slate-800">{dadosFiltrados.qtdNotas.toString().padStart(2, '0')}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-500">
            <FileText size={24} />
          </div>
        </div>

        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div className="space-y-1">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ticket Médio por Nota</p>
            <h3 className="text-3xl font-black text-slate-800">R$ {dadosFiltrados.ticketMedio.toFixed(2)}</h3>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-50 border border-purple-100 flex items-center justify-center text-purple-500">
            <BarChart3 size={24} />
          </div>
        </div>
      </div>

      {/* DUAS COLUNAS: RANKING DE CLIENTES E LISTA DE NOTAS */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* COLUNA 1: RANKING DE FATURAMENTO POR CLIENTE */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-1 flex flex-col">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <Users size={16} className="text-slate-400" /> Faturamento por Cliente
          </h3>
          
          <div className="space-y-3 flex-1 overflow-y-auto max-h-[450px] pr-2">
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
              <p className="text-slate-400 italic text-center text-xs py-10">Nenhuma movimentação de cliente neste período.</p>
            )}
          </div>
        </div>

        {/* COLUNA 2: HISTÓRICO DE NOTAS DO MÊS SELECIONADO */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm lg:col-span-2 flex flex-col">
          <h3 className="font-black text-slate-800 text-sm uppercase tracking-wide mb-4 flex items-center gap-2">
            <CalendarDays size={16} className="text-slate-400" /> Notas Fechadas em {meses[mesSelecionado]}
          </h3>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[450px] pr-2">
            {dadosFiltrados.notesDoPeriodo = dadosFiltrados.notasDoPeriodo.map((nota) => (
              <div key={nota.id} className="p-4 border border-slate-100 bg-slate-50/50 hover:bg-slate-50 transition-all rounded-2xl flex justify-between items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black bg-slate-800 text-white px-2 py-0.5 rounded">
                      {nota.data_formatada}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400 font-bold">
                      ID: {nota.id.substring(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs font-bold text-blue-600">
                      ({nota.qtd_itens} {nota.qtd_itens === 1 ? 'item' : 'itens'})
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 truncate max-w-md">
                    {nota.servicos?.map(s => `${s.marca} (${s.cliente})`).join(', ')}
                  </p>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <span className="font-black text-slate-800 text-sm">R$ {nota.valor_total?.toFixed(2)}</span>
                  <button
                    onClick={() => executarReimpressaoHTML(nota.servicos, nota.valor_total, nota.data_extenso)}
                    className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:text-blue-600 hover:bg-blue-50 transition-all"
                    title="Reimprimir Via"
                  >
                    <Printer size={14} />
                  </button>
                </div>
              </div>
            ))}

            {dadosFiltrados.notasDoPeriodo.length === 0 && (
              <p className="text-slate-400 italic text-center text-xs py-10">Nenhuma nota fiscal gerada neste mês.</p>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}