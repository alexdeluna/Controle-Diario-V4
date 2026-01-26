/******************************
 * ESTADO GLOBAL E PERSISTÊNCIA
 ******************************/
let estado = JSON.parse(localStorage.getItem('controleDiarioV4')) || {
  turnoAtual: null,
  turnos: [],
  metas: { valorMensal: 0, compromissos: [] }
};

function salvar() {
  localStorage.setItem('controleDiarioV4', JSON.stringify(estado));
}

/******************************
 * UTILITÁRIOS
 ******************************/
function formatarMinutosParaHHMM(minutosTotais) {
  const horas = Math.floor(minutosTotais / 60);
  const minutos = Math.round(minutosTotais % 60); 
  return `${String(horas).padStart(2, '0')}:${String(minutos).padStart(2, '0')}h`;
}

function diffHoras(h1, h2) {
  const [aH, aM] = h1.split(':').map(Number);
  const [bH, bM] = h2.split(':').map(Number);
  let inicio = aH * 60 + aM;
  let fim = bH * 60 + bM;
  if (fim < inicio) fim += 24 * 60;
  return fim - inicio; 
}

function tratarEntradaHora(valor) {
  let num = valor.replace(/\D/g, '');
  if (num.length === 3) num = '0' + num;
  if (num.length === 4) {
    const hh = num.substring(0, 2);
    const mm = num.substring(2, 4);
    if (parseInt(hh) < 24 && parseInt(mm) < 60) return `${hh}:${mm}`;
  }
  return valor; 
}

function validarHora(hora) {
  return /^(0[0-9]|1[0-9]|2[0-3]):([0-5][0-9])$/.test(hora);
}

function irPara(id) {
  document.querySelectorAll('.tela').forEach(t => t.classList.remove('ativa'));
  const telaDestino = document.getElementById(id);
  if (telaDestino) telaDestino.classList.add('ativa');
  if (id === 'resumoTurno') carregarResumoTurno();
  if (id === 'resumoDia') carregarResumoDia();
  if (id === 'historicoGeral') carregarHistoricoGeral();
  if (id === 'metasMensais') carregarTelaMetas();
}

