import React, { useState } from 'react';
import { 
  X, 
  Printer, 
  Upload, 
  Trash2, 
  Image as ImageIcon 
} from 'lucide-react';

export default function ModalLaudoTecnico({ chamado, onClose }) {
  const [fotos, setFotos] = useState([]);

  if (!chamado) return null;

  const handlePrint = () => {
    window.print();
  };

  // Helper para formatar qualquer tipo de data (incluindo Mongo {$date: "..."})
  const formatarData = (dataVal) => {
    if (!dataVal) return 'N/A';
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
      return isNaN(dataObj.getTime()) ? 'N/A' : dataObj.toLocaleDateString('pt-BR');
    } catch {
      return 'N/A';
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

  // Upload e manipulação de imagens
  const handleUploadFoto = (e) => {
    const files = Array.from(e.target.files);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotos(prev => [...prev, reader.result]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleRemoverFoto = (index) => {
    setFotos(prev => prev.filter((_, i) => i !== index));
  };

  const osNumero = chamado.os || chamado.numero_os || 'N/A';
  const dtEntrada = formatarData(chamado.data_entrada);
  const dtFinalizacao = formatarData(chamado.data_finalizacao || chamado.data_fim || chamado.data_fechamento);
  const dtAnterior = formatarData(chamado.data_contador_anterior);

  const contadorFinal = Number(chamado.contador_final) || 0;
  const contadorAnterior = chamado.ultimo_contador_anterior !== null && chamado.ultimo_contador_anterior !== undefined
    ? Number(chamado.ultimo_contador_anterior) 
    : null;

  const paginasRodadas = Number(chamado.paginas_rodadas) || 0;
  const listaPecas = obterListaPecas(chamado.pecas_utilizadas);

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
              <label className="bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition cursor-pointer shadow-sm">
                <Upload size={15} />
                <span>Anexar Foto</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  multiple 
                  onChange={handleUploadFoto} 
                  className="hidden" 
                />
              </label>

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
                  Ordem de Serviço Nº: <span className="text-slate-900 font-bold">{osNumero}</span>
                </p>
              </div>
              <div className="text-right text-xs text-slate-600 font-medium space-y-0.5 shrink-0">
                <p>Data Entrada: <strong>{dtEntrada}</strong></p>
                <p>Data Conclusão: <strong>{dtFinalizacao}</strong></p>
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

            {/* Dados de Leitura de Páginas (Contador e Histórico) */}
            <div className="space-y-1">
              <h3 className="text-xs font-bold uppercase text-slate-500 tracking-wider">Métricas e Contadores de Impressão</h3>
              <div className="grid grid-cols-3 gap-3 text-center border border-slate-200 rounded-lg p-3 bg-slate-50">
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Contador Anterior</span>
                  <span className="text-xs sm:text-sm font-bold text-slate-700 block">
                    {contadorAnterior !== null
                      ? contadorAnterior.toLocaleString('pt-BR') + ' págs'
                      : 'Primeiro Registro'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{dtAnterior !== 'N/A' ? dtAnterior : 'Sem registro anterior'}</span>
                </div>
                <div className="border-x border-slate-200">
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Contador Atual</span>
                  <span className="text-xs sm:text-sm font-black text-slate-900 block">
                    {contadorFinal ? contadorFinal.toLocaleString('pt-BR') + ' págs' : 'N/A'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">{dtFinalizacao !== 'N/A' ? dtFinalizacao : dtEntrada}</span>
                </div>
                <div>
                  <span className="block text-[10px] font-bold text-slate-400 uppercase">Rodadas no Período</span>
                  <span className="text-xs sm:text-sm font-bold text-blue-700 block">
                    +{paginasRodadas.toLocaleString('pt-BR')} págs
                  </span>
                  <span className="text-[10px] text-blue-600 font-bold">
                    {chamado.dias_decorridos !== null && chamado.dias_decorridos !== undefined
                      ? `${chamado.dias_decorridos} dia(s) decorrido(s)`
                      : 'Período N/D'}
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
                {listaPecas.length > 0 ? (
                  <ul className="list-disc list-inside space-y-1 font-medium text-slate-700">
                    {listaPecas.map((peca, idx) => (
                      <li key={idx}>{peca}</li>
                    ))}
                  </ul>
                ) : (
                  <span className="text-slate-400 italic">Nenhuma peça substituída neste atendimento.</span>
                )}
              </div>
            </div>

            {/* Galeria de Fotos Anexadas */}
            {fotos.length > 0 && (
              <div className="space-y-2 pt-2 border-t border-slate-200 block-print-keep">
                <p className="font-bold uppercase text-[10px] text-slate-500 flex items-center gap-1">
                  <ImageIcon size={13} /> Anexos e Evidências Fotográficas ({fotos.length})
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {fotos.map((foto, index) => (
                    <div key={index} className="relative group rounded-xl overflow-hidden border border-slate-200 bg-slate-50">
                      <img 
                        src={foto} 
                        alt={`Evidência ${index + 1}`} 
                        className="w-full h-32 object-cover" 
                      />
                      <button
                        type="button"
                        onClick={() => handleRemoverFoto(index)}
                        className="absolute top-1.5 right-1.5 bg-red-600 text-white p-1 rounded-lg opacity-90 hover:opacity-100 transition no-print shadow-md"
                        title="Remover Imagem"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

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