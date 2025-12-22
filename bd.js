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

function showAnoMessage(msg, time = 2000) {
    const el = document.getElementById('anoError');
    if (!el) { alert(msg); return; }
    el.hidden = false;
    el.textContent = msg;
    clearTimeout(showAnoMessage._t);
    showAnoMessage._t = setTimeout(() => { el.hidden = true; el.textContent = ''; }, time);
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


function post_person(){

    const conteudo = {
        nome: document.getElementById("nome").value,
        nasc: parseInt(document.getElementById("nasc").value),
        morte: parseInt(document.getElementById("morte").value),
        foto: document.getElementById("foto").value
    }

    firebase.firestore().collection("pessoas").add(conteudo).then(
        () => {
            window.alert("Documento adicionado com sucesso");        })
        .catch(() => {
            alert("Erro ao cadastrar");
        })

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
