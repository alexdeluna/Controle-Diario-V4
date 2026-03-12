// ==========================================
// 1. ESTADO E NAVEGAÇÃO.
// ==========================================
const screens = {
    menu: document.getElementById('menu-principal'),
    menuTurno: document.getElementById('screen-menu-turno'),
    iniciar: document.getElementById('screen-turno'),
    finalizar: document.getElementById('screen-finalizar-turno'),
    custos: document.getElementById('screen-menu-custos'),
    abastecimento: document.getElementById('screen-abastecimento'),
    outrosCustos: document.getElementById('screen-outros-custos'),
    resumos: document.getElementById('screen-resumos'),
    resumoDiario: document.getElementById('screen-resumo-diario'),
    historicoGeral: document.getElementById('screen-historico-geral'),
	acompanhando: document.getElementById('screen-acompanhando-resultados'),
	metas: document.getElementById('screen-metas'),
    metaMensal: document.getElementById('screen-meta-mensal'),
    metaSemanal: document.getElementById('screen-meta-semanal'),
    metaDiaria: document.getElementById('screen-meta-diaria'),
    metaDataValor: document.getElementById('screen-meta-data-valor')
	
	};

function showScreen(screen) {
    Object.values(screens).forEach(s => { if(s) s.classList.add('hidden'); });
    if (screen) screen.classList.remove('hidden');
    window.scrollTo(0, 0);
}

function updateDateTime() {
    const now = new Date();
    const dateEl = document.getElementById('current-date');
    const timeEl = document.getElementById('current-time');
    if(dateEl) dateEl.textContent = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    if(timeEl) timeEl.textContent = now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
setInterval(updateDateTime, 60000);
updateDateTime();

// ==========================================
// 2. GESTÃO DE DADOS (LOCALSTORAGE)
// ==========================================

const getData = (key) => JSON.parse(localStorage.getItem(key)) || [];
const setData = (key, data) => localStorage.setItem(key, JSON.stringify(data));

// ==========================================
// 3. LÓGICA DE TURNOS E SESSÕES
// ==========================================

function gerenciarEstadoInterface() {
    const turnoAtivo = JSON.parse(localStorage.getItem('turnoAtivo'));
    const statusInd = document.getElementById('status-indicador');
    const btnIni = document.getElementById('btn-iniciar-turno');

    if (turnoAtivo && turnoAtivo.ativo) {
        statusInd.textContent = '🟢 Turno ativo';
        if(btnIni) { btnIni.disabled = true; btnIni.textContent = "Turno em Andamento"; }
    } else {
        statusInd.textContent = '🔴 Turno inativo';
        if(btnIni) { btnIni.disabled = false; btnIni.textContent = "Iniciar Turno"; }
    }
}

document.getElementById('btn-iniciar-turno').onclick = () => {
    const h = document.getElementById('hora-inicio').value;
    const k = document.getElementById('km-inicial').value;
    if(!h || !k) return alert("Informe Hora e KM inicial!");

    localStorage.setItem('turnoAtivo', JSON.stringify({ 
        ativo: true, horaInicio: h, kmInicial: parseFloat(k), data: new Date().toLocaleDateString('pt-BR') 
    }));
    gerenciarEstadoInterface();
    showScreen(screens.menu);
};

document.getElementById('btn-finalizar-turno').onclick = () => {
    const turnoAtivo = JSON.parse(localStorage.getItem('turnoAtivo'));
    if (!turnoAtivo) return alert("⚠️ Erro: Não há turno ativo!");

    const hF = document.getElementById('hora-fim').value;
    const kF = parseFloat(document.getElementById('km-final').value);
    const apu = parseFloat(document.getElementById('apurado').value);

    if(!hF || isNaN(kF) || isNaN(apu)) return alert("Preencha todos os campos!");

    const hoje = turnoAtivo.data;
    const historico = JSON.parse(localStorage.getItem('historico_dias')) || {};

    if (!historico[hoje]) {
        historico[hoje] = { sessoes: [] };
    }

    historico[hoje].sessoes.push({
        id: Date.now(),
        hI: turnoAtivo.horaInicio,
        hF: hF,
        kI: turnoAtivo.kmInicial,
        kF: kF,
        apurado: apu
    });

    localStorage.setItem('historico_dias', JSON.stringify(historico));
    localStorage.removeItem('turnoAtivo');
    
    gerenciarEstadoInterface();
    alert("✅ Sessão salva no dia!");
	atualizarResumoGeral();
    showScreen(screens.menu);
};

// ==========================================
// FILTRO DE RESULTADOS POR PERÍODO
// ==========================================

function filtrarResultadosPorPeriodo(dataInicio, dataFim){

    const historico = JSON.parse(localStorage.getItem("historico_dias")) || {};
    const resultado = [];

    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    Object.keys(historico).forEach(dataBR => {

        const partes = dataBR.split("/");
        const dataObj = new Date(partes[2], partes[1]-1, partes[0]);

        if(dataObj >= inicio && dataObj <= fim){
            resultado.push(historico[dataBR]);
        }

    });

    atualizarPainelResultadoPeriodo(resultado);

}

// ==========================================
// FILTRO DE PERÍODO - ACOMPANHANDO RESULTADOS
// ==========================================

const btnFiltrarPeriodo = document.getElementById("btn-filtrar-periodo");

if (btnFiltrarPeriodo) {
    btnFiltrarPeriodo.onclick = () => {

        const inicio = document.getElementById("data-inicio").value;
        const fim = document.getElementById("data-fim").value;

        if (!inicio || !fim) {
            alert("Selecione o período.");
            return;
        }

        filtrarResultadosPorPeriodo(inicio, fim);

    };
}


// ==========================================
// 4. CUSTOS
// ==========================================

document.getElementById('btn-salvar-abastecimento').onclick = () => {
    const valor = parseFloat(document.getElementById('valor-abastecimento').value);
    if (!valor) return alert("Valor inválido!");

    const lista = getData('abastecimentos');
    lista.push({ data: new Date().toLocaleDateString('pt-BR'), valor });
    setData('abastecimentos', lista);
    
    document.getElementById('valor-abastecimento').value = "";
    atualizarPainelResumoCustos();
	atualizarResumoAbastecimento();
	atualizarResumoGeral();
    alert("Salvo!");
};

document.getElementById('btn-salvar-custo-outro').onclick = () => {
    const tipo = document.getElementById('tipo-custo').value;
    const descInput = document.getElementById('desc-custo-outros'); // Referência ao input
    const valorInput = document.getElementById('valor-custo-outro');
    const valor = parseFloat(valorInput.value);

    if (!valor) return alert("Insira o valor do custo!");

    const lista = getData('outros_custos');
    lista.push({ 
        data: new Date().toLocaleDateString('pt-BR'), 
        desc: tipo === 'Outros' ? descInput.value : tipo, 
        valor: valor 
    });
    setData('outros_custos', lista);

    // LIMPEZA DOS CAMPOS APÓS ADICIONAR
    valorInput.value = '';
    descInput.value = ''; // Esta linha limpa a descrição
    atualizarPainelResumoCustos();
    atualizarListaCustos();
	atualizarResumoGeral();
    alert("Custo adicionado!");
};


function atualizarResumoAbastecimento() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const total = getData('abastecimentos').filter(a => a.data === hoje).reduce((acc, a) => acc + a.valor, 0);
    const el = document.getElementById('total-abastecido-dia');
    if(el) el.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
}

