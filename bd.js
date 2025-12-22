const firebaseConfig = {
    apiKey: "AIzaSyCvZOw_HA3RZ7qWQvEEmIu6r6NutE6YWZw",
    authDomain: "whowasalive.firebaseapp.com",
    projectId: "whowasalive",
    storageBucket: "whowasalive.appspot.com",
    messagingSenderId: "975748404973",
    appId: "1:975748404973:web:faf1bcaee30933a6775ee4"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();

function validateYearInput(el) {
    const MIN = 1400, MAX = 2000;
    if (!el) return;
    // remove caracteres não numéricos
    let raw = String(el.value).replace(/[^\d-]/g, '');
    if (raw === '') { el.value = ''; return; }
    let n = parseInt(raw, 10);
    if (isNaN(n)) { el.value = ''; return; }
    if (n < MIN) {
        el.value = String(MIN);
        showAnoMessage(`Ano mínimo: ${MIN}`);
    } else if (n > MAX) {
        el.value = String(MAX);
        showAnoMessage(`Ano máximo: ${MAX}`);
    } else {
        el.value = String(n);
    }
}

// aceita entrada enquanto usuário digita (não força limites)
function sanitizeYearInput(el) {
    if (!el) return;
    el.value = String(el.value).replace(/[^\d]/g, '');
}

// quando o usuário sai do campo ou tenta pesquisar, aplica as regras finais
function finalizeYearInput(el) {
    const MIN = 1400, MAX = 2000, ADJUST_LOW = 1500;
    if (!el) return;
    let raw = String(el.value).replace(/[^\d]/g, '');
    if (raw === '') { el.value = ''; return; }
    let n = parseInt(raw, 10);
    if (isNaN(n)) { el.value = ''; return; }
    if (n < MIN) {
        el.value = String(ADJUST_LOW);
        showAnoMessage(`Valor muito baixo: ajustado para ${ADJUST_LOW}`);
    } else if (n > MAX) {
        el.value = String(MAX);
        showAnoMessage(`Valor muito alto: ajustado para ${MAX}`);
    } else {
        el.value = String(n);
    }
}

function showAnoMessage(msg, time = 2000) {
    const el = document.getElementById('anoError');
    if (!el) { alert(msg); return; }
    el.hidden = false;
    el.textContent = msg;
    clearTimeout(showAnoMessage._t);
    showAnoMessage._t = setTimeout(() => { el.hidden = true; el.textContent = ''; }, time);
}

function showPostMessage(msg, type = 'info', time = 3500) {
    const el = document.getElementById('postMessage');
    if (!el) return;
    el.textContent = msg;
    el.style.color = (type === 'error') ? '#c00' : (type === 'success') ? '#116622' : '';
    clearTimeout(showPostMessage._t);
    showPostMessage._t = setTimeout(() => { el.textContent = ''; el.style.color = ''; }, time);
}

async function acharConteudo() {
    const botao = document.getElementById("mostrar");
    const carregar = document.getElementById("carregar");
    const anoInput = document.getElementById("ano");
    const escrever = document.getElementById("personsList");

    if (!botao || !carregar || !anoInput || !escrever) {
        console.error("Elementos da página ausentes.");
        return;
    }

    // garante validação final antes de usar o valor
    finalizeYearInput(anoInput);
    var ano = parseInt(anoInput.value, 10);

    if (isNaN(ano) || ano < 1400 || ano > 2000) {
        showAnoMessage('Informe um ano entre 1400 e 2000.');
        return;
    }

    botao.hidden = true;
    carregar.hidden = false;
    escrever.innerHTML = "";

    try {
        const snapshot = await db.collection('pessoas').orderBy('nasc', 'desc').get();
        const pessoas = snapshot.docs.map(doc => doc.data());

        let html = "";
        pessoas.forEach(pessoa => {
            const nasc = Number(pessoa.nasc);
            const morte = (typeof pessoa.morte === 'number') ? pessoa.morte : Infinity;
            if (!isNaN(nasc) && nasc <= ano && morte >= ano) {
                const idade = ano - nasc;
                html += `
                    <div class="pessoas">
                        <img src="${escapeHtml(pessoa.foto || '')}" alt="${escapeHtml(pessoa.nome || '')}">
                        <div>
                            <h1>${breakNameAtMiddle(pessoa.nome || '')}</h1>
                            <p>${escapeHtml(String(idade))} anos</p>
                        </div>
                    </div>
                `;
            }
        });

        escrever.innerHTML = html || '<p>Nenhum resultado.</p>';
    } catch (error) {
        console.error("Erro ao carregar os dados:", error);
        showAnoMessage("Erro ao carregar os dados. Verifique o console.");
    } finally {
        botao.hidden = false;
        carregar.hidden = true;
    }
}


async function post_person() {
    const nomeEl = document.getElementById('nome');
    const fotoEl = document.getElementById('foto');
    const nascEl = document.getElementById('nasc');
    const morteEl = document.getElementById('morte');
    const submitBtn = document.getElementById('submitBtn'); // pode ser null

    if (!nomeEl || !nascEl) { showPostMessage('Formulário incompleto na página.', 'error'); return; }

    // validação final de anos
    finalizeYearInput(nascEl);
    finalizeYearInput(morteEl);

    if (submitBtn) submitBtn.disabled = true;

    try {
        const nome = (nomeEl.value || '').trim();
        const foto = (fotoEl ? (fotoEl.value || '').trim() : '');
        const nasc = parseInt(nascEl.value, 10);
        const morte = (morteEl && morteEl.value) ? parseInt(morteEl.value, 10) : null;

        if (!nome) { showPostMessage('Nome é obrigatório.', 'error'); return; }
        if (isNaN(nasc)) { showPostMessage('Ano de nascimento inválido.', 'error'); return; }
        if (morte !== null && isNaN(morte)) { showPostMessage('Ano de morte inválido.', 'error'); return; }

        const data = {
            nome,
            foto: foto || '',
            nasc,
            ...(morte !== null ? { morte } : {}),
            updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
            createdAt: firebase.firestore.FieldValue.serverTimestamp()
        };

        // Sempre cria novo documento (sem edição)
        await db.collection('pessoas').add(data);
        showPostMessage('Enviado com sucesso.', 'success');
        if (document.getElementById('postForm')) document.getElementById('postForm').reset();
    } catch (err) {
        console.error(err);
        showPostMessage('Erro ao salvar. Veja console.', 'error');
    } finally {
        if (submitBtn) submitBtn.disabled = false;
    }
}

function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (m) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[m]));
}

