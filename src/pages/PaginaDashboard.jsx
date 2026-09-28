import React, { useState } from 'react';
import { useHistorico } from '../hooks/useHistorico';
import { 
  Printer, 
  AlertTriangle, 
  TrendingDown, 
  Wrench, 
  BarChart3, 
  ArrowLeft, 
  RefreshCw, 
  X, 
  Calendar, 
  FileText, 
  Gauge, 
  Package 
} from 'lucide-react';

export function PaginaDashboard({ onVoltar }) {
  const { todosAtendimentos, carregando, extrairData } = useHistorico();
  const [equipamentoSelecionado, setEquipamentoSelecionado] = useState(null);

  // Helper para formatar qualquer tipo de data (incluindo Mongo {$date: "..."})
  const formatarDataBr = (dataVal) => {
    if (!dataVal) return null;
    let d;
    if (typeof dataVal === 'object' && dataVal.$date) {
      d = new Date(dataVal.$date);
    } else if (dataVal instanceof Date) {
      d = dataVal;
    } else {
      d = extrairData(dataVal) || new Date(dataVal);
    }
    return isNaN(d?.getTime()) ? null : d.toLocaleDateString('pt-BR');
  };

  // Helper para normalizar e separar a lista de peças em array
  const obterListaPecas = (pecas) => {
    if (!pecas) return [];
    if (Array.isArray(pecas)) {
      return pecas.flatMap(p => typeof p === 'string' ? p.split(',') : p).map(p => p.trim()).filter(Boolean);
    }
    if (typeof pecas === 'string') {
      return pecas.split(',').map(p => p.trim()).filter(Boolean);
    }
    return [];
  };

  // Processa as estatísticas avançadas com base em todos os atendimentos
  const estatisticas = React.useMemo(() => {
    const mapEquipamentos = {};
    let totalGeralPaginas = 0;
    let totalGeralQuebras = todosAtendimentos.length;

    todosAtendimentos.forEach(os => {
      const chave = os.serial ? String(os.serial).trim().toUpperCase() : (os.modelo ? String(os.modelo).trim().toUpperCase() : 'DESCONHECIDO');
      const modelo = os.modelo || 'Modelo não informado';
      const cliente = os.cliente || 'Cliente não informado';
      const paginas = Number(os.paginas_rodadas) || 0;

      totalGeralPaginas += paginas;

      if (!mapEquipamentos[chave]) {
        mapEquipamentos[chave] = {
          identificador: chave,
          modelo: modelo,
          cliente: cliente,
          totalQuebras: 0,
          totalPaginasRodadas: 0,
          historicoAtendimentos: []
        };
      }

      mapEquipamentos[chave].totalQuebras += 1;
      mapEquipamentos[chave].totalPaginasRodadas += paginas;
      mapEquipamentos[chave].historicoAtendimentos.push(os);
    });

    const listaEquipamentos = Object.values(mapEquipamentos);

    // Ordena os históricos de cada equipamento por data (mais recente primeiro)
    listaEquipamentos.forEach(eq => {
      eq.historicoAtendimentos.sort((a, b) => {
        const dataA = extrairData(a.data_finalizacao) || extrairData(a.data_entrada) || new Date(0);
        const dataB = extrairData(b.data_finalizacao) || extrairData(b.data_entrada) || new Date(0);
        return dataB - dataA;
      });
    });

    // 1. Impressoras que MAIS quebram
    const maisQuebram = [...listaEquipamentos].sort((a, b) => b.totalQuebras - a.totalQuebras);

    // 2. Impressoras que MENOS rodam páginas (Filtrando itens zerados)
    const menosRodam = [...listaEquipamentos]
      .filter(item => item.totalPaginasRodadas > 0)
      .sort((a, b) => a.totalPaginasRodadas - b.totalPaginasRodadas);

    return {
      maisQuebram: maisQuebram.slice(0, 10),
      menosRodam: menosRodam.slice(0, 10),
      totalMaquinasUnicas: listaEquipamentos.length,
      totalGeralPaginas,
      totalGeralQuebras
    };
  }, [todosAtendimentos, extrairData]);

  if (carregando) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-slate-400 space-y-3">
        <RefreshCw className="animate-spin text-blue-500" size={32} />
        <p>Carregando dados analíticos do parque de impressoras...</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-slate-100">
      
      {/* CABEÇALHO DA PÁGINA */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          {onVoltar && (
            <button
              onClick={onVoltar}
              className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg transition border border-slate-700"
              title="Voltar ao Histórico"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <BarChart3 className="text-blue-400" /> Dashboard Analítico de Impressoras
            </h1>
            <p className="text-sm text-slate-400">
              Visão geral da frota: clique em qualquer equipamento para ver o histórico completo de manutenções.
            </p>
          </div>
        </div>

        {/* CARDS DE RESUMO GERAL */}
        <div className="flex items-center gap-3">
          <div className="bg-slate-800/80 border border-slate-700/60 px-4 py-2.5 rounded-xl text-center">
            <p className="text-xs text-slate-400 font-medium">Equipamentos Únicos</p>
            <p className="text-lg font-bold text-blue-400">{estatisticas.totalMaquinasUnicas}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 px-4 py-2.5 rounded-xl text-center">
            <p className="text-xs text-slate-400 font-medium">Total de Chamados</p>
            <p className="text-lg font-bold text-amber-400">{estatisticas.totalGeralQuebras}</p>
          </div>
          <div className="bg-slate-800/80 border border-slate-700/60 px-4 py-2.5 rounded-xl text-center">
            <p className="text-xs text-slate-400 font-medium">Total Páginas Rodadas</p>
            <p className="text-lg font-bold text-emerald-400">{estatisticas.totalGeralPaginas.toLocaleString('pt-BR')}</p>
          </div>
        </div>
      </div>

      {/* GRID DE RANKINGS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* RANKING: AS QUE MAIS QUEBRAM */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-amber-400 font-semibold">
              <AlertTriangle size={20} />
              <h2>Impressoras que Mais Quebram</h2>
            </div>
            <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
              Clique no item para detalhes
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {estatisticas.maisQuebram.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Nenhum registro encontrado.</p>
            ) : (
              estatisticas.maisQuebram.map((item, index) => (
                <div 
                  key={item.identificador} 
                  onClick={() => setEquipamentoSelecionado(item)}
                  className="flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 p-3.5 rounded-xl border border-slate-700/50 cursor-pointer transition transform hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-lg font-bold text-xs ${
                      index === 0 ? 'bg-amber-500 text-slate-950' : 
                      index === 1 ? 'bg-slate-300 text-slate-950' : 
                      index === 2 ? 'bg-amber-700 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-slate-100">{item.modelo}</p>
                      <p className="text-xs text-slate-400">
                        Serial/ID: <span className="text-slate-300 font-mono">{item.identificador}</span> | {item.cliente}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-amber-500/10 text-amber-400 text-xs font-bold rounded-lg border border-amber-500/20">
                      {item.totalQuebras} {item.totalQuebras === 1 ? 'chamado' : 'chamados'}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* RANKING: AS QUE MENOS RODAM PÁGINAS */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-rose-400 font-semibold">
              <TrendingDown size={20} />
              <h2>Impressoras que Menos Rodam Páginas</h2>
            </div>
            <span className="text-xs bg-rose-500/10 text-rose-400 px-2.5 py-1 rounded-full border border-rose-500/20 font-medium">
              Clique no item para detalhes
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {estatisticas.menosRodam.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Nenhum registro encontrado com páginas contabilizadas.</p>
            ) : (
              estatisticas.menosRodam.map((item, index) => (
                <div 
                  key={item.identificador} 
                  onClick={() => setEquipamentoSelecionado(item)}
                  className="flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 p-3.5 rounded-xl border border-slate-700/50 cursor-pointer transition transform hover:scale-[1.01]"
                >
                  <div className="flex items-center gap-3.5">
                    <span className={`w-7 h-7 flex items-center justify-center rounded-lg font-bold text-xs ${
                      index === 0 ? 'bg-rose-500 text-white' : 
                      index === 1 ? 'bg-slate-600 text-white' : 'bg-slate-700 text-slate-300'
                    }`}>
                      #{index + 1}
                    </span>
                    <div>
                      <p className="font-semibold text-sm text-slate-100">{item.modelo}</p>
                      <p className="text-xs text-slate-400">
                        Serial/ID: <span className="text-slate-300 font-mono">{item.identificador}</span> | {item.cliente}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="px-3 py-1 bg-rose-500/10 text-rose-400 text-xs font-bold rounded-lg border border-rose-500/20">
                      {item.totalPaginasRodadas.toLocaleString('pt-BR')} págs
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      {/* MODAL DE HISTÓRICO DO EQUIPAMENTO */}
      {equipamentoSelecionado && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 text-slate-100">
            
            {/* Cabeçalho do Modal */}
            <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
              <div>
                <span className="text-xs uppercase tracking-wider text-blue-400 font-semibold">Histórico de Atendimentos</span>
                <h3 className="text-lg font-bold text-white">{equipamentoSelecionado.modelo}</h3>
                <p className="text-xs text-slate-400 font-mono mt-0.5">
                  Serial/ID: {equipamentoSelecionado.identificador} | Cliente: {equipamentoSelecionado.cliente}
                </p>
              </div>
              <button 
                onClick={() => setEquipamentoSelecionado(null)}
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl transition"
              >
                <X size={20} />
              </button>
            </div>

            {/* Resumo Rápido no Modal */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-slate-950/40 border-b border-slate-800/60 text-center">
              <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block">Total de Chamados</span>
                <span className="text-base font-bold text-amber-400">{equipamentoSelecionado.totalQuebras}</span>
              </div>
              <div className="bg-slate-800/40 p-2.5 rounded-xl border border-slate-800">
                <span className="text-xs text-slate-400 block">Páginas Acumuladas</span>
                <span className="text-base font-bold text-emerald-400">{equipamentoSelecionado.totalPaginasRodadas.toLocaleString('pt-BR')}</span>
              </div>
            </div>

            {/* Lista de Atendimentos */}
            <div className="p-5 overflow-y-auto space-y-4 flex-1">
              {equipamentoSelecionado.historicoAtendimentos.map((osItem, idx) => {
                const osNumero = osItem.os || osItem.numero_os || 'Sem Número';
                
                const dtEntrada = formatarDataBr(osItem.data_entrada);
                const dtFinalizacao = formatarDataBr(osItem.data_finalizacao);
                const dtAnterior = formatarDataBr(osItem.data_contador_anterior);
                const dtAtualContador = dtFinalizacao || dtEntrada || 'Data N/D';

                const contadorFinal = Number(osItem.contador_final) || 0;
                const contadorAnterior = osItem.ultimo_contador_anterior !== null && osItem.ultimo_contador_anterior !== undefined
                  ? Number(osItem.ultimo_contador_anterior) 
                  : null;
                
                const paginasRodadas = Number(osItem.paginas_rodadas) || 0;
                const listaPecas = obterListaPecas(osItem.pecas_utilizadas);
                const defeito = osItem.defeito || osItem.defeito_relatado;
                const relatorio = osItem.relatorio_tecnico || osItem.servico_executado;

                return (
                  <div key={osItem._id || osItem.id || idx} className="bg-slate-800/50 hover:bg-slate-800 border border-slate-700/50 p-4 rounded-xl space-y-3 transition">
                    
                    {/* Linha Superior: Data + OS */}
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-700/40 pb-2">
                      <div className="flex items-center gap-3">
                        <span className="flex items-center gap-1 font-medium text-slate-300">
                          <Calendar size={13} className="text-blue-400" />
                          Entrada: {dtEntrada || 'N/D'}
                        </span>
                        {dtFinalizacao && (
                          <span className="text-emerald-400 font-medium">
                            Fim: {dtFinalizacao}
                          </span>
                        )}
                      </div>
                      <span className="bg-blue-600/20 text-blue-400 border border-blue-500/30 px-2 py-0.5 rounded font-mono font-bold">
                        OS: {osNumero}
                      </span>
                    </div>

                    {/* Bloco Completo dos Contadores */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-xs">
                      <div>
                        <p className="font-bold uppercase text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                          <Gauge size={12}/> Contador Atual
                        </p>
                        <p className="font-mono font-bold text-slate-200 text-sm">
                          {contadorFinal.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400 font-sans">pág</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {dtAtualContador}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold uppercase text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                          <Gauge size={12}/> Contador Anterior
                        </p>
                        <p className="font-mono font-medium text-slate-300 text-sm">
                          {contadorAnterior !== null ? `${contadorAnterior.toLocaleString('pt-BR')} pág` : 'Primeiro Registro'}
                        </p>
                        <p className="text-[10px] text-slate-400 font-medium mt-0.5">
                          {dtAnterior || 'Sem registro anterior'}
                        </p>
                      </div>

                      <div>
                        <p className="font-bold uppercase text-[10px] text-blue-400 flex items-center gap-1 mb-0.5">
                          <Printer size={12}/> Rodadas no Período
                        </p>
                        <p className="font-mono font-bold text-blue-400 text-sm">
                          +{paginasRodadas.toLocaleString('pt-BR')} <span className="text-[10px] font-sans">pág</span>
                        </p>
                        <p className="text-[10px] text-blue-400 font-bold mt-0.5">
                          {osItem.dias_decorridos !== null && osItem.dias_decorridos !== undefined
                            ? `${osItem.dias_decorridos} dia(s) decorrido(s)`
                            : 'Período N/D'}
                        </p>
                      </div>
                    </div>

                    {/* Defeito Relatado */}
                    {defeito && (
                      <div className="text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-amber-400 font-semibold block mb-0.5">Defeito Relatado:</span>
                        <p className="text-slate-300 italic">{defeito}</p>
                      </div>
                    )}

                    {/* Relatório Técnico */}
                    {relatorio && (
                      <div className="text-xs bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        <span className="text-blue-400 font-semibold block mb-0.5">Relatório Técnico:</span>
                        <p className="text-slate-300 whitespace-pre-line leading-relaxed">{relatorio}</p>
                      </div>
                    )}

                    {/* Peças Trocadas em Badges */}
                    {listaPecas.length > 0 && (
                      <div className="text-xs">
                        <span className="text-slate-400 font-semibold flex items-center gap-1 mb-1">
                          <Package size={13} className="text-emerald-400" /> Peças Trocadas:
                        </span>
                        <div className="flex flex-wrap gap-1.5">
                          {listaPecas.map((p, idxPeca) => (
                            <span key={idxPeca} className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
                              {p}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                  </div>
                );
              })}
            </div>

            {/* Rodapé do Modal */}
            <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
              <button 
                onClick={() => setEquipamentoSelecionado(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-sm rounded-xl transition"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}