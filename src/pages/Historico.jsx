import { useHistorico } from '../hooks/useHistorico';
import ModalLaudoTecnico from '../components/ModalLaudoTecnico';
import ModalLaudoConsolidado from '../components/ModalLaudoConsolidado';
import { 
  Search, 
  Calendar as CalendarIcon, 
  FileText, 
  Package, 
  User, 
  CheckCircle, 
  ChevronLeft, 
  ChevronRight, 
  ChevronDown, 
  ChevronUp, 
  X, 
  Gauge, 
  Printer, 
  Edit3, 
  Save, 
  CheckSquare, 
  Square, 
  Layers 
} from 'lucide-react';

const nomesMeses = ["Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho", "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"];

export default function Historico() {
  const {
    busca,
    setBusca,
    carregando,
    todosAtendimentos,
    atendimentosFiltrados,
    totalAtendimentosFiltrados,
    mostrarCalendario,
    setMostrarCalendario,
    cardAbertoId,
    chamadoParaLaudo,
    setChamadoParaLaudo,
    chamadoParaLaudoConsolidado,
    setChamadoParaLaudoConsolidado,
    selecionadosIds,
    toggleSelecionar,
    toggleSelecionarTodos,
    obterItensSelecionados,
    editandoId,
    setEditandoId,
    salvando,
    dadosEdicao,
    handleMudancaCampoEdicao,
    paginaAtual,
    setPaginaAtual,
    totalPaginas,
    dataAtual,
    diaSelecionado,
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
  } = useHistorico(5);

  const todosDaPaginaSelecionados = atendimentosFiltrados.length > 0 && 
    atendimentosFiltrados.every(os => selecionadosIds.includes(os.id || os._id));

  // Helper para formatar objetos Mongo {$date: "..."}, instâncias Date ou ISO Strings
  const formatarDataBr = (valorData) => {
    if (!valorData) return null;
    let d;
    if (typeof valorData === 'object' && valorData.$date) {
      d = new Date(valorData.$date);
    } else if (valorData instanceof Date) {
      d = valorData;
    } else {
      d = extrairData(valorData) || new Date(valorData);
    }
    return isNaN(d?.getTime()) ? null : d.toLocaleDateString('pt-BR');
  };

  // Helper para normalizar e separar a lista de peças em array
  const obterListaPecas = (pecas) => {
    if (!pecas) return [];
    if (Array.isArray(pecas)) {
      return pecas.flatMap(p => typeof p === 'string' ? p.split(',') : p).map(p => p.trim()).filter(Boolean);
    }
    if (typeof pecas === 'string') {
      return pecas.split(',').map(p => p.trim()).filter(Boolean);
    }
    return [];
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-5 bg-slate-50 min-h-screen max-w-5xl mx-auto">
      
      {/* Cabeçalho */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-1">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800">Histórico de Manutenções</h1>
          <p className="text-xs sm:text-sm text-slate-500">Consulte, edite e emita laudos técnicos das manutenções.</p>
        </div>

        {/* Botão de Laudo Consolidado */}
        {selecionadosIds.length > 0 && (
          <button
            type="button"
            onClick={() => setChamadoParaLaudoConsolidado(obterItensSelecionados())}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl font-bold transition flex items-center gap-2 text-xs uppercase tracking-wider shadow-md animate-in fade-in duration-200"
          >
            <Layers size={16} />
            <span>Laudo Consolidado ({selecionadosIds.length})</span>
          </button>
        )}
      </header>

      {/* Busca + Calendário */}
      <section className="space-y-3">
        <div className="flex flex-col sm:flex-row gap-2">
          <form onSubmit={handleBusca} className="flex-1 flex gap-2">
            <div className="flex-1 relative flex items-center bg-white border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-blue-500 pr-2 shadow-sm">
              <Search className="text-slate-400 ml-3 mr-2 shrink-0" size={18} />
              <input 
                type="text"
                placeholder="Digite o S/N, Modelo, Cliente ou N° da OS..."
                value={busca}
                onChange={(e) => setBusca(e.target.value.toLowerCase())}
                className="w-full py-2.5 bg-transparent outline-none text-slate-700 font-medium text-sm lowercase"
              />
              {busca && (
                <button 
                  type="button"
                  onClick={handleLimparBusca}
                  className="text-[11px] text-slate-400 hover:text-slate-600 font-bold uppercase px-2 py-1 hover:bg-slate-100 rounded-lg transition"
                >
                  Limpar
                </button>
              )}
            </div>
            <button 
              type="submit"
              className="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-bold transition uppercase text-xs tracking-wider shrink-0 shadow-sm"
            >
              Buscar
            </button>
          </form>

          <button
            type="button"
            onClick={() => setMostrarCalendario(!mostrarCalendario)}
            className={`flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs uppercase transition border shadow-sm shrink-0 ${
              diaSelecionado || mostrarCalendario
                ? 'bg-blue-50 border-blue-200 text-blue-700' 
                : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
            }`}
          >
            <CalendarIcon size={16} />
            <span>{diaSelecionado ? diaSelecionado.toLocaleDateString('pt-BR') : 'Filtrar por Data'}</span>
            {mostrarCalendario ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {diaSelecionado && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-200 text-blue-800 px-3 py-1.5 rounded-lg text-xs font-medium">
            <span>Mostrando OSs do dia: <strong>{diaSelecionado.toLocaleDateString('pt-BR')}</strong></span>
            <button 
              type="button"
              onClick={handleLimparBusca}
              className="hover:bg-blue-100 p-0.5 rounded text-blue-900 transition"
            >
              <X size={14} />
            </button>
          </div>
        )}

        {mostrarCalendario && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-md space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h2 className="font-bold text-slate-800 text-sm">
                {nomesMeses[dataAtual.getMonth()]} {dataAtual.getFullYear()}
              </h2>
              <div className="flex gap-1">
                <button type="button" onClick={mesAnterior} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition">
                  <ChevronLeft size={16} />
                </button>
                <button type="button" onClick={proximoMes} className="p-1 hover:bg-slate-100 rounded-lg text-slate-600 transition">
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 text-center font-bold text-[10px] text-slate-400 uppercase">
              <span>Dom</span><span>Seg</span><span>Ter</span><span>Qua</span><span>Qui</span><span>Sex</span><span>Sáb</span>
            </div>

            <div className="grid grid-cols-7 gap-1">
              {diasDoMes().map((data, index) => {
                if (!data) return <div key={`empty-${index}`} className="h-8" />;

                const atendsDoDia = todosAtendimentos.filter(os => mesmoDia(extrairData(os.data_entrada), data));
                const temAtendimento = atendsDoDia.length > 0;
                const estaSelecionado = diaSelecionado && mesmoDia(diaSelecionado, data);

                return (
                  <button
                    type="button"
                    key={index}
                    onClick={() => selecionarDataNoCalendario(data)}
                    className={`h-9 rounded-lg flex flex-col items-center justify-between p-1 transition border ${
                      estaSelecionado 
                        ? 'border-blue-600 bg-blue-50 text-blue-700 font-bold shadow-sm' 
                        : 'border-slate-100 hover:bg-slate-50 text-slate-700'
                    }`}
                  >
                    <span className="text-[11px]">{data.getDate()}</span>
                    {temAtendimento && (
                      <div className="flex gap-0.5 items-center justify-center">
                        {atendsDoDia.slice(0, 3).map((os, idx) => (
                          <span 
                            key={idx} 
                            className={`w-1.5 h-1.5 rounded-full ${
                              os.status === 'Finalizado' ? 'bg-emerald-500' : 'bg-blue-500'
                            }`} 
                          />
                        ))}
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </section>

      {/* Barra de Seleção em Lote */}
      {!carregando && atendimentosFiltrados.length > 0 && (
        <div className="flex items-center justify-between bg-white px-4 py-2.5 rounded-xl border border-slate-200 shadow-sm text-xs text-slate-600">
          <button
            type="button"
            onClick={toggleSelecionarTodos}
            className="flex items-center gap-2 font-bold text-slate-700 hover:text-blue-600 transition"
          >
            {todosDaPaginaSelecionados ? (
              <CheckSquare size={16} className="text-blue-600" />
            ) : (
              <Square size={16} className="text-slate-400" />
            )}
            <span>Selecionar todos da exibição ({totalAtendimentosFiltrados})</span>
          </button>

          {selecionadosIds.length > 0 && (
            <span className="font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200">
              {selecionadosIds.length} selecionado(s)
            </span>
          )}
        </div>
      )}

      {/* Cards */}
      <section className="space-y-3">
        {carregando ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200">
            <p className="text-slate-400 text-sm font-medium animate-pulse">Carregando manutenções...</p>
          </div>
        ) : atendimentosFiltrados.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-200 border-dashed">
            <p className="text-slate-400 text-sm font-medium">Nenhuma manutenção encontrada.</p>
          </div>
        ) : (
          atendimentosFiltrados.map((os) => {
            const osId = os.id || os._id;
            const osNumero = os.os || os.numero_os || 'Sem Número';
            
            const dtEntrada = formatarDataBr(os.data_entrada);
            const dtFinalizacao = formatarDataBr(os.data_finalizacao);
            const dtAnterior = formatarDataBr(os.data_contador_anterior);
            const dtAtualContador = dtFinalizacao || dtEntrada || 'Data N/D';

            const isAberto = cardAbertoId === osId;
            const isEditando = editandoId === osId;
            const isSelecionado = selecionadosIds.includes(osId);

            const contadorFinal = Number(os.contador_final) || 0;
            const contadorAnterior = os.ultimo_contador_anterior !== null && os.ultimo_contador_anterior !== undefined
              ? Number(os.ultimo_contador_anterior) 
              : null;
            
            const paginasRodadas = Number(os.paginas_rodadas) || 0;
            const listaPecas = obterListaPecas(os.pecas_utilizadas);

            return (
              <div 
                key={osId} 
                className={`bg-white rounded-2xl border transition relative overflow-hidden ${
                  isSelecionado ? 'border-blue-400 ring-2 ring-blue-100 shadow-md' : 'border-slate-200 hover:border-slate-300 shadow-sm'
                }`}
              >
                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${os.status === 'Finalizado' ? 'bg-emerald-500' : 'bg-blue-500'}`} />

                {/* Cabeçalho do Card */}
                <div 
                  onClick={() => toggleCard(osId)}
                  className="p-4 pl-5 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/80 transition"
                >
                  <div className="flex items-start gap-3">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        toggleSelecionar(osId);
                      }}
                      className="mt-0.5 text-slate-400 hover:text-blue-600 transition"
                    >
                      {isSelecionado ? (
                        <CheckSquare size={18} className="text-blue-600" />
                      ) : (
                        <Square size={18} />
                      )}
                    </button>

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black bg-blue-600 text-white px-2 py-0.5 rounded">
                          OS: {osNumero}
                        </span>
                        <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                          os.status === 'Finalizado' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-blue-50 text-blue-700 border border-blue-200'
                        }`}>
                          {os.status}
                        </span>
                      </div>

                      <h3 className="font-bold text-slate-800 text-sm sm:text-base">
                        {os.marca} {os.modelo}
                      </h3>
                      <p className="text-xs text-slate-500 font-mono">S/N: {os.serial}</p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-2 border-t sm:border-t-0 pt-2 sm:pt-0 border-slate-100">
                    <div className="text-left sm:text-right text-xs text-slate-400 font-medium space-y-0.5 mr-1">
                      <div className="flex items-center gap-1">
                        <CalendarIcon size={12}/> Entrada: {dtEntrada || 'N/D'}
                      </div>
                      {dtFinalizacao && (
                        <div className="flex items-center gap-1 text-emerald-600">
                          <CheckCircle size={12}/> Fim: {dtFinalizacao}
                        </div>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setChamadoParaLaudo(os);
                      }}
                      className="p-2 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 transition flex items-center gap-1 font-bold text-xs"
                      title="Imprimir Laudo Técnico"
                    >
                      <Printer size={15} />
                      <span className="hidden sm:inline">Laudo</span>
                    </button>

                    {!isEditando && (
                      <button
                        type="button"
                        onClick={(e) => iniciarEdicao(os, e)}
                        className="p-2 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition flex items-center gap-1 font-bold text-xs"
                        title="Editar Card"
                      >
                        <Edit3 size={15} />
                        <span className="hidden sm:inline">Editar</span>
                      </button>
                    )}

                    <div className="p-1 rounded-lg bg-slate-100 text-slate-500">
                      {isAberto ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                    </div>
                  </div>
                </div>

                {/* Conteúdo Expansível */}
                {isAberto && (
                  <div className="p-4 pl-5 pt-0 border-t border-slate-100 space-y-3 bg-slate-50/50 text-xs sm:text-sm animate-in fade-in duration-150">
                    {isEditando ? (
                      <form onSubmit={(e) => handleSalvarEdicao(osId, e)} className="space-y-3 mt-3 bg-white p-4 rounded-xl border border-blue-200">
                        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                          <span className="font-bold text-blue-700 text-xs uppercase flex items-center gap-1">
                            <Edit3 size={14}/> Editar Manutenção
                          </span>
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditandoId(null); }}
                            className="text-slate-400 hover:text-slate-600 p-1"
                          >
                            <X size={16} />
                          </button>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                            <select
                              value={dadosEdicao.status}
                              onChange={(e) => handleMudancaCampoEdicao('status', e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-slate-700 bg-white font-medium"
                            >
                              <option value="Em Aberto">Em Aberto</option>
                              <option value="Em Andamento">Em Andamento</option>
                              <option value="Aguardando Peça">Aguardando Peça</option>
                              <option value="Finalizado">Finalizado</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Contador Atual</label>
                            <input
                              type="number"
                              value={dadosEdicao.contador_final}
                              onChange={(e) => handleMudancaCampoEdicao('contador_final', e.target.value)}
                              className="w-full p-2 border border-slate-200 rounded-lg text-slate-700 font-mono"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Defeito Relatado</label>
                          <input
                            type="text"
                            value={dadosEdicao.defeito}
                            onChange={(e) => handleMudancaCampoEdicao('defeito', e.target.value.toLowerCase())}
                            className="w-full p-2 border border-slate-200 rounded-lg text-slate-700 lowercase"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Relatório Técnico</label>
                          <textarea
                            rows={3}
                            value={dadosEdicao.relatorio_tecnico}
                            onChange={(e) => handleMudancaCampoEdicao('relatorio_tecnico', e.target.value.toLowerCase())}
                            className="w-full p-2 border border-slate-200 rounded-lg text-slate-700 leading-relaxed lowercase"
                          />
                        </div>

                        <div>
                          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Peças Trocadas (separadas por vírgula)</label>
                          <input
                            type="text"
                            placeholder="ex: película de fusão, rolo pressor, pickup roller"
                            value={dadosEdicao.pecas_utilizadas}
                            onChange={(e) => handleMudancaCampoEdicao('pecas_utilizadas', e.target.value.toLowerCase())}
                            className="w-full p-2 border border-slate-200 rounded-lg text-slate-700 lowercase"
                          />
                        </div>

                        <div className="flex justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); setEditandoId(null); }}
                            className="px-4 py-2 rounded-lg text-slate-600 bg-slate-100 hover:bg-slate-200 font-bold text-xs uppercase"
                          >
                            Cancelar
                          </button>
                          <button
                            type="button"
                            onClick={(e) => handleSalvarEdicao(osId, e)}
                            disabled={salvando}
                            className="px-4 py-2 rounded-lg text-white bg-emerald-600 hover:bg-emerald-700 font-bold text-xs uppercase flex items-center gap-1 disabled:opacity-50"
                          >
                            <Save size={14} />
                            {salvando ? 'Salvando...' : 'Salvar Alterações'}
                          </button>
                        </div>
                      </form>
                    ) : (
                      <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3 rounded-xl border border-slate-200 mt-3">
                          <div>
                            <p className="font-bold uppercase text-[10px] text-blue-600 mb-0.5">Responsável / Cliente</p>
                            <p className="font-bold text-slate-700 flex items-center gap-1">
                              <User size={13} className="text-slate-400"/> {os.cliente}
                            </p>
                          </div>
                          <div>
                            <p className="font-bold uppercase text-[10px] text-blue-600 mb-0.5">Defeito Relatado</p>
                            <p className="text-slate-600 italic">{os.defeito || "não especificado"}</p>
                          </div>
                        </div>

                        {/* Bloco dos Contadores com Datas e Dias Decorridos */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-white p-3 rounded-xl border border-slate-200">
                          <div>
                            <p className="font-bold uppercase text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                              <Gauge size={12}/> Contador Atual
                            </p>
                            <p className="font-mono font-bold text-slate-800 text-sm">
                              {contadorFinal.toLocaleString('pt-BR')} <span className="text-[10px] text-slate-400 font-sans">pág</span>
                            </p>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              {dtAtualContador}
                            </p>
                          </div>

                          <div>
                            <p className="font-bold uppercase text-[10px] text-slate-400 flex items-center gap-1 mb-0.5">
                              <Gauge size={12}/> Contador Anterior
                            </p>
                            <p className="font-mono font-medium text-slate-600 text-sm">
                              {contadorAnterior !== null ? `${contadorAnterior.toLocaleString('pt-BR')} pág` : 'Primeiro Registro'}
                            </p>
                            <p className="text-[10px] text-slate-500 font-semibold mt-0.5">
                              {dtAnterior || 'Sem registro anterior'}
                            </p>
                          </div>

                          <div>
                            <p className="font-bold uppercase text-[10px] text-blue-600 flex items-center gap-1 mb-0.5">
                              <Printer size={12}/> Rodadas no Período
                            </p>
                            <p className="font-mono font-bold text-blue-700 text-sm">
                              +{paginasRodadas.toLocaleString('pt-BR')} <span className="text-[10px] font-sans">pág</span>
                            </p>
                            <p className="text-[10px] text-blue-600 font-bold mt-0.5">
                              {os.dias_decorridos !== null && os.dias_decorridos !== undefined
                                ? `${os.dias_decorridos} dia(s) decorrido(s)`
                                : 'Período N/D'}
                            </p>
                          </div>
                        </div>

                        <div>
                          <p className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                            <FileText size={13}/> Relatório Técnico:
                          </p>
                          <p className="text-slate-700 bg-white p-3 rounded-xl border border-slate-200 font-medium whitespace-pre-line text-xs leading-relaxed">
                            {os.relatorio_tecnico || "nenhum relatório detalhado foi registrado."}
                          </p>
                        </div>

                        {listaPecas.length > 0 && (
                          <div>
                            <p className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-wider mb-1">
                              <Package size={13}/> Peças Trocadas:
                            </p>
                            <div className="flex flex-wrap gap-1.5">
                              {listaPecas.map((p, idx) => (
                                <span key={idx} className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  {p}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}

                        <div className="flex justify-end pt-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChamadoParaLaudo(os);
                            }}
                            className="bg-slate-800 hover:bg-slate-900 text-white px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition shadow-sm"
                          >
                            <Printer size={14} /> Imprimir Laudo Técnico
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </section>

      {/* Paginação */}
      {!carregando && totalPaginas > 1 && (
        <footer className="flex items-center justify-between bg-white p-3 rounded-xl border border-slate-200 shadow-sm text-xs font-medium text-slate-600">
          <span>Página <strong>{paginaAtual}</strong> de <strong>{totalPaginas}</strong></span>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setPaginaAtual(prev => Math.max(prev - 1, 1))}
              disabled={paginaAtual === 1}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
            >
              <ChevronLeft size={14} /> Anterior
            </button>
            <button
              type="button"
              onClick={() => setPaginaAtual(prev => Math.min(prev + 1, totalPaginas))}
              disabled={paginaAtual === totalPaginas}
              className="px-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed flex items-center gap-1 transition"
            >
              Próxima <ChevronRight size={14} />
            </button>
          </div>
        </footer>
      )}

      {/* Modal Laudo Técnico Individual */}
      {chamadoParaLaudo && (
        <ModalLaudoTecnico
          chamado={chamadoParaLaudo}
          onClose={() => setChamadoParaLaudo(null)}
        />
      )}

      {/* Modal Laudo Técnico Consolidado */}
      {chamadoParaLaudoConsolidado && (
        <ModalLaudoConsolidado
          chamados={chamadoParaLaudoConsolidado}
          onClose={() => setChamadoParaLaudoConsolidado(null)}
        />
      )}

    </div>
  );
}