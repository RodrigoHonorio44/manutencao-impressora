import { useState } from 'react';
import { Search, ShieldAlert, BookOpen, Printer, AlertTriangle, Info } from 'lucide-react';

// BANCO DE DADOS TÉCNICO INTERNO EXPANDIDO VIA MANUAIS DE SERVIÇO DE FÁBRICA
// 🌟 CORREÇÃO: Alterado de "Phantom" para "Pantum" para manter a precisão com o mercado
const MANUAL_ERROS_IMPRESSORAS = {
  Brother: [
    { codigo: "Self-Diagnostic", causa: "Superaquecimento ou falha de leitura térmica no Fusor.", solucao: "Verificar continuidade da Lâmpada (LM0134001), resistência do Termistor (LT3211001) ou resetar o erro pelo Modo Manutenção (Menu 99)." },
    { codigo: "Print Unable 02", causa: "Falha de aquecimento lento no conjunto fusor.", solucao: "Película travada por graxa ressecada ou lâmpada interna trincada/queimada." },
    { codigo: "Replace Drum", causa: "Fim da vida útil programada do contador do fotocondutor.", solucao: "Efetuar a troca do Cilindro (DR3442) e realizar o reset físico abrindo a tampa dianteira e pressionando 'OK' por 2 segundos." },
    { codigo: "Jam Tray 1 / No Paper", causa: "Borracha do rolete de tração lisa ou atuador óptico travado.", solucao: "Trocar o Rolo Pick-up (D008G001) e o Calcador de Separação (D005M001)." }
  ],
  "HP (Laser 408 / MFP 432)": [
    { codigo: "A1-xxxx", causa: "Falha geral de inicialização, rotação ou travamento no Motor BLDC principal.", solucao: "Inspecionar fiação elétrica, conectores na mainboard e o acoplamento mecânico de tração." },
    { codigo: "A2-xxxx", causa: "Erro de rotação ou interrupção na ventoinha de resfriamento (Cooling Fan).", solucao: "Verificar obstruções físicas por poeira nas pás ou falha no conector do cooler do fuso/placa." },
    { codigo: "A3-xxxx", causa: "Falha de leitura do sensor térmico interno ou umidade ambiental.", solucao: "Verificar conexões do sensor ou se o ambiente de bancada não está fora do limite operacional." },
    { codigo: "C1-xxxx", causa: "Problema no cartucho de toner (suprimento não detectado, chip inválido ou incompatível).", solucao: "Limpar os contatos internos do chip do toner ou substituir o cartucho por um modelo homologado." },
    { codigo: "C3-xxxx", causa: "Falha de comunicação, ausência ou fim de vida útil da Unidade de Imagem (Cilindro/Drum Unit).", solucao: "Remover lacres protetores de unidades novas, limpar contatos de aterramento ou substituir o Drum." },
    { codigo: "C5-xxxx", causa: "Aviso de fim de vida útil projetada do Rolo de Transferência.", solucao: "Efetuar a troca mecânica do Transfer Roller e resetar o respectivo contador de manutenção técnica." },
    { codigo: "C6-xxxx", causa: "Unidade fusora incorreta detectada ou fuso não instalado fisicamente.", solucao: "Garantir o travamento correto das alavancas do fuso e checar se a voltagem (110V/220V) bate com a placa." },
    { codigo: "C8-xxxx", causa: "Erro eletrônico ou travamento mecânico nas engrenagens da Unidade de Revelação (Developer).", solucao: "Checar acoplamento das engrenagens laterais do cartucho e os contatos de polarização do rolo revelador." },
    { codigo: "C9-xxxx", causa: "Falha na linha de alta tensão do rolo de transferência (Erro de HVPS).", solucao: "Limpar os contatos e molas internos que interligam o eixo de transferência à placa de alta voltagem." },
    { codigo: "H1-xxxx", causa: "Erro de comunicação ou alimentação na Bandeja Opcional Inferior (Tray 3 / SCF).", solucao: "Verificar o cabo de dados inferior de acoplamento da bandeja e os roletes de tração do cassete 3." },
    { codigo: "Mx-xxxx", causa: "Atolamento de papel (Paper Jam) no trajeto físico ou sensores indicando lixeira cheia/porta aberta.", solucao: "Limpar sensores ópticos de passagem, inspecionar atuadores e remover fragmentos nas tampas." },
    { codigo: "Sx-xxxx", causa: "Falha crítica de sistema (Firmware corrompido, relógio interno Clock, erro de vídeo ou HD).", solucao: "Acessar o Tech Mode do fabricante e executar 'Clear All Memory' ou reatividades via cabo USB." },
    { codigo: "U1-xxxx", causa: "Erro térmico grave no Fusor (Subaquecimento, superaquecimento ou leitura aberta).", solucao: "Medir continuidade do termostato e a resistência da lâmpada de halogênio. Substituir peças abertas." },
    { codigo: "U2-xxxx", causa: "Falha no motor poligonal ou espelhos da unidade do Laser Scanner (LSU).", solucao: "Substituir o cabo flat da LSU ou trocar o bloco mecânico de espelhos ópticos do laser." },
    { codigo: "U3-xxxx", causa: "Erro de carga, tampa aberta ou atolamento no Alimentador Automático de Documentos (ADF).", solucao: "Verificar se o atuador plástico do sensor do ADF não quebrou e se a tampa superior travou." }
  ],
  "HP (LaserJet Pro M404 / M428)": [
    { codigo: "10.WX.YZ", causa: "Erro de suprimento. Falha na leitura ou bloqueio de memória do chip do toner.", solucao: "Limpar contatos de mola da cavidade. Se erro for 10.0X.11 (múltiplas máquinas), ativar o Repair Mode no menu técnico para não queimar novos chips de teste." },
    { codigo: "13.WX.YZ", causa: "Atolamento de papel generalizado (Paper Jam) ou sensores de porta obstruídos.", solucao: "Inspecionar lixeira traseira de fusão, bandeja 1 ou 2. Limpar os roletes Pick-up Rollers e o Separation Pad." },
    { codigo: "21.WX.YZ", causa: "Erro de complexidade da página enviada (Falta de memória RAM para processamento gráfico).", solucao: "Pressione OK para imprimir com possíveis perdas de dados ou mude o driver de impressão do PC para HP PCL6 ou UPD PS." },
    { codigo: "31.WX.YZ", causa: "Falha mecânica ou sensor de papel travado no alimentador superior de originais (ADF).", solucao: "Abrir a escotilha superior do ADF, higienizar o kit de roletes de tração e remover poeira dos sensores ópticos." },
    { codigo: "44.WX.YZ", causa: "Erro de envio digital (Digital Sending Error) nas rotinas de scanner avançado por rede.", solucao: "Revisar as credenciais SMTP/SMB na página Web (EWS) ou rodar o utilitário de atualização de Firmware da HP." },
    { codigo: "50.WX.YZ", causa: "Fuser Error. Falha técnica de temperatura (Fuso aberto, aquecimento lento ou superaquecimento).", solucao: "Verificar a integridade da resistência cerâmica interna do fuso, medir a tomada da parede e substituir o Fusor se necessário." },
    { codigo: "56.WX.YZ", causa: "Erro de manuseio de papel. Divergência entre o tamanho enviado pelo PC e a gaveta física.", solucao: "Ajustar o menu 'Paper Setup' no painel físico para o tamanho correto (ex: mudar de Carta para A4)." },
    { codigo: "58.WX.YZ", causa: "Falha de detecção de energia vinda da Placa de Baixa Tensão (Placa Fonte / CPU Voltage).", solucao: "Remover a impressora de estabilizadores de tensão ou filtros antigos e ligar diretamente na tomada de parede." },
    { codigo: "59.WX.YZ", causa: "Erro nos motores principais de tração das engrenagens (Motor Error).", solucao: "Garantir que o cartucho de toner não está travado mecanicamente e verificar os cabos da placa controladora DC." },
    { codigo: "60.WX.YZ", causa: "Falha no motor responsável pelo elevador de subida de papel da gaveta 2 (Tray Motor).", solucao: "Reduzir o volume de folhas na gaveta, checar se as guias laterais não estão apertadas demais e testar o atuador." }
  ],
  Pantum: [
    { codigo: "Erro 58", causa: "Fuser Error. Temperatura do bloco de fusão abaixo ou acima do limite de segurança.", solucao: "Inspecionar continuidade da lâmpada de aquecimento cerâmico e medir o termistor. Resetar via Menu de Configuração." },
    { codigo: "Erro 11 / Atolamento", causa: "Falha de alimentação de papel vindo da Gaveta Principal (Tray 1).", solucao: "Limpar o rolo de pick-up com álcool isopropílico ou trocar a borracha se estiver lisa. Checar mola do sensor." },
    { codigo: "Erro 31", causa: "Cartucho de Toner defeituoso ou Chip regionalizado/incompatível com o firmware.", solucao: "Limpar contatos del leitor de chip na lateral interna da máquina ou substituir por insumo homologado." },
    { codigo: "Erro 84", causa: "Cilindro Fotocondutor (Drum) no fim da vida útil de rotações.", solucao: "Trocar unidade de imagem ou realizar reset de ciclo abrindo a tampa e acessando o painel." }
  ],
  Samsung: [
    { codigo: "A1-1110 Error", causa: "Falha no motor do sistema de movimentação do toner/cilindro.", solucao: "Remover a tampa lateral e inspecionar se a engrenagem principal que acopla no cartucho não quebrou os dentes." },
    { codigo: "C1-2110 / C1-2130", causa: "Erro de comunicação ou chip do toner inválido/bloqueado.", solucao: "Verificar os contatos de metal internos que encostam no chip do cartucho de toner." },
    { codigo: "Fuser Error #U1-2111", causa: "Termistor aberto ou lâmpada de halogênio cortada.", solucao: "Trocar a película de teflon (JC66-02715A) e testar os termostatos de proteção térmica." }
  ]
};

