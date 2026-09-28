import React from 'react';
import { useHistorico } from '../hooks/useHistorico';
import { Printer, AlertTriangle, TrendingDown, Wrench, BarChart3, ArrowLeft, RefreshCw } from 'lucide-react';

export function PaginaDashboard({ onVoltar }) {
  const { todosAtendimentos, carregando } = useHistorico();

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
        };
      }

      mapEquipamentos[chave].totalQuebras += 1;
      mapEquipamentos[chave].totalPaginasRodadas += paginas;
    });

    const listaEquipamentos = Object.values(mapEquipamentos);

    // 1. Impressoras que MAIS quebram
    const maisQuebram = [...listaEquipamentos].sort((a, b) => b.totalQuebras - a.totalQuebras);

    // 2. Impressoras que MENOS rodam páginas (Filtrando itens zerados)
    const menosRodam = [...listaEquipamentos]
      .filter(item => item.totalPaginasRodadas > 0)
      .sort((a, b) => a.totalPaginasRodadas - b.totalPaginasRodadas);

    return {
      maisQuebram: maisQuebram.slice(0, 10), // Top 10
      menosRodam: menosRodam.slice(0, 10),   // Top 10 que menos rodam
      totalMaquinasUnicas: listaEquipamentos.length,
      totalGeralPaginas,
      totalGeralQuebras
    };
  }, [todosAtendimentos]);

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
              Visão geral da frota: identificação de equipamentos problemáticos e volume de produção.
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
              <h2>Impressoras que Mais Quebram (Manutenções)</h2>
            </div>
            <span className="text-xs bg-amber-500/10 text-amber-400 px-2.5 py-1 rounded-full border border-amber-500/20 font-medium">
              Top Frequência
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {estatisticas.maisQuebram.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Nenhum registro encontrado.</p>
            ) : (
              estatisticas.maisQuebram.map((item, index) => (
                <div key={item.identificador} className="flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 p-3.5 rounded-xl border border-slate-700/50 transition">
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
              Baixo Volume
            </span>
          </div>

          <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
            {estatisticas.menosRodam.length === 0 ? (
              <p className="text-sm text-slate-500 text-center py-6">Nenhum registro encontrado com páginas contabilizadas.</p>
            ) : (
              estatisticas.menosRodam.map((item, index) => (
                <div key={item.identificador} className="flex items-center justify-between bg-slate-800/60 hover:bg-slate-800 p-3.5 rounded-xl border border-slate-700/50 transition">
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
    </div>
  );
}