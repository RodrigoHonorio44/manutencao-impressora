import React from 'react';
import { X, Printer } from 'lucide-react';

export default function ModalLaudoTecnico({ chamado, onClose }) {
  if (!chamado) return null;

  const handlePrint = () => {
    window.print();
  };

  const formatarData = (data) => {
    if (!data) return 'N/A';

    try {
      let dataObj;

      if (typeof data.toDate === 'function') {
        dataObj = data.toDate();
      } else if (typeof data.toMillis === 'function') {
        dataObj = new Date(data.toMillis());
      } else if (data?.seconds !== undefined) {
        dataObj = new Date(data.seconds * 1000);
      } else {
        dataObj = new Date(data);
      }

      if (isNaN(dataObj.getTime())) return 'N/A';

      return dataObj.toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
    }
  };

  return (
    <>
      <style>{`
        @media print {
          body * {
            visibility: hidden !important;
          }
          #modal-laudo-tecnico, #modal-laudo-tecnico * {
            visibility: visible !important;
          }
          #modal-laudo-tecnico {
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
            margin: 10mm;
          }
          .block-print-keep {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Overlay com rolagem e suporte a impressão */}
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 overflow-y-auto p-2 sm:p-4 flex justify-center items-start">
        
        {/* Container Principal */}
        <div 
          id="modal-laudo-tecnico"
          className="bg-white rounded-2xl w-full max-w-3xl my-auto flex flex-col shadow-2xl border border-slate-200 overflow-hidden"
        >
          {/* Barra superior de ações (oculta ao imprimir) */}
          <div className="p-3 sm:p-4 bg-slate-100 border-b border-slate-200 flex justify-between items-center no-print">
            <h2 className="text-xs sm:text-sm font-bold text-slate-700 uppercase tracking-wider">
              Laudo Técnico de Atendimento
            </h2>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={handlePrint}
                className="bg-slate-900 hover:bg-slate-800 text-white px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm shrink-0"
              >
                <Printer size={15} /> Imprimir Laudo
              </button>
              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-200 transition cursor-pointer shrink-0"
              >
                <X size={18} />
              </button>
            </div>
          </div>

          {/* Conteúdo do Laudo */}
          <div className="p-6 sm:p-8 space-y-5 text-slate-800">
            
            {/* Cabeçalho do Laudo */}
            <div className="border-b-2 border-slate-800 pb-4 flex justify-between items-start gap-4">
              <div>
                <h1 className="text-lg sm:text-xl font-black tracking-wider uppercase text-slate-900">
                  LAUDO TÉCNICO DE MANUTENÇÃO
                </h1>
                <p className="text-xs text-slate-500 font-semibold mt-0.5">
                  Ordem de Serviço Nº: <span className="text-slate-900 font-bold">{chamado.os || 'N/A'}</span>
                </p>
              </div>
              <div className="text-right text-xs text-slate-600 font-medium space-y-0.5 shrink-0">
                <p>Data Entrada: <strong>{formatarData(chamado.data_entrada)}</strong></p>
                <p>Data Conclusão: <strong>{formatarData(chamado.data_finalizacao || chamado.data_fim || chamado.data_fechamento)}</strong></p>
                <p>Status: <strong className="uppercase text-slate-900">{chamado.status || 'N/A'}</strong></p>
              </div>
            </div>

            {/* Dados do Equipamento e Cliente */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200">
              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px] mb-1">Cliente / Responsável</p>
                <p className="font-bold text-slate-800 text-sm">
                  {chamado.cliente || chamado.responsavel || 'Não informado'}
                </p>
              </div>
              <div>
                <p className="font-bold text-slate-400 uppercase text-[10px] mb-1">Equipamento / Modelo</p>
                <p className="font-bold text-slate-800 text-sm">
                  {chamado.marca || ''} {chamado.modelo || ''}
                </p>
                <p className="text-slate-600 font-mono mt-0.5">S/N: {chamado.serial || 'N/A'}</p>
              </div>
            </div>

            {/* Defeito Relatado */}
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Defeito Relatado pelo Cliente</h3>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs italic font-medium text-slate-700">
                "{chamado.defeito || chamado.defeito_relatado || 'Não informado'}"
              </div>
            </div>

            {/* Dados de Leitura de Páginas (Contador) */}
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Métricas e Contadores de Impressão</h3>
              <div className="grid grid-cols-3 gap-3 text-center border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Contador Anterior</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-700">
                    {chamado.ultimo_contador_anterior !== null && chamado.ultimo_contador_anterior !== undefined
                      ? Number(chamado.ultimo_contador_anterior).toLocaleString('pt-BR') + ' págs'
                      : 'Primeiro Registro'}
                  </span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Contador Atual</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900">
                    {chamado.contador_final ? Number(chamado.contador_final).toLocaleString('pt-BR') + ' págs' : 'N/A'}
                  </span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Rodadas no Período</span>
                  <span className="text-xs sm:text-sm font-bold text-blue-700">
                    +{chamado.paginas_rodadas ? Number(chamado.paginas_rodadas).toLocaleString('pt-BR') : 0} págs
                  </span>
                </div>
              </div>
            </div>

            {/* Relatório Técnico */}
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Serviço Realizado / Diagnóstico Técnico</h3>
              <div className="p-3 border border-slate-200 rounded-lg text-xs font-medium leading-relaxed bg-white text-slate-800 min-h-[80px] whitespace-pre-line">
                {chamado.relatorio_tecnico || 'Nenhum parecer técnico registrado.'}
              </div>
            </div>

            {/* Peças Substituídas */}
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Peças / Insumos Utilizados</h3>
              <div className="p-3 border border-slate-200 rounded-lg text-xs bg-slate-50">
                {chamado.pecas_utilizadas && chamado.pecas_utilizadas.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 font-medium text-slate-700">
                    {chamado.pecas_utilizadas.map((peca, idx) => (
                      <li key={idx}>{peca}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-400 italic">Nenhuma peça substituída neste atendimento.</span>
                )}
              </div>
            </div>

            {/* Campo de Assinatura */}
            <div className="pt-10 grid grid-cols-2 gap-12 text-center text-xs block-print-keep">
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-700">Técnico Responsável</p>
                <p className="text-[10px] text-slate-400">Assinatura / Carimbo</p>
              </div>
              <div className="border-t border-slate-400 pt-2">
                <p className="font-bold text-slate-700">Aceite do Cliente</p>
                <p className="text-[10px] text-slate-400">Assinatura e Data</p>
              </div>
            </div>

          </div>
        </div>
      </div>
    </>
  );
}