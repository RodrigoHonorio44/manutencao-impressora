import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, query, onSnapshot, where, getDocs } from 'firebase/firestore'; 
import { Printer, ClipboardList, CheckCircle2, Settings, Hash, History, AlertCircle, X } from 'lucide-react';
import toast from 'react-hot-toast';
import ModalGerenciarOS from '../components/ModalGerenciarOS';

// 🌟 LISTA DE CLIENTES/UNIDADES PADRONIZADOS
const CLIENTES_DISPONIVEIS = [
  { id: "conde modesto leal", nomeExibicao: "Conde Modesto Leal" }
];

const MODELOS_DISPONIVEIS = {
  "Brother": ["HL-L5102DW","HL-L6202DW", "DCP-L5652DN","DCP-L5602DN", "MFC-L5702DW", "MFC-L5902DW", "Outro Modelo Brother"],
  "Epson": [" Ecotank L5590",],
  "HP (Laser 408 / MFP 432)": ["Laser 408dn", "Laser MFP 432fdn"],
  "HP (LaserJet Pro M404 / M428)": ["LaserJet Pro M404dn", "LaserJet Pro M404dw", "LaserJet Pro MFP M428fdw", "LaserJet Pro MFP M428fdn"],
  "Pantum": ["P3302DN", "M6552NW", "M7102DN", "Outro Modelo Pantum"],
  "Samsung": ["ProXpress M3820ND", "ProXpress M4020ND", "ProXpress M4070FR", "Outro Modelo Samsung"],
  "Zebra (Térmica)": ["ZD230", "Outro Modelo Zebra"]
};