const INSTRUCOES_TECH_MODE = {
  "HP (Laser 408 / MFP 432)": {
    titulo: "Tech Mode (Menu de Engenharia)",
    procedimento: "No painel, pressione em sequência rápida: Menu ➔ # ➔ 1 ➔ 9 ➔ 3 ➔ 4. O display exibirá 'Tech Mode'. Use para resetar o contador do fuso, unidade de imagem ou rodar o teste individual de motores.",
    alerta: "Útil para limpar códigos de travamento de fuso (U1)."
  },
  "HP (LaserJet Pro M404 / M428)": {
    titulo: "Menu de Serviço & Modo Setup de Reparo",
    procedimento: "Para painéis de 2 linhas (M404): Pressione o botão Seta para a Esquerda ➔ botão Cancelar (X) ➔ Seta para a Esquerda ➔ botão Voltar (Seta curvada). Para modelos Touchscreen (M428): Acesse Configuração ➔ Menu de Serviço (pode solicitar código de acesso da etiqueta traseira).",
    alerta: "Ative o 'Repair Mode' antes de testar toners de teste para não queimar o chip permanente!"
  },
  Pantum: {
    titulo: "Menu de Configuração de Fábrica",
    procedimento: "Desligue o equipamento no botão traseiro. Segure pressionados os botões 'OK' e 'Seta para a Direita' simultaneamente e ligue a chave de energia. Mantenha pressionado até surgir 'Config Menu' ou 'Configuration Menu' no visor.",
    alerta: "Essencial para resetar contadores de fusão e forçar calibração de sensores ópticos."
  },
  Brother: {
    titulo: "Maintenance Mode (Modo Manutenção) & Resets de Peças",
    procedimento: "DCP-L5652DN (Touch): Pressione 'Home' por 5s ➔ Segure a última linha em branco por 5s ➔ Digite *2864. || HL-L5102DW (Botões): Ligue a impressora mantendo o botão 'OK' pressionado até surgir 'MAINTENANCE'.",
    codigosBrother: [
      { num: "01", acao: "Inicialização completa dos parâmetros técnicos de fábrica." },
      { num: "09", acao: "Imprime a folha de teste padrão (Test Print Pattern) para verificar cilindro e fusor." },
      { num: "77", acao: "Imprime o relatório mestre com histórico completo de erros e logs de atolamento." },
      { num: "80", acao: "Exibe os contadores de vida útil das peças. Para zerar, navegue até a peça e aperte Mono Start." },
      { num: "82", acao: "Exibe o código de erro hexadecimal exato atual diretamente na tela." },
      { num: "88", acao: "Reset crítico de erros térmicos do fuso e leitura de logs travados." },
      { num: "99", acao: "Sair do Modo Técnico salvando alterações e reiniciando a máquina no modo normal." }
    ],
    procedimentosReset: [
      { modelo: "HL-L5102DW (Modo Normal - Tampa Aberta)", passos: "Abra a tampa frontal ➔ Segure 'OK' + '▲' por 2s ➔ Selecione a peça (Cilindro, Fusor, Laser ou Roletes) ➔ Escolha '1 (Reset)' ➔ Feche a tampa." },
      { modelo: "DCP-L5652DN (Modo Normal - Tampa Aberta)", passos: "Abra a tampa frontal ➔ Segure 'OK' por 2s (exibe Cilindro) ➔ Pressione '#' no teclado para abrir a lista completa (Fusor, Laser, Roletes) ➔ Escolha a peça e confirme." }
    ],
    alerta: "Sempre utilize o código 99 para fechar a rotina técnica e liberar a impressora de volta para o PC."
  },
  Samsung: {
    titulo: "Tech Menu Oculto",
    procedimento: "Pressione rapidamente a sequência: Menu ➔ # ➔ 1 ➔ 9 ➔ 3 ➔ 4 ➔ Menu. Navegue até 'Tech Mode' ➔ 'Data Setup' ➔ 'Clear Counts'.",
    alerta: "Essencial para zerar contadores de rolete após a manutenção preventiva."
  }
};

