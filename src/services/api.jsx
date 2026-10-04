// src/services/api.js

const API_URL = import.meta.env.VITE_API_URL || 'https://api-impressora.rodhonsystem.com.br/api';

const getHeaders = () => {
  const token = localStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
  };
};

export const api = {
  // --- AUTENTICAÇÃO ---
  login: async (usuario, senha) => {
    const response = await fetch(`${API_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ usuario: usuario.toLowerCase(), senha })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Falha na autenticação');
    return data;
  },

  // --- ATENDIMENTOS ---
  getAtendimentos: async () => {
    const response = await fetch(`${API_URL}/atendimentos`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao buscar atendimentos');
    const data = await response.json();
    return Array.isArray(data) ? data : (data.data || []);
  },

  atualizarAtendimento: async (id, payload) => {
    const payloadFormatado = {
      ...payload,
      ...(payload.defeito && { defeito: payload.defeito.toLowerCase() }),
      ...(payload.relatorio_tecnico && { relatorio_tecnico: payload.relatorio_tecnico.toLowerCase() }),
      ...(payload.pecas_utilizadas && Array.isArray(payload.pecas_utilizadas) && {
        pecas_utilizadas: payload.pecas_utilizadas.map(p => typeof p === 'string' ? p.toLowerCase() : p)
      })
    };

    const response = await fetch(`${API_URL}/atendimentos/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payloadFormatado)
    });
    
    if (!response.ok) throw new Error('Erro ao atualizar atendimento');
    return await response.json();
  },

  // --- ESTOQUE DE PEÇAS ---
  getEstoque: async () => {
    const response = await fetch(`${API_URL}/estoque_pecas`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao buscar estoque');
    const data = await response.json();
    return Array.isArray(data) ? data : (data.data || []);
  },

  criarEstoque: async (payload) => {
    const response = await fetch(`${API_URL}/estoque_pecas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Erro ao registrar peça');
    return await response.json();
  },

  atualizarEstoque: async (id, payload) => {
    const response = await fetch(`${API_URL}/estoque_pecas/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Erro ao atualizar peça');
    return await response.json();
  },

  excluirEstoque: async (id) => {
    const response = await fetch(`${API_URL}/estoque_pecas/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao excluir peça');
    return await response.json();
  },

  // --- MÉTODOS DE FINANÇAS E DASHBOARD ---
  getFinancas: async () => {
    const response = await fetch(`${API_URL}/financas`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao buscar dados financeiros');
    const data = await response.json();
    return Array.isArray(data) ? data : (data.data || []);
  },

  // --- MÉTODOS DE DESPESAS ---
  getDespesas: async () => {
    const response = await fetch(`${API_URL}/despesas_empresa`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao buscar despesas');
    const data = await response.json();
    return Array.isArray(data) ? data : (data.data || []);
  },

  criarDespesa: async (payload) => {
    const response = await fetch(`${API_URL}/despesas_empresa`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        ...payload,
        ...(payload.descricao && { descricao: payload.descricao.toLowerCase() })
      })
    });
    if (!response.ok) throw new Error('Erro ao registrar despesa');
    return await response.json();
  },

  excluirDespesa: async (id) => {
    const response = await fetch(`${API_URL}/despesas_empresa/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao excluir despesa');
    return await response.json();
  },

  // --- MÉTODOS DE NOTAS DE SERVIÇO ---
  getHistoricoNotas: async (status = 'gerado', page = 1, limit = 10) => {
    const response = await fetch(`${API_URL}/historico_notas?status=${status}&page=${page}&limit=${limit}`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao buscar histórico de notas');
    return await response.json();
  },

  criarNotaServico: async (payload) => {
    const response = await fetch(`${API_URL}/historico_notas`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Erro ao criar nota de serviço');
    return await response.json();
  },

  faturarNota: async (id) => {
    // Utiliza PUT atualizando o status para 'faturado' para evitar erro 404 em rotas específicas do servidor
    const response = await fetch(`${API_URL}/historico_notas/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify({ status: 'faturado' })
    });
    if (!response.ok) throw new Error('Erro ao faturar a nota');
    return await response.json();
  },

  // --- CONTROLE MEI (NOTAS FISCAIS E AJUSTES) ---
  getNotasFiscais: async () => {
    const response = await fetch(`${API_URL}/notafiscalmei`, {
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao buscar dados do MEI');
    const data = await response.json();
    return Array.isArray(data) ? data : (data.data || []);
  },

  criarNotaFiscal: async (payload) => {
    const response = await fetch(`${API_URL}/notafiscalmei`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Erro ao registrar nota');
    return await response.json();
  },

  atualizarNotaFiscal: async (id, payload) => {
    const response = await fetch(`${API_URL}/notafiscalmei/${id}`, {
      method: 'PUT',
      headers: getHeaders(),
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error('Erro ao atualizar registro');
    return await response.json();
  },

  excluirNotaFiscal: async (id) => {
    const response = await fetch(`${API_URL}/notafiscalmei/${id}`, {
      method: 'DELETE',
      headers: getHeaders()
    });
    if (!response.ok) throw new Error('Erro ao excluir registro');
    return await response.json();
  }
};