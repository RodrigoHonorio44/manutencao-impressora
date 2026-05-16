import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, addDoc, serverTimestamp, query, onSnapshot, orderBy, doc, deleteDoc } from 'firebase/firestore';
import { PackagePlus, Table, Search, Info, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

// BANCO DE DADOS DE CONFIGURAÇÃO INTERNO (Catálogo Técnico Completo)
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
      // HP 408dn (Base Samsung)
      { nome: "Película de Fusão HP 408", pn: "JC66-03613A", obs: "Toner W1332A / Engenharia Samsung" },
      { nome: "Rolo Pressor do Fusor HP 408", pn: "JC66-03611A", obs: "Toner W1332A / Engenharia Samsung" },
      { nome: "Rolo Pick-up de Tração HP 408 (Rolete)", pn: "JC93-00540A", obs: "Rolete de alimentação da gaveta" },
      { nome: "Separation Pad de Separação HP 408", pn: "JC93-00525A", obs: "Separador de folhas da gaveta" },
      { nome: "Placa Fonte de Alimentação HP 408", pn: "JC44-00244A", obs: "Placa de alta e baixa voltagem" },
      { nome: "Placa Lógica Principal HP 408", pn: "JC92-02941A", obs: "Placa principal de dados" },
      { nome: "Painel de Controle / Teclado HP 408", pn: "JC92-02945A", obs: "Botoeira e visor numérico" },
      { nome: "Gaveta de Papel Cassete HP 408", pn: "JC93-00843A", obs: "Bandeja de entrada de papel" },
      { nome: "Unidade de Cilindro / Imagem (W1332A)", pn: "W1332A", obs: "Cilindro de imagem fotocondutor" },
      // Outros Modelos HP
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
  },
  Samsung: {
    modelos: ["ProXpress M4020ND", "ProXpress M3320ND", "SCX-4623F"],
    pecas: [
      { nome: "Película de Fusão (Teflon)", pn: "JC66-02715A", obs: "Série SL-M (Toner D203)" },
      { nome: "Rolo Pressor", pn: "JC66-02714A", obs: "Série SL-M (Toner D203)" },
      { nome: "Bucha do Rolo Pressor (Par)", pn: "JC61-04098A", obs: "Buchas plásticas pretas das pontas" },
      { nome: "Engrenagem de Saída do Fusor", pn: "JC66-02722A", obs: "Engrenagem acoplada ao fusor" },
      { nome: "Rolo Pick-up Roller (Rolete de Tração)", pn: "JC93-00540A", obs: "Compatível com rolete da HP 408" },
      { nome: "Friction Pad / Separation Pad", pn: "JC93-00522A", obs: "Borracha separadora de folhas" },
      { nome: "Solenoide de Alimentação", pn: "JC47-00033B", obs: "Bobina acionadora do rolete" },
      { nome: "Placa Fonte de Alimentação (110v)", pn: "JC44-00097E", obs: "M4020 / M3320 fonte" },
      { nome: "Placa Lógica Principal", pn: "JC92-02434A", obs: "Placa lógica com saídas USB/Rede" },
      { nome: "Gaveta de Papel Completa", pn: "JC93-00548A", obs: "Bandeja cassete inferior" },
      { nome: "Painel Display LCD", pn: "JC92-02441A", obs: "Placa de botões e tela de agendamento" }
    ]
  }
};