function atualizarListaCustos() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const custosHoje = getData('outros_custos').filter(c => c.data === hoje);
    const total = custosHoje.reduce((acc, c) => acc + c.valor, 0);
    const totalUI = document.getElementById('total-outros-valor');
    const listaUI = document.getElementById('lista-detalhada-custos');

    if (totalUI) totalUI.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
    if (listaUI) {
        listaUI.innerHTML = custosHoje.map(c => `
            <li style="background: #374151; padding: 10px; border-radius: 8px; margin-bottom: 5px; display: flex; justify-content: space-between;">
                <span>${c.desc}</span>
                <strong>R$ ${c.valor.toFixed(2).replace('.', ',')}</strong>
            </li>
        `).join('');
    }
}

// ==========================================
// 5. RENDERIZAÇÃO DE CARDS (O CORAÇÃO DO APP)
// ==========================================

function excluirSessao(data, id) {
    if(!confirm("Deseja excluir esta sessão?")) return;
    const historico = JSON.parse(localStorage.getItem('historico_dias'));
    historico[data].sessoes = historico[data].sessoes.filter(s => s.id !== id);
    
    if(historico[data].sessoes.length === 0) delete historico[data];
    
    localStorage.setItem('historico_dias', JSON.stringify(historico));
    document.getElementById('btn-historico-geral').click(); // Recarrega tela
}

function renderizarDia(data, infoDia) {
    const abast = getData('abastecimentos')
        .filter(a => a.data === data)
        .reduce((acc, a) => acc + a.valor, 0);

    const outros = getData('outros_custos')
        .filter(c => c.data === data)
        .reduce((acc, c) => acc + c.valor, 0);
    
    let totalKM = 0;
    let totalApurado = 0;
    let totalMinutos = 0;

    const sessoesHTML = infoDia.sessoes.map((s, index) => {
        const kmSessao = (s.kF - s.kI);
        totalKM += kmSessao;
        totalApurado += s.apurado;
        
        const [hI, mI] = s.hI.split(':').map(Number);
        const [hF, mF] = s.hF.split(':').map(Number);

        let diff = (hF * 60 + mF) - (hI * 60 + mI);
        if (diff < 0) diff += 1440;

        totalMinutos += diff;

        return `
        <div style="font-size: 13px; color: var(--muted); background: rgba(0,0,0,0.1); padding: 8px; border-radius: 8px; margin-bottom: 8px; position: relative;">
            <strong>Sessão ${index + 1}:</strong> ${s.hI} às ${s.hF} | 
            KM: ${kmSessao} | Apur: R$ ${s.apurado.toFixed(2).replace('.', ',')}
            <button onclick="excluirSessao('${data}', ${s.id})"
                style="background:none; border:none; color:var(--red); font-size:18px; position:absolute; right:10px; top:5px; cursor:pointer;">
                &times;
            </button>
        </div>`;
    }).join('');

    const lucro = totalApurado - abast - outros;
	
	// CUSTOS TOTAIS
const totalCustos = abast + outros;

// CUSTO POR KM
const custoPorKm = totalKM > 0 ? totalCustos / totalKM : 0;

    // -------------------------
    // MÉTRICAS BRUTAS (APURADO)
    // -------------------------
    const valorHoraBruto = totalMinutos > 0 ? totalApurado / (totalMinutos / 60) : 0;
    const valorKmBruto = totalKM > 0 ? totalApurado / totalKM : 0;

    // -------------------------
    // MÉTRICAS LÍQUIDAS (LUCRO)
    // -------------------------
    const valorHoraLiquido = totalMinutos > 0 ? lucro / (totalMinutos / 60) : 0;
    const valorKmLiquido = totalKM > 0 ? lucro / totalKM : 0;

    const intervaloFormatado =
        `${Math.floor(totalMinutos/60).toString().padStart(2,'0')}:` +
        `${(totalMinutos%60).toString().padStart(2,'0')}h`;

    return `
    <div class="resumo-card">
        <div class="card-header">
            <span class="card-title">Resumo Diário</span>
            <span class="card-date">${data}</span>
        </div>

        <div class="card-body">

            <p><span>Intervalo total:</span> <strong>${intervaloFormatado}</strong></p>
            <p><span>KM total rodado:</span> <strong>${totalKM} km</strong></p>
            <p><span>Total Abastecido:</span> <strong>R$ ${abast.toFixed(2).replace('.',',')}</strong></p>
            <p><span>Outros Custos:</span> <strong>R$ ${outros.toFixed(2).replace('.',',')}</strong></p>
            <p><span>Valor Apurado:</span> <strong>R$ ${totalApurado.toFixed(2).replace('.',',')}</strong></p>

            <hr>

            <p style="color: ${lucro >= 0 ? '#4ade80' : '#ef4444'}; font-size: 18px; font-weight: bold;">
                <span>Lucro do Dia:</span> 
                <span>R$ ${lucro.toFixed(2).replace('.', ',')}</span>
            </p>

            <hr>

            <p style="font-size:14px; font-weight:bold; margin-top:10px;">📊 Produtividade Bruta (Apurado)</p>
            <p>Média por Hora: <strong>R$ ${valorHoraBruto.toFixed(2).replace('.',',')}/h</strong></p>
            <p>Valor por KM: <strong>R$ ${valorKmBruto.toFixed(2).replace('.',',')}/km</strong></p>

            <hr>

            <p style="font-size:14px; font-weight:bold; margin-top:10px;">💰 Rentabilidade Líquida (Lucro)</p>
            <p>Média por Hora: <strong>R$ ${valorHoraLiquido.toFixed(2).replace('.',',')}/h</strong></p>
            <p>Valor por KM: <strong>R$ ${valorKmLiquido.toFixed(2).replace('.',',')}/km</strong></p>

            <hr>

            <p style="font-size: 12px; text-transform: uppercase; color: var(--blue); margin-bottom: 10px; font-weight: bold;">
                Detalhamento de Sessões:
            </p>

            <div>${sessoesHTML}</div>
        </div>
    </div>`;
}

   
    

