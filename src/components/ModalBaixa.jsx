import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, runTransaction, doc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function ModalBaixa({ chamado, onClose }) {
  const [pecasCompativeis, setPecasCompativeis] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarPecas = async () => {
      // 1. Convertemos o termo do modelo para minúsculo (.toLowerCase()) para bater com o padrão do banco
      const termoModelo = chamado.modelo.split('-')[0].trim().toLowerCase();

      const q = query(
        collection(db, "estoque_pecas"), 
        where("modelo", ">=", termoModelo) 
      );
      
      const querySnapshot = await getDocs(q);
      const lista = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // FILTRO INTELIGENTE: Remove da listagem visual qualquer item que esteja zerado
      const apenasComEstoque = lista.filter(peca => peca.qtd > 0);
      
      setPecasCompativeis(apenasComEstoque);
      setCarregando(false);
    };
    
    if (chamado?.modelo) {
      buscarPecas();
    }
  }, [chamado]);

  const confirmarBaixa = async (peca) => {
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
            marca: dadosPeca.marca,
            modelo: dadosPeca.modelo,
            nome: dadosPeca.nome,
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
          peca_utilizada: peca.nome,
          data_finalizacao: serverTimestamp() 
        });
      });

      toast.success(`Baixa de ${peca.nome} realizada!`, { id: loading });
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Erro ao processar baixa.", { id: loading });
    }
  };

  return (
    // p-4 previne o modal de colar nas bordas do celular
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4 animate-fade-in">
      {/* max-w-md se adapta ao celular, w-full garante largura total disponível */}
      <div className="bg-white rounded-2xl p-5 md:p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-lg md:text-xl font-black text-slate-800 mb-1">Finalizar Manutenção</h2>
        <p className="text-xs md:text-sm text-slate-500 mb-5">Selecione a peça usada na <strong className="uppercase">{chamado.modelo}</strong>:</p>

        {carregando ? (
          <p className="text-sm text-slate-400 italic text-center py-6">Buscando peças compatíveis...</p>
        ) : (
          // max-h-64 impede o modal de sumir para fora da tela do celular
          <div className="space-y-2.5 max-h-64 overflow-y-auto mb-5 pr-1">
            {pecasCompativeis.length > 0 ? pecasCompativeis.map(peca => (
              <button 
                key={peca.id}
                onClick={() => confirmarBaixa(peca)}
                // p-3.5 para melhor clique touch
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