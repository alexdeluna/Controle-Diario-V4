/******************************
 * ESTADO GLOBAL E PERSISTÊNCIA
 ******************************/
let estado = JSON.parse(localStorage.getItem('controleDiarioV4')) || {
  turnoAtual: null,
  turnos: [],
  metas: {
    valorMensal: 0,
    compromissos: [] 
  }
};

function salvar() {
  localStorage.setItem('controleDiarioV4', JSON.stringify(estado));
}

/******************************
 * UTILITÁRIOS DE HORA
 ******************************/

// Converte minutos totais para formato HH:MM (ex: 80 -> 01:20h)
function formatarMinutosParaHHMM(minutosTotais) {
  const horas = Math.floor(minutosTotais / 60);
  const minutos = Math.round(minutosTotais % 60); 
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}h`;
}

// Retorna a diferença em MINUTOS totais
function diffHoras(h1, h2) {
  const [aH, aM] = h1.split(':').map(Number);
  const [bH, bM] = h2.split(':').map(Number);
  let inicio = aH * 60 + aM;
  let fim = bH * 60 + bM;
  if (fim < inicio) fim += 24 * 60; // Virada de dia
  return fim - inicio; 
}

// Trata entrada de hora flexível (0620, 6:20, 06 20) para 06:20
function tratarEntradaHora(valor) {
  let num = valor.replace(/\D/g, '');
  if (num.length === 3) num = '0' + num;
  if (num.length === 4) {
    const hh = num.substring(0, 2);
    const mm = num.substring(2, 4);
    if (parseInt(hh) < 24 && parseInt(mm) < 60) {
      return `${hh}:${mm}`;
    }
  }
  return valor; 
}

function validarHora(hora) {
  return /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/.test(hora);
}

/******************************
 * FUNÇÕES DE AÇÃO E NAVEGAÇÃO
 ******************************/

function irPara(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  const telaDestino = document.getElementById(id);
  
  if (telaDestino) {
    telaDestino.classList.add('ativa');
  }

  // Gatilhos de carregamento de dados conforme a tela
  if (id === 'resumoTurno') carregarResumoTurno();
  if (id === 'resumoDia') carregarResumoDia();
  if (id === 'historicoGeral') carregarHistoricoGeral();
  if (id === 'metasMensais') carregarTelaMetas();
}

function capturarHora(id) {
  const d = new Date();
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  document.getElementById(id).value = `${h}:${m}`;
}

/******************************
 * FLUXO DO APLICATIVO
 ******************************/

function confirmarInicioTurno() {
  const inputHora = document.getElementById('horaInicio');
  inputHora.value = tratarEntradaHora(inputHora.value);
  
  const hora = inputHora.value;
  const km = Number(document.getElementById('kmInicial').value);

  if (!validarHora(hora) || isNaN(km) || km <= 0) {
    alert('Verifique a Hora (ex: 0620) e o KM!');
    return;
  }

  estado.turnoAtual = {
    data: new Date().toISOString().split('T')[0], // Apenas a data YYYY-MM-DD
    horaInicio: hora,
    kmInicial: km,
    horaFim: '',
    kmFinal: 0,
    custos: { abastecimento: 0, outros: 0 },
    apurado: 0
  };

  salvar();
  alert('Turno iniciado com sucesso!');
  irPara('menu');
}

function adicionarAbastecimento() {
  const input = document.getElementById('valorAbastecimento');
  const valor = Number(input.value);
  if (valor > 0 && estado.turnoAtual) {
    estado.turnoAtual.custos.abastecimento += valor;
    document.getElementById('totalAbastecido').value = estado.turnoAtual.custos.abastecimento.toFixed(2);
    input.value = '';
    atualizarTotalCustos();
    salvar();
  } else if (!estado.turnoAtual) { alert('Inicie um turno primeiro!'); }
}

function adicionarOutrosCustos() {
  const input = document.getElementById('valorOutrosCustos');
  const valor = Number(input.value);
  if (valor > 0 && estado.turnoAtual) {
    estado.turnoAtual.custos.outros += valor;
    document.getElementById('totalOutrosCustos').value = estado.turnoAtual.custos.outros.toFixed(2);
    input.value = '';
    atualizarTotalCustos();
    salvar();
  } else if (!estado.turnoAtual) { alert('Inicie um turno primeiro!'); }
}

function atualizarTotalCustos() {
  if (estado.turnoAtual) {
    const total = estado.turnoAtual.custos.abastecimento + estado.turnoAtual.custos.outros;
    document.getElementById('totalCustos').value = total.toFixed(2);
  }
}

function inserirApurado() {
  const valor = Number(document.getElementById('apurado').value);
  if (estado.turnoAtual && !isNaN(valor) && valor >= 0) {
    estado.turnoAtual.apurado = valor;
    salvar();
    alert('Ganhos salvos! Voltando ao menu.');
    irPara('menu');
  } else if (!estado.turnoAtual) { alert('Inicie um turno primeiro!'); }
}

function confirmarFimTurno() {
  const inputHora = document.getElementById('horaFim');
  inputHora.value = tratarEntradaHora(inputHora.value);
  
  const hora = inputHora.value;
  const km = Number(document.getElementById('kmFinal').value);

  if (!estado.turnoAtual || !validarHora(hora) || km <= estado.turnoAtual.kmInicial) {
    alert('Verifique a Hora e o KM Final (deve ser maior que o inicial)!');
    return;
  }

  estado.turnoAtual.horaFim = hora;
  estado.turnoAtual.kmFinal = km;
  salvar();
  irPara('resumoTurno');
}

function salvarTurnoNoHistorico() {
  if (estado.turnoAtual && estado.turnoAtual.horaFim && estado.turnoAtual.kmFinal > estado.turnoAtual.kmInicial) {
    estado.turnos.push({...estado.turnoAtual});
    estado.turnoAtual = null; // Limpa para novo turno
    salvar();
    alert('Turno arquivado! Recarregando app...');
    window.location.reload(); // Recarrega para limpar interface
  } else {
    alert('Por favor, finalize o turno corretamente antes de arquivar.');
  }
}

/******************************
 * METAS E CUSTOS FIXOS (V4)
 ******************************/

function inserirMetaMensal() {
  const input = document.getElementById('valorMetaMensal');
  const valor = Number(input.value);
  if (!isNaN(valor) && valor > 0) {
    estado.metas.valorMensal = valor;
    salvar();
    alert('Meta mensal salva!');
  } else {
    alert('Valor da meta inválido.');
  }
}

function inserirCustoFixo() {
  const descricaoInput = document.getElementById('descricaoCustoFixo');
  const valorInput = document.getElementById('valorCustoFixo');
  const descricao = descricaoInput.value.trim();
  const valor = Number(valorInput.value);

  if (descricao && !isNaN(valor) && valor > 0) {
    estado.metas.compromissos.push({ nome: descricao, valor: valor });
    salvar();
    renderizarListaCustosFixos();
    descricaoInput.value = '';
    valorInput.value = '';
  } else {
    alert('Descrição ou valor do custo fixo inválido.');
  }
}

function renderizarListaCustosFixos() {
  const lista = document.getElementById('listaCustosFixos');
  lista.innerHTML = '';
  let totalCustosFixos = 0;

  estado.metas.compromissos.forEach((custo, index) => {
    totalCustosFixos += custo.valor;
    const li = document.createElement('li');
    li.style.display = 'flex';
    li.style.justifyContent = 'space-between';
    li.style.padding = '5px 0';
    li.style.borderBottom = '1px solid #eee';
    li.innerHTML = `<span>${custo.nome}</span> <span>R$ ${custo.valor.toFixed(2)}</span>`;
    lista.appendChild(li);
  });

  document.getElementById('totalCustosFixos').value = totalCustosFixos.toFixed(2);
}

function carregarTelaMetas() {
    document.getElementById('valorMetaMensal').value = estado.metas.valorMensal > 0 ? estado.metas.valorMensal.toFixed(2) : '';
    renderizarListaCustosFixos();
    carregarResumoMetas(); 
}

function carregarResumoMetas() {
  let lucroDoMes = 0;
  estado.turnos.forEach(t => {
    const custosTotais = t.custos.abastecimento + t.custos.outros;
    lucroDoMes += (t.apurado - custosTotais);
  });

  let totalCustosFixos = 0;
  estado.metas.compromissos.forEach(c => totalCustosFixos += c.valor);

  const faltaParaMeta = estado.metas.valorMensal - lucroDoMes;

  document.getElementById('resumoSuaMeta').value = estado.metas.valorMensal.toFixed(2);
  document.getElementById('resumoTotalCustosFixos').value = totalCustosFixos.toFixed(2);
  document.getElementById('resumoLucroDoMes').value = lucroDoMes.toFixed(2);
  document.getElementById('resumoFaltaParaMeta').value = faltaParaMeta.toFixed(2);
}


/******************************
 * RESUMOS E HISTÓRICO
 ******************************/

function carregarResumoTurno() {
  const t = estado.turnoAtual;
  if (!t || !t.horaFim) return;

  const totalMinutos = diffHoras(t.horaInicio, t.horaFim);
  const horasFormatadas = formatarMinutosParaHHMM(totalMinutos);
  const km = t.kmFinal - t.kmInicial;
  const custos = t.custos.abastecimento + t.custos.outros;
  const lucro = t.apurado - custos;
  const vHora = (totalMinutos / 60) > 0 ? lucro / (totalMinutos / 60) : 0;

  document.getElementById('resumoHoras').innerText = horasFormatadas;
  document.getElementById('resumoKM').innerText = `${km} km`;
  document.getElementById('resumoCustos').innerText = `R$ ${custos.toFixed(2)}`;
  document.getElementById('resumoLucro').innerText = `R$ ${lucro.toFixed(2)}`;
  document.getElementById('resumoValorHora').innerText = `R$ ${vHora.toFixed(2)}/h`;
}

function carregarResumoDia() {
  const hoje = new Date().toISOString().split('T')[0]; // Data de hoje YYYY-MM-DD
  const turnosDia = estado.turnos.filter(t => t.data === hoje);

  let lucroTotal = 0;
  let kmTotal = 0;
  let minutosTotal = 0;
  let abastecimentoTotal = 0;
  let outrosTotal = 0;
  let apuradoTotal = 0;

  turnosDia.forEach(t => {
    minutosTotal += diffHoras(t.horaInicio, t.horaFim);
    kmTotal += (t.kmFinal - t.kmInicial);
    abastecimentoTotal += t.custos.abastecimento;
    outrosTotal += t.custos.outros;
    apuradoTotal += t.apurado;
    lucroTotal += (t.apurado - (t.custos.abastecimento + t.custos.outros));
  });

  const horasFormatadas = formatarMinutosParaHHMM(minutosTotal);
  const valorHoraMedia = (minutosTotal / 60) > 0 ? lucroTotal / (minutosTotal / 60) : 0;

  document.getElementById('diaHorasTrabalhadas').innerText = horasFormatadas;
  document.getElementById('diaKM').innerText = `${kmTotal} km`;
  document.getElementById('diaAbastecido').innerText = `R$ ${abastecimentoTotal.toFixed(2)}`;
  document.getElementById('diaOutrosCustos').innerText = `R$ ${outrosTotal.toFixed(2)}`;
  document.getElementById('diaApurado').innerText = `R$ ${apuradoTotal.toFixed(2)}`;
  document.getElementById('diaLucro').innerText = `R$ ${lucroTotal.toFixed(2)}`;
  document.getElementById('diaValorHora').innerText = `R$ ${valorHoraMedia.toFixed(2)}/h`;
}

function carregarHistoricoGeral() {
  const lista = document.getElementById('listaHistorico');
  lista.innerHTML = '';
  
  // Criamos uma cópia invertida para a ORDEM DE EXIBIÇÃO (mais recente no topo)
  const turnosExibicao = [...estado.turnos].reverse();

  turnosExibicao.forEach((t, i) => {
    // Calculamos o índice original no array 'estado.turnos' para a função deletarTurno()
    // turnosExibicao.length - 1 - i nos dá o índice correto no array original
    const originalIndex = estado.turnos.length - 1 - i;

    // Métricas para exibição
    const totalMinutos = diffHoras(t.horaInicio, t.horaFim);
    const horasFormatadas = formatarMinutosParaHHMM(totalMinutos);
    const custosTotais = t.custos.abastecimento + t.custos.outros;
    const lucro = t.apurado - custosTotais;
    const valorHora = (totalMinutos / 60) > 0 ? lucro / (totalMinutos / 60) : 0;
    const kmRodados = t.kmFinal - t.kmInicial;
    const dataFormatada = new Date(t.data + 'T00:00:00').toLocaleDateString('pt-BR');

    const divTurno = document.createElement('li');
    divTurno.className = 'detalhe-turno';
    divTurno.style.position = 'relative'; // Importante para o botão 'X'

    divTurno.innerHTML = `
      <div style="padding: 15px; border: 1px solid #ccc; margin-bottom: 10px; border-radius: 5px; background: #fafafa;">
        <strong>Data: ${dataFormatada} | Turno ${originalIndex + 1}</strong><br>
        ${t.horaInicio} às ${t.horaFim} (${horasFormatadas})<br>
        KM Rodados: ${kmRodados} km<br>
        Total Abastecimento: R$ ${t.custos.abastecimento.toFixed(2)}<br>
        Outros Custos: R$ ${t.custos.outros.toFixed(2)}<br>
        Valor Apurado: R$ ${t.apurado.toFixed(2)}<br>
        Lucro: <strong style="color:green;">R$ ${lucro.toFixed(2)}</strong><br>
        Valor da Hora: R$ ${valorHora.toFixed(2)}
      </div>
      <!-- Botão de Deletar com o índice correto -->
      <button onclick="deletarTurno(${originalIndex})" style="position: absolute; top: 10px; right: 10px; background: #dc3545; color: white; border-radius: 50%; width: 30px; height: 30px; padding: 0; line-height: 30px; text-align: center;">X</button>
    `;
    lista.appendChild(divTurno);
  });
}


/******************************
 * FUNÇÕES DE DELEÇÃO
 ******************************/

function deletarTurno(index) {
  if (confirm(`Tem certeza que deseja apagar o turno ${index + 1}?`)) {
    // Remove 1 item a partir do índice especificado
    estado.turnos.splice(index, 1);
    salvar(); // Salva o estado atualizado
    carregarHistoricoGeral(); // Recarrega a lista para mostrar a mudança
  }
}

function limparTodoHistorico() {
  if(confirm("Deseja apagar TODO o histórico de turnos?")) {
    estado.turnos = [];
    salvar();
    carregarHistoricoGeral();
    alert("Histórico apagado.");
  }
}

// Função para Exportar para Excel (CSV)
function exportarExcel() {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Data;Hora Inicio;Hora Fim;KM Inicial;KM Final;Abastecimento;Outros Custos;Apurado;Lucro;Horas Formatadas;KM Rodados;Valor Hora\n";

  estado.turnos.forEach(t => {
    const totalMinutos = diffHoras(t.horaInicio, t.horaFim);
    const horasFormatadas = formatarMinutosParaHHMM(totalMinutos);
    const custosTotais = t.custos.abastecimento + t.custos.outros;
    const lucro = t.apurado - custosTotais;
    const valorHora = (totalMinutos / 60) > 0 ? lucro / (totalMinutos / 60) : 0;
    const kmRodados = t.kmFinal - t.kmInicial;

    let row = `${t.data};${t.horaInicio};${t.horaFim};${t.kmInicial};${t.kmFinal};${t.custos.abastecimento};${t.custos.outros};${t.apurado};${lucro.toFixed(2)};${horasFormatadas};${kmRodados};${valorHora.toFixed(2)}`;
    csvContent += row + "\n";
  });

  var encodedUri = encodeURI(csvContent);
  var link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", "controle_diario_V4.csv");
  document.body.appendChild(link); // Requerido para Firefox
  link.click();
  document.body.removeChild(link);
}

// Função para Exportar para PDF (Usando jsPDF e AutoTable)
function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  const dataParaTabela = estado.turnos.map(t => {
    const totalMinutos = diffHoras(t.horaInicio, t.horaFim);
    const lucro = t.apurado - (t.custos.abastecimento + t.custos.outros);
    return [
      t.data,
      `${t.horaInicio} - ${t.horaFim}`,
      t.kmFinal - t.kmInicial,
      `R$ ${t.custos.abastecimento.toFixed(2)}`,
      `R$ ${t.custos.outros.toFixed(2)}`,
      `R$ ${t.apurado.toFixed(2)}`,
      `R$ ${lucro.toFixed(2)}`
    ];
  });

  doc.text("Relatório Controle Diario V4", 10, 10);
  doc.autoTable({
    head: [['Data', 'Horas', 'KM Rodados', 'Abastecimento', 'Outros Custos', 'Apurado', 'Lucro']],
    body: dataParaTabela,
    startY: 20
  });

  doc.save("controle_diario_V4.pdf");
}

// Registro do Service Worker para PWA
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('SW registrado!'))
      .catch(err => console.error('Erro SW:', err));
  });
}