/**
 * Insere uma quebra de linha próxima ao meio de 'name' (em um espaço),
 * ou um <wbr> no meio se não houver espaço.
 * Retorna HTML seguro (escapeado) pronto para inserção via innerHTML.
 */
function breakNameAtMiddle(name, minLen = 22) {
    if (!name || name.length <= minLen) return escapeHtml(name);
    const mid = Math.floor(name.length / 2);
    const left = name.lastIndexOf(' ', mid);
    const right = name.indexOf(' ', mid);
    let pos = -1;
    if (left === -1) pos = right;
    else if (right === -1) pos = left;
    else pos = (mid - left) <= (right - mid) ? left : right;

    if (pos === -1) {
        // sem espaços: insere uma quebra de palavra ideal (<wbr>) no meio
        return escapeHtml(name.slice(0, mid)) + '<wbr>' + escapeHtml(name.slice(mid));
    } else {
        // força quebra de linha no espaço escolhido
        const a = escapeHtml(name.slice(0, pos));
        const b = escapeHtml(name.slice(pos + 1));
        return a + '<br>' + b;
    }
}

/* Exemplo de uso — ao montar o HTML do card, trocar nome simples por breakNameAtMiddle(nome)
escrever.innerHTML += `
  <div class="pessoas">
    <img src="${escapeHtml(pessoa.foto)}" alt="${escapeHtml(pessoa.nome)}">
    <div>
      <h1>${breakNameAtMiddle(pessoa.nome)}</h1>
      <p>${escapeHtml(String(ano - pessoa.nasc))} anos</p>
    </div>
  </div>
`;
*/
