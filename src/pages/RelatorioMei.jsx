import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import { api } from '../services/api';
import { Printer, FileText, PlusCircle, ShieldCheck, AlertCircle, ChevronDown, ChevronUp, Edit3, Trash2, DollarSign } from 'lucide-react';

export default function RelatorioMei() {
  const [notas, setNotas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState(null);
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  
  // Ano selecionado para a declaração DASN-SIMEI
  const [anoDeclaracao, setAnoDeclaracao] = useState('2026');
  
  const [formData, setFormData] = useState({
    numero: '',
    competencia: '2026-08',
    tomador_nome: '',
    tomador_cnpj: '',
    valor: '',
    chave_acesso: '',
    descricao_servico: '',
  });

  const [valorDisplay, setValorDisplay] = useState('');

  useEffect(() => {
    carregarNotas();
  }, []);

  const carregarNotas = async () => {
    try {
      const dados = await api.getNotasFiscais();
      setNotas(dados);
    } catch (error) {
      toast.error('Erro ao carregar histórico de notas.');
    } finally {
      setLoading(false);
    }
  };

  const handleValorChange = (e) => {
    let value = e.target.value;
    let apenasDigitos = value.replace(/\D/g, '');
    
    if (!apenasDigitos) {
      setValorDisplay('');
      setFormData({ ...formData, valor: '' });
      return;
    }

    let numeroDecimal = Number(apenasDigitos) / 100;
    setFormData({ ...formData, valor: numeroDecimal });

    let formatado = numeroDecimal.toLocaleString('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    });

    setValorDisplay(formatado);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const loadingToast = toast.loading(editingId ? 'Atualizando lançamento...' : 'Salvando lançamento contábil...');

    try {
      if (editingId) {
        await api.atualizarNotaFiscal(editingId, formData);
        toast.success('Registro atualizado com sucesso!', { id: loadingToast });
        setEditingId(null);
      } else {
        await api.criarNotaFiscal(formData);
        toast.success('Receita registrada com sucesso!', { id: loadingToast });
      }

      setFormData({
        numero: '',
        competencia: '2026-08',
        tomador_nome: '',
        tomador_cnpj: '',
        valor: '',
        chave_acesso: '',
        descricao_servico: '',
      });
      setValorDisplay('');
      setMostrarFormulario(false);
      carregarNotas();
    } catch (error) {
      toast.error('Erro ao salvar alteração.', { id: loadingToast });
    }
  };

  const iniciarEdicao = (nota) => {
    setEditingId(nota._id);
    setFormData({
      numero: nota.numero || '',
      competencia: nota.competencia || '',
      tomador_nome: nota.tomador_nome || '',
      tomador_cnpj: nota.tomador_cnpj || '',
      valor: nota.valor || '',
      chave_acesso: nota.chave_acesso || '',
      descricao_servico: nota.descricao_servico || '',
    });

    if (nota.valor !== undefined && nota.valor !== null) {
      const formatado = Number(nota.valor).toLocaleString('pt-BR', {
        style: 'currency',
        currency: 'BRL',
      });
      setValorDisplay(formatado);
    } else {
      setValorDisplay('');
    }
    setMostrarFormulario(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const cancelarEdicao = () => {
    setEditingId(null);
    setFormData({
      numero: '',
      competencia: '2026-08',
      tomador_nome: '',
      tomador_cnpj: '',
      valor: '',
      chave_acesso: '',
      descricao_servico: '',
    });
    setValorDisplay('');
    setMostrarFormulario(false);
  };

  const excluirNota = async (id) => {
    if (!confirm('Deseja realmente excluir este registro fiscal?')) return;
    try {
      await api.excluirNotaFiscal(id);
      toast.success('Registro excluído.');
      carregarNotas();
    } catch (error) {
      toast.error('Erro ao excluir registro.');
    }
  };

  const preencherDadosExemploNota = () => {
    const valorNum = 1470.00;
    setFormData({
      numero: '1',
      competencia: '2026-08',
      tomador_nome: 'MALTA SOLUCOES COMERCIO E SERVICOS LTDA',
      tomador_cnpj: '28.573.471/0001-08',
      valor: valorNum,
      chave_acesso: '33027002268321792000130000000000000126088996215012',
      descricao_servico: 'Prestação de serviços de manutenção preventiva e corretiva em impressoras e multifuncionais para a empresa Malta Soluções, incluindo diagnóstico técnico, limpeza, regulagem, troca de suprimentos/peças e testes operacionais.',
    });
    setValorDisplay(valorNum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
    setMostrarFormulario(true);
    toast.success('Dados da NFS-e carregados no formulário!');
  };

  const notasDoAno = notas.filter(nota => {
    if (!nota.competencia) return false;
    return nota.competencia.includes(anoDeclaracao);
  });

  const mesesDoAno = [
    { mes: '01', nome: 'Janeiro' },
    { mes: '02', nome: 'Fevereiro' },
    { mes: '03', nome: 'Março' },
    { mes: '04', nome: 'Abril' },
    { mes: '05', nome: 'Maio' },
    { mes: '06', nome: 'Junho' },
    { mes: '07', nome: 'Julho' },
    { mes: '08', nome: 'Agosto' },
    { mes: '09', nome: 'Setembro' },
    { mes: '10', nome: 'Outubro' },
    { mes: '11', nome: 'Novembro' },
    { mes: '12', nome: 'Dezembro' },
  ];

  const faturamentoPorMes = mesesDoAno.map((m) => {
    const notasDoMes = notasDoAno.filter(n => {
      if (!n.competencia) return false;
      const compLimpa = n.competencia.trim().replace(/\//g, '-');
      
      const formatoAnoMes = `${anoDeclaracao}-${m.mes}`;
      const formatoMesAno = `${m.mes}-${anoDeclaracao}`;
      
      return compLimpa === formatoAnoMes || 
             compLimpa === formatoMesAno || 
             compLimpa.endsWith(`-${m.mes}`) ||
             compLimpa === m.mes;
    });
    
    const totalMes = notasDoMes.reduce((acc, n) => acc + (Number(n.valor) || 0), 0);
    return {
      ...m,
      total: totalMes,
      quantidade: notasDoMes.length
    };
  });

  const faturamentoTotalAno = notasDoAno.reduce((acc, nota) => acc + (Number(nota.valor) || 0), 0);

  const handleImprimirDeclaracao = () => {
    window.print();
  };

  return (
    <div className="p-4 md:p-8 max-w-6xl mx-auto space-y-6">
      
      {/* BARRA DE TOPO UNIFICADA (Ações Principais) */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-4 print:hidden">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2.5 bg-blue-50 text-blue-600 rounded-xl">
              <FileText size={22} />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900">Relatório Contábil MEI</h1>
              <p className="text-xs text-slate-500 font-medium">Apuração Oficial para DASN-SIMEI • CNPJ: 68.321.792/0001-30</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button 
            type="button"
            onClick={preencherDadosExemploNota}
            className="flex items-center gap-2 px-4 py-2.5 bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold rounded-xl hover:bg-emerald-100 transition-all text-xs"
          >
            <PlusCircle size={16} />
            Carregar NFS-e Copiada
          </button>

          <button 
            type="button"
            onClick={() => { setMostrarFormulario(!mostrarFormulario); setEditingId(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white font-bold rounded-xl hover:bg-blue-700 shadow-sm transition-all text-xs"
          >
            {mostrarFormulario ? <ChevronUp size={16} /> : <PlusCircle size={16} />}
            {mostrarFormulario ? 'Ocultar Formulário' : 'Novo Lançamento Manual'}
          </button>

          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-right flex items-center gap-3">
            <div>
              <span className="block text-[10px] font-bold text-slate-400 uppercase">Faturamento {anoDeclaracao}</span>
              <span className="text-base font-black text-slate-900">
                {faturamentoTotalAno.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* FORMULÁRIO COLAPSÍVEL */}
      {mostrarFormulario && (
        <form onSubmit={handleSubmit} className="bg-slate-50 p-6 rounded-2xl shadow-inner border border-slate-300 grid grid-cols-1 md:grid-cols-4 gap-4 print:hidden animate-fadeIn">
          <div className="md:col-span-4 flex justify-between items-center border-b border-slate-200 pb-3 mb-1">
            <h3 className="font-bold text-slate-800 text-sm flex items-center gap-2">
              <DollarSign size={16} className="text-blue-600" />
              {editingId ? 'Editando Lançamento Fiscal' : 'Cadastrar Nova Receita Bruta'}
            </h3>
            <button type="button" onClick={cancelarEdicao} className="text-xs font-bold text-slate-500 hover:text-slate-700">Fechar</button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Nº da Nota Fiscal</label>
            <input 
              type="text" 
              required 
              placeholder="Ex: 1"
              value={formData.numero}
              onChange={(e) => setFormData({ ...formData, numero: e.target.value })}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Competência (AAAA-MM)</label>
            <input 
              type="text" 
              required 
              placeholder="Ex: 2026-08"
              value={formData.competencia}
              onChange={(e) => setFormData({ ...formData, competencia: e.target.value })}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Valor Bruto (R$)</label>
            <input 
              type="text" 
              required 
              placeholder="R$ 0,00"
              value={valorDisplay}
              onChange={handleValorChange}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-bold text-blue-600 text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">CNPJ do Tomador</label>
            <input 
              type="text" 
              placeholder="00.000.000/0000-00"
              value={formData.tomador_cnpj}
              onChange={(e) => setFormData({ ...formData, tomador_cnpj: e.target.value })}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Razão Social / Nome do Tomador</label>
            <input 
              type="text" 
              required 
              placeholder="Nome empresarial do cliente"
              value={formData.tomador_nome}
              onChange={(e) => setFormData({ ...formData, tomador_nome: e.target.value })}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Chave de Acesso (44 dígitos)</label>
            <input 
              type="text" 
              placeholder="Chave de acesso da NFS-e"
              value={formData.chave_acesso}
              onChange={(e) => setFormData({ ...formData, chave_acesso: e.target.value })}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 font-mono text-xs"
            />
          </div>

          <div className="md:col-span-4">
            <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Descrição do Serviço Prestado</label>
            <textarea 
              rows="2"
              placeholder="Detalhes técnicos da execução do serviço..."
              value={formData.descricao_servico}
              onChange={(e) => setFormData({ ...formData, descricao_servico: e.target.value })}
              className="w-full p-2.5 bg-white border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-blue-500 text-slate-800 text-sm"
            />
          </div>

          <div className="md:col-span-4 flex justify-end gap-2 pt-2">
            <button type="button" onClick={cancelarEdicao} className="px-5 py-2.5 bg-slate-200 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-300 transition-all">
              Cancelar
            </button>
            <button type="submit" className="px-6 py-2.5 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 shadow-sm transition-all">
              {editingId ? 'Salvar Alterações' : 'Salvar no Relatório'}
            </button>
          </div>
        </form>
      )}

      {/* RELATÓRIO OFICIAL (Padrão Contábil / RFB) */}
      <div className="bg-white p-6 md:p-8 rounded-2xl border border-slate-200 shadow-sm space-y-6 print:border-none print:shadow-none print:p-0">
        
        {/* Cabeçalho do Documento */}
        <div className="border-b-2 border-slate-800 pb-5 space-y-3">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg md:text-xl font-black text-slate-900 uppercase tracking-tight">RELATÓRIO MENSAL DAS RECEITAS BRUTAS</h2>
                <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <ShieldCheck size={12} /> Padrão RFB
                </span>
              </div>
              <p className="text-[11px] font-bold text-slate-500 mt-0.5">RESOLUÇÃO CGSN Nº 140, DE 27 DE JANEIRO DE 2018 (ANEXO X)</p>
            </div>

            <div className="flex items-center gap-3 print:hidden w-full md:w-auto justify-end">
              <select 
                value={anoDeclaracao} 
                onChange={(e) => setAnoDeclaracao(e.target.value)}
                className="p-2 bg-slate-50 border border-slate-200 rounded-xl font-bold text-slate-700 outline-none text-xs"
              >
                <option value="2026">Ano 2026</option>
                <option value="2025">Ano 2025</option>
                <option value="2024">Ano 2024</option>
              </select>

              <button 
                onClick={handleImprimirDeclaracao}
                className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-all shadow-sm text-xs"
              >
                <Printer size={16} />
                Imprimir / PDF
              </button>
            </div>
          </div>

          {/* Dados Cadastrais */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs bg-slate-50 p-4 rounded-xl border border-slate-200 print:bg-white print:border-slate-300">
            <div>
              <span className="block font-bold text-slate-400 uppercase text-[10px]">Contribuinte</span>
              <span className="font-bold text-slate-800 uppercase text-xs">rodrigo da silva honorio</span>
            </div>
            <div>
              <span className="block font-bold text-slate-400 uppercase text-[10px]">CNPJ</span>
              <span className="font-bold text-slate-800 text-xs">68.321.792/0001-30</span>
            </div>
            <div>
              <span className="block font-bold text-slate-400 uppercase text-[10px]">Exercício Apurado</span>
              <span className="font-bold text-blue-600 text-xs">{anoDeclaracao}</span>
            </div>
          </div>
        </div>

        {/* Quadro Resumo */}
        <div className="space-y-2">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">1. Apuração da Receita Bruta Total Anual</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="bg-blue-50/60 p-4 rounded-xl border border-blue-100">
              <span className="text-[11px] font-bold text-blue-700 uppercase">Prestação de Serviços (LC 116/03)</span>
              <p className="text-xl font-black text-blue-900 mt-0.5">
                {faturamentoTotalAno.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
              </p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Informado na DASN-SIMEI como Serviços.</span>
            </div>

            <div className="bg-slate-50 p-4 rounded-xl border border-slate-200">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Comércio, Indústria e Revenda</span>
              <p className="text-xl font-black text-slate-700 mt-0.5">R$ 0,00</p>
              <span className="text-[10px] text-slate-500 block mt-0.5">Sem operações comerciais no período.</span>
            </div>
          </div>
        </div>

        {/* Tabela Mensal */}
        <div className="space-y-2">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">2. Consolidação Mensal de Receitas (Livro Caixa)</h3>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-100 text-slate-700 border-b border-slate-200">
                  <th className="p-2.5 font-bold uppercase text-[11px]">Mês de Competência</th>
                  <th className="p-2.5 font-bold uppercase text-[11px] text-center">Qtde. Notas</th>
                  <th className="p-2.5 font-bold uppercase text-[11px] text-right">Valor Bruto Aferido (R$)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {faturamentoPorMes.map((m) => (
                  <tr key={m.mes} className="hover:bg-slate-50/50">
                    <td className="p-2.5 font-medium text-slate-800">{m.nome} / {anoDeclaracao}</td>
                    <td className="p-2.5 text-center text-slate-600 font-semibold">{m.quantidade}</td>
                    <td className="p-2.5 text-right font-bold text-slate-900">
                      {m.total.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-50 border-t-2 border-slate-200 font-black text-slate-900">
                  <td className="p-2.5 uppercase text-[11px]">Total Geral Acumulado no Ano</td>
                  <td className="p-2.5 text-center">{notasDoAno.length}</td>
                  <td className="p-2.5 text-right text-blue-700 text-xs">
                    {faturamentoTotalAno.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Notas Emitidas com Botões de Ação Integrados */}
        <div className="space-y-3 pt-1">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider">3. Relação Detalhada de NFS-e Emitidas ({anoDeclaracao})</h3>
          <div className="space-y-3">
            {notasDoAno.length > 0 ? (
              notasDoAno.map((nota) => (
                <div key={nota._id} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-2 relative group print:bg-white print:border-slate-300">
                  <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-900 text-xs">Nota Fiscal Nº {nota.numero}</span>
                      <span className="text-[10px] bg-blue-100 text-blue-800 font-bold px-2 py-0.5 rounded">Comp: {nota.competencia}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <span className="text-sm font-black text-blue-700">
                        {Number(nota.valor).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      {/* Botões de gerência rápidos visíveis na tela */}
                      <div className="flex gap-1 print:hidden">
                        <button onClick={() => iniciarEdicao(nota)} title="Editar registro" className="p-1 bg-amber-50 text-amber-600 rounded hover:bg-amber-100 transition-all">
                          <Edit3 size={14} />
                        </button>
                        <button onClick={() => excluirNota(nota._id)} title="Excluir registro" className="p-1 bg-red-50 text-red-600 rounded hover:bg-red-100 transition-all">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
                    <div>
                      <span className="font-bold text-slate-700">Tomador:</span> {nota.tomador_nome} {nota.tomador_cnpj ? `(CNPJ: ${nota.tomador_cnpj})` : ''}
                    </div>
                    {nota.chave_acesso && (
                      <div className="font-mono text-[11px] text-slate-500 truncate">
                        <span className="font-bold text-slate-700 font-sans">Chave:</span> {nota.chave_acesso}
                      </div>
                    )}
                  </div>

                  {nota.descricao_servico && (
                    <p className="text-xs text-slate-600 bg-white p-2.5 rounded-lg border border-slate-200 print:bg-slate-50">
                      <span className="font-bold text-slate-700">Discriminação:</span> "{nota.descricao_servico}"
                    </p>
                  )}
                </div>
              ))
            ) : (
              <div className="p-6 text-center text-slate-400 border border-slate-200 rounded-xl bg-slate-50 text-xs">
                Nenhuma nota fiscal ou receita registrada para o ano de {anoDeclaracao}.
              </div>
            )}
          </div>
        </div>

        {/* Rodapé Oficial */}
        <div className="pt-6 border-t border-slate-200 text-xs text-slate-500 space-y-5">
          <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 p-3 rounded-xl text-amber-900 text-[11px]">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p>
              Declaro sob as penas da lei que os valores expressam a exata realidade das receitas brutas auferidas no exercício pelo Microempreendedor Individual, estando os documentos fiscais guardados para apresentação à fiscalização da Receita Federal.
            </p>
          </div>

          <div className="pt-6 flex flex-col sm:flex-row justify-between items-center gap-6 text-center">
            <div className="w-full sm:w-64 border-t border-slate-400 pt-2">
              <p className="font-bold text-slate-800 uppercase text-xs">rodrigo da silva honorio</p>
              <p className="text-[10px] text-slate-400">Assinatura do Empresário</p>
            </div>
            <div className="text-[10px] text-slate-400">
              Gerado eletronicamente em ambiente seguro.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}