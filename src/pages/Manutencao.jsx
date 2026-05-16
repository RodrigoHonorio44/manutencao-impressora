import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, query, onSnapshot, where } from 'firebase/firestore'; 
import { Printer, ClipboardList, CheckCircle2, Settings, Hash } from 'lucide-react';
import toast from 'react-hot-toast';
import ModalGerenciarOS from '../components/ModalGerenciarOS';

// ESTRUTURA DE MARCAS E MODELOS SINCRONIZADA COM A CENTRAL DE ERROS
const MODELOS_DISPONIVEIS = {
  "Brother": ["HL-L5102DW", "DCP-L5652DN", "MFC-L5702DW", "MFC-L5902DW", "Outro Modelo Brother"],
  "HP (Laser 408 / MFP 432)": ["Laser 408dn", "Laser MFP 432fdn"],
  "HP (LaserJet Pro M404 / M428)": ["LaserJet Pro M404dn", "LaserJet Pro M404dw", "LaserJet Pro MFP M428fdw", "LaserJet Pro MFP M428fdn"],
  "Phantom": ["P3302DN", "M6552NW", "M7102DN", "Outro Modelo Phantom"],
  "Samsung": ["ProXpress M3820ND", "ProXpress M4020ND", "ProXpress M4070FR", "Outro Modelo Samsung"]
};