// ==========================================
// 6. EVENTOS E NAVEGAÇÃO
// ==========================================

document.querySelectorAll('.menu-card').forEach(card => {
    card.onclick = () => {
        const action = card.dataset.action;
        if (action === 'turno') showScreen(screens.menuTurno);
        
        if (action === 'custos') { 
            // 1. Atualiza o Resumo Geral (o novo painel que você pediu)
            atualizarPainelResumoCustos();             
            // 2. Deixa as subtelas prontas caso o motorista clique nelas
            atualizarResumoAbastecimento(); 
            atualizarListaCustos();             
            showScreen(screens.custos); 
        }
        if (action === 'resumos') showScreen(screens.resumos);
		if (action === 'metas') showScreen(screens.metas);
		if (action === 'acompanhando') {
			atualizarPainelResultados();
			showScreen(screens.acompanhando);
}
    };
});

document.getElementById('btn-resumo-diario').onclick = () => {
    const hoje = new Date().toLocaleDateString('pt-BR');
    const historico = JSON.parse(localStorage.getItem('historico_dias')) || {};
    if (!historico[hoje]) return alert("Nenhuma sessão finalizada hoje!");
    
    const container = document.querySelector('#screen-resumo-diario .resumo-dia');
    container.innerHTML = renderizarDia(hoje, historico[hoje]);
    showScreen(screens.resumoDiario);
};

document.getElementById('btn-historico-geral').onclick = () => {
    const historico = JSON.parse(localStorage.getItem('historico_dias')) || {};
    const lista = document.getElementById('lista-historico');
    const chaves = Object.keys(historico).reverse();
    
    if (chaves.length === 0) {
        lista.innerHTML = "<p style='text-align:center'>Nenhum histórico encontrado.</p>";
    } else {
        lista.innerHTML = chaves.map(data => renderizarDia(data, historico[data])).join('');
    }
    showScreen(screens.historicoGeral);
};

// Botões Auxiliares
document.getElementById('btn-ir-iniciar-turno').onclick = () => showScreen(screens.iniciar);
document.getElementById('btn-ir-finalizar-turno').onclick = () => showScreen(screens.finalizar);
document.getElementById('btn-ir-abastecimento').onclick = () => showScreen(screens.abastecimento);
document.getElementById('btn-ir-outros-custos').onclick = () => showScreen(screens.outrosCustos);
document.getElementById('btn-hora-atual').onclick = () => document.getElementById('hora-inicio').value = new Date().toTimeString().slice(0, 5);
document.getElementById('btn-hora-final-atual').onclick = () => document.getElementById('hora-fim').value = new Date().toTimeString().slice(0, 5);
document.getElementById('tipo-custo').onchange = (e) => document.getElementById('group-desc-outros').classList.toggle('hidden', e.target.value !== 'Outros');

// Botões Voltar
const botoesVoltar = [
    ['voltar-menu-principal', screens.menu],
	['voltar-menu-turno', screens.menuTurno],
    ['voltar-menu-finalizar', screens.menuTurno],
	['voltar-custos-principal', screens.menu],
    ['voltar-menu-custos-abast', screens.custos],
	['voltar-menu-custos-outros', screens.custos],
    ['voltar-menu-resumos', screens.menu],
	['voltar-resumo-diario', screens.resumos],
	['voltar-historico', screens.resumos],
	['voltar-acompanhando', screens.menu],
	//['voltar-menu-metas', screens.menu],
	['voltar-metas-mensal', screens.metas],
    ['voltar-metas-semanal', screens.metas],
    ['voltar-metas-diaria', screens.metas],
    ['voltar-metas-data', screens.metas]
];
botoesVoltar.forEach(([id, screen]) => {
    const btn = document.getElementById(id);
    if(btn) btn.onclick = () => showScreen(screen);
	
});

window.onload = () => {
    gerenciarEstadoInterface();
    atualizarResumoGeral();
};

// ==========================================
// 8. EXPORTAÇÃO (PDF E EXCEL) REVISADA
// ==========================================

