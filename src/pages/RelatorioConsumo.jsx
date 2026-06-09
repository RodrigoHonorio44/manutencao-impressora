import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, getDocs, limit, startAfter, orderBy } from 'firebase/firestore';
import { FileText, Search, Printer, Calendar, Loader2, ChevronRight, ChevronLeft, BarChart3 } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RelatorioConsumo() {
  const [atendimentos, setAtendimentos] = useState([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [carregando, setCarregando] = useState(false);
  
  // Estado isolado para acumular o resumo fiel do lote vindo do banco
  const [resumoPecasGastas, setResumoPecasGastas] = useState({});

  // Estados de Paginação
  const [ultimoDocumento, setUltimoDocumento] = useState(null);
  const [historicoPaginas, setHistoricoPaginas] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [temMais, setTemMais] = useState(false);
  
  const ITENS_POR_PAGINA = 10;

  // 1. Função Principal de Busca e Consolidação Otimizada
  const buscarDados = async (proximaPagina = false, retrocederPagina = false) => {
    setCarregando(true);
    
    try {
      let q = collection(db, "atendimentos");
      let filtros = [orderBy("data_finalizacao", "desc"), limit(ITENS_POR_PAGINA)];

      if (proximaPagina && ultimoDocumento) {
        filtros.push(startAfter(ultimoDocumento));
      } else if (retrocederPagina && historicoPaginas[paginaAtual - 2]) {
        filtros.push(startAfter(historicoPaginas[paginaAtual - 3] || null));
      }

      const queryFinal = query(q, ...filtros);
      const snapshot = await getDocs(queryFinal);

      if (snapshot.empty) {
        if (!proximaPagina) {
          setAtendimentos([]);
          setResumoPecasGastas({});
          setUltimoDocumento(null);
          setHistoricoPaginas([]);
          setPaginaAtual(1);
        }
        setTemMais(false);
        setCarregando(false);
        return;
      }

      const dadosBrutos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // =========================================================================
      // PASSO CRUCIAL: Contagem direta e normalizada de TUDO que veio do banco
      // =========================================================================
      const acumuladorPecas = {};
      dadosBrutos.forEach(atendimento => {
        if (Array.isArray(atendimento.pecas_utilizadas)) {
          atendimento.pecas_utilizadas.forEach(pecaCrua => {
            if (!pecaCrua) return;

            // Limpa espaços extras e padroniza para letras maiúsculas sem acentos comuns
            const pecaTexto = pecaCrua.trim().toUpperCase()
              .normalize("NFD")
              .replace(/[\u0300-\u036f]/g, ""); 

            let nomePadronizado = pecaCrua.trim();

            // Identificação robusta por palavras-chave (Varre também os novos nomes longos/part numbers)
            if (pecaTexto.includes("PELICULA")) {
              nomePadronizado = "PELÍCULA DE FUSÃO (TN3472)";
            } else if (pecaTexto.includes("ROLO") || pecaTexto.includes("PRESSOR")) {
              nomePadronizado = "ROLO PRESSOR (TN3472)";
            }

            acumuladorPecas[nomePadronizado] = (acumuladorPecas[nomePadronizado] || 0) + 1;
          });
        }
      });
      setResumoPecasGastas(acumuladorPecas);
      // =========================================================================

      // Filtragem em memória apenas para a exibição visual da tabela de registros
      const dadosFiltrados = dadosBrutos.filter(atendimento => {
        const possuiPecas = Array.isArray(atendimento.pecas_utilizadas) && atendimento.pecas_utilizadas.length > 0;
        if (!possuiPecas) return false;

        if (buscaCliente.trim()) {
          const nomeClienteBanco = (atendimento.cliente || '').toLowerCase();
          const nomeBuscado = buscaCliente.trim().toLowerCase();
          if (!nomeClienteBanco.includes(nomeBuscado)) return false;
        }

        const dataAtendimentoMs = atendimento.data_finalizacao?.seconds 
          ? atendimento.data_finalizacao.seconds * 1000 
          : new Date(atendimento.data_finalizacao || atendimento.data_entrada).getTime();
        
        if (filtroDataInicio) {
          if (dataAtendimentoMs < new Date(filtroDataInicio).getTime()) return false;
        }
        if (filtroDataFim) {
          if (dataAtendimentoMs > new Date(filtroDataFim).setHours(23, 59, 59, 999)) return false;
        }
        
        return true;
      });

      const ultimoDocAtual = snapshot.docs[snapshot.docs.length - 1];
      setUltimoDocumento(ultimoDocAtual);

      if (proximaPagina) {
        setHistoricoPaginas([...historicoPaginas, ultimoDocAtual]);
        setPaginaAtual(prev => prev + 1);
      } else if (retrocederPagina) {
        setPaginaAtual(prev => prev - 1);
      } else {
        setHistoricoPaginas([ultimoDocAtual]);
        setPaginaAtual(1);
      }

      setTemMais(snapshot.docs.length === ITENS_POR_PAGINA);
      setAtendimentos(dadosFiltrados);

    } catch (error) {
      console.error("Erro ao processar atendimentos:", error);
      toast.error("Erro ao carregar dados do banco.");
    } finally {
      setCarregando(false);
    }
  };

  const formatarData = (campoData) => {
    if (!campoData) return '---';
    if (typeof campoData.toDate === 'function') return campoData.toDate().toLocaleDateString('pt-BR');
    if (campoData.seconds) return new Date(campoData.seconds * 1000).toLocaleDateString('pt-BR');
    return new Date(campoData).toLocaleDateString('pt-BR');
  };

  // Encontra o maior valor do lote para calcular a proporção (100%) das barras do gráfico
  const valoresValidos = Object.values(resumoPecasGastas);
  const valorMaximo = valoresValidos.length > 0 ? Math.max(...valoresValidos) : 1;

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen print:bg-white print:p-0 print:space-y-0 print:m-0 id-container-relatorio-impressao">
      
      {/* CSS OTIMIZADO PARA IMPRESSÃO - FORÇANDO SUMIÇO DA SIDEBAR GLOBAL */}
      <style>{`
        @media print {
          /* 1. Remove qualquer barra lateral ou menu global de forma absoluta */
          nav, aside, header, button, .no-print, [role="navigation"], 
          .sidebar, [class*="sidebar"], [class*="Sidebar"] {
            display: none !important;
            opacity: 0 !important;
            width: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
            visibility: hidden !important;
          }
          
          /* 2. Reseta espaçamentos estruturais de possíveis layouts pais (como flex/grid laterais) */
          html, body, #root, .min-h-screen, main, div {
            background-color: #fff !important;
            color: #000 !important;
            height: auto !important;
            overflow: visible !important;
            margin: 0 !important;
            padding: 0 !important;
            transform: none !important;
            position: static !important;
            display: block !important;
            width: 100% !important;
            max-width: 100% !important;
          }

          /* 3. Força o container do relatório a ocupar o topo esquerdo absoluto da folha */
          .id-container-relatorio-impressao {
            display: block !important;
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            visibility: visible !important;
            z-index: 9999 !important;
          }

          .id-container-relatorio-impressao * {
            visibility: visible !important;
          }
          
          @page {
            size: auto;
            margin: 12mm 15mm;
          }
          
          tr {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }

          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
        }
      `}</style>

      {/* Cabeçalho */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> Relatório de Insumos Otimizado
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Busca sob demanda com cálculo direto nos dados brutos para precisão absoluta de estoque.
          </p>
        </div>
        
        <button 
          onClick={() => window.print()}
          disabled={atendimentos.length === 0}
          className="flex items-center gap-2 bg-blue-600 text-white font-bold px-5 py-3 rounded-xl hover:bg-blue-700 text-xs uppercase tracking-wider transition-all disabled:opacity-50"
        >
          <Printer size={16} /> Imprimir Página / PDF
        </button>
      </header>

      {/* Painel de Filtros */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4 print:hidden">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="flex flex-col space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Buscar por Cliente (Hospital / Unidade)</label>
            <div className="relative flex items-center bg-slate-50 border rounded-xl p-2.5">
              <Search size={18} className="text-slate-400 mr-2" />
              <input 
                type="text" 
                placeholder="Ex: Conde Modesto Leal..." 
                value={buscaCliente}
                onChange={(e) => setBuscaCliente(e.target.value)}
                className="w-full text-sm font-semibold outline-none text-slate-700 bg-transparent"
              />
            </div>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Data Inicial</label>
            <input 
              type="date" 
              value={filtroDataInicio}
              onChange={(e) => setFiltroDataInicio(e.target.value)}
              className="p-2.5 bg-slate-50 border rounded-xl text-sm font-medium text-slate-700 outline-none"
            />
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Data Final</label>
            <input 
              type="date" 
              value={filtroDataFim}
              onChange={(e) => setFiltroDataFim(e.target.value)}
              className="p-2.5 bg-slate-50 border rounded-xl text-sm font-medium text-slate-700 outline-none"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            onClick={() => buscarDados(false, false)}
            disabled={carregando}
            className="bg-slate-900 text-white text-xs uppercase tracking-wider font-bold px-6 py-3 rounded-xl hover:bg-slate-800 flex items-center gap-2"
          >
            {carregando && <Loader2 size={14} className="animate-spin" />}
            Gerar e Filtrar Relatório
          </button>
        </div>
      </section>

      {/* Conteúdo do Relatório */}
      {carregando ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2 print:hidden">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-widest">Processando lote do Firestore...</span>
        </div>
      ) : atendimentos.length > 0 ? (
        <div className="space-y-6 print:space-y-6 w-full layout-impressao-isolado">
          
          {/* Cabeçalho Visual de Impressão */}
          <div className="hidden print:block border-b-2 border-slate-800 pb-3 mb-4 w-full">
            <div className="flex justify-between items-end">
              <div>
                <h1 className="text-xl font-black text-slate-900 uppercase tracking-tight">Relatório de Manutenção e Aplicação de Peças</h1>
                <p className="text-xs text-slate-600 font-bold mt-0.5 uppercase">
                  FILTRO DE BUSCA: {buscaCliente ? buscaCliente : 'TODOS OS LOCAIS'}
                </p>
              </div>
              <div className="text-right text-[10px] text-slate-500 font-mono">
                <p className="font-bold text-slate-800">Lote (Página): {paginaAtual}</p>
                <p>Gerado em: {new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>
          </div>

          {/* SEÇÃO DO GRÁFICO DE BARRAS TAIWIND (Largura Total) */}
          <div className="w-full bg-white p-5 rounded-2xl border border-slate-200 shadow-sm print:border-slate-300 print:p-4 print:rounded-xl break-inside-avoid">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-4 flex items-center gap-1.5 border-b pb-1">
              <BarChart3 size={16} className="text-blue-600" /> 
              Análise Visual de Consumo
            </h3>
            <div className="space-y-3.5">
              {Object.entries(resumoPecasGastas).map(([nomePeca, qtd]) => {
                // Define tamanho mínimo de 8% para a barra não sumir visualmente se for 1 unidade
                const percentual = Math.max(8, (qtd / valorMaximo) * 100);
                const isPelicula = nomePeca.includes("PELÍCULA");

                return (
                  <div key={nomePeca} className="space-y-1">
                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-wide text-slate-600">
                      <span className="truncate max-w-[85%]">{nomePeca}</span>
                      <span className="font-mono text-slate-900 font-black">{qtd} un</span>
                    </div>
                    {/* Trilha da Barra */}
                    <div className="w-full h-3.5 bg-slate-100 rounded-md overflow-hidden relative border border-slate-200/50">
                      {/* Barra Dinâmica Colorida */}
                      <div 
                        className={`h-full rounded-r transition-all duration-500 ${isPelicula ? 'bg-gradient-to-r from-blue-500 to-blue-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'}`}
                        style={{ width: `${percentual}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Tabela Detalhada */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none w-full">
            <table className="w-full text-left border-collapse text-xs table-auto print:w-full">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b-2 border-slate-200 print:bg-slate-100 print:text-slate-900">
                <tr>
                  <th className="p-3 pl-5 w-24 print:p-2 print:pl-3">Data Fin.</th>
                  <th className="p-3 w-44 print:p-2">Nº O.S. / Cliente</th>
                  <th className="p-3 w-52 print:p-2">Equipamento / Série</th>
                  <th className="p-3 print:p-2">Insumos Aplicados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                {atendimentos.map((atendimento) => (
                  <tr key={atendimento.id} className="hover:bg-slate-50/50 transition-colors print:break-inside-avoid">
                    <td className="p-3 pl-5 font-semibold text-slate-500 whitespace-nowrap print:p-2 print:pl-3 print:text-slate-900">
                      {formatarData(atendimento.data_finalizacao || atendimento.data_atendimento || atendimento.data_entrada)}
                    </td>
                    <td className="p-3 print:p-2">
                      <span className="font-bold text-slate-900 block">
                        {atendimento.os ? `OS-${atendimento.os}` : '---'}
                      </span>
                      <span className="text-[10px] text-slate-400 block uppercase print:whitespace-normal print:text-slate-600 font-bold">
                        {atendimento.cliente || 'Sem Local'}
                      </span>
                    </td>
                    <td className="p-3 print:p-2">
                      <p className="font-bold uppercase text-slate-800 print:text-slate-900">{atendimento.modelo || atendimento.modelo_impressora || '---'}</p>
                      <p className="text-[10px] font-mono text-blue-600 font-bold uppercase tracking-wider print:text-slate-500">
                        S/N: {atendimento.serial || atendimento.num_serie || '---'}
                      </p>
                    </td>
                    <td className="p-3 print:p-2">
                      <ul className="list-disc pl-4 space-y-0.5">
                        {atendimento.pecas_utilizadas.map((peca, idx) => (
                          <li key={idx} className="uppercase font-bold text-slate-900 text-[11px] print:text-slate-900">
                            {peca}
                          </li>
                        ))}
                      </ul>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Controle de Paginação */}
          <div className="flex items-center justify-between border-t pt-4 print:hidden">
            <span className="text-xs text-slate-500 font-semibold">
              Página <strong className="text-slate-800">{paginaAtual}</strong>
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => buscarDados(false, true)}
                disabled={paginaAtual === 1}
                className="flex items-center gap-1 px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
              >
                <ChevronLeft size={16} /> Voltar
              </button>
              <button
                onClick={() => buscarDados(true, false)}
                disabled={!temMais}
                className="flex items-center gap-1 px-3 py-2 bg-white border rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
              >
                Avançar <ChevronRight size={16} />
              </button>
            </div>
          </div>

        </div>
      ) : (
        <div className="bg-white rounded-2xl border p-12 text-center text-slate-400 space-y-2 print:hidden">
          <Calendar size={32} className="mx-auto text-slate-300" />
          <p className="font-medium text-sm">Nenhum dado carregado na tela.</p>
          <p className="text-xs text-slate-400">Preencha os filtros acima e clique em <strong>"Gerar e Filtrar Relatório"</strong>.</p>
        </div>
      )}
    </div>
  );
}