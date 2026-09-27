import { useState, useEffect } from 'react';
import { PackagePlus, Table, Search, Trash2, Archive, CheckCircle2, Eye, X, Loader2, Edit3, Check, RotateCcw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../services/api';

// BANCO DE DADOS DE CONFIGURAÇÃO INTERNO
const CATALOGO_IMPRESSORAS = {
  Brother: {
    modelos: ["DCP-L2540DN", "DCP-L5652DN", "MFC-L5702DN", "DCP-L5502DN", "HL-L5102DW"],
    pecas: [
      { nome: "Rolo Pressor do Fusor", pn: "LY9015001 / L2540", obs: "Compatível com DCP-L2540DN e série L5000" },
      { nome: "Película de Fusão (Metálica/Alta Performance)", pn: "LY9012001 / L2540", obs: "Compatível com DCP-L2540DN e série L5000" },
      { nome: "Bucha do Rolo Pressor (Par)", pn: "LY9011002", obs: "Usar junto com o Rolo Pressor" },
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
      { nome: "Gaveta de Papel Completa (LT-5500)", pn: "LY9021001", obs: "Cassete de papel padrão" },
      { nome: "Cabo Flat do Scanner / ADF", pn: "LY9033001", obs: "Fita de comunicação do escaner" },
      { nome: "Unidade de Cilindro (Drum DR3442)", pn: "DR3442", obs: "Fotocondutor de imagem (Rolo verde)" },
      { nome: "Rolo de Transferência (Banda de Transferência)", pn: "LY9019001", obs: "Fica abaixo do cilindro" }
    ]
  },
  Epson: {
    modelos: ["EcoTank L3250", "EcoTank L3150", "EcoTank M2170", "EcoTank M2140", "EcoTank L6171", "Expression Home XP-4100", "WorkForce WF-2830"],
    pecas: [
      { 
        nome: "Caixa de Resíduo de Tinta C9344 / EWMB3", 
        pn: "C9344 / EWMB3", 
        obs: "Compatível com XP-3100 / XP-4100 / WF-2830 / L3250 / L3150" 
      },
      { 
        nome: "Caixa de Resíduo de Tinta E-04D1 / EWMB2", 
        pn: "E-04D1 / EWMB2", 
        obs: "Compatível com WF-2860, M2170, M2140, L6190, L6171" 
      }
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

  // Edição
  const [itemEmEdicao, setItemEmEdicao] = useState(null);
  const [editForm, setEditForm] = useState({ marca: '', modelo: '', nome: '', qtd: '' });

  const carregarEstoque = async () => {
    try {
      const response = api.getEstoque ? await api.getEstoque() : await api.get('/api/estoque_pecas');
      const rawData = response?.data !== undefined ? response.data : response;

      let listaItens = [];
      if (Array.isArray(rawData)) {
        listaItens = rawData;
      } else if (rawData && typeof rawData === 'object') {
        listaItens = rawData.docs || rawData.items || rawData.estoque || rawData.pecas || rawData.data || [];
      }

      let filtrados = [];
      if (verFiltroStatus === 'disponivel') {
        filtrados = listaItens.filter(item => Number(item.qtd) > 0);
      } else {
        filtrados = listaItens.filter(item => Number(item.qtd) === 0);
      }

      const obterTimestamp = (item) => {
        let campo = item.data_entrada || item.createdAt;
        if (!campo) return 0;
        if (typeof campo === 'object' && campo.$date) {
          campo = campo.$date;
        }
        const parsed = new Date(campo).getTime();
        return isNaN(parsed) ? 0 : parsed;
      };

      filtrados.sort((a, b) => obterTimestamp(b) - obterTimestamp(a));
      setPecas(filtrados);
    } catch (error) {
      console.error("Erro ao carregar estoque:", error);
      toast.error("Erro ao conectar à API de estoque.");
    }
  };

  useEffect(() => {
    carregarEstoque();
  }, [verFiltroStatus]);

  useEffect(() => {
    if (!itemSelecionadoRastrear) {
      setHistoricoAtendimentos([]);
      return;
    }

    const buscarAtendimentos = async () => {
      setCarregandoAtendimentos(true);
      try {
        const response = api.getAtendimentos ? await api.getAtendimentos() : await api.get('/api/atendimentos');
        const todosAtendimentos = response.data || response;

        const textoPecaCompleto = (itemSelecionadoRastrear.nome || '').toLowerCase();
        let partNumberIsolado = "";
        const matchPN = textoPecaCompleto.match(/part number:\s*([a-zA-Z0-9_-]+)/);
        if (matchPN && matchPN[1]) {
          partNumberIsolado = matchPN[1].toLowerCase().trim();
        }

        const listaAtendimentos = Array.isArray(todosAtendimentos) ? todosAtendimentos : (todosAtendimentos.docs || todosAtendimentos.items || []);

        const filtrados = listaAtendimentos.filter(atendimento => {
          const pecasUtilizadas = atendimento.pecas_utilizadas;
          if (Array.isArray(pecasUtilizadas)) {
            return pecasUtilizadas.some(pecaString => {
              const nomePecaAtendimento = pecaString.toLowerCase();
              return nomePecaAtendimento.includes(textoPecaCompleto) || (partNumberIsolado && nomePecaAtendimento.includes(partNumberIsolado));
            });
          }
          if (typeof pecasUtilizadas === 'string') {
            return pecasUtilizadas.toLowerCase().includes(textoPecaCompleto);
          }
          return false;
        });

        setHistoricoAtendimentos(filtrados);
      } catch (error) {
        console.error("Erro ao buscar atendimentos:", error);
      } finally {
        setCarregandoAtendimentos(false);
      }
    };

    buscarAtendimentos();
  }, [itemSelecionadoRastrear]);

  const formatarData = (campoData) => {
    if (!campoData) return '---';
    if (typeof campoData === 'object' && campoData.$date) {
      campoData = campoData.$date;
    }
    const data = new Date(campoData);
    return isNaN(data.getTime()) ? '---' : data.toLocaleDateString('pt-BR');
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

    const qtdNum = Number(quantidade);
    if (isNaN(qtdNum) || qtdNum <= 0) {
      return toast.error("Informe uma quantidade válida maior que zero!");
    }

    const loading = toast.loading("Registrando no MongoDB...");
    const nomeCompletoPeca = `${pecaObjetoSelecionado.nome} (part number: ${pecaObjetoSelecionado.pn}) [${pecaObjetoSelecionado.obs}]`;

    const novoItem = {
      marca: marcaSelecionada.trim().toLowerCase(),
      modelo: modeloSelecionada.trim().toLowerCase(),
      nome: nomeCompletoPeca.trim().toLowerCase(),
      qtd: qtdNum,
      data_entrada: new Date().toISOString()
    };

    try {
      if (api.criarEstoque) {
        await api.criarEstoque(novoItem);
      } else {
        await api.post('/api/estoque_pecas', novoItem);
      }

      setMarcaSelecionada('');
      setModeloSelecionada('');
      setPecaObjetoSelecionado(null);
      setQuantidade('');
      toast.success("Peça registrada com sucesso!", { id: loading });
      carregarEstoque();
    } catch (error) {
      toast.error("Erro ao salvar peça.", { id: loading });
    }
  };

  const handleIniciarEdicao = (item) => {
    setItemEmEdicao(item._id || item.id);
    setEditForm({
      marca: item.marca || '',
      modelo: item.modelo || '',
      nome: item.nome || '',
      qtd: item.qtd !== undefined ? item.qtd : ''
    });
  };

  const handleCancelarEdicao = () => {
    setItemEmEdicao(null);
    setEditForm({ marca: '', modelo: '', nome: '', qtd: '' });
  };

  const handleSalvarEdicao = async (id) => {
    if (!editForm.marca || !editForm.modelo || !editForm.nome || editForm.qtd === '') {
      return toast.error("Preencha todos os campos da edição!");
    }

    const loading = toast.loading("Atualizando no MongoDB...");

    try {
      const dadosAtualizados = {
        marca: editForm.marca.trim().toLowerCase(),
        modelo: editForm.modelo.trim().toLowerCase(),
        nome: editForm.nome.trim().toLowerCase(),
        qtd: Number(editForm.qtd)
      };

      if (api.atualizarEstoque) {
        await api.atualizarEstoque(id, dadosAtualizados);
      } else {
        await api.put(`/api/estoque_pecas/${id}`, dadosAtualizados);
      }

      setItemEmEdicao(null);
      toast.success("Estoque atualizado com sucesso!", { id: loading });
      carregarEstoque();
    } catch (error) {
      toast.error("Erro ao atualizar o item.", { id: loading });
    }
  };

  const handleExcluir = async (id, nomeCompleto) => {
    const loading = toast.loading(`A remover "${nomeCompleto}"...`);

    try {
      if (api.excluirEstoque) {
        await api.excluirEstoque(id);
      } else {
        await api.delete(`/api/estoque_pecas/${id}`);
      }

      toast.success("Item removido com sucesso!", { id: loading });
      carregarEstoque();
    } catch (error) {
      console.error("Erro ao excluir peça:", error);
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

      {/* Formulário Automatizado */}
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
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Componente Interno / Insumo</label>
            <select value={pecaObjetoSelecionado ? JSON.stringify(pecaObjetoSelecionado) : ''} onChange={(e) => setPecaObjetoSelecionado(e.target.value ? JSON.parse(e.target.value) : null)} disabled={!modeloSelecionada} className="p-3 bg-slate-50 border rounded-xl text-sm font-medium text-slate-700 disabled:opacity-50 outline-none focus:ring-2 focus:ring-blue-500">
              <option value="">Selecione a peça...</option>
              {marcaSelecionada && CATALOGO_IMPRESSORAS[marcaSelecionada].pecas.map((p, index) => <option key={index} value={JSON.stringify(p)}>{p.nome} (PN: {p.pn})</option>)}
            </select>
          </div>

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

      {/* Menu de Filtro e Barra de Busca */}
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

      {/* Tabela de Visualização */}
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
                <th className="p-4 pl-6 w-32">Data Entrada</th>
                <th className="p-4 w-48">Marca / Modelo</th>
                <th className="p-4">Especificação Técnica & Observação</th>
                <th className="p-4 text-center w-24">Qtd</th>
                <th className="p-4 text-center w-32">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-sm">
              {pecasFiltradas.map((item) => {
                const itemId = item._id || item.id;
                const eItemEditando = itemEmEdicao === itemId;

                return (
                  <tr key={itemId} className={eItemEditando ? "bg-blue-50/40 transition-colors" : "hover:bg-slate-50/60 transition-colors"}>
                    <td className="p-4 pl-6 text-xs text-slate-400">
                      {formatarData(item.data_entrada || item.createdAt)}
                    </td>
                    
                    <td className="p-4">
                      {eItemEditando ? (
                        <div className="space-y-1">
                          <input
                            type="text"
                            value={editForm.marca}
                            onChange={(e) => setEditForm({ ...editForm, marca: e.target.value })}
                            className="w-full p-1 text-xs font-bold uppercase border rounded bg-white"
                          />
                          <input
                            type="text"
                            value={editForm.modelo}
                            onChange={(e) => setEditForm({ ...editForm, modelo: e.target.value })}
                            className="w-full p-1 text-[10px] font-bold uppercase border rounded bg-white"
                          />
                        </div>
                      ) : (
                        <>
                          <p className="font-black text-slate-800 text-xs uppercase">{item.marca}</p>
                          <p className="text-[10px] text-slate-400 font-bold uppercase">{item.modelo}</p>
                        </>
                      )}
                    </td>

                    <td className="p-4 text-xs text-slate-600 uppercase font-semibold">
                      {eItemEditando ? (
                        <textarea
                          rows={2}
                          value={editForm.nome}
                          onChange={(e) => setEditForm({ ...editForm, nome: e.target.value })}
                          className="w-full p-1 text-xs border rounded bg-white uppercase font-medium"
                        />
                      ) : (
                        <p className="break-words max-w-md">{item.nome}</p>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      {eItemEditando ? (
                        <input
                          type="number"
                          min="0"
                          value={editForm.qtd}
                          onChange={(e) => setEditForm({ ...editForm, qtd: e.target.value })}
                          className="w-16 p-1 text-center font-bold text-xs border rounded bg-white"
                        />
                      ) : (
                        <span className={`font-black text-xs px-2.5 py-1 rounded-lg border ${Number(item.qtd) > 0 ? 'bg-blue-50 text-blue-700 border-blue-100' : 'bg-amber-50 text-amber-700 border-amber-100'}`}>
                          {Number(item.qtd)?.toString().padStart(2, '0') || '00'}
                        </span>
                      )}
                    </td>

                    <td className="p-4 text-center">
                      {eItemEditando ? (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleSalvarEdicao(itemId)}
                            className="text-emerald-600 bg-emerald-50 hover:bg-emerald-100 p-2 rounded-xl"
                            title="Salvar alterações"
                          >
                            <Check size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={handleCancelarEdicao}
                            className="text-slate-400 hover:bg-slate-200 p-2 rounded-xl"
                            title="Cancelar edição"
                          >
                            <RotateCcw size={16} />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleIniciarEdicao(item)}
                            className="text-slate-400 hover:text-amber-600 hover:bg-amber-50 p-2 rounded-xl"
                            title="Editar item"
                          >
                            <Edit3 size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setItemSelecionadoRastrear(item)}
                            className="text-slate-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-xl"
                            title="Rastrear uso"
                          >
                            <Eye size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleExcluir(itemId, item.nome)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-xl"
                            title="Excluir item"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
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

      {/* Modal de Rastreabilidade */}
      {itemSelecionadoRastrear && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center z-[110] p-3 md:p-4">
          <div className="bg-white rounded-2xl shadow-xl border w-full max-w-2xl flex flex-col max-h-[90vh] overflow-hidden">
            <div className="p-4 md:p-5 bg-slate-50 border-b flex justify-between items-center shrink-0">
              <div className="max-w-[85%]">
                <span className="text-[9px] md:text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-blue-100 text-blue-800 tracking-wider">Histórico de Uso em Atendimentos</span>
                <h3 className="text-xs md:text-sm font-bold text-slate-800 mt-1 uppercase truncate">{itemSelecionadoRastrear.nome}</h3>
              </div>
              <button onClick={() => setItemSelecionadoRastrear(null)} className="p-1.5 rounded-xl hover:bg-slate-200 text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="p-4 md:p-6 space-y-4 overflow-y-auto flex-1">
              {carregandoAtendimentos ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400 space-y-2">
                  <Loader2 size={22} className="animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">Buscando atendimentos no MongoDB...</span>
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
                          <tr key={atendimento._id || atendimento.id} className="hover:bg-white transition-colors">
                            <td className="p-3 font-semibold text-slate-500">
                              {formatarData(atendimento.data_finalizacao || atendimento.createdAt)}
                            </td>
                            <td className="p-3 text-slate-900 uppercase font-bold">
                              {atendimento.modelo || atendimento.modelo_impressora || '---'}
                            </td>
                            <td className="p-3 tracking-wider font-mono text-blue-600 font-bold uppercase">
                              {atendimento.serial || atendimento.num_serie || '---'}
                            </td>
                            <td className="p-3 text-center font-bold text-slate-600 uppercase">
                              {atendimento.os || atendimento.numero_os || atendimento.setor || '---'}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="4" className="text-center p-6 text-slate-400 italic">
                            Nenhum atendimento registrado utilizou esta peça até o momento.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}