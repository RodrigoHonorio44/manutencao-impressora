import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { FileText, Printer, CheckCircle2, ReceiptText } from 'lucide-react';
import toast from 'react-hot-toast';

export default function NotasServico() {
  const [finalizadas, setFinalizadas] = useState([]);
  const [selecionadas, setSelecionadas] = useState([]);

  useEffect(() => {
    // Busca apenas o que foi finalizado na tela de manutenção
    const q = query(collection(db, "atendimentos"), where("status", "==", "Finalizado"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setFinalizadas(data);
    }, (error) => {
      console.error("Erro no Firebase:", error);
      toast.error("Erro ao carregar dados.");
    });
    return () => unsubscribe();
  }, []);

  const toggleSelecao = (id) => {
    setSelecionadas(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const gerarNotaImpressao = () => {
    const itens = finalizadas.filter(f => selecionadas.includes(f.id));
    if (itens.length === 0) return toast.error("Selecione ao menos um serviço!");

    const total = itens.length * 70;
    const win = window.open('', 'PRINT', 'height=600,width=800');
    
    win.document.write(`
      <html>
        <head>
          <title>Nota de Serviço - RODHON</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 40px; }
            .header { text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 30px; }
            th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }
            th { background-color: #f8f9fa; }
            .total { margin-top: 30px; text-align: right; font-size: 22px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>RODHON & CO - NOTA DE SERVIÇO</h1>
            <p>Data: ${new Date().toLocaleDateString('pt-BR')}</p>
          </div>
          <table>
            <thead>
              <tr>
                <th>Equipamento / Série</th>
                <th>Cliente</th>
                <th>Serviço / Peças</th>
                <th>Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itens.map(item => `
                <tr>
                  <td><strong>${item.marca} ${item.modelo}</strong><br>${item.serial}</td>
                  <td>${item.cliente}</td>
                  <td>${item.pecas_utilizadas?.join(', ') || 'Manutenção Preventiva'}</td>
                  <td>R$ 70,00</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">VALOR TOTAL: R$ ${total.toFixed(2)}</div>
        </body>
      </html>
    `);
    win.document.close();
    win.print();
  };

  return (
    <div className="p-8 space-y-6">
      <header className="flex justify-between items-center bg-white p-6 rounded-3xl border border-slate-200 shadow-sm">
        <div>
          <h1 className="text-2xl font-black text-slate-800">Notas de Serviço</h1>
          <p className="text-slate-500 font-medium">Selecione as OS finalizadas para cobrança.</p>
        </div>
        <div className="flex items-center gap-6">
          <div className="text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Geral</p>
            <p className="text-2xl font-black text-emerald-600">R$ {(selecionadas.length * 70).toFixed(2)}</p>
          </div>
          <button 
            onClick={gerarNotaImpressao}
            className="bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold flex items-center gap-2 hover:bg-blue-700 transition-all shadow-lg shadow-blue-200"
          >
            <Printer size={20}/> GERAR NOTA
          </button>
        </div>
      </header>

      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 text-[10px] font-black uppercase tracking-widest">
            <tr>
              <th className="p-5 w-10 text-center">Sel.</th>
              <th className="p-5">Equipamento / Origem</th>
              <th className="p-5">Peças / Serviços</th>
              <th className="p-5 text-right">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {finalizadas.map(item => (
              <tr 
                key={item.id} 
                onClick={() => toggleSelecao(item.id)}
                className={`cursor-pointer transition-all ${selecionadas.includes(item.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
              >
                <td className="p-5">
                  <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${selecionadas.includes(item.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300 bg-white'}`}>
                    {selecionadas.includes(item.id) && <CheckCircle2 size={16} className="text-white" />}
                  </div>
                </td>
                <td className="p-5">
                  <p className="font-bold text-slate-800">{item.marca} {item.modelo}</p>
                  <p className="text-xs text-slate-400">S/N: {item.serial} | <span className="text-blue-600 font-bold">{item.cliente}</span></p>
                </td>
                <td className="p-5">
                  <div className="flex flex-wrap gap-1">
                    {item.pecas_utilizadas?.length > 0 ? item.pecas_utilizadas.map((p, i) => (
                      <span key={i} className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded font-bold uppercase">{p}</span>
                    )) : <span className="text-[10px] text-slate-400 italic font-medium">Ajuste técnico</span>}
                  </div>
                </td>
                <td className="p-5 text-right font-black text-slate-700">R$ 70,00</td>
              </tr>
            ))}
          </tbody>
        </table>
        
        {finalizadas.length === 0 && (
          <div className="p-20 text-center">
            <ReceiptText size={48} className="mx-auto text-slate-200 mb-2" />
            <p className="text-slate-400 font-medium">Nenhuma OS pronta para faturamento.</p>
          </div>
        )}
      </div>
    </div>
  );
}