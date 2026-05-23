import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, getDocs, runTransaction, doc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';

export default function ModalBaixa({ chamado, onClose }) {
  const [pecasCompativeis, setPecasCompativeis] = useState([]);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    const buscarPecas = async () => {
      // Busca peças que mencionam o modelo da impressora
      const q = query(
        collection(db, "estoque_pecas"), 
        where("modelo", ">=", chamado.modelo.split('-')[0]) 
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

        // REGRA DE TRANSMISSÃO INTELIGENTE PARA O HISTÓRICO
        if (novaQtd <= 0) {
          // 1. Move o lote para o histórico com a data de hoje (fim)
          transaction.set(historicoRef, {
            marca: dadosPeca.marca,
            modelo: dadosPeca.modelo,
            nome: dadosPeca.nome,
            qtd: 0,
            data_entrada: dadosPeca.data_entrada, 
            data_fim: serverTimestamp()          
          });

          // 2. Apaga o item do estoque ativo para sumir do sistema
          transaction.delete(pecaRef);
        } else {
          // Se ainda tem saldo, só atualiza a quantidade subtraindo 1
          transaction.update(pecaRef, { qtd: novaQtd });
        }
        
        // 3. Atualiza o chamado com a peça usada e muda status
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-2xl">
        <h2 className="text-xl font-black text-slate-800 mb-2">Finalizar Manutenção</h2>
        <p className="text-sm text-slate-500 mb-6">Selecione a peça usada na <strong>{chamado.modelo}</strong>:</p>

        {carregando ? <p className="text-sm text-slate-400 italic text-center py-4">Buscando peças compatíveis...</p> : (
          <div className="space-y-3 max-h-60 overflow-y-auto mb-6">
            {pecasCompativeis.length > 0 ? pecasCompativeis.map(peca => (
              <button 
                key={peca.id}
                onClick={() => confirmarBaixa(peca)}
                className="w-full flex justify-between items-center p-4 bg-slate-50 hover:bg-blue-50 border border-slate-200 rounded-xl transition-all group"
              >
                <div className="text-left max-w-[70%]">
                  <p className="font-bold text-slate-700 group-hover:text-blue-700 break-words">{peca.nome}</p>
                  <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mt-0.5">{peca.marca}</p>
                </div>
                <span className="bg-white px-2.5 py-1 rounded-lg border font-black text-xs text-blue-600 whitespace-nowrap">
                  {peca.qtd.toString().padStart(2, '0')} DISP.
                </span>
              </button>
            )) : <p className="text-center text-slate-400 text-sm italic py-4">Nenhuma peça com saldo encontrada para este modelo.</p>}
          </div>
        )}

        <button onClick={onClose} className="w-full py-3 text-slate-500 font-bold hover:bg-slate-100 rounded-xl transition-all text-sm">
          Cancelar
        </button>
      </div>
    </div>
  );
}