// --- EXPORTAR PARA PDF (COM TOTAIS E LUCRO) ---
document.getElementById('export-pdf').onclick = () => {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    const historico = JSON.parse(localStorage.getItem('historico_dias')) || {};
    const chaves = Object.keys(historico).reverse();

    if (chaves.length === 0) return alert("Não há dados para exportar!");

    let yPos = 20;
    doc.setFontSize(16);
    doc.text("Relatório Detalhado - Controle Diário", 14, yPos);
    yPos += 10;

    chaves.forEach((data) => {
        const infoDia = historico[data];
        
        // Busca custos do dia para o cálculo
        const abast = (JSON.parse(localStorage.getItem('abastecimentos')) || []).filter(a => a.data === data).reduce((acc, a) => acc + a.valor, 0);
        const outros = (JSON.parse(localStorage.getItem('outros_custos')) || []).filter(c => c.data === data).reduce((acc, c) => acc + c.valor, 0);
        
        let totalKM = 0, totalApurado = 0, totalMinutos = 0;

        // Prepara as linhas da tabela de sessões
        const corpoTabela = infoDia.sessoes.map((s, idx) => {
            const kmSessao = s.kF - s.kI;
            totalKM += kmSessao;
            totalApurado += s.apurado;
            
            // Cálculo de tempo
            const [hI, mI] = s.hI.split(':').map(Number);
            const [hF, mF] = s.hF.split(':').map(Number);
            let diff = (hF * 60 + mF) - (hI * 60 + mI);
            if (diff < 0) diff += 1440;
            totalMinutos += diff;

            return [idx + 1, s.hI, s.hF, `${kmSessao} km`, `R$ ${s.apurado.toFixed(2)}` ];
        });

        const lucro = totalApurado - abast - outros;
        // MÉTRICAS BASEADAS NO APURADO
		const valorHoraApurado = totalMinutos > 0 ? totalApurado / (totalMinutos / 60) : 0;
		const valorKmApurado = totalKM > 0 ? totalApurado / totalKM : 0;
		// MÉTRICAS BASEADAS NO LUCRO
		const valorHoraLucro = totalMinutos > 0 ? lucro / (totalMinutos / 60) : 0;
		const valorKmLucro = totalKM > 0 ? lucro / totalKM : 0;
        const tempoFmt = `${Math.floor(totalMinutos/60).toString().padStart(2,'0')}:${(totalMinutos%60).toString().padStart(2,'0')}h`;

        // Verifica se precisa de nova página
        if (yPos > 240) { doc.addPage(); yPos = 20; }

        // Título do Dia
        doc.setFontSize(11);
        doc.setTextColor(255, 255, 255);
        doc.setFillColor(31, 41, 51);
        doc.rect(14, yPos, 182, 7, 'F');
        doc.text(`DATA: ${data}`, 16, yPos + 5);
        
        // Tabela de sessões
        doc.autoTable({
            startY: yPos + 7,
            head: [['Sessão', 'Início', 'Fim', 'KM', 'Apurado']],
            body: corpoTabela,
            theme: 'grid',
            headStyles: { fillColor: [55, 65, 81] },
            styles: { fontSize: 9 },
            margin: { left: 14 }
        });

        yPos = doc.lastAutoTable.finalY + 6;
        
        // Resumo do Dia (O que você solicitou)
        doc.setTextColor(0, 0, 0);
        doc.setFontSize(9);
        const resumo = [
			`Intervalo Total: ${tempoFmt} | KM Total: ${totalKM} km`,
			`Combustível: R$ ${abast.toFixed(2)} | Outros Custos: R$ ${outros.toFixed(2)}`,
			`Total Apurado: R$ ${totalApurado.toFixed(2)}`,
			`Lucro do Dia: R$ ${lucro.toFixed(2)}`,
			`Média (Apurado): R$ ${valorHoraApurado.toFixed(2)}/h | R$ ${valorKmApurado.toFixed(2)}/km`,
			`Média (Lucro): R$ ${valorHoraLucro.toFixed(2)}/h | R$ ${valorKmLucro.toFixed(2)}/km`
		];

        resumo.forEach(linha => {
            doc.text(linha, 14, yPos);
            yPos += 5;
        });

        yPos += 7; // Espaço para o próximo dia
    });

    doc.save(`Relatorio_Controle_Diario.pdf`);
};

// --- EXPORTAR PARA EXCEL (CSV DETALHADO) ---
document.getElementById('export-excel').onclick = () => {

    const historico = JSON.parse(localStorage.getItem('historico_dias')) || {};
    const chaves = Object.keys(historico).reverse();

    if (chaves.length === 0) {
        alert("Não há dados!");
        return;
    }

    let csv = "Data;Intervalo;KM Total;Abastecimento;Outros;Apurado;Lucro;Media/h Apurado;R$/km Apurado;Media/h Lucro;R$/km Lucro\n";

    let somaKM = 0;
    let somaApurado = 0;
    let somaLucro = 0;
    let somaAbast = 0;
    let somaOutros = 0;
    let somaMin = 0;

    chaves.forEach(data => {

        const info = historico[data];

        const abast = (JSON.parse(localStorage.getItem('abastecimentos')) || [])
            .filter(a => a.data === data)
            .reduce((acc, a) => acc + a.valor, 0);

        const outros = (JSON.parse(localStorage.getItem('outros_custos')) || [])
            .filter(c => c.data === data)
            .reduce((acc, c) => acc + c.valor, 0);

        let totalKM = 0;
        let totalApurado = 0;
        let totalMin = 0;

        info.sessoes.forEach(s => {

            const kmSessao = s.kF - s.kI;
            totalKM += kmSessao;
            totalApurado += s.apurado;

            const [hI, mI] = s.hI.split(':').map(Number);
            const [hF, mF] = s.hF.split(':').map(Number);

            let diff = (hF * 60 + mF) - (hI * 60 + mI);
            if (diff < 0) diff += 1440;

            totalMin += diff;
        });

        const lucro = totalApurado - abast - outros;
        const horas = totalMin / 60;

        const mediaHoraApurado = horas > 0 ? totalApurado / horas : 0;
        const kmApurado = totalKM > 0 ? totalApurado / totalKM : 0;

        const mediaHoraLucro = horas > 0 ? lucro / horas : 0;
        const kmLucro = totalKM > 0 ? lucro / totalKM : 0;

        const tempo = `${Math.floor(totalMin / 60)}h${totalMin % 60}m`;

        csv += `${data};${tempo};${totalKM};${abast.toFixed(2)};${outros.toFixed(2)};${totalApurado.toFixed(2)};${lucro.toFixed(2)};${mediaHoraApurado.toFixed(2)};${kmApurado.toFixed(2)};${mediaHoraLucro.toFixed(2)};${kmLucro.toFixed(2)}\n`;

        // acumuladores
        somaKM += totalKM;
        somaApurado += totalApurado;
        somaLucro += lucro;
        somaAbast += abast;
        somaOutros += outros;
        somaMin += totalMin;

    });

    const horasTotais = somaMin / 60;

    const mediaHoraApuradoGeral = horasTotais > 0 ? somaApurado / horasTotais : 0;
    const kmApuradoGeral = somaKM > 0 ? somaApurado / somaKM : 0;

    const mediaHoraLucroGeral = horasTotais > 0 ? somaLucro / horasTotais : 0;
    const kmLucroGeral = somaKM > 0 ? somaLucro / somaKM : 0;

    csv += "\n";
    csv += `TOTAL;;${somaKM};${somaAbast.toFixed(2)};${somaOutros.toFixed(2)};${somaApurado.toFixed(2)};${somaLucro.toFixed(2)};;;;\n`;
    csv += `MEDIA GERAL;;;;;;;${mediaHoraApuradoGeral.toFixed(2)};${kmApuradoGeral.toFixed(2)};${mediaHoraLucroGeral.toFixed(2)};${kmLucroGeral.toFixed(2)}\n`;

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });

    saveAs(blob, "Relatorio_Controle_Diario.csv");
};

