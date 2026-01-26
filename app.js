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
  if (telaDestino) {
    telaDestino.classList.add('ativa');
    if (id === 'resumoTurno') carregarResumoTurno();
    if (id === 'resumoDia') carregarResumoDia();
    if (id === 'historicoGeral') carregarHistoricoGeral();
    if (id === 'metasMensais') carregarTelaMetas();
  }
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
    document.getElementById('valorAbastecimento').value = '';
    atualizarTotalCustos();
    salvar();
  }
}

function adicionarOutrosCustos() {
  const v = Number(document.getElementById('valorOutrosCustos').value);
  if (v > 0 && estado.turnoAtual) {
    estado.turnoAtual.custos.outros += v;
    document.getElementById('totalOutrosCustos').value = estado.turnoAtual.custos.outros.toFixed(2);
    document.getElementById('valorOutrosCustos').value = '';
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
  if (estado.turnoAtual) {
    estado.turnoAtual.apurado = v || 0;
    salvar();
    alert('Ganhos salvos!');
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
    alert('Turno arquivado!');
    window.location.reload();
  }
}

/******************************
 * METAS E CUSTOS FIXOS (AJUSTADO AO HTML)
 ******************************/
function atualizarMetaMensal() {
  const v = Number(document.getElementById('valorMetaMensal').value);
  if (v > 0) {
    estado.metas.valorMensal = v;
    salvar();
    carregarResumoMetas();
    alert('Meta atualizada!');
  }
}

function inserirCustoFixo() {
  const desc = document.getElementById('descricaoCustoFixo').value.trim();
  const valor = Number(document.getElementById('valorCustoFixo').value);
  if (desc && valor > 0) {
    estado.metas.compromissos.push({ id: Date.now(), nome: desc, valor: valor });
    document.getElementById('descricaoCustoFixo').value = '';
    document.getElementById('valorCustoFixo').value = '';
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
  estado.metas.compromissos.forEach((c, index) => {
    total += c.valor;
    const li = document.createElement('li');
    li.style = "display:flex; flex-direction:column; gap:5px; margin-bottom:10px; padding:8px; border:1px solid #eee; border-radius:5px; background:#fff;";
    li.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <input type="text" value="${c.nome}" onchange="editarNomeCustoFixo(${index}, this.value)" style="flex:2; margin-right:5px; border:none; background:transparent; font-weight:bold;">
        <input type="number" value="${c.valor}" onchange="editarValorCustoFixo(${index}, this.value)" style="flex:1; border:none; background:transparent; text-align:right;">
        <button onclick="excluirCustoFixo(${c.id})" style="background:none; color:red; border:none; cursor:pointer; margin-left:10px;">🗑️</button>
      </div>
      <small style="color:#999; font-size:10px;">Toque no texto ou valor para editar</small>
    `;
    lista.appendChild(li);
  });
  document.getElementById('totalCustosFixos').value = total.toFixed(2);
}

function editarNomeCustoFixo(index, novoNome) {
  if (novoNome.trim()) {
    estado.metas.compromissos[index].nome = novoNome.trim();
    salvar();
    carregarResumoMetas();
  }
}

function editarValorCustoFixo(index, novoValor) {
  const v = Number(novoValor);
  if (v >= 0) {
    estado.metas.compromissos[index].valor = v;
    salvar();
    renderizarListaCustosFixos();
    carregarResumoMetas();
  }
}

function carregarResumoMetas() {
  // O lucro do mês é a soma dos lucros de todos os turnos
  const lucroTurnos = estado.turnos.reduce((acc, t) => acc + (t.apurado - (t.custos.abastecimento + t.custos.outros)), 0);
  const totalFixos = estado.metas.compromissos.reduce((acc, c) => acc + c.valor, 0);
  
  // A meta é independente dos custos fixos, conforme sua solicitação
  const falta = Math.max(estado.metas.valorMensal - lucroTurnos, 0);

  document.getElementById('resumoSuaMeta').value = `R$ ${estado.metas.valorMensal.toFixed(2)}`;
  document.getElementById('resumoTotalCustosFixos').value = `R$ ${totalFixos.toFixed(2)}`;
  document.getElementById('resumoLucroDoMes').value = `R$ ${lucroTurnos.toFixed(2)}`;
  document.getElementById('resumoFaltaParaMeta').value = `R$ ${falta.toFixed(2)}`;
}

function carregarTelaMetas() {
  document.getElementById('valorMetaMensal').value = estado.metas.valorMensal || '';
  renderizarListaCustosFixos();
  carregarResumoMetas();
}

function carregarResumoMetas() {
  const lucroTurnos = estado.turnos.reduce((acc, t) => acc + (t.apurado - (t.custos.abastecimento + t.custos.outros)), 0);
  const totalFixos = estado.metas.compromissos.reduce((acc, c) => acc + c.valor, 0);
  const lucroLiquido = lucroTurnos - totalFixos;
  const falta = Math.max(estado.metas.valorMensal - lucroLiquido, 0);

  document.getElementById('resumoSuaMeta').value = `R$ ${estado.metas.valorMensal.toFixed(2)}`;
  document.getElementById('resumoTotalCustosFixos').value = `R$ ${totalFixos.toFixed(2)}`;
  document.getElementById('resumoLucroDoMes').value = `R$ ${lucroLiquido.toFixed(2)}`;
  document.getElementById('resumoFaltaParaMeta').value = `R$ ${falta.toFixed(2)}`;
}

/******************************
 * RESUMOS E HISTÓRICO
 ******************************/
function carregarResumoTurno() {
  const t = estado.turnoAtual;
  if (!t) return;
  const min = diffHoras(t.horaInicio, t.horaFim);
  const custos = t.custos.abastecimento + t.custos.outros;
  document.getElementById('resumoHoras').innerText = formatarMinutosParaHHMM(min);
  document.getElementById('resumoKM').innerText = `${t.kmFinal - t.kmInicial} km`;
  document.getElementById('resumoCustos').innerText = `R$ ${custos.toFixed(2)}`;
  document.getElementById('resumoLucro').innerText = `R$ ${(t.apurado - custos).toFixed(2)}`;
  const lucro = t.apurado - custos;
  const vHora = (min / 60) > 0 ? lucro / (min / 60) : 0;
  document.getElementById('resumoValorHora').innerText = `R$ ${vHora.toFixed(2)}/h`;
}

function carregarResumoDia() {
  const hoje = new Date().toISOString().split('T')[0];
  const turnos = estado.turnos.filter(t => t.data === hoje);
  let lucro = 0, km = 0, min = 0, gas = 0, out = 0, apur = 0;
  turnos.forEach(t => {
    min += diffHoras(t.horaInicio, t.horaFim);
    km += (t.kmFinal - t.kmInicial);
    gas += t.custos.abastecimento;
    out += t.custos.outros;
    apur += t.apurado;
    lucro += (t.apurado - (t.custos.abastecimento + t.custos.outros));
  });
  document.getElementById('diaHorasTrabalhadas').innerText = formatarMinutosParaHHMM(min);
  document.getElementById('diaKM').innerText = `${km} km`;
  document.getElementById('diaAbastecido').innerText = `R$ ${gas.toFixed(2)}`;
  document.getElementById('diaOutrosCustos').innerText = `R$ ${out.toFixed(2)}`;
  document.getElementById('diaApurado').innerText = `R$ ${apur.toFixed(2)}`;
  document.getElementById('diaLucro').innerText = `R$ ${lucro.toFixed(2)}`;
  const vHora = (min / 60) > 0 ? lucro / (min / 60) : 0;
  document.getElementById('diaValorHora').innerText = `R$ ${vHora.toFixed(2)}/h`;
}

function carregarHistoricoGeral() {
  const lista = document.getElementById('listaHistorico');
  lista.innerHTML = '';
  
  [...estado.turnos].reverse().forEach((t, i) => {
    const idx = estado.turnos.length - 1 - i;
    const min = diffHoras(t.horaInicio, t.horaFim);
    const km = t.kmFinal - t.kmInicial;
    const custosTotal = t.custos.abastecimento + t.custos.outros;
    const lucro = t.apurado - custosTotal;
    const vHora = (min / 60) > 0 ? lucro / (min / 60) : 0;

    const li = document.createElement('li');
    li.className = 'detalhe-turno';
    li.style = "position:relative; border:1px solid #ccc; padding:15px; margin-bottom:15px; border-radius:8px; background:#fff; line-height:1.6; font-size:13px; color:#444;";
    
    li.innerHTML = `
      <div style="border-bottom:1px solid #eee; margin-bottom:10px; padding-bottom:5px; display:flex; justify-content:space-between;">
        <strong>📅 ${new Date(t.data+'T00:00:00').toLocaleDateString('pt-BR')}</strong>
        <strong>🕒 ${t.horaInicio} - ${t.horaFim}</strong>
      </div>
      <p style="margin:2px 0;">⏱ Intervalo Total: <strong>${formatarMinutosParaHHMM(min)}</strong></p>
      <p style="margin:2px 0;">🛣 KM Total Rodado: <strong>${km} km</strong></p>
      <p style="margin:2px 0;">⛽ Total Abastecido: R$ ${t.custos.abastecimento.toFixed(2)}</p>
      <p style="margin:2px 0;">🛠 Outros Custos: R$ ${t.custos.outros.toFixed(2)}</p>
      <p style="margin:2px 0;">💰 Valor Apurado: R$ ${t.apurado.toFixed(2)}</p>
      <hr style="border:0; border-top:1px dashed #eee;">
      <p style="margin:2px 0; font-size:15px;">💵 Lucro do Dia: <strong style="color:green;">R$ ${lucro.toFixed(2)}</strong></p>
      <p style="margin:2px 0;">📈 Valor Médio da Hora: <strong>R$ ${vHora.toFixed(2)}/h</strong></p>
      
      <button onclick="deletarTurno(${idx})" style="position:absolute; top:12px; right:10px; background:#ff4444; color:white; border-radius:50%; width:24px; height:24px; border:none; cursor:pointer; font-size:12px;">X</button>
    `;
    lista.appendChild(li);
  });
}
function deletarTurno(index) {
  if (confirm('Deseja excluir este turno permanentemente?')) {
    estado.turnos.splice(index, 1);
    salvar();
    carregarHistoricoGeral();
  }
}

function limparTodoHistorico() {
  if (confirm('ATENÇÃO: Isso apagará todos os turnos salvos! Confirma?')) {
    estado.turnos = [];
    salvar();
    carregarHistoricoGeral();
  }
}

function exportarExcel() {
  let csv = "Data;Início;Fim;KM Rodado;Lucro\n";
  estado.turnos.forEach(t => {
    const lucro = t.apurado - (t.custos.abastecimento + t.custos.outros);
    csv += `${t.data};${t.horaInicio};${t.horaFim};${t.kmFinal-t.kmInicial};${lucro.toFixed(2)}\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "historico_controle.csv";
  link.click();
}

function exportarPDF() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  const col = ["Data", "Horário", "KM", "Lucro"];
  const rows = estado.turnos.map(t => [t.data, `${t.horaInicio}-${t.horaFim}`, t.kmFinal-t.kmInicial, (t.apurado-(t.custos.abastecimento+t.custos.outros)).toFixed(2)]);
  doc.text("Histórico de Turnos - Controle Diário", 10, 10);
  doc.autoTable({ head: [col], body: rows, startY: 20 });
  doc.save("historico.pdf");
}

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => { navigator.serviceWorker.register('./sw.js'); });
}

