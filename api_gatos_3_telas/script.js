'use strict';

// A aplicação usa a TheCatAPI. A chave é opcional para testes básicos.
// Para uso com maior volume, crie uma chave em https://thecatapi.com/ e informe abaixo.
const API_KEY = '';
const API_BASE = 'https://api.thecatapi.com/v1';

const telas = {
  inicio: document.getElementById('tela-inicio'),
  busca: document.getElementById('tela-busca'),
  detalhes: document.getElementById('tela-detalhes')
};
const galeria = document.getElementById('galeria-container');
const statusResultado = document.getElementById('resultado-status');
const inputRaca = document.getElementById('racaInput');
const detalhesContainer = document.getElementById('detalhes-container');
let racas = [];
let imagensAtuais = [];

function mostrarTela(nome) {
  Object.entries(telas).forEach(([chave, tela]) => {
    tela.classList.toggle('hidden', chave !== nome);
  });
  document.querySelectorAll('[data-screen]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.screen === nome);
  });
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

document.querySelectorAll('[data-screen]').forEach(btn => {
  btn.addEventListener('click', () => mostrarTela(btn.dataset.screen));
});

async function requisitar(endpoint) {
  const headers = {};
  if (API_KEY) headers['x-api-key'] = API_KEY;
  const resposta = await fetch(`${API_BASE}${endpoint}`, { headers });
  if (!resposta.ok) throw new Error(`A API respondeu com status ${resposta.status}.`);
  return resposta.json();
}

async function carregarRacas() {
  if (racas.length) return racas;
  racas = await requisitar('/breeds');
  return racas;
}

function normalizar(texto) {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim();
}

async function buscarImagens(termo = '') {
  mostrarTela('busca');
  galeria.replaceChildren();
  statusResultado.textContent = 'Buscando imagens...';

  try {
    let endpoint = '/images/search?limit=20&has_breeds=1';
    const pesquisa = normalizar(termo);

    if (pesquisa) {
      const listaRacas = await carregarRacas();
      const correspondencias = listaRacas.filter(raca =>
        normalizar(raca.name).includes(pesquisa)
      );

      if (!correspondencias.length) {
        statusResultado.textContent = 'Não encontrei essa raça. Tente outro nome, como Siamês ou Persa.';
        return;
      }

      // Busca pela primeira raça correspondente encontrada.
      endpoint += `&breed_ids=${encodeURIComponent(correspondencias[0].id)}`;
      statusResultado.textContent = `Resultados para ${correspondencias[0].name}`;
    }

    const dados = await requisitar(endpoint);
    imagensAtuais = dados;
    if (!dados.length) {
      statusResultado.textContent = 'Nenhuma imagem encontrada. Tente outra raça.';
      return;
    }

    if (!pesquisa) statusResultado.textContent = `Encontramos ${dados.length} imagens para explorar.`;
    dados.forEach((gato, indice) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'cat-card';
      card.setAttribute('aria-label', `Ver detalhes da imagem ${indice + 1}`);
      const img = document.createElement('img');
      img.src = gato.url;
      img.alt = gato.breeds?.[0]?.name ? `Gato da raça ${gato.breeds[0].name}` : 'Foto de gato';
      img.loading = 'lazy';
      img.addEventListener('error', () => card.remove());
      card.appendChild(img);
      card.addEventListener('click', () => mostrarDetalhes(gato));
      galeria.appendChild(card);
    });
  } catch (erro) {
    console.error(erro);
    statusResultado.textContent = 'Não foi possível carregar as imagens agora. Verifique sua conexão e tente novamente.';
  }
}

function mostrarDetalhes(gato) {
  const raca = gato.breeds?.[0];
  detalhesContainer.replaceChildren();

  const img = document.createElement('img');
  img.className = 'detail-image';
  img.src = gato.url;
  img.alt = raca ? `Gato da raça ${raca.name}` : 'Foto de gato';

  const conteudo = document.createElement('div');
  conteudo.className = 'detail-copy';
  const tag = document.createElement('span');
  tag.className = 'eyebrow';
  tag.textContent = 'CONHEÇA MAIS';
  const titulo = document.createElement('h1');
  titulo.textContent = raca?.name || 'Um gato encantador';
  const descricao = document.createElement('p');
  descricao.textContent = raca?.description || 'Não há uma descrição de raça disponível para esta imagem.';
  conteudo.append(tag, titulo, descricao);

  if (raca?.origin) {
    const origem = document.createElement('p');
    origem.innerHTML = `<strong>Origem:</strong> ${escaparHTML(raca.origin)}`;
    conteudo.appendChild(origem);
  }
  if (raca?.temperament) {
    const temperamento = document.createElement('p');
    temperamento.innerHTML = `<strong>Temperamento:</strong> ${escaparHTML(raca.temperament)}`;
    conteudo.appendChild(temperamento);
  }
  if (raca?.life_span) {
    const vida = document.createElement('p');
    vida.innerHTML = `<strong>Expectativa de vida:</strong> ${escaparHTML(raca.life_span)} anos`;
    conteudo.appendChild(vida);
  }

  detalhesContainer.append(img, conteudo);
  mostrarTela('detalhes');
}

function escaparHTML(texto) {
  return String(texto).replace(/[&<>"']/g, caractere => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[caractere]);
}

document.getElementById('busca-form').addEventListener('submit', evento => {
  evento.preventDefault();
  buscarImagens(inputRaca.value);
});
document.getElementById('todosBtn').addEventListener('click', () => {
  inputRaca.value = '';
  buscarImagens('');
});
document.getElementById('voltarBtn').addEventListener('click', () => mostrarTela('busca'));

// Abre a galeria com algumas imagens ao entrar na tela de busca.
document.querySelector('[data-screen="busca"]').addEventListener('click', () => {
  if (!imagensAtuais.length) buscarImagens('');
});
