import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot, doc, writeBatch, serverTimestamp, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { Printer, CheckCircle2, ReceiptText, Calendar, History, ChevronLeft, ChevronRight } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotasServico() {
  const [finalizadas, setFinalizadas] = useState([]);
  const [selecionadas, setSelecionadas] = useState([]);
  
  // Estados do Histórico e Paginação
  const [historico, setHistorico] = useState([]);
  const [ultimoDoc, setUltimoDoc] = useState(null);
  const [historicoDePaginas, setHistoricoDePaginas] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [temMais, setTemMais] = useState(false);
  
  const [abaAtiva, setAbaAtiva] = useState('pendentes');
  const ITENS_POR_PAGINA = 10;

  // 1. Monitora atendimentos prontos em tempo real (Surgem aqui se status for "Finalizado")
  useEffect(() => {
    const qAtendimentos = query(collection(db, "atendimentos"), where("status", "==", "Finalizado"));
    const unsubscribeAtendimentos = onSnapshot(qAtendimentos, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFinalizadas(data);
    }, (error) => {
      console.error("Erro no Firebase Atendimentos:", error);
      toast.error("Erro ao carregar dados ativos.");
    });

    return () => unsubscribeAtendimentos();
  }, []);

  // 2. Carrega o histórico ao mudar de aba
  useEffect(() => {
    if (abaAtiva === 'historico') {
      carregarPrimeiraPaginaHistorico();
    }
  }, [abaAtiva]);

  const carregarPrimeiraPaginaHistorico = async () => {
    try {
      const qContagem = query(
        collection(db, "historico_notas"), 
        orderBy("data_fechamento", "desc"), 
        limit(ITENS_POR_PAGINA + 1)
      );
      
      const snapshot = await getDocs(qContagem);
      
      if (snapshot.empty) {
        setHistorico([]);
        setTemMais(false);
        return;
      }

      const docs = snapshot.docs;
      const temProxima = docs.length > ITENS_POR_PAGINA;
      const docsVisualizar = temProxima ? docs.slice(0, ITENS_POR_PAGINA) : docs;

      setHistorico(docsVisualizar.map(doc => ({ id: doc.id, ...doc.data() })));
      setUltimoDoc(docsVisualizar[docsVisualizar.length - 1]);
      setHistoricoDePaginas([docsVisualizar[0]]);
      setPaginaAtual(1);
      setTemMais(temProxima);
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar histórico.");
    }
  };

  const proximaPagina = async () => {
    if (!temMais || !ultimoDoc) return;

    try {
      const q = query(
        collection(db, "historico_notas"),
        orderBy("data_fechamento", "desc"),
        startAfter(ultimoDoc),
        limit(ITENS_POR_PAGINA + 1)
      );

      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      const temProxima = docs.length > ITENS_POR_PAGINA;
      const docsVisualizar = temProxima ? docs.slice(0, ITENS_POR_PAGINA) : docs;

      setHistorico(docsVisualizar.map(doc => ({ id: doc.id, ...doc.data() })));
      setUltimoDoc(docsVisualizar[docsVisualizar.length - 1]);
      
      setHistoricoDePaginas(prev => [...prev, docsVisualizar[0]]);
      setPaginaAtual(prev => prev + 1);
      setTemMais(temProxima);
    } catch (error) {
      console.error("Erro ao avançar página:", error);
    }
  };

  const paginaAnterior = async () => {
    if (paginaAtual === 1) return;

    try {
      const queryExecutar = (paginaAtual === 2) 
        ? query(collection(db, "historico_notas"), orderBy("data_fechamento", "desc"), limit(ITENS_POR_PAGINA))
        : query(collection(db, "historico_notas"), orderBy("data_fechamento", "desc"), startAfter(historicoDePaginas[paginaAtual - 3]), limit(ITENS_POR_PAGINA));

      const snapshot = await getDocs(queryExecutar);
      const docs = snapshot.docs;

      setHistorico(docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setUltimoDoc(docs[docs.length - 1]);
      
      setHistoricoDePaginas(prev => prev.slice(0, -1));
      setPaginaAtual(prev => prev - 1);
      setTemMais(true);
    } catch (error) {
      console.error("Erro ao voltar página:", error);
    }
  };

  const toggleSelecao = (id) => {
    setSelecionadas(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const executarImpressaoHTML = (itens, total, dataNota) => {
    const win = window.open('', 'PRINT', 'height=750,width=900');
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
            .meta-title { font-size: 11px; font-weight: 800; color: #3b82f6; text-transform: uppercase; letter-spacing: 0.05em; }
            .meta-value { font-size: 15px; font-weight: 700; color: #1e293b; margin-top: 2px; }
            .table-title { font-size: 13px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; color: #475569; margin-bottom: 12px; }
            table { width: 100%; border-collapse: collapse; margin-bottom: 35px; }
            th { background-color: #f8fafc; border-bottom: 2px solid #cbd5e1; color: #64748b; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.05em; padding: 12px 16px; text-align: left; }
            td { border-bottom: 1px solid #e2e8f0; padding: 14px 16px; font-size: 13px; vertical-align: top; }
            .eq-name { font-weight: 700; color: #0f172a; font-size: 13.5px; }
            .eq-serial { font-family: monospace; font-size: 11.5px; color: #64748b; margin-top: 2px; font-weight: 600; }
            .client-name { font-weight: 600; color: #334155; }
            .badge-list { display: flex; flex-wrap: wrap; gap: 4px; margin-top: 2px; }
            .badge { font-size: 10px; background-color: #f1f5f9; color: #475569; padding: 2px 6px; font-weight: 700; text-transform: uppercase; border: 1px solid #e2e8f0; border-radius: 4px; }
            .italic-text { color: #94a3b8; font-style: italic; font-size: 12px; }
            .price-col { font-weight: 700; text-align: right; color: #0f172a; }
            .summary-container { display: flex; justify-content: flex-end; margin-bottom: 50px; }
            .total-box { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 24px; min-width: 260px; text-align: right; }
            .total-label { font-size: 11px; font-weight: 800; color: #64748b; text-transform: uppercase; letter-spacing: 0.05em; }
            .total-amount { font-size: 24px; font-weight: 900; color: #10b981; margin-top: 4px; }
            .footer-signature { margin-top: 80px; border-top: 1px dashed #cbd5e1; padding-top: 40px; }
            .signature-grid { display: flex; justify-content: space-between; gap: 50px; }
            .sig-line { flex: 1; text-align: center; }
            .line { border-bottom: 1px solid #94a3b8; margin-bottom: 8px; height: 30px; }
            .sig-label { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; }
            @media print { body { padding: 20px; } .invoice-card { max-width: 100%; } }
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
                <div class="meta-title">Nota de Serviço Registrada</div>
                <div class="meta-value">${dataNota}</div>
              </div>
            </div>

            <div class="table-title">Detalhamento das Ordens de Serviço</div>
            <table>
              <thead>
                <tr>
                  <th style="width: 30%;">Equipamento / Série</th>
                  <th style="width: 25%;">Cliente</th>
                  <th style="width: 30%;">Peças / Serviços Realizados</th>
                  <th style="width: 15%; text-align: right;">Subtotal</th>
                </tr>
              </thead>
              <tbody>
                ${itens.map(item => `
                  <tr>
                    <td>
                      <div class="eq-name">${item.marca} ${item.modelo}</div>
                      <div class="eq-serial">S/N: ${item.serial}</div>
                    </td>
                    <td><div class="client-name">${item.cliente}</div></td>
                    <td>
                      <div class="badge-list">
                        ${item.pecas_utilizadas?.length > 0 
                          ? item.pecas_utilizadas.map(p => `<span class="badge">${p}</span>`).join('') 
                          : `<span class="italic-text">Ajuste / Preventiva</span>`
                        }
                      </div>
                    </td>
                    <td class="price-col">R$ 70,00</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>

            <div class="summary-container">
              <div class="total-box">
                <div class="total-label">Valor Total do Lote</div>
                <div class="total-amount">R$ ${total.toFixed(2)}</div>
              </div>
            </div>

            <div class="footer-signature">
              <div class="signature-grid">
                <div class="sig-line">
                  <div class="line"></div>
                  <div class="sig-label">Responsável Técnico (RODHON)</div>
                </div>
                <div class="sig-line">
                  <div class="line"></div>
                  <div class="sig-label">Assinatura do Cliente / Recebedor</div>
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
    const itens = finalizadas.filter(f => selecionadas.includes(f.id));
    if (itens.length === 0) return toast.error("Selecione ao menos um serviço!");

    const loading = toast.loading("Salvando nota e atualizando atendimentos...");
    const total = itens.length * 70;
    const dataAtualString = new Date().toLocaleDateString('pt-BR');

    try {
      // Criamos um lote (batch) para fazer todas as alterações juntas de forma segura
      const batch = writeBatch(db);

      // 1. Cria a referência da nova nota no histórico
      const novaNotaRef = doc(collection(db, "historico_notas"));
      batch.set(novaNotaRef, {
        data_fechamento: serverTimestamp(),
        data_extenso: dataAtualString,
        valor_total: total,
        qtd_itens: itens.length,
        servicos: itens.map(item => ({
          marca: item.marca,
          modelo: item.modelo,
          serial: item.serial,
          cliente: item.cliente,
          pecas_utilizadas: item.pecas_utilizadas || []
        }))
      });

      // 2. CORREÇÃO AQUI: Muda o status dos atendimentos para "Faturado" para sumirem desta tela
      itens.forEach(item => {
        const atendimentoRef = doc(db, "atendimentos", item.id);
        batch.update(atendimentoRef, { status: "Faturado" });
      });

      // Envia o lote inteiro para o Firestore
      await batch.commit();

      toast.success("Nota gerada e itens faturados com sucesso!", { id: loading });
      
      // Abre o fluxo de impressão
      executarImpressaoHTML(itens, total, dataAtualString);
      setSelecionadas([]);
      
      if (abaAtiva === 'historico') carregarPrimeiraPaginaHistorico();
    } catch (error) {
      console.error("Erro ao processar faturamento:", error);
      toast.error("Erro ao faturar e salvar nota.", { id: loading });
    }
  };

  return (
    <div className="p-8 space-y-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Notas de Serviço</h1>
          <p className="text-slate-500 font-medium">Controle de faturamentos ativos e histórico de consultas.</p>
        </div>
        
        {abaAtiva === 'pendentes' && (
          <div className="flex items-center gap-6">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</p>
              <p className="text-2xl font-black text-emerald-600">R$ {(selecionadas.length * 70).toFixed(2)}</p>
            </div>
            <button 
              onClick={gerarNotaEGuardarNoHistorico}
              className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase text-xs tracking-wider"
            >
              <Printer size={18}/> GERAR E SALVAR NOTA
            </button>
          </div>
        )}
      </header>

      {/* ABAS */}
      <div className="flex border-b border-slate-200 gap-4">
        <button 
          onClick={() => setAbaAtiva('pendentes')}
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-2 transition-all flex items-center gap-2 ${abaAtiva === 'pendentes' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <ReceiptText size={16} /> OS Prontas para Nota ({finalizadas.length})
        </button>
        <button 
          onClick={() => setAbaAtiva('historico')}
          className={`pb-3 text-xs font-black uppercase tracking-wider border-b-2 px-2 transition-all flex items-center gap-2 ${abaAtiva === 'historico' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-400 hover:text-slate-600'}`}
        >
          <History size={16} /> Consultar Notas Guardadas
        </button>
      </div>

      {/* ABA 1: OS PENDENTES */}
      {abaAtiva === 'pendentes' && (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="p-5 w-10 text-center">Sel.</th>
                <th className="p-5">Equipamento / Origem</th>
                <th className="p-5">Peças / Serviços</th>
                <th className="p-5 text-right">Valor</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {finalizadas.map(item => (
                <tr 
                  key={item.id} 
                  onClick={() => toggleSelecao(item.id)}
                  className={`cursor-pointer transition-all ${selecionadas.includes(item.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                >
                  <td className="p-5">
                    <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selecionadas.includes(item.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                      {selecionadas.includes(item.id) && <CheckCircle2 size={16} className="text-white" />}
                    </div>
                  </td>
                  <td className="p-5">
                    <p className="font-bold text-slate-800">{item.marca} {item.modelo}</p>
                    <p className="text-xs text-slate-400">S/N: {item.serial} | <span className="text-blue-600 font-bold">{item.cliente}</span></p>
                  </td>
                  <td className="p-5">
                    <div className="flex flex-wrap gap-1">
                      {item.pecas_utilizadas?.length > 0 ? item.pecas_utilizadas.map((p, i) => (
                        <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">{p}</span>
                      )) : <span className="text-[10px] text-slate-400 italic font-medium">Ajuste técnico</span>}
                    </div>
                  </td>
                  <td className="p-5 text-right font-black text-slate-700">R$ 70,00</td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {finalizadas.length === 0 && (
            <div className="p-20 text-center">
              <ReceiptText size={48} className="mx-auto text-slate-200 mb-2" />
              <p className="text-slate-400 font-medium">Nenhuma OS pronta para faturamento.</p>
            </div>
          )}
        </div>
      )}

      {/* ABA 2: HISTÓRICO COM PAGINAÇÃO */}
      {abaAtiva === 'historico' && (
        <div className="space-y-4">
          {historico.map((nota) => (
            <div key={nota.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex justify-between items-center hover:shadow-sm transition-all">
              <div className="space-y-2 flex-1">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-1 text-[10px] font-black bg-slate-900 text-white px-2.5 py-1 rounded-md">
                    <Calendar size={12} /> ARQUIVADA EM: {nota.data_extenso}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">
                    REF ID: {nota.id.substring(0, 8).toUpperCase()}
                  </span>
                  <span className="text-xs font-bold text-blue-600">
                    ({nota.qtd_itens} {nota.qtd_itens === 1 ? 'Equipamento' : 'Equipamentos'})
                  </span>
                </div>
                
                <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 space-y-1.5">
                  {nota.servicos?.map((s, idx) => (
                    <div key={idx} className="text-xs text-slate-600 flex justify-between">
                      <span>• <strong className="text-slate-800">{s.marca} {s.modelo}</strong> ({s.cliente}) — S/N: {s.serial}</span>
                      <span className="text-[10px] font-mono text-slate-400 uppercase">
                        {s.pecas_utilizadas?.length > 0 ? s.pecas_utilizadas.join(', ') : 'Preventiva'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-col items-end gap-2 ml-6 min-w-[150px]">
                <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Valor Registrado</p>
                <p className="text-xl font-black text-slate-800">R$ {nota.valor_total?.toFixed(2)}</p>
                <button 
                  onClick={() => executarImpressaoHTML(nota.servicos, nota.valor_total, nota.data_extenso)}
                  className="flex items-center gap-1.5 bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 text-[11px] font-bold px-3 py-1.5 rounded-lg border border-slate-200 transition-all uppercase tracking-wide"
                >
                  <Printer size={13} /> Reimprimir Via
                </button>
              </div>
            </div>
          ))}

          {/* BARRA DE PAGINAÇÃO */}
          {historico.length > 0 && (
            <div className="flex justify-between items-center bg-white p-4 rounded-2xl border border-slate-200 shadow-sm mt-4">
              <span className="text-xs font-bold text-slate-500">
                Página <span className="text-slate-800 font-black">{paginaAtual}</span>
              </span>
              <div className="flex items-center gap-2">
                <button
                  onClick={paginaAnterior}
                  disabled={paginaAtual === 1}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${paginaAtual === 1 ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95'}`}
                >
                  <ChevronLeft size={16} /> Anterior
                </button>
                <button
                  onClick={proximaPagina}
                  disabled={!temMais}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${!temMais ? 'border-slate-100 text-slate-300 cursor-not-allowed bg-slate-50' : 'border-slate-200 text-slate-700 hover:bg-slate-50 active:scale-95'}`}
                >
                  Próxima <ChevronRight size={16} />
                </button>
              </div>
            </div>
          )}

          {historico.length === 0 && (
            <div className="p-20 text-center bg-white rounded-3xl border border-slate-200">
              <History size={48} className="mx-auto text-slate-200 mb-2" />
              <p className="text-slate-400 font-medium">Nenhum faturamento arquivado no banco.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}