import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, orderBy, limit, runTransaction, doc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { Gauge, History } from 'lucide-react';

export default function ModalBaixa({ chamado, onClose }) {
  const [pecasCompativeis, setPecasCompativeis] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [contadorFinal, setContadorFinal] = useState(chamado?.contador_final || '');
  const [ultimoContador, setUltimoContador] = useState(null);

  useEffect(() => {
    const buscarDados = async () => {
      try {
        // 1. Busca o último contador registrado deste mesmo serial (S/N)
        if (chamado?.serial) {
          const serialLimpo = chamado.serial.toLowerCase().trim();
          const qHistorico = query(
            collection(db, "atendimentos"),
            where("serial_lc", "==", serialLimpo),
            where("status", "==", "Finalizado"),
            orderBy("data_finalizacao", "desc"),
            limit(2)
          );

          const snapHist = await getDocs(qHistorico);
          const docsHist = snapHist.docs.map(d => d.data());
          const osAnterior = docsHist.find(d => d.contador_final && d.os !== chamado.os);

          if (osAnterior) {
            setUltimoContador(osAnterior.contador_final);
          }
        }

        // 2. Filtra peças compatíveis
        const termoModelo = chamado.modelo.split('-')[0].trim().toLowerCase();
        const qPecas = query(
          collection(db, "estoque_pecas"), 
          where("modelo", ">=", termoModelo) 
        );

        const querySnapshot = await getDocs(qPecas);
        const lista = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));

        // Filtro inteligente para exibir apenas itens com estoque
        const apenasComEstoque = lista.filter(peca => peca.qtd > 0);
        setPecasCompativeis(apenasComEstoque);
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setCarregando(false);
      }
    };

    if (chamado?.modelo) {
      buscarDados();
    }
  }, [chamado]);

  // Cálculo dinâmico das páginas rodadas desde a última manutenção
  const paginasRodadas = (contadorFinal && ultimoContador && Number(contadorFinal) >= ultimoContador)
    ? Number(contadorFinal) - ultimoContador
    : 0;

  const confirmarBaixa = async (peca) => {
    if (!contadorFinal) return toast.error("Informe o contador final de páginas!");
    if (ultimoContador && Number(contadorFinal) < ultimoContador) {
      return toast.error(`O contador (${contadorFinal}) não pode ser menor que o anterior (${ultimoContador})!`);
    }
    if (peca.qtd <= 0) return toast.error("Peça sem saldo no estoque!");

    const loading = toast.loading("Processando baixa...");
    const pecaRef = doc(db, "estoque_pecas", peca.id);
    const chamadoRef = doc(db, "atendimentos", chamado.id);
    const historicoRef = doc(collection(db, "historico_lotes_zerados"));

    try {
      await runTransaction(db, async (transaction) => {
        const pecaDoc = await transaction.get(pecaRef);
        if (!pecaDoc.exists()) throw "Peça não encontrada!";

        const dadosPeca = pecaDoc.data();
        const novaQtd = dadosPeca.qtd - 1;

        if (novaQtd <= 0) {
          transaction.set(historicoRef, {
            marca: (dadosPeca.marca || '').toLowerCase().trim(),
            modelo: (dadosPeca.modelo || '').toLowerCase().trim(),
            nome: (dadosPeca.nome || '').toLowerCase().trim(),
            qtd: 0,
            data_entrada: dadosPeca.data_entrada, 
            data_fim: serverTimestamp()          
          });

          transaction.delete(pecaRef);
        } else {
          transaction.update(pecaRef, { qtd: novaQtd });
        }

        transaction.update(chamadoRef, { 
          status: 'Finalizado',
          peca_utilizada: peca.nome ? peca.nome.toLowerCase().trim() : '',
          contador_final: Number(contadorFinal),
          ultimo_contador_anterior: ultimoContador || null,
          paginas_rodadas: paginasRodadas,
          serial_lc: (chamado.serial || '').toLowerCase().trim(),
          data_finalizacao: serverTimestamp() 
        });
      });

      toast.success(`Baixa de ${peca.nome} realizada com sucesso!`, { id: loading });
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao processar baixa.", { id: loading });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-fade-in">
      <div className="bg-white rounded-2xl p-5 md:p-6 w-full max-w-md shadow-2xl space-y-4">
        <div>
          <h2 className="text-lg md:text-xl font-black text-slate-800 mb-1">Finalizar Manutenção</h2>
          <p className="text-xs md:text-sm text-slate-500">
            Selecione a peça usada na <strong className="uppercase">{chamado.modelo}</strong>:
          </p>
        </div>

        {/* Bloco do Contador de Páginas */}
        <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-2">
          {ultimoContador !== null && (
            <div className="flex items-center justify-between text-xs bg-blue-50 p-2 rounded-lg border border-blue-100 text-blue-800 font-medium mb-1">
              <span className="flex items-center gap-1 font-bold">
                <History size={14} className="text-blue-600" /> Contador Anterior:
              </span>
              <span className="font-black text-blue-900">{ultimoContador.toLocaleString('pt-BR')} págs</span>
            </div>
          )}

          <label className="flex items-center gap-2 font-bold text-slate-700 text-[10px] uppercase tracking-widest">
            <Gauge size={14} className="text-blue-600" /> Contador Final (Páginas)
          </label>
          <div className="relative flex items-center">
            <input 
              type="number"
              value={contadorFinal} 
              onChange={(e) => setContadorFinal(e.target.value)}
              placeholder="Ex: 15450"
              className="w-full p-2.5 border rounded-xl outline-none text-xs bg-white font-medium focus:ring-2 focus:ring-blue-500 pr-8"
            />
            <Gauge size={16} className="absolute right-3 text-slate-400 pointer-events-none" />
          </div>

          {paginasRodadas > 0 && (
            <div className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 p-1.5 rounded-lg text-center">
              Páginas impressas no período: <strong>+{paginasRodadas.toLocaleString('pt-BR')}</strong>
            </div>
          )}
        </div>

        {/* Lista de Peças Compatíveis */}
        {carregando ? (
          <p className="text-sm text-slate-400 italic text-center py-6">Buscando peças compatíveis...</p>
        ) : (
          <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
            {pecasCompativeis.length > 0 ? pecasCompativeis.map(peca => (
              <button 
                key={peca.id}
                onClick={() => confirmarBaixa(peca)}
                className="w-full flex justify-between items-center p-3.5 bg-slate-50 active:bg-blue-100 md:hover:bg-blue-50 border border-slate-200 rounded-xl transition-all group"
              >
                <div className="text-left max-w-[70%]">
                  <p className="font-bold text-slate-700 text-sm md:text-base group-hover:text-blue-700 break-words">{peca.nome}</p>
                  <p className="text-[10px] text-slate-400 uppercase font-bold tracking-wider mt-0.5">{peca.marca}</p>
                </div>
                <span className="bg-white px-2.5 py-1 rounded-lg border font-black text-[11px] text-blue-600 whitespace-nowrap">
                  {peca.qtd.toString().padStart(2, '0')} DISP.
                </span>
              </button>
            )) : (
              <p className="text-center text-slate-400 text-sm italic py-6">Nenhuma peça com saldo encontrada para este modelo.</p>
            )}
          </div>
        )}

        <button 
          onClick={onClose} 
          className="w-full py-3 text-slate-500 font-bold active:bg-slate-200 md:hover:bg-slate-100 rounded-xl transition-all text-sm"
        >
          Cancelar
        </button>
      </div>
    </div>
  );
}