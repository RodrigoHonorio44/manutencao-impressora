import React from 'react';
import { X, Printer } from 'lucide-react';

export default function ModalLaudoConsolidado({ chamados = [], onClose }) {
  const handlePrint = () => {
    window.print();
  };

  // Agrupa e conta o total por modelo
  const totalPorModelo = chamados.reduce((acc, item) => {
    const marca = item?.marca || '';
    const modelo = item?.modelo || '';
    const chave = `${marca} ${modelo}`.trim() || 'Outros';
    acc[chave] = (acc[chave] || 0) + 1;
    return acc;
  }, {});

  // Formata datas para o padrão DD/MM/AAAA tratando objetos MongoDB {$date: "..."}
  const formatarData = (dataVal) => {
    if (!dataVal) return '-';
    
    try {
      let dataObj;
      if (typeof dataVal === 'object' && dataVal.$date) {
        dataObj = new Date(dataVal.$date);
      } else if (dataVal instanceof Date) {
        dataObj = dataVal;
      } else if (typeof dataVal === 'object' && dataVal.seconds) {
        dataObj = new Date(dataVal.seconds * 1000);
      } else {
        dataObj = new Date(dataVal);
      }

      if (isNaN(dataObj.getTime())) return '-';

      return dataObj.toLocaleDateString('pt-BR');
    } catch {
      return '-';
    }
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

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #modal-laudo-consolidado, #modal-laudo-consolidado * {
            visibility: visible !important;
          }
          #modal-laudo-consolidado {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 100% !important;
            box-shadow: none !important;
            padding: 0 !important;
            margin: 0 !important;
            border: none !important;
            height: auto !important;
            max-height: none !important;
            overflow: visible !important;
          }
          .no-print {
            display: none !important;
          }
          @page {
            size: A4 landscape;
            margin: 8mm;
          }
          table {
            font-size: 8.5px !important;
            width: 100% !important;
            border-collapse: collapse !important;
          }
          tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          th, td {
            padding: 3px 5px !important;
            border: 1px solid #cbd5e1 !important;
          }
        }
      `}</style>

      {/* Overlay com rolagem e centralização */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto p-2 sm:p-4 flex justify-center items-start">
        
        {/* Container do Modal */}
        <div 
          id="modal-laudo-consolidado"
          className="bg-white rounded-2xl w-full max-w-7xl my-auto flex flex-col shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh]"
        >
          {/* Cabeçalho Fixo */}
          <div className="shrink-0 flex items-center justify-between p-3 sm:p-4 border-b border-slate-200 bg-white z-10 no-print">
            <div>
              <h2 className="text-sm sm:text-base font-bold text-slate-800">
                Laudo Técnico Consolidado
              </h2>
              <p className="text-[11px] text-slate-500">
                Total: {chamados.length} {chamados.length === 1 ? 'item selecionado' : 'itens selecionados'}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
              >
                <Printer size={15} /> Imprimir
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Área de Conteúdo */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            {/* Título de Impressão */}
            <div className="hidden print:block border-b pb-2 mb-2">
              <h1 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Laudo Técnico Consolidado - Relatório Geral de Manutenções
              </h1>
              <p className="text-[10px] text-slate-600 mt-0.5">
                Total de equipamentos listados: <strong>{chamados.length}</strong>
              </p>
            </div>

            {/* Resumo por modelo */}
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
              <span className="text-[11px] font-bold text-slate-700 block mb-1">
                Resumo de Equipamentos:
              </span>
              <div className="flex flex-wrap gap-1.5 text-xs">
                {Object.entries(totalPorModelo).map(([modelo, qtd]) => (
                  <span key={modelo} className="bg-white px-2 py-0.5 rounded border border-slate-200 text-[10px] font-medium text-slate-700">
                    <strong>{qtd}x</strong> {modelo}
                  </span>
                ))}
              </div>
            </div>

            {/* Tabela de Dados Detalhada */}
            {chamados.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-8">
                Nenhum chamado selecionado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-semibold text-[11px]">
                      <th className="p-1.5 border-r border-slate-200 w-20">Nº OS</th>
                      <th className="p-1.5 border-r border-slate-200 w-20">Conclusão</th>
                      <th className="p-1.5 border-r border-slate-200 w-28">Nº Serial (S/N)</th>
                      <th className="p-1.5 border-r border-slate-200 w-36">Equipamento</th>
                      <th className="p-1.5 border-r border-slate-200 w-32">Cliente</th>
                      <th className="p-1.5 border-r border-slate-200 w-20 text-center">Cont. Anterior</th>
                      <th className="p-1.5 border-r border-slate-200 w-20 text-center">Cont. Atual</th>
                      <th className="p-1.5 border-r border-slate-200 w-24 text-center">Rodadas (Período)</th>
                      <th className="p-1.5 border-r border-slate-200 w-44">Serviço / Relatório Técnico</th>
                      <th className="p-1.5 w-36">Peças Trocadas</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {chamados.map((item, index) => {
                      const osNumero = item.os || item.numero_os || 'N/D';
                      const dataFechamento = 
                        item.data_finalizacao ||
                        item.data_fim || 
                        item.data_fechamento || 
                        item.data_conclusao || 
                        item.data_entrada;

                      const dtAnterior = formatarData(item.data_contador_anterior);

                      const contadorFinal = Number(item.contador_final) || 0;
                      const contadorAnterior = item.ultimo_contador_anterior !== null && item.ultimo_contador_anterior !== undefined
                        ? Number(item.ultimo_contador_anterior) 
                        : null;

                      const paginasRodadas = Number(item.paginas_rodadas) || 0;
                      const listaPecas = obterListaPecas(item.pecas_utilizadas);

                      return (
                        <tr key={item.id || item._id || index} className="hover:bg-slate-50/50">
                          <td className="p-1.5 font-mono text-[10px] font-bold border-r border-slate-200 text-slate-800 whitespace-nowrap">
                            {osNumero}
                          </td>
                          <td className="p-1.5 font-mono text-[10px] border-r border-slate-200 text-slate-700 whitespace-nowrap">
                            {formatarData(dataFechamento)}
                          </td>
                          <td className="p-1.5 font-mono text-[10px] border-r border-slate-200 text-slate-600 whitespace-nowrap">
                            {item.serial || 'N/A'}
                          </td>
                          <td className="p-1.5 border-r border-slate-200 font-medium text-slate-800 text-[10px]">
                            {item.marca} {item.modelo}
                          </td>
                          <td className="p-1.5 border-r border-slate-200 text-[10px] text-slate-600">
                            {item.cliente || '-'}
                          </td>
                          <td className="p-1.5 border-r border-slate-200 text-[10px] text-slate-700 font-mono text-center">
                            {contadorAnterior !== null ? contadorAnterior.toLocaleString('pt-BR') : '-'}
                            {dtAnterior && <span className="block text-[8px] text-slate-400 font-sans">{dtAnterior}</span>}
                          </td>
                          <td className="p-1.5 border-r border-slate-200 text-[10px] font-bold text-slate-800 font-mono text-center">
                            {contadorFinal.toLocaleString('pt-BR')}
                          </td>
                          <td className="p-1.5 border-r border-slate-200 text-[10px] font-bold text-blue-700 font-mono text-center">
                            +{paginasRodadas.toLocaleString('pt-BR')}
                            {item.dias_decorridos !== null && item.dias_decorridos !== undefined && (
                              <span className="block text-[8px] text-blue-600 font-sans font-normal">
                                {item.dias_decorridos} dia(s)
                              </span>
                            )}
                          </td>
                          <td className="p-1.5 border-r border-slate-200 text-[10px] text-slate-700 leading-tight">
                            {item.relatorio_tecnico || item.defeito || 'Sem registro'}
                          </td>
                          <td className="p-1.5 text-[10px]">
                            {listaPecas.length > 0 ? (
                              <div className="flex flex-wrap gap-1">
                                {listaPecas.map((peca, idxP) => (
                                  <span key={idxP} className="bg-emerald-50 text-emerald-800 border border-emerald-200 px-1 py-0.5 rounded text-[9px] font-semibold">
                                    {peca}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-400 text-[9px]">Nenhuma</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      </div>
    </>
  );
}