function capturarHora(id) {
  const d = new Date();
  document.getElementById(id).value = `${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
}

/******************************
 * FLUXO DO TURNO
 ******************************/
function confirmarInicioTurno() {
  const inputHora = document.getElementById('horaInicio');
  inputHora.value = tratarEntradaHora(inputHora.value);
  const hora = inputHora.value;
  const km = Number(document.getElementById('kmInicial').value);

  if (!validarHora(hora) || isNaN(km) || km <= 0) {
    alert('Verifique a Hora e o KM!');
    return;
  }
  estado.turnoAtual = {
    data: new Date().toISOString().split('T')[0],
    horaInicio: hora, kmInicial: km, horaFim: '', kmFinal: 0,
    custos: { abastecimento: 0, outros: 0 }, apurado: 0
  };
  salvar();
  irPara('menu');
}

function adicionarAbastecimento() {
  const v = Number(document.getElementById('valorAbastecimento').value);
  if (v > 0 && estado.turnoAtual) {
    estado.turnoAtual.custos.abastecimento += v;
    document.getElementById('totalAbastecido').value = estado.turnoAtual.custos.abastecimento.toFixed(2);
    atualizarTotalCustos();
    salvar();
  }
}

function adicionarOutrosCustos() {
  const v = Number(document.getElementById('valorOutrosCustos').value);
  if (v > 0 && estado.turnoAtual) {
    estado.turnoAtual.custos.outros += v;
    document.getElementById('totalOutrosCustos').value = estado.turnoAtual.custos.outros.toFixed(2);
    atualizarTotalCustos();
    salvar();
  }
}

function atualizarTotalCustos() {
  if (estado.turnoAtual) {
    const total = estado.turnoAtual.custos.abastecimento + estado.turnoAtual.custos.outros;
    document.getElementById('totalCustos').value = total.toFixed(2);
  }
}

function inserirApurado() {
  const v = Number(document.getElementById('apurado').value);
  if (estado.turnoAtual && !isNaN(v)) {
    estado.turnoAtual.apurado = v;
    salvar();
    irPara('menu');
  }
}

function confirmarFimTurno() {
  const inputHora = document.getElementById('horaFim');
  inputHora.value = tratarEntradaHora(inputHora.value);
  const hora = inputHora.value;
  const km = Number(document.getElementById('kmFinal').value);

  if (!estado.turnoAtual || !validarHora(hora) || km <= estado.turnoAtual.kmInicial) {
    alert('Verifique a Hora e o KM Final!');
    return;
  }
  estado.turnoAtual.horaFim = hora;
  estado.turnoAtual.kmFinal = km;
  salvar();
  irPara('resumoTurno');
}

function salvarTurnoNoHistorico() {
  if (estado.turnoAtual && estado.turnoAtual.horaFim) {
    estado.turnos.push({...estado.turnoAtual});
    estado.turnoAtual = null;
    salvar();
    window.location.reload();
  }
}

/******************************
 * METAS E CUSTOS FIXOS (UNIFICADO)
 ******************************/
function inserirMetaMensal() {
  const v = Number(document.getElementById('valorMetaMensal').value);
  if (v > 0) {
    estado.metas.valorMensal = v;
    salvar();
    carregarResumoMetas();
    alert('Meta salva!');
  }
}

function inserirCustoFixo() {
  const desc = document.getElementById('descricaoCustoFixo').value.trim();
  const valor = Number(document.getElementById('valorCustoFixo').value);
  if (desc && valor > 0) {
    estado.metas.compromissos.push({ id: Date.now(), nome: desc, valor: valor });
    salvar();
    renderizarListaCustosFixos();
    carregarResumoMetas();
  }
}

function excluirCustoFixo(id) {
  estado.metas.compromissos = estado.metas.compromissos.filter(c => c.id !== id);
  salvar();
  renderizarListaCustosFixos();
  carregarResumoMetas();
}

function renderizarListaCustosFixos() {
  const lista = document.getElementById('listaCustosFixos');
  lista.innerHTML = '';
  let total = 0;
  estado.metas.compromissos.forEach(c => {
    total += c.valor;
    const li = document.createElement('li');
    li.className = 'linha';
    li.innerHTML = `<span>${c.nome}: R$ ${c.valor.toFixed(2)}</span> 
                    <button onclick="excluirCustoFixo(${c.id})">🗑️</button>`;
    lista.appendChild(li);
  });
  document.getElementById('totalCustosFixos').value = total.toFixed(2);
}

function carregarTelaMetas() {
  document.getElementById('valorMetaMensal').value = estado.metas.valorMensal || '';
  renderizarListaCustosFixos();
  carregarResumoMetas();
}

function carregarResumoMetas() {
  let lucroMes = estado.turnos.reduce((acc, t) => acc + (t.apurado - (t.custos.abastecimento + t.custos.outros)), 0);
  let custosFixos = estado.metas.compromissos.reduce((acc, c) => acc + c.valor, 0);
  let falta = Math.max(estado.metas.valorMensal - (lucroMes - custosFixos), 0);

  document.getElementById('resumoSuaMeta').value = `R$ ${estado.metas.valorMensal.toFixed(2)}`;
  document.getElementById('resumoTotalCustosFixos').value = `R$ ${custosFixos.toFixed(2)}`;
  document.getElementById('resumoLucroDoMes').value = `R$ ${lucroMes.toFixed(2)}`;
  document.getElementById('resumoFaltaParaMeta').value = `R$ ${falta.toFixed(2)}`;
}

/******************************
 * RESUMOS E EXPORTAÇÃO
 ******************************/
function carregarResumoTurno() {
  const t = estado.turnoAtual;
  if (!t || !t.horaFim) return;
  const min = diffHoras(t.horaInicio, t.horaFim);
  const custos = t.custos.abastecimento + t.custos.outros;
  document.getElementById('resumoHoras').innerText = formatarMinutosParaHHMM(min);
  document.getElementById('resumoKM').innerText = `${t.kmFinal - t.kmInicial} km`;
  document.getElementById('resumoCustos').innerText = `R$ ${custos.toFixed(2)}`;
  document.getElementById('resumoLucro').innerText = `R$ ${(t.apurado - custos).toFixed(2)}`;
}

function carregarResumoDia() {
  const hoje = new Date().toISOString().split('T')[0];
  const turnos = estado.turnos.filter(t => t.data === hoje);
  let lucro = 0, km = 0, min = 0;
  turnos.forEach(t => {
    min += diffHoras(t.horaInicio, t.horaFim);
    km += (t.kmFinal - t.kmInicial);
    lucro += (t.apurado - (t.custos.abastecimento + t.custos.outros));
  });
  document.getElementById('diaHorasTrabalhadas').innerText = formatarMinutosParaHHMM(min);
  document.getElementById('diaKM').innerText = `${km} km`;
  document.getElementById('diaLucro').innerText = `R$ ${lucro.toFixed(2)}`;
}

function carregarHistoricoGeral() {
  const lista = document.getElementById('listaHistorico');
  lista.innerHTML = '';
  [...estado.turnos].reverse().forEach((t, i) => {
    const idx = estado.turnos.length - 1 - i;
    const lucro = t.apurado - (t.custos.abastecimento + t.custos.outros);
    const li = document.createElement('li');
    li.className = 'detalhe-turno';
    li.style.position = 'relative';
    li.innerHTML = `<div style="padding:10px; border:1px solid #ccc; margin-bottom:5px; border-radius:5px;">
        <strong>Data: ${new Date(t.data+'T00:00:00').toLocaleDateString('pt-BR')}</strong><br>
        Lucro: <span style="color:green">R$ ${lucro.toFixed(2)}</span>
      </div>
      <button onclick="deletarTurno(${idx})" style="position:absolute; top:5px; right:5px; background:red; color:white; border-radius:50%">X</button>`;
    lista.appendChild(li);
  });
}

function deletarTurno(index) {
  if (confirm('Excluir este turno?')) {
    estado.turnos.splice(index, 1);
    salvar();
    carregarHistoricoGeral();
  }
}

function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const data = estado.turnos.map(t => [t.data, t.horaInicio, t.horaFim, (t.apurado - (t.custos.abastecimento + t.custos.outros)).toFixed(2)]);
  doc.text("Histórico de Turnos", 10, 10);
  doc.autoTable({ head: [['Data', 'Início', 'Fim', 'Lucro']], body: data });
  doc.save("historico.pdf");
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js'); });
}
