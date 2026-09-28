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

  const aplicarFiltroPadraoOuMes = (lista) => {
    return lista.filter(os => ehMesAtual(os.data_entrada));
  };

  const carregarTodosAtendimentos = async () => {
    setCarregando(true);
    try {
      const listaBruta = await api.getAtendimentos();
      
      // 1. Normaliza os dados e extrai o contador do texto caso venha vazio nas OS antigas
      const listaNormalizada = listaBruta.map(os => {
        let contadorFinal = os.contador_final;
        if ((!contadorFinal || contadorFinal === 0) && os.relatorio_tecnico) {
          const match = os.relatorio_tecnico.match(/contador[:\s]*([\d\.]+)/i);
          if (match) {
            contadorFinal = Number(match[1].replace(/\./g, ''));
          }
        }
        return {
          ...os,
          contador_final: Number(contadorFinal) || 0,
          dataObj: extrairData(os.data_entrada) || new Date(0)
        };
      });

      // 2. Ordena cronologicamente do mais ANTIGO para o mais RECENTE para rastrear a sequência do serial
      const listaCronologica = [...listaNormalizada].sort((a, b) => a.dataObj - b.dataObj);

      const ultimosContadoresPorSerial = {};
      const listaComCalculo = listaCronologica.map(os => {
        const serial = os.serial ? String(os.serial).trim().toLowerCase() : 'desconhecido';
        const contadorAtual = os.contador_final;
        
        let contadorAnterior = os.ultimo_contador_anterior;
        let rodadasPeriodo = os.paginas_rodadas;

        // Se a OS não tiver o cálculo salvo, calcula dinamicamente com base na anterior do mesmo serial
        if (contadorAnterior === undefined || contadorAnterior === null) {
          if (ultimosContadoresPorSerial[serial] !== undefined) {
            contadorAnterior = ultimosContadoresPorSerial[serial];
            rodadasPeriodo = contadorAtual >= contadorAnterior ? contadorAtual - contadorAnterior : 0;
          } else {
            contadorAnterior = 'Primeiro Registro';
            rodadasPeriodo = 0;
          }
        }

        if (contadorAtual > 0) {
          ultimosContadoresPorSerial[serial] = contadorAtual;
        }

        return {
          ...os,
          contador_final: contadorAtual,
          ultimo_contador_anterior: contadorAnterior,
          paginas_rodadas: rodadasPeriodo
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
      defeito: os.defeito || '',
      relatorio_tecnico: os.relatorio_tecnico || '',
      contador_final: os.contador_final !== undefined && os.contador_final !== null ? os.contador_final : '',
      pecas_utilizadas: pecasStr
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
        ? dadosEdicao.pecas_utilizadas.split(',').map(p => p.trim()).filter(Boolean)
        : [];

      const payloadAtualizacao = {
        status: dadosEdicao.status,
        defeito: dadosEdicao.defeito,
        relatorio_tecnico: dadosEdicao.relatorio_tecnico,
        contador_final: Number(dadosEdicao.contador_final) || 0,
        pecas_utilizadas: pecasArray,
        ultima_atualizacao: new Date().toISOString()
      };

      if (dadosEdicao.status === 'Finalizado') {
        payloadAtualizacao.data_finalizacao = new Date().toISOString();
      }

      await api.atualizarAtendimento(id, payloadAtualizacao);

      // Recarrega todos os atendimentos para recalcular automaticamente as páginas rodadas de todo o histórico da máquina
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