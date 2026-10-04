import { useState, useEffect, useCallback } from 'react';
import { api } from '../services/api';
import { Printer, CheckCircle2, ReceiptText, Calendar, History, ChevronLeft, ChevronRight, FileText, Clock } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotasServico() {
  const [finalizadas, setFinalizadas] = useState([]);
  const [selecionadas, setSelecionadas] = useState([]);
  const [cortesias, setCortesias] = useState([]);
  
  // Estados de Paginação da Aba Pendentes
  const [paginaPendentes, setPaginaPendentes] = useState(1);
  const ITENS_POR_PAGINA = 10;
  
  // Estados do Histórico e Paginação
  const [historico, setHistorico] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [totalPaginas, setTotalPaginas] = useState(1);
  const [carregando, setCarregando] = useState(false);
  
  const [abaAtiva, setAbaAtiva] = useState('pendentes');
  const [statusFiltroHistorico, setStatusFiltroHistorico] = useState('gerado');

  // Helper para obter o ID único de cada item
  const getItemId = (item) => item._id || item.id;

  // Formata datas de forma segura
  const formatarData = (dataInput) => {
    if (!dataInput) return '---';
    let dataObj;
    if (typeof dataInput === 'object' && dataInput.$date) {
      dataObj = new Date(dataInput.$date);
    } else {
      dataObj = new Date(dataInput);
    }
    return isNaN(dataObj.getTime()) ? '---' : dataObj.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  // 1. Carrega OSs finalizadas e remove as que já possuem nota gerada
  const carregarAtendimentosFinalizados = async () => {
    try {
      // Busca atendimentos e histórico de notas em paralelo para cruzar os dados
      const [dataAtendimentos, dataNotasGeradas, dataNotasFaturadas] = await Promise.all([
        api.getAtendimentos(),
        api.getHistorico_notas ? api.getHistorico_notas('gerado', 1, 1000).catch(() => ({ docs: [] })) : api.getHistoricoNotas('gerado', 1, 1000).catch(() => ({ docs: [] })),
        api.getHistoricoNotas ? api.getHistoricoNotas('faturado', 1, 1000).catch(() => ({ docs: [] })) : { docs: [] }
      ]);
      
      // Coleta todos os IDs de atendimentos que já foram adicionados a alguma nota (gerada ou faturada)
      const todasNotas = [
        ...(dataNotasGeradas.docs || dataNotasGeradas.itens || (Array.isArray(dataNotasGeradas) ? dataNotasGeradas : [])),
        ...(dataNotasFaturadas.docs || dataNotasFaturadas.itens || (Array.isArray(dataNotasFaturadas) ? dataNotasFaturadas : []))
      ];

      const idsAtendimentosComNota = new Set();
      todasNotas.forEach(nota => {
        if (nota.atendimento_ids && Array.isArray(nota.atendimento_ids)) {
          nota.atendimento_ids.forEach(id => idsAtendimentosComNota.add(String(id)));
        }
        if (nota.servicos && Array.isArray(nota.servicos)) {
          nota.servicos.forEach(s => {
            if (s.atendimento_id) idsAtendimentosComNota.add(String(s.atendimento_id));
            if (s._id) idsAtendimentosComNota.add(String(s._id));
          });
        }
      });

      // Filtra apenas as finalizadas que AINDA NÃO possuem nota gerada
      const prontas = dataAtendimentos.filter(item => {
        const id = String(getItemId(item));
        const statusOk = (item.status || '').toLowerCase() === 'finalizado';
        const semNota = !idsAtendimentosComNota.has(id);
        return statusOk && semNota;
      });

      // Ordena por data crescente (mais antiga primeiro)
      prontas.sort((a, b) => {
        const getMillis = (d) => {
          if (!d) return 0;
          if (typeof d === 'object' && d.$date) return new Date(d.$date).getTime();
          return new Date(d).getTime() || 0;
        };
        const dataA = getMillis(a.data_finalizacao || a.data_entrada || a.criadoEm);
        const dataB = getMillis(b.data_finalizacao || b.data_entrada || b.criadoEm);
        return dataA - dataB;
      });

      setFinalizadas(prontas);

      // Sincroniza as cortesias já marcadas no banco de dados para o estado local
      const cortesiasSalvas = prontas
        .filter(item => item.eh_cortesia || item.cortesia)
        .map(item => getItemId(item));
      
      setCortesias(cortesiasSalvas);
    } catch (error) {
      console.error("Erro ao carregar atendimentos:", error);
      toast.error("Erro ao carregar OSs prontas.");
    }
  };

  // 2. Carrega o histórico consumindo api.getHistoricoNotas()
  const carregarHistorico = useCallback(async (pagina = 1) => {
    setCarregando(true);
    try {
      const data = await api.getHistoricoNotas(statusFiltroHistorico, pagina, ITENS_POR_PAGINA);
      setHistorico(data.docs || data.itens || (Array.isArray(data) ? data : []));
      setTotalPaginas(data.totalPages || Math.ceil((data.total || 0) / ITENS_POR_PAGINA) || 1);
      setPaginaAtual(pagina);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar histórico de notas.");
    } finally {
      setCarregando(false);
    }
  }, [statusFiltroHistorico]);

  useEffect(() => {
    if (abaAtiva === 'pendentes') {
      carregarAtendimentosFinalizados();
    } else if (abaAtiva === 'historico') {
      carregarHistorico(1);
    }
  }, [abaAtiva, statusFiltroHistorico, carregarHistorico]);

  // Cálculos de paginação da aba pendentes (10 por tela)
  const totalPaginasPendentes = Math.ceil(finalizadas.length / ITENS_POR_PAGINA) || 1;
  const indiceInicio = (paginaPendentes - 1) * ITENS_POR_PAGINA;
  const finalizadasPaginadas = finalizadas.slice(indiceInicio, indiceInicio + ITENS_POR_PAGINA);

  const toggleSelecao = (id) => {
    setSelecionadas(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const toggleSelecionarTodos = () => {
    if (selecionadas.length === finalizadas.length) {
      setSelecionadas([]);
    } else {
      setSelecionadas(finalizadas.map(item => getItemId(item)));
    }
  };

  // Alterna e persiste o estado de cortesia no backend e no estado local
  const toggleCortesia = async (id, e) => {
    e.stopPropagation();
    const ehCortesiaAtual = cortesias.includes(id);
    const novoStatusCortesia = !ehCortesiaAtual;

    // Atualiza otimisticamente a interface
    setCortesias(prev =>
      ehCortesiaAtual ? prev.filter(i => i !== id) : [...prev, id]
    );

    try {
      if (api.atualizarAtendimento) {
        await api.atualizarAtendimento(id, { eh_cortesia: novoStatusCortesia });
      } else {
        await api.patch(`/atendimentos/${id}`, { eh_cortesia: novoStatusCortesia });
      }
    } catch (error) {
      console.error("Erro ao salvar cortesia:", error);
      toast.error("Erro ao salvar cortesia no servidor.");
      // Reverte em caso de falha
      setCortesias(prev =>
        ehCortesiaAtual ? [...prev, id] : prev.filter(i => i !== id)
      );
    }
  };

  const calcularValorOS = (id) => (cortesias.includes(id) ? 0 : 70);

  const calcularTotalSelecionadas = () => {
    return selecionadas.reduce((acc, id) => acc + calcularValorOS(id), 0);
  };

  const ejecutarImpressaoHTML = (itens, total, dataNota, statusNota) => {
    const win = window.open('', 'PRINT', 'height=750,width=900,top=100,left=100,toolbar=no,navigator=no,status=no');
    if (!win) {
      toast.error("Bloqueador de pop-ups ativo! Permita a abertura para imprimir.");
      return;
    }

    const ehFaturado = statusNota === 'faturado';
    const nomeClientePrincipal = itens && itens.length > 0 ? itens[0].cliente : "Cliente";

    win.document.write(`
      <html>
        <head>
          <title>Nota de Serviço - RODHON & CO</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;900&display=swap');
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: 'Inter', sans-serif; color: #1e293b; padding: 40px; background-color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
            .invoice-card { max-width: 800px; margin: 0 auto; }
            .header-container { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #f1f5f9; padding-bottom: 20px; margin-bottom: 25px; }
            .brand-section h1 { font-size: 28px; font-weight: 900; color: #0f172a; letter-spacing: -0.025em; }
            .brand-section p { font-size: 12px; color: #64748b; margin-top: 4px; font-weight: 500; }
            .status-badge { display: inline-block; padding: 6px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; border-radius: 8px; margin-top: 8px; }
            .status-faturado { background-color: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
            .status-pendente { background-color: #fffbeb; color: #d97706; border: 1px solid #fde68a; }
            .meta-section { text-align: right; }
            .meta-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; }
            .meta-value { font-size: 14px; font-weight: 700; color: #1e293b; margin-top: 2px; }
            .addresses-container { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 35px; background-color: #f8fafc; padding: 20px; border: 1px solid #e2e8f0; border-radius: 16px; }
            .address-block h3 { font-size: 11px; font-weight: 800; text-transform: uppercase; color: #64748b; letter-spacing: 0.05em; margin-bottom: 6px; }
            .address-block p { font-size: 13px; color: #334155; font-weight: 600; line-height: 1.4; }
            .table-title { font-size: 12px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
            th { background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1; color: #475569; font-size: 11px; font-weight: 800; text-transform: uppercase; padding: 12px 16px; text-align: left; }
            td { border-bottom: 1px solid #e2e8f0; padding: 14px 16px; font-size: 13px; vertical-align: top; }
            .eq-name { font-weight: 700; color: #0f172a; font-size: 13.5px; }
            .eq-serial { font-family: monospace; font-size: 11.5px; color: #64748b; margin-top: 2px; }
            .badge-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 6px; }
            .badge { font-size: 10px; background-color: #fff; color: #475569; padding: 2px 6px; font-weight: 700; text-transform: uppercase; border: 1px solid #cbd5e1; border-radius: 4px; }
            .price-col { font-weight: 700; text-align: right; color: #0f172a; font-size: 14px; }
            .summary-container { display: flex; justify-content: flex-end; margin-bottom: 40px; page-break-inside: avoid; }
            .total-box { background-color: #0f172a; border-radius: 12px; padding: 16px 24px; min-width: 280px; text-align: right; color: #fff; }
            .total-label { font-size: 11px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 0.05em; }
            .total-amount { font-size: 24px; font-weight: 900; color: #34d399; margin-top: 4px; }
            .terms-section { font-size: 11px; color: #64748b; line-height: 1.5; margin-bottom: 40px; border-left: 3px solid #cbd5e1; padding-left: 12px; }
            .footer-signature { margin-top: 50px; padding-top: 30px; page-break-inside: avoid; }
            .signature-grid { display: flex; justify-content: space-between; gap: 60px; }
            .sig-line { flex: 1; text-align: center; }
            .line { border-bottom: 1px solid #94a3b8; height: 35px; margin-bottom: 8px; }
            .sig-label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
            @media print { body { padding: 0; } .invoice-card { max-width: 100%; } }
          </style>
        </head>
        <body>
          <div class="invoice-card">
            <div class="header-container">
              <div class="brand-section">
                <h1>RODHON & CO</h1>
                <p>Laboratório de Manutenção Avançada & Suporte Técnico</p>
                <div class="status-badge ${ehFaturado ? 'status-faturado' : 'status-pendente'}">
                  ${ehFaturado ? 'Nota de Serviço / Liquidada' : 'Nota de Serviço / Aguardando Pagamento'}
                </div>
              </div>
              <div class="meta-section">
                <div class="meta-label">Data de Emissão</div>
                <div class="meta-value">${dataNota}</div>
              </div>
            </div>

            <div class="addresses-container">
              <div class="address-block">
                <h3>Prestador</h3>
                <p>RODHON & CO</p>
                <p style="font-size: 12px; color: #64748b; font-weight: 400; margin-top: 4px;">
                  Suporte Técnico Especializado em Equipamentos Industriais e de Laboratório.
                </p>
              </div>
              <div class="address-block">
                <h3>Tomador / Cliente</h3>
                <p style="text-transform: uppercase;">${nomeClientePrincipal}</p>
                <p style="font-size: 12px; color: #64748b; font-weight: 400; margin-top: 4px;">
                  Cobrança consolidada referente às Ordens de Serviço finalizadas no período.
                </p>
              </div>
            </div>

            <div class="table-title">Detalhamento dos Serviços Prestados</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 45%;">Equipamento / Identificação</th>
                  <th style="width: 25%;">Cliente</th>
                  <th style="width: 15%;">Peças Aplicadas</th>
                  <th style="width: 15%; text-align: right;">Valor Unitário</th>
                </tr>
              </thead>
              <tbody>
                ${itens.map(item => `
                  <tr>
                    <td>
                      <div class="eq-name">${item.marca}${item.modelo}</div>
                      <div class="eq-serial">S/N: ${item.serial || 'Não informado'}</div>
                    </td>
                    <td><div style="font-weight: 600; color: #475569;">${item.cliente}</div></td>
                    <td>
                      <div class="badge-list">
                        ${item.pecas_utilizadas?.length > 0 
                          ? item.pecas_utilizadas.map(p => `<span class="badge">${p}</span>`).join('') 
                          : `<span style="font-size: 12px; color: #94a3b8; font-style: italic;">Mão de obra</span>`
                        }
                      </div>
                    </td>
                    <td class="price-col">
                      ${item.eh_cortesia || item.valor === 0 
                        ? '<span style="color: #9333ea;">R$ 0,00 (Cortesia)</span>' 
                        : `R$ ${(item.valor ?? 70).toFixed(2)}`
                      }
                    </td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary-container">
              <div class="total-box">
                <div class="total-label">${ehFaturado ? 'Total Recebido' : 'Total a Pagar'}</div>
                <div class="total-amount">R$ ${total.toFixed(2)}</div>
              </div>
            </div>

            <div class="terms-section">
              <strong>Observações Importantes:</strong><br/>
              <strong>Garantia:</strong> Os serviços listados acima possuem garantia legal de 90 dias a contar da data de emissão deste documento.<br/>
              <strong>Contrato:</strong> Esta Nota de Serviço discrimina custos internos de manutenção e insumos aplicados conforme contrato estabelecido.
            </div>

            <div class="footer-signature">
              <div class="signature-grid">
                <div class="sig-line">
                  <div class="line"></div>
                  <div class="sig-label">Responsável Técnico (RODHON & CO)</div>
                </div>
                <div class="sig-line">
                  <div class="line"></div>
                  <div class="sig-label">Aceite do Cliente (Recebedor)</div>
                </div>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  const gerarNotaEGuardarNoHistorico = async () => {
    const itens = finalizadas.filter(f => selecionadas.includes(getItemId(f)));
    if (itens.length === 0) return toast.error("Selecione ao menos um serviço!");

    const total = calcularTotalSelecionadas();

    const confirmou = window.confirm(
      `Deseja gerar a nota de serviço no valor total de R$ ${total.toFixed(2)} referente a ${itens.length} ordem(ns) selecionada(s)?`
    );

    if (!confirmou) return;

    const loading = toast.loading("Salvando nota na base de dados...");
    const dataAtualString = new Date().toLocaleDateString('pt-BR');

    try {
      const payload = {
        atendimento_ids: selecionadas,
        status: "gerado",
        data_extenso: dataAtualString,
        valor_total: total,
        qtd_itens: itens.length,
        servicos: itens.map(item => {
          const id = getItemId(item);
          return {
            atendimento_id: id,
            marca: item.marca,
            modelo: item.modelo,
            serial: item.serial,
            cliente: item.cliente,
            eh_cortesia: cortesias.includes(id),
            valor: calcularValorOS(id),
            pecas_utilizadas: item.pecas_utilizadas || []
          };
        })
      };

      await api.criarNotaServico(payload);

      toast.success("Nota gerada com sucesso!", { id: loading });
      
      setSelecionadas([]);
      setCortesias([]);
      carregarAtendimentosFinalizados();
      if (abaAtiva === 'historico') carregarHistorico(1);
    } catch (error) {
      console.error("Erro ao processar faturamento:", error);
      toast.error("Erro ao faturar e salvar nota.", { id: loading });
    }
  };

  const confirmarPagamentoNota = async (id) => {
    const confirmacao = window.confirm("Deseja confirmar o pagamento desta nota?");
    if (!confirmacao) return;

    try {
      await api.faturarNota(id);
      toast.success("Pagamento baixado com sucesso!");
      carregarHistorico(paginaAtual);
    } catch (error) {
      console.error("Erro ao confirmar pagamento:", error);
      toast.error("Não foi possível registrar o pagamento.");
    }
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-7xl mx-auto">
      {/* HEADER RESPONSIVO */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white p-5 md:p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-xl md:text-2xl font-black text-slate-800">Notas de Serviço</h1>
          <p className="text-sm text-slate-500 font-medium">Controle de faturamentos ativos e histórico de consultas.</p>
        </div>
        
        {abaAtiva === 'pendentes' && (
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
            <div className="text-left sm:text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</p>
              <p className="text-2xl font-black text-emerald-600">R$ {calcularTotalSelecionadas().toFixed(2)}</p>
            </div>
            <button 
              onClick={gerarNotaEGuardarNoHistorico}
              className="bg-blue-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase text-xs tracking-wider w-full sm:w-auto"
            >
              <ReceiptText size={18}/> GERAR E SALVAR NOTA
            </button>
          </div>
        )}
      </header>

      {/* ABAS DO TOPO */}
      <div className="flex border-b border-slate-200 gap-4 overflow-x-auto pb-1 scrollbar-none">
        <button 
          onClick={() => setAbaAtiva('pendentes')}
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-2 transition-all flex items-center gap-2 whitespace-nowrap ${abaAtiva === 'pendentes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <ReceiptText size={16} /> OS Prontas para Nota ({finalizadas.length})
        </button>
        <button 
          onClick={() => setAbaAtiva('historico')}
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-2 transition-all flex items-center gap-2 whitespace-nowrap ${abaAtiva === 'historico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <History size={16} /> Consultar Notas Guardadas
        </button>
      </div>

      {/* ABA 1: OS PENDENTES */}
      {abaAtiva === 'pendentes' && (
        <div className="space-y-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left min-w-[600px]">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">
                  <tr>
                    <th className="p-4 md:p-5 w-10 text-center">
                      <div 
                        onClick={(e) => { e.stopPropagation(); toggleSelecionarTodos(); }}
                        className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all cursor-pointer ${finalizadas.length > 0 && selecionadas.length === finalizadas.length ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}
                      >
                        {finalizadas.length > 0 && selecionadas.length === finalizadas.length && <CheckCircle2 size={16} className="text-white" />}
                      </div>
                    </th>
                    <th className="p-4 md:p-5">Equipamento / Origem / Conclusão</th>
                    <th className="p-4 md:p-5">Peças / Relatório Técnico</th>
                    <th className="p-4 md:p-5 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {finalizadasPaginadas.map(item => {
                    const itemId = getItemId(item);
                    const estaSelecionado = selecionadas.includes(itemId);
                    const ehCortesia = cortesias.includes(itemId);

                    return (
                      <tr 
                        key={itemId} 
                        onClick={() => toggleSelecao(itemId)}
                        className={`cursor-pointer transition-all ${estaSelecionado ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                      >
                        <td className="p-4 md:p-5">
                          <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${estaSelecionado ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                            {estaSelecionado && <CheckCircle2 size={16} className="text-white" />}
                          </div>
                        </td>
                        <td className="p-4 md:p-5 space-y-1">
                          <p className="font-bold text-slate-800">{item.marca} {item.modelo}</p>
                          <p className="text-xs text-slate-400">S/N: {item.serial || 'N/A'} | <span className="text-blue-600 font-bold">{item.cliente}</span></p>
                          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md w-fit border border-emerald-200">
                            <Clock size={12} /> Finalizado em: {formatarData(item.data_finalizacao)}
                          </div>
                        </td>
                        <td className="p-4 md:p-5 space-y-2">
                          <div className="flex flex-wrap gap-1">
                            {item.pecas_utilizadas?.length > 0 ? item.pecas_utilizadas.map((p, i) => (
                              <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">{p}</span>
                            )) : <span className="text-[10px] text-slate-400 italic font-medium">Ajuste técnico</span>}
                          </div>
                          {item.relatorio_tecnico && (
                            <p className="text-xs text-slate-600 bg-slate-50 p-2 rounded-xl border border-slate-200">
                              <strong className="text-slate-700 text-[10px] uppercase block mb-0.5">O que foi feito:</strong>
                              {item.relatorio_tecnico}
                            </p>
                          )}
                        </td>
                        <td className="p-4 md:p-5 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-3">
                            <button
                              type="button"
                              onClick={(e) => toggleCortesia(itemId, e)}
                              className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition-all uppercase tracking-wider ${
                                ehCortesia
                                  ? 'bg-purple-600 text-white border-purple-600 shadow-sm'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              {ehCortesia ? 'Cortesia' : '+ Cortesia'}
                            </button>

                            <span className={`font-black ${ehCortesia ? 'line-through text-slate-300' : 'text-slate-700'}`}>
                              R$ {calcularValorOS(itemId).toFixed(2)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            
            {finalizadas.length === 0 && (
              <div className="p-12 md:p-20 text-center">
                <ReceiptText size={48} className="mx-auto text-slate-200 mb-2" />
                <p className="text-slate-400 font-medium">Nenhuma OS pronta para faturamento.</p>
              </div>
            )}
          </div>

          {/* BARRA DE PAGINAÇÃO DA ABA PENDENTES */}
          {finalizadas.length > 0 && (
            <div className="flex flex-col sm:flex-row justify-between items-center gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
              <span className="text-xs font-bold text-slate-500">
                Página <span className="text-slate-800 font-black">{paginaPendentes}</span> de {totalPaginasPendentes} ({finalizadas.length} itens no total)
              </span>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
                <button
                  onClick={() => setPaginaPendentes(prev => Math.max(prev - 1, 1))}
                  disabled={paginaPendentes === 1}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${paginaPendentes === 1 ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95'}`}
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <button
                  onClick={() => setPaginaPendentes(prev => Math.min(prev + 1, totalPaginasPendentes))}
                  disabled={paginaPendentes >= totalPaginasPendentes}
                  className={`flex-1 sm:flex-none flex items-center justify-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${paginaPendentes >= totalPaginasPendentes ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95'}`}
                >
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: HISTÓRICO */}
      {abaAtiva === 'historico' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 bg-slate-100 p-1.5 rounded-2xl w-full sm:w-fit">
            <button
              onClick={() => setStatusFiltroHistorico('gerado')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${statusFiltroHistorico === 'gerado' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <FileText size={14} /> Notas a Faturar
            </button>
            <button
              onClick={() => setStatusFiltroHistorico('faturado')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${statusFiltroHistorico === 'faturado' ? 'bg-white text-emerald-600 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              <CheckCircle2 size={14} /> Histórico de Notas Pagas
            </button>
          </div>

          {carregando ? (
            <div className="p-12 text-center text-slate-400 font-bold">Carregando dados...</div>
          ) : (
            historico.map((nota) => {
              const notaId = getItemId(nota);
              return (
                <div key={notaId} className="bg-white p-4 md:p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:shadow-sm transition-all">
                  <div className="space-y-2 flex-1 w-full">
                    <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                      <span className={`flex items-center gap-1 text-[10px] font-black px-2.5 py-1 rounded-md text-white uppercase ${nota.status === 'faturado' ? 'bg-emerald-600' : 'bg-amber-500'}`}>
                        <Calendar size={12} /> {nota.status === 'faturado' ? 'Liquidada' : 'Aguardando Pagamento'} ({nota.data_extenso})
                      </span>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                        REF ID: {String(notaId).substring(0, 8).toUpperCase()}
                      </span>
                      <span className="text-xs font-bold text-blue-600">
                        ({nota.qtd_itens} {nota.qtd_itens === 1 ? 'Equipamento' : 'Equipamentos'})
                      </span>
                    </div>
                    
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                      {nota.servicos?.map((s, idx) => (
                        <div key={idx} className="text-xs text-slate-600 flex flex-col sm:flex-row justify-between gap-1 sm:gap-0">
                          <span>
                            <strong className="text-slate-800">{s.marca} {s.modelo}</strong> ({s.cliente}) — S/N: {s.serial}
                            {s.eh_cortesia && <span className="ml-2 text-[10px] font-bold text-purple-600 uppercase">(Cortesia)</span>}
                          </span>
                          <span className="text-[10px] font-mono text-slate-400 uppercase">
                            {s.pecas_utilizadas?.length > 0 ? s.pecas_utilizadas.join(', ') : 'Preventiva'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2 pt-2 md:pt-0 border-t md:border-t-0 border-slate-100 min-w-[170px]">
                    <div className="text-left md:text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Valor do Lote</p>
                      <p className="text-lg md:text-xl font-black text-slate-800">R$ {Number(nota.valor_total || 0).toFixed(2)}</p>
                    </div>
                    
                    <div className="flex gap-2">
                      {nota.status !== 'faturado' && (
                        <button 
                          onClick={() => confirmarPagamentoNota(notaId)}
                          className="flex items-center gap-1 bg-amber-50 hover:bg-emerald-600 text-amber-700 hover:text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-amber-200 hover:border-emerald-600 transition-all uppercase tracking-wide"
                          title="Confirmar Recebimento"
                        >
                          <CheckCircle2 size={13} /> Confirmar Pago
                        </button>
                      )}
                      
                      <button 
                        onClick={() => ejecutarImpressaoHTML(nota.servicos, nota.valor_total, nota.data_extenso, nota.status)}
                        className="flex items-center gap-1 bg-slate-100 hover:bg-blue-600 text-slate-700 hover:text-white text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-600 transition-all uppercase tracking-wide"
                        title="Imprimir Nota"
                      >
                        <Printer size={13} /> Imprimir
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}