// --- EXPORTAR RELATÓRIO MENSAL ---
document.getElementById('export-mensal').onclick = () => {

    const historico = JSON.parse(localStorage.getItem('historico_dias')) || {};

    if (Object.keys(historico).length === 0) {
        alert("Não há dados!");
        return;
    }

    const abastecimentos = JSON.parse(localStorage.getItem('abastecimentos')) || [];
    const outrosCustos = JSON.parse(localStorage.getItem('outros_custos')) || [];

    const meses = {};

    Object.keys(historico).forEach(data => {

        const [dia, mes, ano] = data.split('/');
        const chaveMes = `${mes}/${ano}`;

        if (!meses[chaveMes]) {
            meses[chaveMes] = {
                km: 0,
                apurado: 0,
                lucro: 0,
                abast: 0,
                outros: 0,
                minutos: 0
            };
        }

        const info = historico[data];

        let kmDia = 0;
        let apuradoDia = 0;
        let minDia = 0;

        info.sessoes.forEach(s => {

            const kmSessao = s.kF - s.kI;
            kmDia += kmSessao;

            apuradoDia += s.apurado;

            const [hI, mI] = s.hI.split(':').map(Number);
            const [hF, mF] = s.hF.split(':').map(Number);

            let diff = (hF * 60 + mF) - (hI * 60 + mI);
            if (diff < 0) diff += 1440;

            minDia += diff;
        });

        const abastDia = abastecimentos
            .filter(a => a.data === data)
            .reduce((acc, a) => acc + a.valor, 0);

        const outrosDia = outrosCustos
            .filter(c => c.data === data)
            .reduce((acc, c) => acc + c.valor, 0);

        const lucroDia = apuradoDia - abastDia - outrosDia;

        meses[chaveMes].km += kmDia;
        meses[chaveMes].apurado += apuradoDia;
        meses[chaveMes].lucro += lucroDia;
        meses[chaveMes].abast += abastDia;
        meses[chaveMes].outros += outrosDia;
        meses[chaveMes].minutos += minDia;

    });

    let csv = "Mes;KM Total;Abastecimento;Outros;Apurado;Lucro;Media/h Apurado;R$/km Apurado;Media/h Lucro;R$/km Lucro\n";

    Object.keys(meses).sort().forEach(mes => {

        const dados = meses[mes];

        const horas = dados.minutos / 60;

        const mediaHoraApurado = horas > 0 ? dados.apurado / horas : 0;
        const kmApurado = dados.km > 0 ? dados.apurado / dados.km : 0;

        const mediaHoraLucro = horas > 0 ? dados.lucro / horas : 0;
        const kmLucro = dados.km > 0 ? dados.lucro / dados.km : 0;

        csv += `${mes};${dados.km};${dados.abast.toFixed(2)};${dados.outros.toFixed(2)};${dados.apurado.toFixed(2)};${dados.lucro.toFixed(2)};${mediaHoraApurado.toFixed(2)};${kmApurado.toFixed(2)};${mediaHoraLucro.toFixed(2)};${kmLucro.toFixed(2)}\n`;

    });

    const blob = new Blob(["\ufeff" + csv], { type: "text/csv;charset=utf-8;" });

    saveAs(blob, "Relatorio_Mensal.csv");

};


// Função que realiza as somas (adicione ao final do arquivo)
function atualizarPainelResumoCustos() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    // Soma Abastecimentos
    const abastecimentos = JSON.parse(localStorage.getItem('abastecimentos')) || [];
    const totalAbast = abastecimentos
        .filter(a => a.data === hoje)
        .reduce((acc, a) => acc + a.valor, 0);

    // Soma Outros Custos
    const outros = JSON.parse(localStorage.getItem('outros_custos')) || [];
    const totalOutros = outros
        .filter(c => c.data === hoje)
        .reduce((acc, c) => acc + c.valor, 0);

    // Escreve os valores no HTML (IDs batendo com o passo 1)
    const abastEl = document.getElementById('resumo-custo-abast');
    const outrosEl = document.getElementById('resumo-custo-outros');
    const totalEl = document.getElementById('resumo-custo-total');

    if(abastEl) abastEl.textContent = `R$ ${totalAbast.toFixed(2).replace('.', ',')}`;
    if(outrosEl) outrosEl.textContent = `R$ ${totalOutros.toFixed(2).replace('.', ',')}`;
    if(totalEl) totalEl.textContent = `R$ ${(totalAbast + totalOutros).toFixed(2).replace('.', ',')}`;
}

// ==========================================
// 9. LÓGICA DE METAS (PADRÃO VISUAL APP)
// ==========================================