export default function Manuais() {
  const [marcaManual, setMarcaManual] = useState('');
  const [buscaErro, setBuscaErro] = useState('');

  const obterErrosFiltrados = () => {
    if (!marcaManual) return [];

    let baseErros = MANUAL_ERROS_IMPRESSORAS[marcaManual] || [];

    if (buscaErro) {
      const termo = buscaErro.toLowerCase().trim();
      const prefixoNumerico = termo.match(/^(\d+)/);

      return baseErros.filter(err => {
        const codigoFormatado = err.codigo.toLowerCase();
        
        if (prefixoNumerico && codigoFormatado.startsWith(prefixoNumerico[1])) {
          return true;
        }

        const prefixoLetras = termo.match(/^([a-zA-Z\d]+)/);
        if (prefixoLetras && (codigoFormatado.startsWith(prefixoLetras[1]) || codigoFormatado.includes(prefixoLetras[1]))) {
          return true;
        }

        return (
          codigoFormatado.includes(termo) || 
          err.causa.toLowerCase().includes(termo) || 
          err.solucao.toLowerCase().includes(termo)
        );
      });
    }

    return baseErros;
  };

  return (
    <div className="p-8 space-y-6 bg-slate-50 min-h-screen">
      <header>
        <h1 className="text-2xl font-black text-slate-800 tracking-tight flex items-center gap-2">
          <BookOpen className="text-amber-500" size={26} /> Central de Erros & Manuais
        </h1>
        <p className="text-slate-500 font-medium text-sm">Selecione um modelo para consultar códigos de erro de painel e diagnósticos de bancada.</p>
      </header>

      {/* Painel de Pesquisa Avançado */}
      <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center gap-2 text-amber-600">
          <ShieldAlert size={20} />
          <h2 className="font-bold text-slate-800 text-base">Filtro de Diagnóstico Rápido</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Seletor de Marca */}
          <div className="flex flex-col space-y-1.5">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Fabricante / Família</label>
            <select 
              value={marcaManual} 
              onChange={(e) => {
                setMarcaManual(e.target.value);
                setBuscaErro('');
              }}
              className="p-3 bg-slate-50 border rounded-xl outline-none focus:ring-2 focus:ring-amber-500 text-sm font-medium text-slate-700"
            >
              <option value="">Selecione um Modelo...</option>
              {Object.keys(MANUAL_ERROS_IMPRESSORAS).map(marca => (
                <option key={marca} value={marca}>{marca}</option>
              ))}
            </select>
          </div>

          {/* Input de Busca Dinâmica */}
          <div className="flex flex-col space-y-1.5 md:col-span-2">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wide">Código do Erro ou Sintoma do Painel</label>
            <div className="relative flex items-center bg-slate-50 border rounded-xl focus-within:ring-2 focus-within:ring-amber-500">
              <Search size={18} className="text-slate-400 ml-3 absolute" />
              <input 
                type="text"
                placeholder="Ex: 58, 50.2, U1, 13, Fusor, Atolamento..."
                disabled={!marcaManual}
                value={buscaErro}
                onChange={(e) => setBuscaErro(e.target.value)}
                className="w-full p-3 pl-10 text-sm font-medium outline-none text-slate-700 bg-transparent disabled:cursor-not-allowed disabled:text-slate-400"
              />
            </div>
          </div>
        </div>
      </section>

      {/* BLOCO DINÂMICO DO MODO TÉCNICO */}
      {marcaManual && INSTRUCOES_TECH_MODE[marcaManual] && (
        <section className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-5 rounded-2xl border border-slate-700 shadow-md space-y-4">
          <div className="flex items-center gap-2 text-amber-400">
            <Info size={18} />
            <h3 className="font-bold text-sm tracking-wide uppercase">
              {INSTRUCOES_TECH_MODE[marcaManual].titulo} — {marcaManual}
            </h3>
          </div>
          
          <p className="text-xs font-medium text-slate-300 leading-relaxed">
            <strong className="text-white">Procedimento de Acesso:</strong> {INSTRUCOES_TECH_MODE[marcaManual].procedimento}
          </p>

          {/* LISTAGEM DOS PARÂMETROS NUMÉRICOS DA BROTHER */}
          {INSTRUCOES_TECH_MODE[marcaManual].codigosBrother && (
            <div className="pt-2 border-t border-slate-700 space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-amber-400 uppercase block">Comandos do Modo Maintenance (2 Dígitos):</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs font-medium">
                {INSTRUCOES_TECH_MODE[marcaManual].codigosBrother.map((item, idx) => (
                  <div key={idx} className="flex gap-2 bg-slate-800/40 p-2 rounded-lg border border-slate-700/40">
                    <span className="font-mono font-black text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">{item.num}</span>
                    <span className="text-slate-300 leading-tight">{item.acao}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LISTAGEM DOS PROCEDIMENTOS DE RESET DE CONSUMÍVEIS */}
          {INSTRUCOES_TECH_MODE[marcaManual].procedimentosReset && (
            <div className="pt-2 border-t border-slate-700 space-y-2">
              <span className="text-[10px] font-bold tracking-wider text-emerald-400 uppercase block">Rotinas Rápidas de Reset (Após Troca de Peças):</span>
              <div className="space-y-2 text-xs font-medium">
                {INSTRUCOES_TECH_MODE[marcaManual].procedimentosReset.map((item, idx) => (
                  <div key={idx} className="bg-slate-800/40 p-2.5 rounded-lg border border-slate-700/40 space-y-1">
                    <span className="text-slate-200 font-bold block text-[11px]">{item.modelo}:</span>
                    <p className="text-slate-300 leading-relaxed font-normal">{item.passos}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="text-[11px] font-semibold text-amber-300 bg-slate-800/60 inline-block px-2.5 py-1 rounded-lg border border-slate-700/60 w-full sm:w-auto">
            ⚠️ Atenção: {INSTRUCOES_TECH_MODE[marcaManual].alerta}
          </div>
        </section>
      )}

      {/* Cards de Resposta Rápida */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {obterErrosFiltrados().map((err, index) => (
          <div key={`${marcaManual}-${err.codigo}-${index}`} className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:border-amber-300 transition-all flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="bg-amber-50 text-amber-800 font-mono text-xs font-black px-3 py-1 rounded-xl border border-amber-200 uppercase">
                  CÓDIGO: {err.codigo}
                </span>
                <span className="text-[10px] uppercase bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
                  <Printer size={10} /> {marcaManual}
                </span>
              </div>
              
              <div className="space-y-3 pt-1">
                <div>
                  <span className="text-slate-400 block font-bold uppercase tracking-wider text-[10px]">Causa Provável:</span>
                  <p className="text-xs text-slate-700 font-medium">{err.causa}</p>
                </div>
                
                <div className="p-3 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-xs text-slate-600">
                  <span className="text-emerald-700 block font-bold uppercase tracking-wider text-[10px] mb-1">Solução de Bancada:</span>
                  <p className="font-semibold leading-relaxed">{err.solucao}</p>
                </div>
              </div>
            </div>
          </div>
        ))}

        {/* Estado Inicial */}
        {!marcaManual && (
          <div className="col-span-full flex flex-col items-center justify-center py-16 bg-white rounded-2xl border border-dashed text-slate-400 text-sm p-4 text-center">
            <BookOpen size={40} className="text-slate-300 mb-2.5" />
            <p className="font-medium text-slate-500">Aguardando seleção do fabricante.</p>
            <p className="text-xs text-slate-400 mt-1">Escolha uma família de impressoras acima para listar os códigos de erro e instruções do painel.</p>
          </div>
        )}

        {/* Estado de Busca Vazio */}
        {marcaManual && obterErrosFiltrados().length === 0 && (
          <div className="col-span-full flex flex-col items-center justify-center py-12 bg-white rounded-2xl border border-dashed text-slate-400 text-sm p-4 text-center">
            <AlertTriangle size={32} className="text-slate-300 mb-2" />
            <p className="italic">Nenhum procedimento técnico encontrado para o termo "{buscaErro}".</p>
          </div>
        )}
      </div>
    </div>
  );
}