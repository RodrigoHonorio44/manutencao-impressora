import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, query, onSnapshot, doc, deleteDoc } from 'firebase/firestore';
import { PackagePlus, Table, Search, Trash2, Archive, CheckCircle2, Eye, X, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

// BANCO DE DADOS DE CONFIGURAÇÃO INTERNO (Catálogo mantido)
const CATALOGO_IMPRESSORAS = {
  Brother: {
    modelos: ["DCP-L5652DN", "MFC-L5702DN", "DCP-L5502DN", "HL-L5102DW"],
    pecas: [
      { nome: "Película de Fusão (Metálica/Alta Performance)", pn: "LY9012001", obs: "Compatível com série L5000/L6000 (Toner TN3472)" },
      { nome: "Rolo Pressor do Fusor", pn: "LY9015001", obs: "Compatível com série L5000/L6000 (Toner TN3472)" },
      { nome: "Bucha do Rolo Pressor (Par)", pn: "LY9011002", obs: "Usar junto com o Rolo Pressor LY9015001" },
      { nome: "Engrenagem do Fusor (31 dentes)", pn: "LY9013001", obs: "Engrenagem de tração do fusor" },
      { nome: "Lâmpada de Halogênio do Fusor (110v)", pn: "LM0134001", obs: "Resistência interna do fusor" },
      { nome: "Termistor da Unidade de Fusão", pn: "LT3211001", obs: "Sensor de temperatura do fusor" },
      { nome: "Rolo Pick-up de Tração da Gaveta (Rolete)", pn: "D008G001", obs: "Borracha que puxa o papel da gaveta 1" },
      { nome: "Separation Pad (Calcador de Separação da Gaveta)", pn: "D005M001", obs: "Evita puxar duas folhas juntas" },
      { nome: "Rolete de Alimentação do ByPass (Manual)", pn: "D008K001", obs: "Borracha de tração da bandeja manual" },
      { nome: "Solenoide de Tração de Papel (T1)", pn: "LT0292001", obs: "Atuador elétrico de disparo do papel" },
      { nome: "Placa Fonte de Alimentação (110v)", pn: "LT3524001", obs: "Placa de energia principal" },
      { nome: "Placa Lógica Principal", pn: "LT3412001", obs: "Placa de processamento" },
      { nome: "Painel Touchscreen / Placa do Painel", pn: "LT3102001", obs: "Tela frontal de comando" },
      { nome: "Gaveta de Papel Completa (LT-5500)", pn: "LY9021001", obs: "Cassete de papel padrão de 250 folhas" },
      { nome: "Cabo Flat do Scanner / ADF", pn: "LY9033001", obs: "Fita de comunicação do escaner" },
      { nome: "Unidade de Cilindro (Drum DR3442)", pn: "DR3442", obs: "Fotocondutor de imagem (Rolo verde)" },
      { nome: "Rolo de Transferência (Banda de Transferência)", pn: "LY9019001", obs: "Fica abaixo do cilindro" }
    ]
  },
  HP: {
    modelos: ["LaserJet 408dn", "LaserJet M404n", "LaserJet M428fdw", "LaserJet P1102w"],
    pecas: [
      { nome: "Película de Fusão HP 408", pn: "JC66-03613A", obs: "Toner W1332A / Engenharia Samsung" },
      { nome: "Rolo Pressor do Fusor HP 408", pn: "JC66-03611A", obs: "Toner W1332A / Engenharia Samsung" },
      { nome: "Rolo Pick-up de Tração HP 408 (Rolete)", pn: "JC93-00540A", obs: "Rolete de alimentação da gaveta" },
      { nome: "Separation Pad de Separação HP 408", pn: "JC93-00525A", obs: "Separador de folhas da gaveta" },
      { nome: "Placa Fonte de Alimentação HP 408", pn: "JC44-00244A", obs: "Placa de alta e baixa voltagem" },
      { nome: "Placa Lógica Principal HP 408", pn: "JC92-02941A", obs: "Placa principal de dados" },
      { nome: "Painel de Controle / Teclado HP 408", pn: "JC92-02945A", obs: "Botoeira e visor numérico" },
      { nome: "Gaveta de Papel Cassete HP 408", pn: "JC93-00843A", obs: "Bandeja de entrada de papel" },
      { nome: "Unidade de Cilindro / Imagem (W1332A)", pn: "W1332A", obs: "Cilindro de imagem fotocondutor" },
      { nome: "Película de Fusão (Teflon - Série M404/M428)", pn: "RM2-2554-000", obs: "Série Pro 400 (Toner CF258A)" },
      { nome: "Rolo Pressor do Fusor (Série M404/M428)", pn: "RM2-5425-000", obs: "Série Pro 400 (Toner CF258A)" },
      { nome: "Rolo Pick-up Roller (Alimentação M404)", pn: "RM1-4006-000", obs: "Rolete em formato de D" },
      { nome: "Separation Pad com Suporte (M404)", pn: "RM1-4207-000", obs: "Almofada de separação da gaveta" },
      { nome: "Placa Fonte de Alimentação (M404n - 110v)", pn: "RM2-8491-000", obs: "Placa fonte interna HP" },
      { nome: "Placa Lógica Principal (M404n)", pn: "W1A52-60001", obs: "Placa mãe da impressora" },
      { nome: "Película de Fusão P1102w", pn: "RG5-1493-000", obs: "Máquinas antigas (Toner CE285A)" },
      { nome: "Placa Fonte P1102w (110v)", pn: "RM1-7901-000", obs: "Queima muito quando ligam no 220v" },
      { nome: "Gaveta de Papel / Cassete Série M404", pn: "RM2-5394-000", obs: "Gaveta frontal de plástico" },
      { nome: "Solenoide de Registro (Série M404)", pn: "RK2-1481-000", obs: "Controla o tempo de subida da folha" }
    ]
  }
};

export default function Estoque() {
  const [pecas, setPecas] = useState([]);
  const [verFiltroStatus, setVerFiltroStatus] = useState('disponivel');
  const [marcaSelecionada, setMarcaSelecionada] = useState('');
  const [modeloSelecionada, setModeloSelecionada] = useState('');
  const [pecaObjetoSelecionado, setPecaObjetoSelecionado] = useState(null);
  const [quantidade, setQuantidade] = useState('');
  const [termoBusca, setTermoBusca] = useState('');
  
  const [itemSelecionadoRastrear, setItemSelecionadoRastrear] = useState(null);
  const [historicoAtendimentos, setHistoricoAtendimentos] = useState([]);
  const [carregandoAtendimentos, setCarregandoAtendimentos] = useState(false);

  useEffect(() => {
    if (verFiltroStatus === 'disponivel') {
      const q = query(collection(db, "estoque_pecas"));
      const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const ativos = data.filter(item => (Number(item.qtd) || 0) > 0);

        ativos.sort((a, b) => {
          const obterTempo = (item) => {
            const campoData = item.data_entrada;
            if (!campoData) return 0;
            if (typeof campoData.toDate === 'function') return campoData.toDate().getTime();
            return campoData.seconds ? campoData.seconds * 1000 : new Date(campoData).getTime() || 0;
          };
          return obterTempo(b) - obterTempo(a);
        });
        setPecas(ativos);
      });
      return () => unsubscribe();
    } 
    else {
      let dadosEstoqueZerado = [];
      let dadosHistoricoZerado = [];

      const unificarEZerar = () => {
        const unificados = [...dadosEstoqueZerado, ...dadosHistoricoZerado];
        const IDsUnicos = Array.from(new Set(unificados.map(a => a.id)))
          .map(id => unificados.find(a => a.id === id));

        IDsUnicos.sort((a, b) => {
          const obterTempo = (item) => {
            const campoData = item.data_fim || item.data_entrada;
            if (!campoData) return 0;
            if (typeof campoData.toDate === 'function') return campoData.toDate().getTime();
            return campoData.seconds ? campoData.seconds * 1000 : new Date(campoData).getTime() || 0;
          };
          return obterTempo(b) - obterTempo(a);
        });

        setPecas(IDsUnicos);
      };

      const qEstoque = query(collection(db, "estoque_pecas"));
      const unsubscribeEstoque = onSnapshot(qEstoque, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        dadosEstoqueZerado = data.filter(item => (Number(item.qtd) || 0) === 0);
        unificarEZerar();
      });

      const qHistorico = query(collection(db, "historico_lotes_zerados"));
      const unsubscribeHistorico = onSnapshot(qHistorico, (snapshot) => {
        dadosHistoricoZerado = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        unificarEZerar();
      });

      return () => {
        unsubscribeEstoque();
        unsubscribeHistorico();
      };
    }
  }, [verFiltroStatus]);

  useEffect(() => {
    if (!itemSelecionadoRastrear) {
      setHistoricoAtendimentos([]);
      return;
    }

    setCarregandoAtendimentos(true);
    const qAtendimentos = query(collection(db, "atendimentos"));

    const unsubscribe = onSnapshot(qAtendimentos, (snapshot) => {
      const todosAtendimentos = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      const textoPecaCompleto = (itemSelecionadoRastrear.nome || '').toLowerCase();
      let partNumberIsolado = "";
      const matchPN = textoPecaCompleto.match(/part number:\s*([a-zA-Z0-9_-]+)/);
      if (matchPN && matchPN[1]) {
        partNumberIsolado = matchPN[1].toLowerCase().trim();
      }

      const filtrados = todosAtendimentos.filter(atendimento => {
        const pecasUtilizadas = atendimento.pecas_utilizadas;

        if (Array.isArray(pecasUtilizadas)) {
          return pecasUtilizadas.some(pecaString => {
            const nomePecaAtendimento = pecaString.toLowerCase();
            const batePorTexto = (
              nomePecaAtendimento.includes(textoPecaCompleto) ||
              textoPecaCompleto.includes(nomePecaAtendimento)
            );
            const batePorPartNumber = partNumberIsolado && nomePecaAtendimento.includes(partNumberIsolado);
            return batePorTexto || batePorPartNumber;
          });
        }

        if (typeof pecasUtilizadas === 'string') {
          const stringPeca = pecasUtilizadas.toLowerCase();
          return stringPeca.includes(textoPecaCompleto) || textoPecaCompleto.includes(stringPeca);
        }

        return false;
      });

      filtrados.sort((a, b) => {
        const obterTempo = (x) => {
          const d = x.data_finalizacao || x.data_atendimento || x.data_entrada;
          if (!d) return 0;
          if (typeof d.toDate === 'function') return d.toDate().getTime();
          return d.seconds ? d.seconds * 1000 : new Date(d).getTime();
        };
        return obterTempo(b) - obterTempo(a);
      });

      setHistoricoAtendimentos(filtrados);
      setCarregandoAtendimentos(false);
    }, (error) => {
      console.error("Erro ao ler atendimentos:", error);
      setCarregandoAtendimentos(false);
    });

    return () => unsubscribe();
  }, [itemSelecionadoRastrear]);

  const formatarData = (campoData) => {
    if (!campoData) return '---';
    if (typeof campoData.toDate === 'function') return campoData.toDate().toLocaleDateString('pt-BR');
    if (campoData.seconds) return new Date(campoData.seconds * 1000).toLocaleDateString('pt-BR');
    if (typeof campoData === 'string') {
      const dataTentativa = new Date(campoData);
      if (!isNaN(dataTentativa.getTime())) return dataTentativa.toLocaleDateString('pt-BR');
      return campoData;
    }
    return '---';
  };

  const handleMarcaChange = (e) => {
    setMarcaSelecionada(e.target.value);
    setModeloSelecionada('');
    setPecaObjetoSelecionado(null);
  };

  const handleAdicionar = async (e) => {
    e.preventDefault();
    if (!marcaSelecionada || !modeloSelecionada || !pecaObjetoSelecionado || !quantidade) {
      return toast.error("Preencha todos os campos antes de salvar!");
    }

    const loading = toast.loading("Registrando no estoque...");
    const nomeCompletoPeca = `${pecaObjetoSelecionado.nome} - (Part Number: ${pecaObjetoSelecionado.pn}) [${pecaObjetoSelecionado.obs}]`;

    try {
      // NORMALIZAÇÃO PARA MINÚSCULAS: Salvando dados estruturados de forma limpa e padronizada
      await addDoc(collection(db, "estoque_pecas"), {
        marca: marcaSelecionada.trim().toLowerCase(),
        modelo: modeloSelecionada.trim().toLowerCase(),
        nome: nomeCompletoPeca.trim().toLowerCase(),
        qtd: Number(quantidade),
        data_entrada: serverTimestamp()
      });

      setPecaObjetoSelecionado(null);
      setQuantidade('');
      toast.success("Peça registrada com sucesso!", { id: loading });
    } catch (error) {
      toast.error("Erro ao salvar no banco.", { id: loading });
    }
  };

  const handleExcluir = async (id, nomeCompleto) => {
    const confirmar = window.confirm(`Deseja realmente remover esta entrada do estoque?\n\n"${nomeCompleto}"`);
    if (!confirmar) return;

    const loading = toast.loading("Removendo item do estoque...");
    const nomeColecao = verFiltroStatus === 'disponivel' ? "estoque_pecas" : "historico_lotes_zerados";

    try {
      await deleteDoc(doc(db, nomeColecao, id));
      toast.success("Item removido com sucesso!", { id: loading });
    } catch (error) {
      toast.error("Erro ao tentar excluir o item.", { id: loading });
    }
  };

  const pecasFiltradas = pecas.filter(item => {
    const termo = termoBusca.toLowerCase();
    return (
      item.marca?.toLowerCase().includes(termo) ||
      item.modelo?.toLowerCase().includes(termo) ||
      item.nome?.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="p-4 md:p-8 space-y-6 md:space-y-8 bg-slate-50 min-h-screen relative">
      <header>
        <h1 className="text-xl md:text-2xl font-bold text-slate-800">Estoque de Peças</h1>
        <p className="text-xs md:text-sm text-slate-500 font-medium">Controle inteligente e padronizado de insumos de assistência.</p>
      </header>

      {/* Formulário Automatizado - Mobile Friendly */}
      <section className="bg-white p-4 md:p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-1 text-blue-600">
          <PackagePlus size={22} />
          <h2 className="font-bold text-slate-800 text-base md:text-lg">Nova Entrada Automatizada</h2>
        </div>

        <form onSubmit={handleAdicionar} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Marca</label>
            <select value={marcaSelecionada} onChange={handleMarcaChange} className="p-3 bg-slate-50 border rounded-xl text-sm font-medium text-slate-700 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              {Object.keys(CATALOGO_IMPRESSORAS).map(marca => <option key={marca} value={marca}>{marca}</option>)}
            </select>
          </div>

          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Modelo</label>
            <select value={modeloSelecionada} onChange={(e) => setModeloSelecionada(e.target.value)} disabled={!marcaSelecionada} className="p-3 bg-slate-50 border rounded-xl text-sm font-medium text-slate-700 disabled:opacity-50 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione...</option>
              {marcaSelecionada && CATALOGO_IMPRESSORAS[marcaSelecionada].modelos.map(mod => <option key={mod} value={mod}>{mod}</option>)}
            </select>
          </div>

          <div className="flex flex-col space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Componente Interno</label>
            <select value={pecaObjetoSelecionado ? JSON.stringify(pecaObjetoSelecionado) : ''} onChange={(e) => setPecaObjetoSelecionado(e.target.value ? JSON.parse(e.target.value) : null)} disabled={!modeloSelecionada} className="p-3 bg-slate-50 border rounded-xl text-sm font-medium text-slate-700 disabled:opacity-50 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione a peça...</option>
              {marcaSelecionada && CATALOGO_IMPRESSORAS[marcaSelecionada].pecas.map((p, index) => <option key={index} value={JSON.stringify(p)}>{p.nome} (PN: {p.pn})</option>)}
            </select>
          </div>

          {/* Grid de quantidade e botão responsivo */}
          <div className="grid grid-cols-3 gap-3 md:col-span-1">
            <div className="col-span-1 flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase text-center tracking-wide">Qtd</label>
              <input type="number" min="1" value={quantidade} onChange={(e) => setQuantidade(e.target.value)} placeholder="0" className="w-full p-3 bg-slate-50 border rounded-xl text-center font-bold text-slate-700 outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <button type="submit" className="col-span-2 bg-blue-600 text-white font-bold rounded-xl active:bg-blue-800 md:hover:bg-blue-700 text-xs uppercase tracking-wider h-[48px]">
              Salvar
            </button>
          </div>
        </form>
      </section>

      {/* Menu de Filtro e Barra de Busca Responsiva */}
      <div className="flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4">
        <div className="flex bg-slate-200/60 p-1 rounded-xl border border-slate-300/40 shrink-0">
          <button onClick={() => setVerFiltroStatus('disponivel')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs uppercase transition-all ${verFiltroStatus === 'disponivel' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500'}`}>
            <CheckCircle2 size={14} /> Em Estoque
          </button>
          <button onClick={() => setVerFiltroStatus('esgotado')} className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-bold text-xs uppercase transition-all ${verFiltroStatus === 'esgotado' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}>
            <Archive size={14} /> Arquivo (Zeradas)
          </button>
        </div>

        <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl p-1.5 shadow-sm w-full max-w-md">
          <Search size={18} className="text-slate-400 ml-2" />
          <input type="text" placeholder="Buscar por Código (PN), Modelo ou Insumo..." value={termoBusca} onChange={(e) => setTermoBusca(e.target.value)} className="w-full p-2 pl-2 text-sm font-medium outline-none text-slate-700 bg-transparent" />
          {termoBusca && <button onClick={() => setTermoBusca('')} className="text-xs text-slate-400 font-bold px-2 active:text-slate-600">Limpar</button>}
        </div>
      </div>

      {/* Tabela de Visualização com Scroll Horizontal para Mobile */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 md:p-5 bg-slate-50 border-b flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Table size={16} className="text-slate-400" />
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">
              {verFiltroStatus === 'disponivel' ? 'Insumos Disponíveis' : 'Histórico de Peças Esgotadas'}
            </h3>
          </div>
          <span className="text-[11px] bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
            Mostrando {pecasFiltradas.length} itens
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead className="bg-slate-100/70 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b">
              <tr>
                <th className="p-4 pl-6 w-32">{verFiltroStatus === 'disponivel' ? 'Data' : 'Data Fim'}</th>
                <th className="p-4 w-48">Marca / Modelo</th>
                <th className="p-4">Especificação Técnica & Observação</th>
                <th className="p-4 text-center w-24">Qtd</th>
                <th className="p-4 text-center w-24">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-sm">
              {pecasFiltradas.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-4 pl-6 text-xs text-slate-400">
                    {formatarData(item.data_fim || item.data_entrada)}
                  </td>
                  <td className="p-4">
                    <p className="font-black text-slate-800 text-xs uppercase">{item.marca}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{item.modelo}</p>
                  </td>
                  <td className="p-4 text-xs text-slate-600 uppercase font-semibold">
                    <p className="break-words max-w-md">{item.nome}</p>
                  </td>
                  <td className="p-4 text-center">
                    <span className={`font-black text-xs px-2.5 py-1 rounded-lg border ${Number(item.qtd) > 0 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                      {Number(item.qtd)?.toString().padStart(2, '0') || '00'}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        type="button"
                        onClick={() => setItemSelecionadoRastrear(item)}
                        className="text-slate-400 active:text-blue-600 md:hover:text-blue-600 p-2 rounded-xl active:bg-blue-50 md:hover:bg-blue-50 transition-colors"
                        title="Ver atendimentos que usaram esta peça"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleExcluir(item.id, item.nome)}
                        className="text-slate-400 active:text-red-600 md:hover:text-red-600 p-2 rounded-xl active:bg-red-50 md:hover:bg-red-50 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {pecasFiltradas.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center p-8 text-slate-400 italic text-sm font-normal">
                    Nenhuma peça encontrada correspondente aos filtros.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* MODAL DE RASTREABILIDADE TOTALMENTE RESPONSIVO */}
      {itemSelecionadoRastrear && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[110] p-3 md:p-4">
          <div className="bg-white rounded-2xl shadow-xl border w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in fade-in zoom-in duration-150">
            {/* Header Modal */}
            <div className="p-4 md:p-5 bg-slate-50 border-b flex justify-between items-center shrink-0">
              <div className="max-w-[85%]">
                <span className="text-[9px] md:text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 tracking-wider">Histórico de Uso Real em Atendimentos</span>
                <h3 className="text-xs md:text-sm font-bold text-slate-800 mt-1 uppercase truncate">{itemSelecionadoRastrear.nome}</h3>
              </div>
              <button onClick={() => setItemSelecionadoRastrear(null)} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {/* Conteúdo Modal com Rolagem Lateral e Vertical Interna */}
            <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
              <p className="text-[11px] md:text-xs text-slate-500 font-medium">Buscando correspondências internas na lista de peças aplicadas dos chamados:</p>
              
              {carregandoAtendimentos ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                  <Loader2 size={22} className="animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">Vasculhando banco de atendimentos...</span>
                </div>
              ) : (
                <div className="border rounded-xl overflow-x-auto bg-slate-50">
                  <table className="w-full text-left text-xs border-collapse min-w-[500px]">
                    <thead className="bg-slate-200/60 text-slate-600 uppercase font-bold text-[9px] tracking-wider border-b">
                      <tr>
                        <th className="p-3">Data Finalização</th>
                        <th className="p-3">Modelo Máquina</th>
                        <th className="p-3">Nº de Série</th>
                        <th className="p-3 text-center">Nº O.S. / Local</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y text-slate-700 font-medium">
                      {historicoAtendimentos.length > 0 ? (
                        historicoAtendimentos.map((atendimento) => (
                          <tr key={atendimento.id} className="hover:bg-white transition-colors">
                            <td className="p-3 font-semibold text-slate-500">
                              {formatarData(atendimento.data_finalizacao || atendimento.data_atendimento || atendimento.data_entrada)}
                            </td>
                            <td className="p-3 text-slate-900 uppercase font-bold">
                              {atendimento.modelo || atendimento.modelo_impressora || '---'}
                            </td>
                            <td className="p-3 tracking-wider font-mono text-blue-600 font-bold uppercase">
                              {atendimento.serial || atendimento.num_serie || '---'}
                            </td>
                            <td className="p-3 text-center text-slate-500">
                              <span className="font-bold block text-slate-700">
                                {atendimento.os ? `#${atendimento.os}` : `#${atendimento.id.substring(0, 5)}`}
                              </span>
                              <span className="text-[10px] text-slate-400 block uppercase max-w-[150px] truncate mx-auto">
                                {atendimento.cliente || 'Sem Local'}
                              </span>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center py-10 text-slate-400 italic font-normal">
                            Nenhum registro encontrado para essa especificação.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="p-4 bg-slate-50 border-t flex justify-end shrink-0">
              <button onClick={() => setItemSelecionadoRastrear(null)} className="w-full sm:w-auto px-5 py-2.5 bg-slate-200 text-slate-700 rounded-xl text-xs font-bold uppercase tracking-wider active:bg-slate-300 transition-all">
                Fechar Janela
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}