// --- NAVEGAÇÃO DOS BOTÕES DO MENU DE METAS ---
document.getElementById('btn-meta-mensal').onclick = () => { showScreen(screens.metaMensal); atualizarProgressoMeta('mensal'); };
document.getElementById('btn-meta-semanal').onclick = () => { showScreen(screens.metaSemanal); atualizarProgressoMeta('semanal'); };
document.getElementById('btn-meta-diaria').onclick = () => { showScreen(screens.metaDiaria); atualizarProgressoMeta('diario'); };
document.getElementById('btn-meta-por-data').onclick = () => { showScreen(screens.metaDataValor); renderizarMetasPorData(); };

// --- SALVAR VALORES DAS METAS ---
const salvarMetaSimples = (tipo) => {
    const input = document.getElementById(`input-meta-${tipo}`);
    if(!input.value) return alert("Insira um valor!");
    localStorage.setItem(`config_meta_${tipo}`, input.value);
    atualizarProgressoMeta(tipo);
    alert("Meta salva!");
};

if(document.getElementById('btn-salvar-meta-mensal')) document.getElementById('btn-salvar-meta-mensal').onclick = () => salvarMetaSimples('mensal');
if(document.getElementById('btn-salvar-meta-semanal')) document.getElementById('btn-salvar-meta-semanal').onclick = () => salvarMetaSimples('semanal');
if(document.getElementById('btn-salvar-meta-diaria')) document.getElementById('btn-salvar-meta-diaria').onclick = () => salvarMetaSimples('diaria');

// --- ATUALIZAR INTERFACE DE PROGRESSO ---
function atualizarProgressoMeta(tipo) {
    const meta = parseFloat(localStorage.getItem(`config_meta_${tipo === 'diario' ? 'diaria' : tipo}`)) || 0;
    const lucro = calcularLucroParaMeta(tipo); // Aquela função que já criamos
    const falta = meta - lucro;
    const container = document.getElementById(`progresso-${tipo}`);

    if (!container) return;

    if (tipo === 'diario') {
        const cor = falta <= 0 ? "#4ade80" : "#fbbf24";
        const msg = falta <= 0 ? "🎉 META BATIDA!" : "Meta não batida";
        container.innerHTML = `<h2 style="color:${cor}">${msg}</h2><p>Lucro hoje: R$ ${lucro.toFixed(2)}</p><p>Faltam: R$ ${falta > 0 ? falta.toFixed(2) : '0,00'}</p>`;
    } else {
        container.innerHTML = `
            <p>Sua meta: <strong>R$ ${meta.toFixed(2)}</strong></p>
            <p>Lucro acumulado: <span style="color:#4ade80">R$ ${lucro.toFixed(2)}</span></p>
            <h3 style="margin-top:10px; color:#fbbf24">${falta <= 0 ? "🎉 Meta Concluída!" : "Faltam: R$ " + falta.toFixed(2)}</h3>
        `;
    }
}

// --- LOGICA ESPECIFICA: META POR DATA E VALOR ---
document.getElementById('btn-salvar-meta-data').onclick = () => {
    const titulo = document.getElementById('meta-data-titulo').value;
    const valor = parseFloat(document.getElementById('meta-data-valor').value);
    const dataLimite = document.getElementById('meta-data-limite').value;

    if(!titulo || !valor || !dataLimite) return alert("Preencha tudo!");

    const lista = getData('metas_por_data');
    lista.push({ id: Date.now(), titulo, valor, dataLimite });
    setData('metas_por_data', lista);

    renderizarMetasPorData();
    // Limpar campos
    document.getElementById('meta-data-titulo').value = '';
    document.getElementById('meta-data-valor').value = '';
};

/*function renderizarMetasPorData() {
    const lista = getData('metas_por_data');
    const container = document.getElementById('lista-metas-data');
    const hoje = new Date();
    hoje.setHours(0,0,0,0);

    container.innerHTML = lista.map(m => {
        const alvo = new Date(m.dataLimite + "T00:00:00");
        const dias = Math.ceil((alvo - hoje) / (1000 * 60 * 60 * 24));
        const diaria = dias > 0 ? (m.valor / dias) : m.valor;

        return `
            <div style="background:var(--card); padding:15px; border-radius:12px; margin-bottom:10px; border-left:5px solid var(--blue)">
                <strong>${m.titulo}</strong> - R$ ${m.valor.toFixed(2)}
                <p style="font-size:13px; margin:5px 0;">Data: ${new Date(m.dataLimite).toLocaleDateString('pt-BR')}</p>
                <p style="color:var(--orange)">Faltam ${dias} dias | Diária necessária: <strong>R$ ${diaria.toFixed(2)}</strong></p>
            </div>
        `;
    }).join('');
}*/

function renderizarMetasPorData() {
    const lista = getData('metas_por_data');
    const container = document.getElementById('lista-metas-data');
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    if (lista.length === 0) {
        container.innerHTML = '<p style="opacity:0.5; text-align:center; padding:20px;">Nenhuma meta agendada.</p>';
        return;
    }

    // Variável para acumular a soma de todas as parcelas diárias
    let esforçoDiarioTotal = 0;

    // Gerar o HTML de cada card e calcular a soma
    const htmlCards = lista.map(m => {
        const alvo = new Date(m.dataLimite + "T00:00:00");
        const diffMs = alvo - hoje;
        const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        
        // Cálculo da parcela individual (apenas se a meta não venceu)
        const parcelaIndividual = dias > 0 ? (m.valor / dias) : 0;
        
        // Soma ao total acumulado
        if (dias > 0) {
            esforçoDiarioTotal += parcelaIndividual;
        }

        return `
            <div style="background:var(--card); padding:15px; border-radius:12px; margin-bottom:10px; border-left:5px solid var(--blue); position:relative;">
                <button onclick="excluirMetaPorData(${m.id})" style="position:absolute; top:10px; right:10px; background:none; border:none; color:#ef4444; font-size:22px; cursor:pointer;">&times;</button>
                
                <strong style="color:var(--white); display:block; margin-bottom:5px;">${m.titulo}</strong>
                <p style="font-size:13px; margin:2px 0; opacity:0.8;">Total: R$ ${m.valor.toFixed(2)} | Alvo: ${new Date(m.dataLimite).toLocaleDateString('pt-BR')}</p>
                <p style="color:var(--orange); font-size:13px; font-weight:bold;">Parcela desta meta: R$ ${parcelaIndividual.toFixed(2)}/dia</p>
            </div>
        `;
    }).join('');

    // Criar o Card de Resumo (O Esforço Total)
    const cardResumo = `
        <div style="background: linear-gradient(135deg, #1e293b, #0f172a); border: 2px solid var(--blue); padding: 20px; border-radius: 15px; margin-bottom: 20px; text-align: center; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
            <p style="font-size: 14px; text-transform: uppercase; letter-spacing: 1px; opacity: 0.8; margin-bottom: 10px;">Esforço Diário Total</p>
            <h2 style="color: #4ade80; font-size: 28px; margin: 0;">R$ ${esforçoDiarioTotal.toFixed(2)}</h2>
            <p style="font-size: 12px; opacity: 0.6; margin-top: 10px;">Lucro necessário hoje para bater as ${lista.length} metas</p>
        </div>
    `;

    container.innerHTML = cardResumo + htmlCards;
}


