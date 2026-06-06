import { useState } from 'react';
import { db } from '../firebase/config';
import { collection, query, getDocs, limit, startAfter, orderBy } from 'firebase/firestore';
import { FileText, Search, Printer, Calendar, ShieldCheck, Loader2, ChevronRight, ChevronLeft } from 'lucide-react';
import toast from 'react-hot-toast';

export default function RelatorioConsumo() {
  const [atendimentos, setAtendimentos] = useState([]);
  const [buscaCliente, setBuscaCliente] = useState('');
  const [filtroDataInicio, setFiltroDataInicio] = useState('');
  const [filtroDataFim, setFiltroDataFim] = useState('');
  const [carregando, setCarregando] = useState(false);

  // Estados de Paginação
  const [ultimoDocumento, setUltimoDocumento] = useState(null);
  const [historicoPaginas, setHistoricoPaginas] = useState([]);
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [temMais, setTemMais] = useState(false);
  
  const ITENS_POR_PAGINA = 10; // Limite estrito de leitura por vez para economia de dados

  // 1. Função Principal de Busca Otimizada e Flexível
  const buscarDados = async (proximaPagina = false, retrocederPagina = false) => {
    setCarregando(true);
    
    try {
      let q = collection(db, "atendimentos");
      
      // Ordenamos por data de finalização e limitamos o lote para economizar dados
      let filtros = [orderBy("data_finalizacao", "desc"), limit(ITENS_POR_PAGINA)];

      // Controle de navegação das páginas
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
          setUltimoDocumento(null);
          setHistoricoPaginas([]);
          setPaginaAtual(1);
        }
        setTemMais(false);
        setCarregando(false);
        return;
      }

      const dados = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // FILTRAGEM FLEXÍVEL EM MEMÓRIA (Ignora maiúsculas/minúsculas e aceita termos parciais)
      const dadosFiltrados = dados.filter(atendimento => {
        // 1. Garante que só entram itens com peças utilizadas
        const possuiPecas = Array.isArray(atendimento.pecas_utilizadas) && atendimento.pecas_utilizadas.length > 0;
        if (!possuiPecas) return false;

        // 2. Filtro por nome do cliente (Case-Insensitive e aceita partes do nome)
        if (buscaCliente.trim()) {
          const nomeClienteBanco = (atendimento.cliente || '').toLowerCase();
          const nomeBuscado = buscaCliente.trim().toLowerCase();
          
          // Se o termo digitado não estiver incluído no nome registrado, descarta do filtro
          if (!nomeClienteBanco.includes(nomeBuscado)) return false;
        }

        // 3. Filtro por intervalo de datas
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

      // Atualiza os estados de paginação baseados no snapshot original do Firestore
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
      console.error("Erro ao filtrar atendimentos:", error);
      toast.error("Erro ao carregar dados do banco.");
    } finally {
      setCarregando(false);
    }
  };

  // Consolida o total de peças gastas da página atual
  const resumoPecasGastas = {};
  atendimentos.forEach(atendimento => {
    atendimento.pecas_utilizadas.forEach(peca => {
      resumoPecasGastas[peca] = (resumoPecasGastas[peca] || 0) + 1;
    });
  });

  const formatarData = (campoData) => {
    if (!campoData) return '---';
    if (typeof campoData.toDate === 'function') return campoData.toDate().toLocaleDateString('pt-BR');
    if (campoData.seconds) return new Date(campoData.seconds * 1000).toLocaleDateString('pt-BR');
    return new Date(campoData).toLocaleDateString('pt-BR');
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen print:bg-white print:p-0">
      
      {/* Cabeçalho */}
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="text-blue-600" /> Relatório de Insumos Otimizado
          </h1>
          <p className="text-slate-500 font-medium text-sm">
            Busca sob demanda com paginação para economia de dados e franquia do Firebase.
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

      {/* Painel de Filtros e Disparador de Busca */}
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

      {/* Exibição dos Dados */}
      {carregando ? (
        <div className="flex flex-col items-center justify-center py-20 text-slate-400 gap-2">
          <Loader2 size={32} className="animate-spin text-blue-600" />
          <span className="text-xs font-bold uppercase tracking-widest">Puxando lote do servidor...</span>
        </div>
      ) : atendimentos.length > 0 ? (
        <div className="space-y-6 print:space-y-8">
          
          {/* Cabeçalho Visual de Impressão */}
          <div className="hidden print:flex flex-col border-b-2 border-slate-800 pb-4 mb-6">
            <h1 className="text-xl font-black text-slate-900 uppercase">Relatório de Manutenção e Aplicação de Peças</h1>
            <p className="text-xs text-slate-600 font-bold mt-1">
              FILTRO DE BUSCA: {buscaCliente ? buscaCliente : 'TODOS OS LOCAIS'}
            </p>
            <p className="text-[10px] text-slate-500">
              Página: {paginaAtual} | Gerado em: {new Date().toLocaleDateString('pt-BR')}
            </p>
          </div>

          {/* Card Consolidado da Página */}
          <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800 print:border-slate-300 print:bg-slate-50 print:text-slate-900">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 print:text-slate-600 mb-3 flex items-center gap-1.5">
              <ShieldCheck size={16} className="text-green-400 print:text-green-600" /> 
              Resumo do Lote Atual (Página {paginaAtual})
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-mono">
              {Object.entries(resumoPecasGastas).map(([nomePeca, qtd]) => (
                <div key={nomePeca} className="flex justify-between items-center bg-slate-800/50 print:bg-white p-2.5 rounded-lg border border-slate-700/50 print:border-slate-200">
                  <span className="uppercase font-bold truncate pr-2">{nomePeca}</span>
                  <span className="bg-blue-600 text-white px-2 py-0.5 rounded font-black print:bg-slate-200 print:text-slate-900">
                    {qtd.toString().padStart(2, '0')} un
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Tabela Detalhada */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print:border-none print:shadow-none">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100 text-slate-600 uppercase font-bold text-[10px] tracking-wider border-b-2 border-slate-200">
                <tr>
                  <th className="p-3 pl-5 w-28">Data Fin.</th>
                  <th className="p-3 w-32">Nº O.S.</th>
                  <th className="p-3 w-48">Equipamento / Série</th>
                  <th className="p-3">Insumos Aplicados</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-700 font-medium">
                {atendimentos.map((atendimento) => (
                  <tr key={atendimento.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-3 pl-5 font-semibold text-slate-500 whitespace-nowrap">
                      {formatarData(atendimento.data_finalizacao || atendimento.data_atendimento || atendimento.data_entrada)}
                    </td>
                    <td className="p-3">
                      <span className="font-bold text-slate-900 block">
                        {atendimento.os ? `OS-${atendimento.os}` : '---'}
                      </span>
                      <span className="text-[10px] text-slate-400 block uppercase max-w-[120px] truncate">
                        {atendimento.cliente || 'Sem Local'}
                      </span>
                    </td>
                    <td className="p-3">
                      <p className="font-bold uppercase text-slate-800">{atendimento.modelo || atendimento.modelo_impressora || '---'}</p>
                      <p className="text-[10px] font-mono text-blue-600 font-bold uppercase tracking-wider">
                        S/N: {atendimento.serial || atendimento.num_serie || '---'}
                      </p>
                    </td>
                    <td className="p-3">
                      <ul className="list-disc pl-4 space-y-0.5">
                        {atendimento.pecas_utilizadas.map((peca, idx) => (
                          <li key={idx} className="uppercase font-bold text-slate-900 text-[11px]">
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

          {/* CONTROLE DE PAGINAÇÃO - Ocultado na Impressão */}
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
          <p className="text-xs text-slate-400">Preencha os filtros acima e clique em <strong>"Gerar e Filtrar Relatório"</strong> para realizar a consulta.</p>
        </div>
      )}
    </div>
  );
}