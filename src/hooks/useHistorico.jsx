import { useState, useEffect } from 'react';
import { db } from '../firebase/config';
import { collection, getDocs, query, orderBy, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
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

  const extrairData = (dataFirestore) => {
    if (!dataFirestore) return null;
    if (dataFirestore.toDate) return dataFirestore.toDate();
    if (dataFirestore.seconds) return new Date(dataFirestore.seconds * 1000);
    return new Date(dataFirestore);
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

  // Aplica a regra de exibição inicial (mês vigente) ou respeita seleção de data/busca
  const aplicarFiltroPadraoOuMes = (lista) => {
    return lista.filter(os => ehMesAtual(os.data_entrada));
  };

  const carregarTodosAtendimentos = async () => {
    setCarregando(true);
    try {
      const atendimentosRef = collection(db, "atendimentos");
      const q = query(atendimentosRef, orderBy("data_entrada", "desc"));
      const snapshot = await getDocs(q);
      const lista = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      setTodosAtendimentos(lista);
      // Ao carregar inicialmente, exibe apenas os atendimentos do mês vigente
      setAtendimentosFiltrados(aplicarFiltroPadraoOuMes(lista));
    } catch (error) {
      console.error("Erro ao carregar histórico:", error);
      toast.error("Erro ao carregar o histórico de manutenções.");
    } finally {
      setCarregando(false);
    }
  };

  // Funções de Seleção Múltipla
  const toggleSelecionar = (id) => {
    setSelecionadosIds(prev => 
      prev.includes(id) ? prev.filter(itemId => itemId !== id) : [...prev, id]
    );
  };

  const toggleSelecionarTodos = () => {
    if (selecionadosIds.length === atendimentosFiltrados.length && atendimentosFiltrados.length > 0) {
      setSelecionadosIds([]);
    } else {
      setSelecionadosIds(atendimentosFiltrados.map(os => os.id));
    }
  };

  const obterItensSelecionados = () => {
    return todosAtendimentos
      .filter(os => selecionadosIds.includes(os.id))
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
      // Se a busca for limpa, volta para o padrão do mês vigente
      setAtendimentosFiltrados(aplicarFiltroPadraoOuMes(todosAtendimentos));
      return;
    }

    // Se houver busca textual (S/N, Modelo, OS ou Cliente), pesquisa no histórico completo
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
    // Reseta para o mês vigente
    setAtendimentosFiltrados(aplicarFiltroPadraoOuMes(todosAtendimentos));
  };

  const selecionarDataNoCalendario = (data) => {
    setPaginaAtual(1);
    setSelecionadosIds([]);
    if (diaSelecionado && mesmoDia(diaSelecionado, data)) {
      setDiaSelecionado(null);
      // Ao desmarcar o dia do calendário, retorna ao mês vigente
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
    setEditandoId(os.id);
    setCardAbertoId(os.id);
    setDadosEdicao({
      status: os.status || 'Em Aberto',
      defeito: os.defeito || '',
      relatorio_tecnico: os.relatorio_tecnico || '',
      contador_final: os.contador_final || '',
      pecas_utilizadas: Array.isArray(os.pecas_utilizadas) ? os.pecas_utilizadas.join(', ') : ''
    });
  };

  const handleSalvarEdicao = async (id, e) => {
    e.stopPropagation();
    setSalvando(true);

    try {
      const docRef = doc(db, "atendimentos", id);
      const pecasArray = dadosEdicao.pecas_utilizadas
        ? dadosEdicao.pecas_utilizadas.split(',').map(p => p.trim()).filter(Boolean)
        : [];

      const payloadAtualizacao = {
        status: dadosEdicao.status,
        defeito: dadosEdicao.defeito,
        relatorio_tecnico: dadosEdicao.relatorio_tecnico,
        contador_final: Number(dadosEdicao.contador_final) || 0,
        pecas_utilizadas: pecasArray,
        ultima_atualizacao: serverTimestamp()
      };

      if (dadosEdicao.status === 'Finalizado') {
        payloadAtualizacao.data_finalizacao = serverTimestamp();
      }

      await updateDoc(docRef, payloadAtualizacao);

      const listaAtualizada = todosAtendimentos.map(item => {
        if (item.id === id) {
          return {
            ...item,
            ...payloadAtualizacao,
            data_finalizacao: dadosEdicao.status === 'Finalizado' ? (item.data_finalizacao || new Date()) : item.data_finalizacao
          };
        }
        return item;
      });

      setTodosAtendimentos(listaAtualizada);
      
      if (busca) {
        const termo = busca.trim().toLowerCase();
        setAtendimentosFiltrados(listaAtualizada.filter(os => {
          return (os.serial && String(os.serial).toLowerCase().includes(termo)) ||
                 (os.modelo && String(os.modelo).toLowerCase().includes(termo)) ||
                 (os.os && String(os.os).toLowerCase().includes(termo)) ||
                 (os.cliente && String(os.cliente).toLowerCase().includes(termo));
        }));
      } else if (diaSelecionado) {
        setAtendimentosFiltrados(listaAtualizada.filter(os => mesmoDia(extrairData(os.data_entrada), diaSelecionado)));
      } else {
        setAtendimentosFiltrados(aplicarFiltroPadraoOuMes(listaAtualizada));
      }

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

  // Cálculo da Paginação
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