// NOVA FUNÇÃO PARA EXCLUIR
function excluirMetaPorData(id) {
    if (!confirm("Deseja excluir esta meta permanentemente?")) return;
    
    let lista = getData('metas_por_data');
    // Filtra a lista removendo o item com o ID clicado
    lista = lista.filter(meta => meta.id !== id);
    
    setData('metas_por_data', lista);
    renderizarMetasPorData(); // Atualiza a tela imediatamente
}


// --- BOTÕES VOLTAR ---
document.getElementById('voltar-meta-mensal').onclick = () => showScreen(screens.metas);
document.getElementById('voltar-meta-semanal').onclick = () => showScreen(screens.metas);
document.getElementById('voltar-meta-diaria').onclick = () => showScreen(screens.metas);
document.getElementById('voltar-meta-data').onclick = () => showScreen(screens.metas);

function calcularLucroParaMeta(tipo) {
    const hoje = new Date();
    const historico = JSON.parse(localStorage.getItem('historico_dias')) || {};
    const abastTotal = JSON.parse(localStorage.getItem('abastecimentos')) || [];
    const outrosTotal = JSON.parse(localStorage.getItem('outros_custos')) || [];
    
    let ganhos = 0;
    let custos = 0;

    // Regra de Filtro por período
    const filtrarData = (dataStr) => {
        const [d, m, y] = dataStr.split('/').map(Number);
        const dataItem = new Date(y, m - 1, d);
        
        if (tipo === 'mensal') {
            return dataItem.getMonth() === hoje.getMonth() && dataItem.getFullYear() === hoje.getFullYear();
        }
        if (tipo === 'semanal') {
            const primeiro = hoje.getDate() - hoje.getDay();
            const dataInicioSemana = new Date(new Date().setDate(primeiro));
            dataInicioSemana.setHours(0,0,0,0);
            return dataItem >= dataInicioSemana;
        }
        if (tipo === 'diario' || tipo === 'diaria') {
            return dataStr === hoje.toLocaleDateString('pt-BR');
        }
        return false;
    };

    // 1. Soma Ganhos do histórico (Apurado)
    Object.keys(historico).filter(filtrarData).forEach(data => {
        historico[data].sessoes.forEach(s => ganhos += s.apurado);
    });

    // 2. Soma Custos (Combustível + Outros)
    abastTotal.filter(a => filtrarData(a.data)).forEach(a => custos += a.valor);
    outrosTotal.filter(c => filtrarData(c.data)).forEach(c => custos += c.valor);

    return ganhos - custos; // Este é o LUCRO REAL
}

function atualizarResumoGeral() {

    const historico = JSON.parse(localStorage.getItem('historico_dias')) || {};
    const abastecimentos = JSON.parse(localStorage.getItem('abastecimentos')) || [];
    const outros = JSON.parse(localStorage.getItem('outros_custos')) || [];

    let totalApurado = 0;

    // Somar apurado
    Object.values(historico).forEach(dia => {
        dia.sessoes.forEach(s => {
            totalApurado += s.apurado;
        });
    });

    // Somar custos
    const totalAbastecimento = abastecimentos.reduce((acc, a) => acc + a.valor, 0);
    const totalOutros = outros.reduce((acc, c) => acc + c.valor, 0);

    const totalCustos = totalAbastecimento + totalOutros;

    // Calcular lucro
    const totalLucro = totalApurado - totalCustos;

    // Atualizar interface
    const apuradoEl = document.getElementById('total-apurado-geral');
    const lucroEl = document.getElementById('total-lucro-geral');

    if(apuradoEl){
        apuradoEl.textContent = `R$ ${totalApurado.toFixed(2).replace('.',',')}`;
    }

    if(lucroEl){
        lucroEl.textContent = `R$ ${totalLucro.toFixed(2).replace('.',',')}`;
    }
}