export default function Manutencao() {
  const [chamados, setChamados] = useState([]);
  const [form, setForm] = useState({ cliente: '', marca: '', modelo: '', serial: '', defeito: '' });
  const [modalAberto, setModalAberto] = useState(false);
  const [chamadoSelecionado, setChamadoSelecionado] = useState(null);

  useEffect(() => {
    const q = query(
      collection(db, "atendimentos"), 
      where("status", "!=", "Finalizado")
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const dataOrdenada = data.sort((a, b) => {
        const dataA = a.data_entrada?.seconds || 0;
        const dataB = b.data_entrada?.seconds || 0;
        return dataB - dataA;
      });
      setChamados(dataOrdenada);
    });
    return () => unsubscribe();
  }, []);

  // FUNÇÃO PARA GERAR NÚMERO DE OS (Ano + 10 dígitos aleatórios)
  const gerarNumeroOS = () => {
    const ano = new Date().getFullYear();
    const aleatorio = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    return `${ano}${aleatorio}`;
  };

  const handleEntrada = async (e) => {
    e.preventDefault();
    if (!form.marca || !form.modelo || !form.serial) {
      return toast.error("Marca, Modelo e Serial são obrigatórios!");
    }
    
    const loading = toast.loading("Registrando entrada...");
    const numeroOS = gerarNumeroOS();

    try {
      await addDoc(collection(db, "atendimentos"), {
        ...form,
        os: numeroOS,
        status: 'Em Análise',
        pecas_utilizadas: [], 
        data_entrada: serverTimestamp()
      });
      setForm({ cliente: '', marca: '', modelo: '', serial: '', defeito: '' });
      toast.success(`OS ${numeroOS} registrada!`, { id: loading });
    } catch (error) { 
      toast.error("Erro no sistema.", { id: loading }); 
    }
  };

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <header>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight">Manutenção & Bancada</h1>
        <p className="text-slate-500 font-medium text-sm">Gerenciamento de reparos ativos.</p>
      </header>

      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2 mb-6 text-blue-600">
          <Printer size={24} />
          <h2 className="font-bold text-slate-800 text-lg">Nova Entrada</h2>
        </div>
        
        <form onSubmit={handleEntrada} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* CLIENTE */}
          <input 
            placeholder="Cliente / Unidade" 
            className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium text-sm" 
            value={form.cliente} 
            onChange={(e) => setForm({...form, cliente: e.target.value})} 
          />
          
          {/* SELETOR DE MARCA */}
          <select
            value={form.marca}
            onChange={(e) => setForm({ ...form, marca: e.target.value, modelo: '' })}
            className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium text-sm"
          >
            <option value="">Selecione a Marca...</option>
            {Object.keys(MODELOS_DISPONIVEIS).map((marca) => (
              <option key={marca} value={marca}>{marca}</option>
            ))}
          </select>

          {/* SELETOR DE MODELO DINÂMICO */}
          <select
            value={form.modelo}
            disabled={!form.marca}
            onChange={(e) => setForm({ ...form, modelo: e.target.value })}
            className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium text-sm disabled:cursor-not-allowed disabled:text-slate-400"
          >
            <option value="">
              {form.marca ? "Selecione o Modelo..." : "Escolha a marca primeiro..."}
            </option>
            {form.marca && MODELOS_DISPONIVEIS[form.marca].map((mod) => (
              <option key={mod} value={mod}>{mod}</option>
            ))}
          </select>

          {/* NÚMERO DE SÉRIE */}
          <input 
            placeholder="S/N (Número de Série)" 
            className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium text-sm" 
            value={form.serial} 
            onChange={(e) => setForm({...form, serial: e.target.value})} 
          />
          
          {/* DEFEITO RELATADO + BOTÃO */}
          <div className="md:col-span-2 flex gap-2">
            <input 
              placeholder="Defeito Relatado" 
              className="flex-1 p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium text-sm" 
              value={form.defeito} 
              onChange={(e) => setForm({...form, defeito: e.target.value})} 
            />
            <button className="bg-blue-600 text-white px-8 font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase text-sm whitespace-nowrap">
              Dar Entrada
            </button>
          </div>
        </form>
      </section>

      {/* LISTAGEM DE CHAMADOS */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 text-slate-600 mb-2">
          <ClipboardList size={20} />
          <h3 className="font-bold uppercase text-xs tracking-widest">Equipamentos na Bancada ({chamados.length})</h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {chamados.map((item) => (
            <div key={item.id} className="bg-white p-5 rounded-2xl border border-slate-200 flex flex-col md:flex-row justify-between items-center hover:shadow-md transition-all">
              <div className="space-y-3 flex-1 w-full">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="flex items-center gap-1 text-[10px] font-black bg-blue-600 text-white px-2 py-1 rounded-lg">
                    <Hash size={12} /> OS: {item.os || 'GERANDO...'}
                  </span>
                  
                  <span className="text-[10px] font-black bg-slate-100 text-slate-500 px-2 py-1 rounded-lg border border-slate-200">
                    {item.data_entrada?.toDate().toLocaleDateString('pt-BR')}
                  </span>
                  
                  <span className="text-xs font-bold text-blue-600 uppercase italic">
                    {item.marca} - {item.modelo}
                  </span>
                </div>

                <div className="space-y-0.5">
                  <p className="text-sm text-slate-800 font-bold">Cliente: {item.cliente}</p>
                  <p className="text-[11px] font-mono text-slate-500 font-bold uppercase">S/N: {item.serial}</p>
                </div>
                
                <p className="text-xs text-slate-500 font-medium bg-slate-50 p-2 rounded-lg border border-slate-100">
                  <span className="font-bold text-slate-700 uppercase text-[9px] block mb-1">Defeito Relatado:</span>
                  {item.defeito}
                </p>

                {item.pecas_utilizadas?.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.pecas_utilizadas.map((p, idx) => (
                      <span key={idx} className="flex items-center gap-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-200 uppercase">
                        <CheckCircle2 size={10} /> {p}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex flex-col items-end gap-3 min-w-[180px] w-full md:w-auto mt-4 md:mt-0">
                <span className={`px-4 py-1 text-[10px] font-black rounded-full uppercase border ${
                  item.status === 'Aguardando Peça' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-100'
                }`}>
                  {item.status}
                </span>
                
                <button 
                  onClick={() => { setChamadoSelecionado(item); setModalAberto(true); }}
                  className="flex items-center gap-2 bg-slate-900 text-white text-xs px-5 py-3 rounded-xl font-bold hover:bg-blue-600 transition-all shadow-xl shadow-slate-200 w-full md:w-auto justify-center uppercase tracking-wider"
                >
                  <Settings size={14} /> Gerenciar OS
                </button>
              </div>
            </div>
          ))}
          
          {chamados.length === 0 && (
            <div className="text-center py-20 bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
              <p className="text-slate-400 font-medium italic">Nenhum equipamento na bancada no momento.</p>
            </div>
          )}
        </div>
      </div>

      {modalAberto && (
        <ModalGerenciarOS chamado={chamadoSelecionado} onClose={() => setModalAberto(false)} />
      )}
    </div>
  );
}