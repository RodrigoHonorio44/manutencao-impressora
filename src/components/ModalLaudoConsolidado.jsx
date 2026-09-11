import React from 'react';
import { X, Printer } from 'lucide-react';

export default function ModalLaudoConsolidado({ chamados = [], onClose }) {
  const handlePrint = () => {
    window.print();
  };

  // Agrupa e conta o total por modelo
  const totalPorModelo = chamados.reduce((acc, item) => {
    const modelo = `${item.marca || ''} ${item.modelo || ''}`.trim() || 'Outros';
    acc[modelo] = (acc[modelo] || 0) + 1;
    return acc;
  }, {});

  // Formata datas para o padrão DD/MM/AAAA
  const formatarData = (dataString) => {
    if (!dataString) return '-';
    try {
      const data = new Date(dataString);
      if (isNaN(data.getTime())) return dataString;
      return data.toLocaleDateString('pt-BR');
    } catch {
      return dataString;
    }
  };

  return (
    <>
      <style>{`
        @media print {
          /* Esconde tudo na impressão */
          body * {
            visibility: hidden !important;
          }
          /* Exibe apenas o container do modal */
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
            size: A4 portrait;
            margin: 6mm;
          }
          table {
            font-size: 9px !important;
          }
          th, td {
            padding: 3px 5px !important;
          }
        }
      `}</style>

      {/* Overlay com rolagem própria para evitar que o topo corte em zooms de 100% */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto p-2 sm:p-4 flex justify-center items-start">
        
        {/* Modal sem max-h fixo restritivo */}
        <div 
          id="modal-laudo-consolidado"
          className="bg-white rounded-2xl w-full max-w-6xl my-auto flex flex-col shadow-2xl border border-slate-200 overflow-hidden max-h-[90vh]"
        >
          {/* Cabeçalho Fixo do Modal */}
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

          {/* Área interna de conteúdo */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-3">
            {/* Título exclusivo de impressão */}
            <div className="hidden print:block border-b pb-2 mb-2">
              <h1 className="text-xs font-bold text-slate-900 uppercase">
                Laudo Técnico Consolidado - Relatório Geral
              </h1>
              <p className="text-[10px] text-slate-600">
                Total de itens: <strong>{chamados.length}</strong>
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

            {/* Tabela de Dados */}
            {chamados.length === 0 ? (
              <p className="text-center text-slate-500 text-sm py-8">
                Nenhum chamado selecionado.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse border border-slate-200 text-xs">
                  <thead>
                    <tr className="bg-slate-100 text-slate-800 border-b border-slate-200 font-semibold text-[11px]">
                      <th className="p-1.5 border-r border-slate-200 w-24">Nº OS</th>
                      <th className="p-1.5 border-r border-slate-200 w-24">Conclusão</th>
                      <th className="p-1.5 border-r border-slate-200 w-32">Nº Serial (S/N)</th>
                      <th className="p-1.5 border-r border-slate-200 w-44">Equipamento</th>
                      <th className="p-1.5 border-r border-slate-200 w-36">Cliente</th>
                      <th className="p-1.5">Serviço / Relatório Técnico</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {chamados.map((item, index) => {
                      const dataFechamento = 
                        item.data_fim || 
                        item.data_fechamento || 
                        item.data_fim_manutencao || 
                        item.data_conclusao || 
                        item.data_saida ||
                        item.updatedAt;

                      return (
                        <tr key={item.id || index} className="hover:bg-slate-50/50">
                          <td className="p-1.5 font-mono text-[10px] font-bold border-r border-slate-200 text-slate-800 whitespace-nowrap">
                            {item.os || 'N/D'}
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
                          <td className="p-1.5 text-[10px] text-slate-700 leading-tight">
                            {item.relatorio_tecnico || item.defeito || 'Sem registro'}
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