function atualizarPainelResultados(){

    const historico = JSON.parse(localStorage.getItem('historico_dias')) || {};
    const abastecimentos = JSON.parse(localStorage.getItem('abastecimentos')) || [];
    const outros = JSON.parse(localStorage.getItem('outros_custos')) || [];

    let totalApurado = 0;
    let totalKM = 0;
    let totalMin = 0;

    Object.values(historico).forEach(dia => {

        dia.sessoes.forEach(s => {

            totalApurado += s.apurado;

            const kmSessao = s.kF - s.kI;
            totalKM += kmSessao;

            const [hI,mI] = s.hI.split(':').map(Number);
            const [hF,mF] = s.hF.split(':').map(Number);

            let diff = (hF*60+mF)-(hI*60+mI);
            if(diff<0) diff+=1440;

            totalMin += diff;
        });

    });

    const totalAbastecimento = abastecimentos.reduce((acc,a)=>acc+a.valor,0);
    const totalOutros = outros.reduce((acc,c)=>acc+c.valor,0);

    const totalCustos = totalAbastecimento + totalOutros;
    const totalLucro = totalApurado - totalCustos;

    const horas = totalMin/60;

    const horaApurado = horas>0 ? totalApurado/horas : 0;
    const horaLucro = horas>0 ? totalLucro/horas : 0;

    const kmApurado = totalKM>0 ? totalApurado/totalKM : 0;
    const kmLucro = totalKM>0 ? totalLucro/totalKM : 0;

    document.getElementById('painel-apurado-total').textContent = `R$ ${totalApurado.toFixed(2).replace('.',',')}`;
    document.getElementById('painel-lucro-total').textContent = `R$ ${totalLucro.toFixed(2).replace('.',',')}`;
    document.getElementById('painel-custos-total').textContent = `R$ ${totalCustos.toFixed(2).replace('.',',')}`;

    document.getElementById('painel-km-total').textContent = `${totalKM} km`;

    document.getElementById('painel-lucro-km').textContent = `R$ ${kmLucro.toFixed(2).replace('.',',')}/km`;
    document.getElementById('painel-apurado-km').textContent = `R$ ${kmApurado.toFixed(2).replace('.',',')}/km`;

    document.getElementById('painel-hora-apurado').textContent = `R$ ${horaApurado.toFixed(2).replace('.',',')}/h`;
    document.getElementById('painel-hora-lucro').textContent = `R$ ${horaLucro.toFixed(2).replace('.',',')}/h`;
}

document.getElementById('btn-filtrar-periodo').onclick = () => {
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;

    if (!dataInicio || !dataFim) {
        return alert("Por favor, selecione um intervalo de datas válido!");
    }

    // Converte as datas para objetos Date para comparação
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);

    // Valida se o intervalo é válido
    if (inicio > fim) {
        return alert("A data de início não pode ser maior que a data de fim!");
    }

    // Filtra os dados de histórico com base no intervalo
    const historico = JSON.parse(localStorage.getItem('historico_dias')) || {};
    const resultadoPeriodo = {};

    Object.keys(historico).forEach(data => {
        const [dia, mes, ano] = data.split('/').map(Number);
        const dataAtual = new Date(ano, mes - 1, dia);

        if (dataAtual >= inicio && dataAtual <= fim) {
            resultadoPeriodo[data] = historico[data];
        }
    });

    // Exibe os resultados filtrados no painel
    atualizarPainelResultadoPeriodo(resultadoPeriodo);
};

// Função para atualizar o painel com os dados filtrados
function atualizarPainelResultadoPeriodo(historicoPeriodo) {

    const abastecimentos = JSON.parse(localStorage.getItem('abastecimentos')) || [];
    const outros = JSON.parse(localStorage.getItem('outros_custos')) || [];

    const msg = document.getElementById("mensagem-periodo");
    const periodo = document.getElementById("periodo-analisado");

    const dataInicio = document.getElementById("data-inicio").value;
    const dataFim = document.getElementById("data-fim").value;

    if (dataInicio && dataFim) {
        periodo.textContent = `📅 Período analisado: ${dataInicio} → ${dataFim}`;
    }

    let totalApurado = 0;
    let totalKM = 0;
    let totalMin = 0;
    let totalCustos = 0;

    const datas = Object.keys(historicoPeriodo);

    if (datas.length === 0) {

        msg.textContent = "📭 Nenhum resultado encontrado neste período.";

        document.getElementById('painel-apurado-total').textContent = "R$ 0,00";
        document.getElementById('painel-lucro-total').textContent = "R$ 0,00";
        document.getElementById('painel-custos-total').textContent = "R$ 0,00";
        document.getElementById('painel-km-total').textContent = "0 km";
        document.getElementById('painel-hora-apurado').textContent = "R$ 0,00/h";
        document.getElementById('painel-hora-lucro').textContent = "R$ 0,00/h";
        document.getElementById('painel-apurado-km').textContent = "R$ 0,00/km";
        document.getElementById('painel-lucro-km').textContent = "R$ 0,00/km";

        return;
    }

    msg.textContent = "";

    datas.forEach(data => {

        const dia = historicoPeriodo[data];

        dia.sessoes.forEach(s => {

            totalApurado += s.apurado;

            const kmSessao = s.kF - s.kI;
            totalKM += kmSessao;

            const [hI, mI] = s.hI.split(':').map(Number);
            const [hF, mF] = s.hF.split(':').map(Number);

            let diff = (hF * 60 + mF) - (hI * 60 + mI);
            if (diff < 0) diff += 1440;

            totalMin += diff;

        });

        const abastDia = abastecimentos
            .filter(a => a.data === data)
            .reduce((acc, a) => acc + a.valor, 0);

        const outrosDia = outros
            .filter(c => c.data === data)
            .reduce((acc, c) => acc + c.valor, 0);

        totalCustos += abastDia + outrosDia;

    });

    const totalLucro = totalApurado - totalCustos;

    const horas = totalMin / 60;

    const horaApurado = horas > 0 ? totalApurado / horas : 0;
    const horaLucro = horas > 0 ? totalLucro / horas : 0;

    const kmApurado = totalKM > 0 ? totalApurado / totalKM : 0;
    const kmLucro = totalKM > 0 ? totalLucro / totalKM : 0;

    document.getElementById('painel-apurado-total').textContent = `R$ ${totalApurado.toFixed(2).replace('.', ',')}`;
    document.getElementById('painel-lucro-total').textContent = `R$ ${totalLucro.toFixed(2).replace('.', ',')}`;
    document.getElementById('painel-custos-total').textContent = `R$ ${totalCustos.toFixed(2).replace('.', ',')}`;

    document.getElementById('painel-km-total').textContent = `${totalKM} km`;

    document.getElementById('painel-hora-apurado').textContent = `R$ ${horaApurado.toFixed(2).replace('.', ',')}/h`;
    document.getElementById('painel-hora-lucro').textContent = `R$ ${horaLucro.toFixed(2).replace('.', ',')}/h`;

    document.getElementById('painel-apurado-km').textContent = `R$ ${kmApurado.toFixed(2).replace('.', ',')}/km`;
    document.getElementById('painel-lucro-km').textContent = `R$ ${kmLucro.toFixed(2).replace('.', ',')}/km`;

}

