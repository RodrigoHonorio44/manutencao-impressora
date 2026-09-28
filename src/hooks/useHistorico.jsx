import { useState, useEffect } from 'react';
import { api } from '../services/api';
import toast from 'react-hot-toast';

export function useHistorico(itensPorPagina = 5) {
  const [busca, setBusca] = useState('');
  const [todosAtendimentos, setTodosAtendimentos] = useState([]);
  const [atendimentosFiltrados, setAtendimentosFiltrados] = useState([]);
  const [carregando, setCarregando] = useState(true);

  // Controle de Interface e Modais
  const [mostrarCalendario, setMostrarCalendario] = useState(false);
  const [cardAbertoId, setCardAbertoId] = useState(null);
  const [chamadoParaLaudo, setChamadoParaLaudo] = useState(null);
  const [chamadoParaLaudoConsolidado, setChamadoParaLaudoConsolidado] = useState(null);

  // Seleção Múltipla para Laudo Consolidado
  const [selecionadosIds, setSelecionadosIds] = useState([]);

  // Controle de Edição
  const [editandoId, setEditandoId] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [dadosEdicao, setDadosEdicao] = useState({
    status: '',
    defeito: '',
    relatorio_tecnico: '',
    contador_final: '',
    pecas_utilizadas: ''
  });

  // Paginação e Calendário
  const [paginaAtual, setPaginaAtual] = useState(1);
  const [dataAtual, setDataAtual] = useState(new Date());
  const [diaSelecionado, setDiaSelecionado] = useState(null);

  useEffect(() => {
    carregarTodosAtendimentos();
  }, []);

  // Extrai data suportando MongoDB {$date: "..."}, Firestore e Strings
  const extrairData = (dataFirestore) => {
    if (!dataFirestore) return null;
    if (typeof dataFirestore === 'object' && dataFirestore.$date) {
      return new Date(dataFirestore.$date);
    }
    if (dataFirestore.toDate) return dataFirestore.toDate();
    if (dataFirestore.seconds) return new Date(dataFirestore.seconds * 1000);
    const d = new Date(dataFirestore);
    return isNaN(d.getTime()) ? null : d;
  };

  const mesmoDia = (d1, d2) => {
    if (!d1 || !d2) return false;
    return d1.getFullYear() === d2.getFullYear() &&
           d1.getMonth() === d2.getMonth() &&
           d1.getDate() === d2.getDate();
  };

  const ehMesAtual = (dataVal) => {
    const dataObj = extrairData(dataVal);
    if (!dataObj) return false;
    const hoje = new Date();
    return (
      dataObj.getMonth() === hoje.getMonth() &&
      dataObj.getFullYear() === hoje.getFullYear()
    );
  };

  const aplicarFiltroPadraoOuMes = (lista) => {
    return lista.filter(os => ehMesAtual(os.data_entrada));
  };

  const carregarTodosAtendimentos = async () => {
    setCarregando(true);
    try {
      const listaBruta = await api.getAtendimentos();
      
      // 1. Normaliza os dados e extrai o contador do texto caso venha vazio nas OS antigas
      const listaNormalizada = listaBruta.map(os => {
        let contadorFinal = os.contador_final || os.contador_atual || os.contador;
        if ((!contadorFinal || contadorFinal === 0) && os.relatorio_tecnico) {
          const match = os.relatorio_tecnico.match(/contador[:\s]*([\d\.]+)/i);
          if (match) {
            contadorFinal = Number(match[1].replace(/\./g, ''));
          }
        }

        const dataObj = extrairData(os.data_finalizacao) || extrairData(os.data_entrada) || new Date(0);

        return {
          ...os,
          contador_final: Number(contadorFinal) || 0,
          dataObj
        };
      });

      // 2. Ordena cronologicamente do mais ANTIGO para o mais RECENTE para rastrear a sequência do serial
      const listaCronologica = [...listaNormalizada].sort((a, b) => a.dataObj - b.dataObj);

      const historicoPorSerial = {}; // Guarda { ultimoContador, ultimaData }

      const listaComCalculo = listaCronologica.map(os => {
        const serial = os.serial ? String(os.serial).trim().toLowerCase() : 'desconhecido';
        const contadorAtual = os.contador_final;
        const dataAtualOS = os.dataObj;
        
        let contadorAnterior = os.ultimo_contador_anterior;
        let dataContadorAnterior = os.data_contador_anterior;
        let rodadasPeriodo = os.paginas_rodadas;
        let diasDecorridos = null;

        if (historicoPorSerial[serial]) {
          const registroAnterior = historicoPorSerial[serial];
          
          if (contadorAnterior === undefined || contadorAnterior === null) {
            contadorAnterior = registroAnterior.ultimoContador;
          }

          dataContadorAnterior = registroAnterior.ultimaData;
          rodadasPeriodo = contadorAtual >= contadorAnterior ? contadorAtual - contadorAnterior : 0;
          
          if (dataContadorAnterior && dataAtualOS) {
            const diffMs = Math.abs(dataAtualOS.getTime() - dataContadorAnterior.getTime());
            diasDecorridos = Math.round(diffMs / (1000 * 60 * 60 * 24));
          }
        } else {
          if (contadorAnterior === undefined || contadorAnterior === null) {
            contadorAnterior = null;
          }
        }

        if (contadorAtual > 0) {
          historicoPorSerial[serial] = {
            ultimoContador: contadorAtual,
            ultimaData: dataAtualOS
          };
        }

        return {
          ...os,
          contador_final: contadorAtual,
          ultimo_contador_anterior: contadorAnterior,
          data_contador_anterior: dataContadorAnterior,
          paginas_rodadas: rodadasPeriodo,
          dias_decorridos: diasDecorridos
        };
      });

      // 3. Reverte para o padrão de exibição (do mais RECENTE para o mais ANTIGO)
      const listaOrdenada = listaComCalculo.sort((a, b) => b.dataObj - a.dataObj);

      setTodosAtendimentos(listaOrdenada);
      setAtendimentosFiltrados(aplicarFiltroPadraoOuMes(listaOrdenada));
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar o histórico de manutenções.");
    } finally {
      setCarregando(false);
    }
  };

  const toggleSelecionar = (id) => {
    setSelecionadosIds(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const toggleSelecionarTodos = () => {
    if (selecionadosIds.length === atendimentosFiltrados.length && atendimentosFiltrados.length > 0) {
      setSelecionadosIds([]);
    } else {
      setSelecionadosIds(atendimentosFiltrados.map(os => os.id || os._id));
    }
  };

  const obterItensSelecionados = () => {
    return todosAtendimentos
      .filter(os => selecionadosIds.includes(os.id || os._id))
      .sort((a, b) => {
        const dtA = extrairData(a.data_entrada) || 0;
        const dtB = extrairData(b.data_entrada) || 0;
        return dtA - dtB;
      });
  };

  const handleBusca = (e) => {
    if (e) e.preventDefault();
    const termo = busca.trim().toLowerCase();
    setDiaSelecionado(null);
    setPaginaAtual(1);
    setSelecionadosIds([]);

    if (!termo) {
      setAtendimentosFiltrados(aplicarFiltroPadraoOuMes(todosAtendimentos));
      return;
    }

    const resultado = todosAtendimentos.filter(os => {
      const serialMatch = os.serial ? String(os.serial).toLowerCase().includes(termo) : false;
      const modeloMatch = os.modelo ? String(os.modelo).toLowerCase().includes(termo) : false;
      const osMatch = os.os ? String(os.os).toLowerCase().includes(termo) : false;
      const clienteMatch = os.cliente ? String(os.cliente).toLowerCase().includes(termo) : false;
      return serialMatch || modeloMatch || osMatch || clienteMatch;
    });

    setAtendimentosFiltrados(resultado);
    if (resultado.length === 0) toast.error("Nenhum registro encontrado.");
  };

  const handleLimparBusca = () => {
    setBusca('');
    setDiaSelecionado(null);
    setPaginaAtual(1);
    setSelecionadosIds([]);
    setAtendimentosFiltrados(aplicarFiltroPadraoOuMes(todosAtendimentos));
  };

  const selecionarDataNoCalendario = (data) => {
    setPaginaAtual(1);
    setSelecionadosIds([]);
    if (diaSelecionado && mesmoDia(diaSelecionado, data)) {
      setDiaSelecionado(null);
      setAtendimentosFiltrados(aplicarFiltroPadraoOuMes(todosAtendimentos));
      return;
    }

    setDiaSelecionado(data);
    setBusca('');

    const filtrados = todosAtendimentos.filter(os => {
      const dtEntrada = extrairData(os.data_entrada);
      return mesmoDia(dtEntrada, data);
    });

    setAtendimentosFiltrados(filtrados);
    setMostrarCalendario(false);
  };

  const toggleCard = (id) => {
    if (editandoId && editandoId !== id) {
      setEditandoId(null);
    }
    setCardAbertoId(cardAbertoId === id ? null : id);
  };

  const iniciarEdicao = (os, e) => {
    e.stopPropagation();
    const targetId = os.id || os._id;
    setEditandoId(targetId);
    setCardAbertoId(targetId);
    
    let pecasStr = '';
    if (Array.isArray(os.pecas_utilizadas)) {
      pecasStr = os.pecas_utilizadas.join(', ');
    } else if (typeof os.pecas_utilizadas === 'string') {
      pecasStr = os.pecas_utilizadas;
    }

    setDadosEdicao({
      status: os.status || 'Em Aberto',
      defeito: os.defeito ? String(os.defeito).toLowerCase() : '',
      relatorio_tecnico: os.relatorio_tecnico ? String(os.relatorio_tecnico).toLowerCase() : '',
      contador_final: os.contador_final !== undefined && os.contador_final !== null ? os.contador_final : '',
      pecas_utilizadas: pecasStr.toLowerCase()
    });
  };

  const handleMudancaCampoEdicao = (campo, valor) => {
    setDadosEdicao(prev => ({
      ...prev,
      [campo]: valor
    }));
  };

  const handleSalvarEdicao = async (id, e) => {
    if (e) e.stopPropagation();
    setSalvando(true);

    try {
      const pecasArray = typeof dadosEdicao.pecas_utilizadas === 'string'
        ? dadosEdicao.pecas_utilizadas.split(',').map(p => p.trim().toLowerCase()).filter(Boolean)
        : [];

      const payloadAtualizacao = {
        status: dadosEdicao.status,
        defeito: String(dadosEdicao.defeito || '').toLowerCase(),
        relatorio_tecnico: String(dadosEdicao.relatorio_tecnico || '').toLowerCase(),
        contador_final: Number(dadosEdicao.contador_final) || 0,
        pecas_utilizadas: pecasArray,
        ultima_atualizacao: new Date().toISOString()
      };

      if (dadosEdicao.status === 'Finalizado') {
        payloadAtualizacao.data_finalizacao = new Date().toISOString();
      }

      await api.atualizarAtendimento(id, payloadAtualizacao);

      await carregarTodosAtendimentos();

      toast.success("Card atualizado com sucesso!");
      setEditandoId(null);
    } catch (error) {
      console.error("Erro ao atualizar card:", error);
      toast.error("Erro ao salvar as alterações do card.");
    } finally {
      setSalvando(false);
    }
  };

  const diasDoMes = () => {
    const ano = dataAtual.getFullYear();
    const mes = dataAtual.getMonth();
    const primeiroDiaIndex = new Date(ano, mes, 1).getDay();
    const totalDiasMes = new Date(ano, mes + 1, 0).getDate();

    const dias = [];
    for (let i = 0; i < primeiroDiaIndex; i++) dias.push(null);
    for (let dia = 1; dia <= totalDiasMes; dia++) dias.push(new Date(ano, mes, dia));
    return dias;
  };

  const mesAnterior = () => setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() - 1, 1));
  const proximoMes = () => setDataAtual(new Date(dataAtual.getFullYear(), dataAtual.getMonth() + 1, 1));

  const totalPaginas = Math.ceil(atendimentosFiltrados.length / itensPorPagina);
  const inicioIndice = (paginaAtual - 1) * itensPorPagina;
  const atendimentosPaginados = atendimentosFiltrados.slice(inicioIndice, inicioIndice + itensPorPagina);

  return {
    busca,
    setBusca,
    carregando,
    todosAtendimentos,
    atendimentosFiltrados: atendimentosPaginados,
    totalAtendimentosFiltrados: atendimentosFiltrados.length,
    mostrarCalendario,
    setMostrarCalendario,
    cardAbertoId,
    chamadoParaLaudo,
    setChamadoParaLaudo,
    chamadoParaLaudoConsolidado,
    setChamadoParaLaudoConsolidado,
    selecionadosIds,
    setSelecionadosIds,
    toggleSelecionar,
    toggleSelecionarTodos,
    obterItensSelecionados,
    editandoId,
    setEditandoId,
    salvando,
    dadosEdicao,
    setDadosEdicao,
    handleMudancaCampoEdicao,
    paginaAtual,
    setPaginaAtual,
    totalPaginas,
    dataAtual,
    diaSelecionado,
    setDiaSelecionado,
    handleBusca,
    handleLimparBusca,
    selecionarDataNoCalendario,
    toggleCard,
    iniciarEdicao,
    handleSalvarEdicao,
    mesAnterior,
    proximoMes,
    diasDoMes,
    mesmoDia,
    extrairData
  };
}