import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, runTransaction, doc, arrayUnion, updateDoc, serverTimestamp } from 'firebase/firestore';
import toast from 'react-hot-toast';
import { X, Package, Clock, CheckCircle, FileText } from 'lucide-react';

export default function ModalGerenciarOS({ chamado, onClose }) {
  const [pecasEstoque, setPecasEstoque] = useState([]);
  const [pendencia, setPendencia] = useState(chamado.peca_pendente || '');
  const [relatorio, setRelatorio] = useState(chamado.relatorio_tecnico || '');

  useEffect(() => {
    const buscarPecas = async () => {
      try {
        // Busca ampla no estoque para evitar problemas de Case-Sensitive no where do Firestore
        const querySnapshot = await getDocs(collection(db, "estoque_pecas"));
        const listaDados = querySnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        
        const marcaOs = (chamado.marca || '').toLowerCase().trim();
        const modeloOs = (chamado.modelo || '').toLowerCase().trim();
        
        // Remove parênteses para isolar os números chaves (ex: transforma "(laser 408 / mfp 432)" em termos limpos)
        const modeloLimpo = modeloOs.replace(/[\(\)]/g, ' '); 
        const termosModelo = modeloLimpo.split(/[^a-zA-Z0-9]/).filter(t => t.length >= 3);

        // Identifica se o equipamento pertence à grande família mecânica Brother L5000 / L6000
        const ehFamiliaBrotherL5000_L6000 = marcaOs.includes('brother') && (
          modeloOs.includes('5000') || 
          modeloOs.includes('6000') || 
          modeloOs.includes('5102') || 
          modeloOs.includes('5652') || 
          modeloOs.includes('6202') || 
          modeloOs.includes('6402')
        );

        // TENTATIVA 1: Filtro cruzado por marca e termos do modelo
        let filtradas = listaDados.filter(peca => {
          if (peca.qtd <= 0) return false;

          const marcaPeca = peca.marca ? peca.marca.toLowerCase().trim() : '';
          const nomePeca = peca.nome ? peca.nome.toLowerCase().trim() : '';
          const modeloPeca = peca.modelo ? peca.modelo.toLowerCase().trim() : '';

          // Validação flexível de marca
          if (marcaOs && marcaPeca && marcaPeca !== marcaOs) {
            if (!nomePeca.includes(marcaOs) && !modeloPeca.includes(marcaOs)) {
              return false;
            }
          }

          // REGRA DE OURO PARA BROTHER SÉRIE L5000/L6000:
          // Se a OS for desse ecossistema, puxa qualquer insumo compatível cadastrado para a série
          if (ehFamiliaBrotherL5000_L6000) {
            const pecaServeNaFamilia = 
              modeloPeca.includes('l5000') || 
              modeloPeca.includes('l6000') || 
              modeloPeca.includes('5652') || 
              modeloPeca.includes('5102') ||
              nomePeca.includes('l5000') || 
              nomePeca.includes('l6000') ||
              nomePeca.includes('tn3472'); // Código do toner comum à fusão deles

            if (pecaServeNaFamilia) return true;
          }

          // Confere se o modelo ou nome da peça possui o nome completo do modelo ou os termos isolados
          const matchDireto = modeloPeca.includes(modeloOs) || modeloOs.includes(modeloPeca) || nomePeca.includes(modeloOs);
          const matchTermos = termosModelo.some(termo => modeloPeca.includes(termo) || nomePeca.includes(termo));

          return matchDireto || matchTermos;
        });

        // TENTATIVA 2 (FALLBACK): Se a filtragem rígida sumir com os itens da tela,
        // força a busca puramente pelos termos principais numéricos (ex: "408")
        if (filtradas.length === 0 && termosModelo.length > 0) {
          filtradas = listaDados.filter(peca => {
            if (peca.qtd <= 0) return false;

            const nomePeca = peca.nome ? peca.nome.toLowerCase().trim() : '';
            const modeloPeca = peca.modelo ? peca.modelo.toLowerCase().trim() : '';

            return termosModelo.some(termo => modeloPeca.includes(termo) || nomePeca.includes(termo));
          });
        }
        
        setPecasEstoque(filtradas);
      } catch (error) {
        console.error("Erro ao buscar peças:", error);
        toast.error("Erro ao carregar peças compatíveis.");
      }
    };

    if (chamado?.modelo) {
      buscarPecas();
    }
  }, [chamado]);

  const adicionarPeca = async (peca) => {
    if (peca.qtd <= 0) return toast.error("Sem estoque disponível!");
    const loading = toast.loading("Dando baixa no insumo...");
    
    const pecaRef = doc(db, "estoque_pecas", peca.id);
    const chamadoRef = doc(db, "atendimentos", chamado.id);
    const historicoRef = collection(db, "historico_lotes_zerados");

    try {
      await runTransaction(db, async (transaction) => {
        const pDoc = await transaction.get(pecaRef);
        if (!pDoc.exists()) throw "Peça não encontrada no banco!";

        const dadosPeca = pDoc.data();
        const novaQtd = dadosPeca.qtd - 1;

        if (novaQtd <= 0) {
          transaction.set(doc(historicoRef), {
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
        
        const novoRelatorio = relatorio 
          ? `${relatorio}, trocado ${peca.nome}` 
          : `Efetuada a troca de: ${peca.nome}`;
        
        setRelatorio(novoRelatorio);

        transaction.update(chamadoRef, { 
          pecas_utilizadas: arrayUnion(peca.nome), 
          relatorio_tecnico: novoRelatorio,
          status: 'Em Manutenção'
        });
      });

      setPecasEstoque(prev => 
        prev.map(p => {
          if (p.id === peca.id) {
            return { ...p, qtd: p.qtd - 1 };
          }
          return p;
        }).filter(p => p.qtd > 0)
      );

      toast.success(`${peca.nome} aplicada com sucesso!`, { id: loading });
    } catch (e) { 
      console.error(e);
      toast.error("Erro na transação ou estoque desatualizado.", { id: loading }); 
    }
  };

  const salvarPendencia = async () => {
    if(!pendencia) return toast.error("Digite o que está faltando.");
    try {
      await updateDoc(doc(db, "atendimentos", chamado.id), { 
        status: 'Aguardando Peça',
        peca_pendente: pendencia,
        relatorio_tecnico: relatorio
      });
      toast.success("Status: Aguardando Peça");
      onClose();
    } catch (e) { toast.error("Erro ao salvar pendência."); }
  };

  const finalizarOS = async () => {
    if(!relatorio) return toast.error("Descreva o serviço realizado antes de finalizar!");
    
    const loading = toast.loading("Finalizando...");
    try {
      await updateDoc(doc(db, "atendimentos", chamado.id), { 
        status: 'Finalizado',
        relatorio_tecnico: relatorio,
        data_finalizacao: serverTimestamp() 
      });
      toast.success("OS Finalizada com sucesso!", { id: loading });
      onClose();
    } catch (e) { toast.error("Erro ao finalizar.", { id: loading }); }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden border border-slate-200">
        <div className="p-6 border-b flex justify-between items-center bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800 uppercase">Gerenciar OS</h2>
            <p className="text-xs text-blue-600 font-bold">{chamado.marca} {chamado.modelo} - SN: {chamado.serial}</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition-colors"><X size={20}/></button>
        </div>

        <div className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Coluna 1: Peças */}
          <div className="space-y-4">
            <h3 className="flex items-center gap-2 font-bold text-slate-500 text-[10px] uppercase tracking-widest"><Package size={14}/> Estoque Disponível</h3>
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2">
              {pecasEstoque.map(peca => (
                <button key={peca.id} onClick={() => adicionarPeca(peca)} className="w-full p-3 text-left border rounded-xl hover:border-blue-500 hover:bg-blue-50 transition-all flex justify-between items-center group">
                  <span className="text-xs font-bold text-slate-700 group-hover:text-blue-700">{peca.nome}</span>
                  <span className="text-[10px] bg-slate-100 px-2 py-1 rounded-lg font-black text-slate-500">{peca.qtd}</span>
                </button>
              ))}
              {pecasEstoque.length === 0 && (
                <p className="text-xs text-slate-400 italic py-4">Nenhum lote ativo com saldo encontrado para esse modelo.</p>
              )}
            </div>
          </div>

          {/* Coluna 2: Relatório (O que foi feito) */}
          <div className="space-y-4 md:col-span-2">
            <h3 className="flex items-center gap-2 font-bold text-slate-500 text-[10px] uppercase tracking-widest"><FileText size={14}/> Relatório do Serviço</h3>
            <textarea 
              value={relatorio} 
              onChange={(e) => setRelatorio(e.target.value)}
              placeholder="Descreva aqui o serviço realizado (ex: Limpeza da unidade de imagem, troca de rolo pressor...)"
              className="w-full p-4 border rounded-2xl h-32 outline-none focus:ring-2 focus:ring-blue-500 text-sm bg-slate-50 font-medium"
            />
            
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 space-y-3">
              <h3 className="flex items-center gap-2 font-bold text-amber-600 text-[10px] uppercase tracking-widest"><Clock size={14}/> Caso falte peça:</h3>
              <div className="flex gap-2">
                <input 
                  value={pendencia} onChange={(e) => setPendencia(e.target.value)}
                  placeholder="Nome da peça pendente"
                  className="flex-1 p-2 border rounded-xl outline-none text-xs bg-white"
                />
                <button onClick={salvarPendencia} className="bg-amber-500 text-white px-4 py-2 rounded-xl font-bold text-xs hover:bg-amber-600 transition-all">Pausar OS</button>
              </div>
            </div>
          </div>
        </div>

        <div className="p-6 bg-slate-50 border-t flex gap-4">
          <button onClick={onClose} className="flex-1 py-3 font-bold text-slate-500 hover:text-slate-800 transition-colors uppercase text-xs">Cancelar</button>
          <button onClick={finalizarOS} className="flex-[2] bg-emerald-600 text-white py-3 rounded-2xl font-black flex items-center justify-center gap-2 hover:bg-emerald-700 shadow-xl shadow-emerald-200 uppercase tracking-widest text-sm">
            <CheckCircle size={18}/> Finalizar e Entregar
          </button>
        </div>
      </div>
    </div>
  );
}