export default function Estoque() {
  const [pecas, setPecas] = useState([]);
  
  // Estados para os Seletores Dinâmicos de Cadastro
  const [marcaSelecionada, setMarcaSelecionada] = useState('');
  const [modeloSelecionada, setModeloSelecionada] = useState('');
  const [pecaObjetoSelecionado, setPecaObjetoSelecionado] = useState(null);
  const [quantidade, setQuantidade] = useState('');

  // ESTADO DA BARRA DE PESQUISA DO ESTOQUE
  const [termoBusca, setTermoBusca] = useState('');

  // 1. Busca os dados em tempo real do Firebase (onSnapshot)
  useEffect(() => {
    const q = query(collection(db, "estoque_pecas"), orderBy("data_entrada", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPecas(data);
    });
    return () => unsubscribe();
  }, []);

  const handleMarcaChange = (e) => {
    setMarcaSelecionada(e.target.value);
    setModeloSelecionada('');
    setPecaObjetoSelecionado(null);
  };

  // 2. Grava a nova peça estruturada de forma limpa no banco
  const handleAdicionar = async (e) => {
    e.preventDefault();
    if (!marcaSelecionada || !modeloSelecionada || !pecaObjetoSelecionado || !quantidade) {
      return toast.error("Preencha todos os campos antes de salvar!");
    }

    const loading = toast.loading("Registrando no estoque...");
    
    // Adiciona o nome da peça + observação de compatibilidade técnica no mesmo texto
    const nomeCompletoPeca = `${pecaObjetoSelecionado.nome} - (Part Number: ${pecaObjetoSelecionado.pn}) [${pecaObjetoSelecionado.obs}]`;

    try {
      await addDoc(collection(db, "estoque_pecas"), {
        marca: marcaSelecionada,
        modelo: modeloSelecionada,
        nome: nomeCompletoPeca,
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

  // 3. FUNÇÃO PARA EXCLUIR CADASTRO INCORRETO DO FIREBASE
  const handleExcluir = async (id, nomeCompleto) => {
    const confirmar = window.confirm(`Deseja realmente remover esta entrada do estoque?\n\n"${nomeCompleto}"`);
    if (!confirmar) return;

    const loading = toast.loading("Removendo item do estoque...");
    try {
      await deleteDoc(doc(db, "estoque_pecas", id));
      toast.success("Item removido com sucesso!", { id: loading });
    } catch (error) {
      toast.error("Erro ao tentar excluir o item.", { id: loading });
    }
  };

  // 4. LOGICA DO FILTRO DA BARRA DE BUSCA (Procura por código, marca, modelo ou nome)
  const pecasFiltradas = pecas.filter(item => {
    const termo = termoBusca.toLowerCase();
    return (
      item.marca.toLowerCase().includes(termo) ||
      item.modelo.toLowerCase().includes(termo) ||
      item.nome.toLowerCase().includes(termo)
    );
  });

  return (
    <div className="p-8 space-y-8 bg-slate-50 min-h-screen">
      <header>
        <h1 className="text-2xl font-bold text-slate-800">Estoque de Peças</h1>
        <p className="text-slate-500 font-medium">Controle inteligente e padronizado de insumos de assistência.</p>
      </header>

      {/* Formulário Automatizado por Seleção */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 mb-2 text-blue-600">
          <PackagePlus size={24} />
          <h2 className="font-bold text-slate-800 text-lg">Nova Entrada Automatizada</h2>
        </div>

        <form onSubmit={handleAdicionar} className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
          
          {/* Seletor 1: Marca */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Marca</label>
            <select 
              value={marcaSelecionada} 
              onChange={handleMarcaChange}
              className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700"
            >
              <option value="">Selecione...</option>
              {Object.keys(CATALOGO_IMPRESSORAS).map(marca => (
                <option key={marca} value={marca}>{marca}</option>
              ))}
            </select>
          </div>

          {/* Seletor 2: Modelo */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Modelo</label>
            <select 
              value={modeloSelecionada} 
              onChange={(e) => setModeloSelecionada(e.target.value)}
              disabled={!marcaSelecionada}
              className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              <option value="">Selecione...</option>
              {marcaSelecionada && CATALOGO_IMPRESSORAS[marcaSelecionada].modelos.map(mod => (
                <option key={mod} value={mod}>{mod}</option>
              ))}
            </select>
          </div>

          {/* Seletor 3: Peças Internas / Componentes */}
          <div className="flex flex-col space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Componente Interno / Part Number</label>
            <select 
              value={pecaObjetoSelecionado ? JSON.stringify(pecaObjetoSelecionado) : ''} 
              onChange={(e) => setPecaObjetoSelecionado(e.target.value ? JSON.parse(e.target.value) : null)}
              disabled={!modeloSelecionada}
              className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-sm font-medium text-slate-700 disabled:opacity-50"
            >
              <option value="">Selecione a peça...</option>
              {marcaSelecionada && CATALOGO_IMPRESSORAS[marcaSelecionada].pecas.map((p, index) => (
                <option key={index} value={JSON.stringify(p)}>
                  {p.nome} (PN: {p.pn})
                </option>
              ))}
            </select>
          </div>

          {/* Quantidade e Gatilho de Envio */}
          <div className="grid grid-cols-3 gap-2 md:col-span-1">
            <div className="col-span-1 flex flex-col space-y-1.5">
              <label className="text-xs font-bold text-slate-500 uppercase text-center tracking-wide">Qtd</label>
              <input 
                type="number" 
                min="1"
                value={quantidade}
                onChange={(e) => setQuantidade(e.target.value)}
                placeholder="0"
                className="w-full p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-center font-bold text-slate-700"
              />
            </div>
            <button type="submit" className="col-span-2 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 transition-all uppercase text-xs tracking-wider h-[46px] shadow-md shadow-blue-200">
              Salvar
            </button>
          </div>

        </form>
      </section>

      {/* BARRA DE PESQUISA TÉCNICA (O seu localizador rápido) */}
      <div className="relative flex items-center bg-white border border-slate-200 rounded-2xl p-2 shadow-sm max-w-md">
        <Search size={20} className="text-slate-400 ml-2" />
        <input 
          type="text"
          placeholder="Buscar por Código (PN), Modelo ou Toner (ex: TN3472)..."
          value={termoBusca}
          onChange={(e) => setTermoBusca(e.target.value)}
          className="w-full p-2 pl-3 text-sm font-medium outline-none text-slate-700 bg-transparent"
        />
        {termoBusca && (
          <button onClick={() => setTermoBusca('')} className="text-xs text-slate-400 hover:text-slate-600 font-bold px-2">Limpar</button>
        )}
      </div>

      {/* Tabela de Visualização Atualizada com Opção de Excluir */}
      <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 bg-slate-50 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table size={16} className="text-slate-400" />
            <h3 className="font-bold text-slate-700 text-xs uppercase tracking-wider">Insumos em Estoque</h3>
          </div>
          <span className="text-xs bg-slate-200 text-slate-600 px-2.5 py-0.5 rounded-full font-bold">
            Mostrando {pecasFiltradas.length} itens
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-100/70 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b">
              <tr>
                <th className="p-4 pl-6">Data</th>
                <th className="p-4">Marca / Modelo</th>
                <th className="p-4">Especificação Técnica & Observação Comercial</th>
                <th className="p-4 text-center w-24">Qtd</th>
                <th className="p-4 text-center w-20">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium text-sm">
              {pecasFiltradas.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="p-4 pl-6 text-xs text-slate-400">
                    {item.data_entrada?.toDate().toLocaleDateString('pt-BR')}
                  </td>
                  <td className="p-4">
                    <p className="font-black text-slate-800 text-xs uppercase">{item.marca}</p>
                    <p className="text-[10px] text-slate-400 font-bold uppercase">{item.modelo}</p>
                  </td>
                  <td className="p-4 text-xs text-slate-600 uppercase font-semibold">
                    <div className="space-y-0.5">
                      <p>{item.nome}</p>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <span className="bg-blue-50 text-blue-700 font-black text-xs px-2.5 py-1 rounded-lg border border-blue-100">
                      {item.qtd?.toString().padStart(2, '0')}
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <button
                      type="button"
                      onClick={() => handleExcluir(item.id, item.nome)}
                      className="text-slate-400 hover:text-red-600 p-2 rounded-xl hover:bg-red-50 transition-colors"
                      title="Excluir lançamento"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
              {pecasFiltradas.length === 0 && (
                <tr>
                  <td colSpan="5" className="text-center py-10 text-slate-400 italic text-sm">Nenhuma peça corresponde à sua busca.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}