export default function Manutencao() {
  const [chamados, setChamados] = useState([]);
  const [form, setForm] = useState({ cliente: '', marca: '', modelo: '', serial: '', defeito: '' });
  const [modalAberto, setModalAberto] = useState(false);
  const [chamadoSelecionado, setChamadoSelecionado] = useState(null);

  // Estados para o histórico do Serial
  const [historicoEquipamento, setHistoricoEquipamento] = useState([]);
  const [modalHistoricoAberto, setModalHistoricoAberto] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, "atendimentos"), 
      where("status", "not-in", ["Finalizado", "Faturado"])
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const dataOrdenada = data.sort((a, b) => {
        const dataA = a.data_entrada?.seconds || 0;
        const dataB = b.data_entrada?.seconds || 0;
        return dataB - dataA;
      });
      setChamados(dataOrdenada);
    }, (error) => {
      console.error("Erro ao carregar bancada:", error);
    });
    
    return () => unsubscribe();
  }, []);

  // Efeito para buscar histórico quando o Serial for digitado
  useEffect(() => {
    const buscarHistorico = async () => {
      if (!form.serial.trim()) {
        setHistoricoEquipamento([]);
        return;
      }

    try {
        const q = query(
          collection(db, "atendimentos"),
          where("serial", "==", form.serial.trim().toLowerCase())
        );
        const querySnapshot = await getDocs(q);
        
        const rascunhoHistorico = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));

        rascunhoHistorico.sort((a, b) => {
          const dataA = a.data_entrada?.seconds || 0;
          const dataB = b.data_entrada?.seconds || 0;
          return dataB - dataA;
        });

        setHistoricoEquipamento(rascunhoHistorico);
      } catch (error) {
        console.error("Erro ao buscar histórico do serial:", error);
      }
    };

    const delayBusca = setTimeout(() => {
      buscarHistorico();
    }, 600);

    return () => clearTimeout(delayBusca);
  }, [form.serial]);

  const gerarNumeroOS = () => {
    const ano = new Date().getFullYear();
    const aleatorio = Math.floor(Math.random() * 10000000000).toString().padStart(10, '0');
    return `${ano}${aleatorio}`;
  };

  const handleEntrada = async (e) => {
    e.preventDefault();
    if (!form.cliente) {
      return toast.error("Selecione um Cliente / Unidade!");
    }
    if (!form.marca || !form.modelo || !form.serial) {
      return toast.error("Marca, Modelo e Serial são obrigatórios!");
    }
    
    const loading = toast.loading("Registrando entrada...");
    const numeroOS = gerarNumeroOS();

    try {
      await addDoc(collection(db, "atendimentos"), {
        cliente: form.cliente.toLowerCase(),
        marca: form.marca,
        modelo: form.modelo,
        serial: form.serial.trim().toLowerCase(),
        defeito: form.defeito.toLowerCase(),
        os: numeroOS,
        status: 'Em Análise',
        pecas_utilizadas: [], 
        data_entrada: serverTimestamp()
      });

      setForm({ cliente: '', marca: '', modelo: '', serial: '', defeito: '' });
      setHistoricoEquipamento([]);
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
          
          {/* 🌟 ALTERADO DE INPUT PARA SELECT COM A OPÇÃO CONDE MODESTO LEAL */}
          <select
            value={form.cliente}
            onChange={(e) => setForm({...form, cliente: e.target.value})}
            className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium text-sm"
          >
            <option value="">Selecione o Cliente / Unidade...</option>
            {CLIENTES_DISPONIVEIS.map((cli) => (
              <option key={cli.id} value={cli.id}>{cli.nomeExibicao}</option>
            ))}
          </select>
          
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

          <div className="flex flex-col space-y-1">
            <input 
              placeholder="S/N (Número de Série)" 
              className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium text-sm" 
              value={form.serial} 
              onChange={(e) => setForm({...form, serial: e.target.value})} 
            />
            {historicoEquipamento.length > 0 && (
              <div className="flex items-center justify-between bg-amber-50 border border-amber-200 rounded-xl p-2 px-3 animate-fade-in">
                <div className="flex items-center gap-1.5 text-amber-800 text-[11px] font-bold">
                  <AlertCircle size={14} className="text-amber-600 flex-shrink-0" />
                  <span>Este equipamento já possui {historicoEquipamento.length} histórico(s)!</span>
                </div>
                <button
                  type="button"
                  onClick={() => setModalHistoricoAberto(true)}
                  className="flex items-center gap-1 text-[10px] font-black uppercase text-white bg-amber-600 hover:bg-amber-700 px-2 py-1 rounded-md transition-all ml-2"
                >
                  <History size={12} /> Ver Histórico
                </button>
              </div>
            )}
          </div>
          
          <div className="md:col-span-2 flex gap-2 items-start">
            <input 
              placeholder="Defeito Relatado" 
              className="flex-1 p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-700 font-medium text-sm" 
              value={form.defeito} 
              onChange={(e) => setForm({...form, defeito: e.target.value})} 
            />
            <button className="bg-blue-600 text-white px-8 h-[46px] font-bold rounded-xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase text-sm whitespace-nowrap">
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
                  <p className="text-sm text-slate-800 font-bold capitalize">Cliente: {item.cliente}</p>
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

      {/* MODAL DO HISTÓRICO DE MANUTENÇÃO ANTERIOR */}
      {modalHistoricoAberto && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-100">
            <div className="p-5 border-b border-slate-100 flex items-center justify-between bg-slate-50 rounded-t-2xl">
              <div className="flex items-center gap-2 text-slate-800">
                <History className="text-amber-500" size={20} />
                <div>
                  <h3 className="font-bold text-base">Histórico do Equipamento</h3>
                  <p className="text-xs text-slate-500 font-mono">S/N: {form.serial.toUpperCase()}</p>
                </div>
              </div>
              <button 
                onClick={() => setModalHistoricoAberto(false)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-200/60 transition-all"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 flex-1">
              {historicoEquipamento.map((hist, index) => (
                <div key={hist.id} className="border border-slate-200 p-4 rounded-xl space-y-2.5 bg-white relative">
                  <div className="absolute right-4 top-4 text-[10px] font-black bg-slate-100 text-slate-600 border px-2 py-0.5 rounded-md">
                    #{index + 1}
                  </div>
                  <div className="flex flex-wrap gap-2 items-center text-xs">
                    <span className="bg-blue-50 text-blue-700 font-black px-2 py-0.5 rounded text-[10px]">
                      OS: {hist.os}
                    </span>
                    <span className="font-bold text-slate-500">
                      Entrada: {hist.data_entrada?.toDate().toLocaleDateString('pt-BR')} às {hist.data_entrada?.toDate().toLocaleTimeString('pt-BR', {hour: '2-digit', minute:'2-digit'})}
                    </span>
                    <span className={`px-2 py-0.5 text-[9px] font-black rounded uppercase border ${
                      hist.status === 'Finalizado' || hist.status === 'Faturado' 
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-slate-100 text-slate-700 border-slate-200'
                    }`}>
                      {hist.status}
                    </span>
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-700 uppercase">Cliente na época: <span className="text-slate-900 font-medium capitalize">{hist.cliente}</span></h4>
                    <p className="text-xs font-bold text-slate-700 mt-1 uppercase">Defeito: <span className="text-slate-500 font-medium normal-case block bg-slate-50 p-2 rounded border mt-0.5">{hist.defeito}</span></p>
                  </div>
                  {hist.pecas_utilizadas?.length > 0 && (
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Peças Aplicadas:</span>
                      <div className="flex flex-wrap gap-1">
                        {hist.pecas_utilizadas.map((p, i) => (
                          <span key={i} className="text-[9px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-100 px-1.5 py-0.5 rounded">
                            {p}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {modalAberto && (
        <ModalGerenciarOS chamado={chamadoSelecionado} onClose={() => setModalAberto(false)} />
      )}
    </div>
  );
}