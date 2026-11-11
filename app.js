(function () {
  "use strict";

  const categories = {
    revista: ["História", "Filosofia", "Sociologia", "Literatura", "Artes", "Cultura", "Atualidades", "Ciências", "Tecnologia", "Meio Ambiente"],
    laboratorio: ["Matemática", "Física", "Química", "Biologia", "Programação", "Robótica", "Engenharia", "Experimentos científicos"]
  };

  // Todo conteúdo abaixo é fictício e existe apenas para demonstrar a interface.
  const people = [
    { handle: "exemplo-01", name: "Estudante exemplo 01", initials: "01", tone: "", bio: "Biografia demonstrativa. Não representa uma pessoa real nem uma escola específica.", interests: ["História", "Literatura", "Sociologia"] },
    { handle: "exemplo-02", name: "Estudante exemplo 02", initials: "02", tone: "blue", bio: "Perfil fictício usado para mostrar como interesses e projetos podem ser apresentados.", interests: ["Física", "Matemática", "Experimentos"] },
    { handle: "exemplo-03", name: "Estudante exemplo 03", initials: "03", tone: "lime", bio: "Pessoa fictícia para demonstrar autoria e colaboração entre áreas.", interests: ["Programação", "Biologia", "Artes"] }
  ];

  const articles = [
    {
      slug: "mapas-de-memoria", title: "Mapas de memória: quem escolhe o que uma cidade lembra?",
      subtitle: "Um ensaio demonstrativo sobre memória coletiva, espaço público e histórias à margem.",
      category: "História", author: people[0].name, handle: people[0].handle, art: "map",
      summary: "Uma pergunta para observar monumentos, nomes de ruas e diferentes modos de narrar um lugar.",
      body: [
        "Toda cidade conta histórias. Algumas aparecem em placas, monumentos e nomes de ruas; outras sobrevivem em relatos de família, arquivos locais e lembranças compartilhadas.",
        "Este texto é um exemplo de formato editorial. Ele propõe perguntas para uma investigação, sem apresentar pesquisa de campo ou fatos sobre uma escola real.",
        "Um primeiro caminho seria comparar fontes: observar um espaço, ouvir diferentes relatos e anotar quem aparece em cada narrativa. O exercício ajuda a tornar visíveis escolhas, silêncios e ausências.",
        "Em uma publicação real, esta seção reuniria as fontes consultadas, os critérios de pesquisa e a autoria confirmada."
      ], refs: ["Campo reservado para fontes de uma publicação real."]
    },
    {
      slug: "perguntas-bem-feitas", title: "A pergunta antes da resposta",
      subtitle: "Como formular uma boa pergunta pode mudar o rumo de uma investigação.",
      category: "Filosofia", author: people[2].name, handle: people[2].handle, art: "question",
      summary: "Um roteiro curto para transformar curiosidade em uma questão que possa ser explorada.",
      body: [
        "Perguntar é um modo de começar. Uma questão aberta pode revelar suposições, limites e caminhos que ainda não tinham sido considerados.",
        "Neste exemplo, a ideia é comparar perguntas amplas com perguntas que indicam um recorte, sem tratar o exercício como trabalho escolar real.",
        "Uma pauta pode começar com “o que queremos entender?”, seguir para “que evidências ajudariam?” e terminar com “o que ainda não sabemos?”.",
        "Uma versão publicada por estudantes incluiria autoria, fontes e revisões feitas durante o processo."
      ], refs: ["Conteúdo demonstrativo; referências reais ainda não foram fornecidas."]
    },
    {
      slug: "ler-uma-cena", title: "Ler uma cena duas vezes",
      subtitle: "Voz narrativa, ponto de vista e detalhes que mudam quando voltamos ao texto.",
      category: "Literatura", author: people[0].name, handle: people[0].handle, art: "reading",
      summary: "Uma proposta de leitura atenta para observar como a forma também produz sentido.",
      body: [
        "Uma releitura pode deslocar a atenção: da sequência dos acontecimentos para a escolha das palavras, para quem narra e para o que permanece sem ser dito.",
        "Este conteúdo demonstra o espaço de leitura e não descreve uma turma ou atividade real.",
        "Em um artigo completo, o estudante poderia apresentar o trecho analisado, explicar seu método e relacionar a interpretação a outras fontes."
      ], refs: ["Campo de referências demonstrativas."]
    },
    {
      slug: "cultura-do-cotidiano", title: "O cotidiano também é cultura",
      subtitle: "Um convite demonstrativo a olhar para hábitos, objetos e sentidos compartilhados.",
      category: "Cultura", author: people[2].name, handle: people[2].handle, art: "culture",
      summary: "Como pequenas práticas podem abrir uma conversa sobre identidade, memória e comunidade.",
      body: ["Este exemplo mostra como uma pauta cultural pode começar com uma observação simples e construir um recorte mais preciso.", "O conteúdo é fictício. Uma publicação real deverá incluir observações, autoria e fontes verificáveis."]
    }
  ];

  const projects = [
    {
      slug: "medir-o-movimento", title: "Medir o movimento", subtitle: "Transformar observação em registro e comparação.",
      category: "Física", author: people[1].name, handle: people[1].handle, format: "Roteiro de experimento", art: "lab",
      summary: "Modelo para apresentar pergunta, procedimento e registros — sem resultados inventados.",
      question: "Como registrar o movimento de um objeto para que outra pessoa consiga comparar observações?",
      method: "Em um projeto real, esta área descreve materiais, cuidados, etapas e registro dos dados. Este exemplo não contém execução real.",
      results: "Nenhum resultado real foi informado. O campo mostra onde a equipe registrará medições, tabelas, imagens e limites do experimento."
    },
    {
      slug: "padroes-em-sequencia", title: "Padrões em sequência", subtitle: "Recorrências, representações e conjecturas em uma investigação matemática.",
      category: "Matemática", author: people[2].name, handle: people[2].handle, format: "Investigação matemática", art: "question",
      summary: "Ficha demonstrativa para documentar a pergunta, os casos testados e o raciocínio.",
      question: "Que padrões aparecem quando uma regra simples é repetida?",
      method: "Os valores e as conclusões de uma atividade real ainda precisam ser preenchidos pela autoria.",
      results: "Área reservada para exemplos, contraexemplos, representações e conclusão."
    },
    {
      slug: "programar-para-observar", title: "Programar para observar", subtitle: "Uma simulação como ferramenta de investigação.",
      category: "Programação", author: people[0].name, handle: people[0].handle, format: "Projeto tecnológico", art: "code",
      summary: "Estrutura para explicar problema, hipótese, protótipo e próximos passos.",
      question: "Como uma simulação pode ajudar a visualizar uma ideia antes de construir um protótipo?",
      method: "Este exemplo não é um programa executado nem um resultado real. Uma contribuição publicada poderá anexar código, licença e instruções.",
      results: "Sem resultados reais nesta demonstração. O espaço poderá incluir imagens, vídeo ou código revisado."
    },
    {
      slug: "observar-o-crescimento", title: "Observar o crescimento", subtitle: "Um modelo para registrar mudanças em um sistema vivo.",
      category: "Biologia", author: people[1].name, handle: people[1].handle, format: "Diário de observação", art: "growth",
      summary: "Exemplo de estrutura para reunir hipótese, observações e cuidado com as variáveis.",
      question: "Que informações tornam uma observação de longo prazo comparável?",
      method: "Nenhum experimento foi realizado para este exemplo. Aqui entrariam protocolo, datas e condições observadas.",
      results: "Área para resultados reais, imagens autorizadas e limites da observação."
    }
  ];

  function escapeHtml(value) {
    return String(value == null ? "" : value).replace(/[&<>"']/g, function (char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char];
    });
  }

  function art(kind) {
    const palettes = {
      map: ["#e8d0c4", "#bf4b36", "#e9bd57", "#4559bd"],
      question: ["#dadcf1", "#4559bd", "#dce66d", "#b54831"],
      reading: ["#e8e1d3", "#bf4b36", "#d9dcce", "#28332e"],
      culture: ["#ead7c8", "#4559bd", "#dce66d", "#b54831"],
      lab: ["#253430", "#dce66d", "#7380d3", "#f4f2eb"],
      code: ["#d9def7", "#4559bd", "#dce66d", "#b54831"],
      growth: ["#dfe4cb", "#66814c", "#d8a858", "#4559bd"]
    };
    const p = palettes[kind] || palettes.map;
    const drawings = {
      map: `<path d="M-20 320 C100 260 130 340 250 260 S410 190 560 235" fill="none" stroke="${p[3]}" stroke-width="12"/><path d="M20 40 L175 5 202 190 49 226Z" fill="${p[2]}"/><path d="M286 0 470 50 430 190 268 145Z" fill="${p[1]}"/><circle cx="340" cy="270" r="82" fill="${p[0]}"/><path d="M250 320 420 270 500 370 310 420Z" fill="${p[3]}"/><text x="28" y="290" font-size="15" letter-spacing="4">ATLAS / 01</text><text x="296" y="276" font-size="14" letter-spacing="3">MEMÓRIA</text>`,
      question: `<circle cx="300" cy="190" r="120" fill="${p[0]}"/><path d="M276 143c0-30 22-49 54-49 31 0 51 19 51 46 0 23-13 35-37 52-19 13-27 24-27 43" fill="none" stroke="${p[1]}" stroke-width="18" stroke-linecap="round"/><circle cx="317" cy="270" r="10" fill="${p[1]}"/><path d="M48 45 154 20 183 113 74 135Z" fill="${p[2]}"/><path d="M414 250 544 213 567 310 437 345Z" fill="${p[3]}"/><text x="33" y="202" font-size="14" letter-spacing="4">E SE?</text><text x="415" y="92" font-size="13" letter-spacing="3">PERGUNTAR</text>`,
      reading: `<rect x="72" y="38" width="390" height="294" fill="${p[0]}" transform="rotate(-5 72 38)"/><path d="M106 98h228M96 128h272M87 158h184" stroke="${p[3]}" stroke-width="5"/><circle cx="390" cy="250" r="78" fill="${p[1]}"/><path d="M344 255c21-33 42-51 67-52 11 0 21 5 28 13" fill="none" stroke="${p[2]}" stroke-width="11" stroke-linecap="round"/><text x="94" y="250" font-size="13" letter-spacing="3">LEITURA / RELEITURA</text>`,
      culture: `<rect x="60" y="46" width="180" height="240" fill="${p[0]}"/><rect x="260" y="90" width="202" height="244" fill="${p[2]}"/><circle cx="351" cy="192" r="64" fill="${p[1]}"/><path d="M73 310 212 205 274 283 152 375Z" fill="${p[3]}"/><text x="84" y="86" font-size="14" letter-spacing="3">COTIDIANO</text><text x="308" y="198" font-size="14" fill="#fff" letter-spacing="3">CULTURA</text>`,
      lab: `<path d="M89 42h145v44l68 124v106H43V210l66-124V42" fill="none" stroke="${p[3]}" stroke-width="8"/><path d="M77 232h186v63H77Z" fill="${p[1]}"/><circle cx="158" cy="186" r="28" fill="${p[2]}"/><path d="M357 94h130M390 130h112M342 166h155M375 202h119" stroke="${p[3]}" stroke-width="5" opacity=".7"/><circle cx="420" cy="280" r="48" fill="${p[2]}"/><text x="343" y="352" font-size="13" fill="${p[3]}" letter-spacing="3">TESTAR / MEDIR / REVER</text>`,
      code: `<rect x="60" y="48" width="420" height="286" rx="3" fill="${p[0]}"/><path d="M60 91h420" stroke="${p[1]}" stroke-width="5"/><circle cx="84" cy="70" r="6" fill="${p[3]}"/><circle cx="104" cy="70" r="6" fill="${p[2]}"/><path d="m147 155-41 37 41 38m117-75 42 37-42 38m-32-92-39 112" fill="none" stroke="${p[1]}" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><text x="86" y="302" font-size="14" fill="#303833" letter-spacing="3">IDEIA → MODELO → TESTE</text>`,
      growth: `<path d="M280 310V127m0 102c-84 0-116-46-116-93 71 0 116 35 116 93Zm0-57c0-68 42-111 107-111 0 71-41 111-107 111Z" fill="${p[1]}"/><path d="M113 318h350" stroke="${p[3]}" stroke-width="5"/><circle cx="134" cy="110" r="42" fill="${p[2]}"/><text x="348" y="291" font-size="13" letter-spacing="3">OBSERVAR</text>`
    };
    return `<svg viewBox="0 0 600 390" role="img" aria-label="Ilustração editorial demonstrativa" xmlns="http://www.w3.org/2000/svg"><rect width="600" height="390" fill="${p[0]}"/><g fill="${p[3]}" font-family="Courier New,monospace">${drawings[kind] || drawings.map}</g><path d="M0 365h600" stroke="${p[3]}" opacity=".18"/></svg>`;
  }

  function navLink(label, route, active, extra) {
    return `<a href="#${route}"${active ? ' aria-current="page"' : ""}${extra || ""}>${label}</a>`;
  }

  function shell(content, page) {
    const mainPage = page === "artigo" ? "revista" : page === "projeto" ? "laboratorio" : page === "perfil" ? "comunidade" : page;
    return `<div class="shell"><div class="edition"><span>REVISTA DIGITAL DE CONHECIMENTO</span><span>EDIÇÃO DEMONSTRATIVA <b>✳</b></span></div>
      <header class="header"><a class="brand" href="#home" aria-label="MARGEM, início"><span class="brand-mark">M</span><span>MARGEM<small>conhecimento em circulação</small></span></a>
      <button class="menu" type="button" aria-expanded="false" aria-label="Abrir navegação">☰</button>
      <nav class="nav" aria-label="Navegação principal">${navLink("Home", "home", mainPage === "home")}${navLink("Revista", "revista", mainPage === "revista")}${navLink("Laboratório", "laboratorio", mainPage === "laboratorio")}${navLink("Comunidade", "comunidade", mainPage === "comunidade")}${navLink("Sobre", "sobre", mainPage === "sobre")}</nav>
      <a class="header-note" href="#sobre">A proposta ↗</a></header>${content}
      <footer class="footer"><a class="brand" href="#home"><span class="brand-mark">M</span><span>MARGEM<small>conhecimento em circulação</small></span></a><p>Publicação demonstrativa para feira escolar.<br>Ideias abertas, autoria em construção.</p><a href="#home">Voltar ao início ↑</a><div class="footnote"><span>CONTEÚDOS DE EXEMPLO IDENTIFICADOS NO SITE</span><span>PROJETO DEMONSTRATIVO · 2026</span></div></footer></div>`;
  }

  function articleCard(item) {
    return `<article class="article-card" data-filter-card data-category="${escapeHtml(item.category)}"><a class="cover" href="#artigo/${item.slug}">${art(item.art)}<span class="sample-tag">EXEMPLO</span></a><div class="meta"><b>${escapeHtml(item.category)}</b><span>LEITURA · DEMONSTRAÇÃO</span></div><h3><a href="#artigo/${item.slug}">${escapeHtml(item.title)}</a></h3><p>${escapeHtml(item.summary)}</p><div class="card-foot"><span>${escapeHtml(item.author)}</span><a href="#artigo/${item.slug}">Ler matéria ↗</a></div></article>`;
  }

  function projectCard(item) {
    return `<article class="project-card" data-filter-card data-category="${escapeHtml(item.category)}"><a class="project-art" href="#projeto/${item.slug}">${art(item.art)}<span>LAB / EXEMPLO</span></a><div class="project-copy"><div class="meta"><b>${escapeHtml(item.category)}</b><span>${escapeHtml(item.format)}</span></div><h3><a href="#projeto/${item.slug}">${escapeHtml(item.title)}</a></h3><p>${escapeHtml(item.summary)}</p><div class="card-foot"><span>por ${escapeHtml(item.author)}</span><a href="#projeto/${item.slug}">Abrir projeto ↗</a></div></div></article>`;
  }

  function personCard(person) {
    return `<article class="person" data-filter-card data-category="${escapeHtml(person.interests.join(" "))}"><div class="avatar ${person.tone}">${escapeHtml(person.initials)}</div><div><small>PERFIL DEMONSTRATIVO</small><h3><a href="#perfil/${person.handle}">${escapeHtml(person.name)}</a></h3><p>${escapeHtml(person.bio)}</p><div class="interests">${person.interests.map(function (interest) { return `<span>${escapeHtml(interest)}</span>`; }).join("")}</div><a class="link" href="#perfil/${person.handle}">Ver perfil ↗</a></div></article>`;
  }

  function home() {
    const lead = articles[0];
    return `<main id="top"><section class="hero wrap"><div><div class="eyeline"><span>01</span> IDEIAS QUE PEDEM ESPAÇO <i></i> FEIRA ESCOLAR</div><h1>Conhecimento<br>em <em>movimento.</em></h1><p class="lead">Uma revista digital para investigar o mundo, compartilhar perguntas e dar forma às ideias de quem aprende.</p><div class="actions"><a class="button button-dark" href="#revista">Explorar a Revista ↗</a><a class="link" href="#laboratorio">Entrar no Laboratório →</a></div><p class="hero-note">✳ &nbsp; TEXTOS, PROJETOS E PONTOS DE VISTA<br>&nbsp;&nbsp;&nbsp;&nbsp; CRIADOS PARA CIRCULAR</p></div><div class="hero-art"><div class="hero-art-frame">${art("map")}</div><div class="hero-caption"><span>CAPA DESTA EDIÇÃO</span><span>01 — PENSAR O LUGAR</span></div><b class="hero-scribble">CURIOSIDADE<br>É UM COMEÇO</b></div></section>
      <div class="ticker">HISTÓRIA　✳　FILOSOFIA　✳　CIÊNCIAS　✳　CULTURA　✳　TECNOLOGIA　✳　MEIO AMBIENTE　✳　ARTES</div>
      <section class="wrap section"><div class="section-heading"><div class="kicker">01 / REVISTA</div><h2>Ideias para <em>ler de perto.</em></h2><a class="link" href="#revista">Toda a Revista ↗</a></div><div class="featured"><div>${articleCard(lead)}</div><aside><span>01</span><blockquote>“Uma pergunta pode mudar o jeito de olhar para um lugar.”</blockquote><small>NOTA DE LEITURA · TEXTO DE EXEMPLO</small><a class="link" href="#artigo/${lead.slug}">Abrir matéria ↗</a></aside></div><div class="article-grid">${articles.slice(1, 3).map(articleCard).join("")}</div></section>
      <section class="lab-promo"><div class="wrap lab-promo-inner"><div><div class="kicker">02 / LABORATÓRIO</div><h2>Testar uma ideia<br>também é <em>pensar.</em></h2><p>Experimentos, modelos, códigos e perguntas em construção — apresentados como processos, não só resultados.</p><a class="button button-lime" href="#laboratorio">Explorar o Laboratório ↗</a></div>${art("lab")}</div></section>
      <section class="wrap section"><div class="section-heading"><div class="kicker">03 / COMUNIDADE</div><h2>Quem está por <em>trás das ideias.</em></h2><a class="link" href="#comunidade">Ver a comunidade ↗</a></div><div class="people-grid">${people.map(personCard).join("")}</div></section>
      <section class="wrap home-close"><small>UM ESPAÇO PARA COMPARTILHAR O QUE SE APRENDE</small><p>Da primeira pergunta à ideia publicada, <em>todo processo pode inspirar outro.</em></p><a class="button button-outline" href="#sobre">Conheça a proposta ↗</a></section></main>`;
  }

  function collection(kind) {
    const lab = kind === "laboratorio";
    const items = lab ? projects : articles;
    const cats = lab ? categories.laboratorio : categories.revista;
    const title = lab ? "Laboratório" : "Revista";
    const desc = lab ? "Um caderno de processos para perguntas científicas, projetos técnicos e experimentos em construção." : "Ensaios, leituras e investigações sobre o mundo — escritos para circular entre diferentes áreas do conhecimento.";
    const aside = lab ? "PERGUNTA → MÉTODO → REGISTRO" : "LEITURA → CONTEXTO → CONVERSA";
    return `<main id="top" class="wrap collection ${lab ? "lab-page" : "magazine-page"}"><header class="page-intro"><div><div class="kicker">MARGEM / ${lab ? "02" : "01"}</div><h1>${lab ? "Fazer para <em>entender.</em>" : "Ideias para <em>circular.</em>"}</h1><p>${desc}</p></div><aside class="page-aside"><b>${lab ? "BANCADA ABERTA" : "EDIÇÃO ABERTA"}</b><span>${aside}<br>CONTEÚDO DEMONSTRATIVO</span><i>${lab ? "∑" : "✳"}</i></aside></header><div class="demo-note">TODOS OS ITENS DESTA EDIÇÃO SÃO EXEMPLOS FICTÍCIOS, IDENTIFICADOS COMO DEMONSTRAÇÃO.</div><label class="search"><span aria-hidden="true">⌕</span><input type="search" data-search="${kind}" placeholder="Buscar em ${title.toLowerCase()}…" aria-label="Buscar em ${title}"></label><div class="chips" data-chips="${kind}"><button type="button" class="selected" data-cat="Todas">Todas</button>${cats.map(function (cat) { return `<button type="button" data-cat="${escapeHtml(cat)}">${escapeHtml(cat)}</button>`; }).join("")}</div><div class="result-line"><span data-count="${kind}"></span><span>ORDENADO POR DESTAQUE EDITORIAL</span></div><div class="${lab ? "project-grid" : "article-grid"}" data-list="${kind}">${items.map(lab ? projectCard : articleCard).join("")}</div><p class="empty" data-empty="${kind}" hidden>Nenhuma publicação encontrada. Experimente outra busca.</p></main>`;
  }

  function community() {
    return `<main id="top" class="wrap collection community"><header class="page-intro"><div><div class="kicker">MARGEM / 03</div><h1>Ideias têm <em>autoria.</em></h1><p>Um índice demonstrativo de estudantes, interesses e trabalhos. A comunidade valoriza quem pesquisa, escreve, testa e compartilha.</p></div><aside class="page-aside"><b>CONHEÇA QUEM FAZ</b><span>PERFIS E CONTRIBUIÇÕES<br>EXEMPLOS FICTÍCIOS</span><i>↗</i></aside></header><div class="demo-note">PERFIS FICTÍCIOS CRIADOS PARA DEMONSTRAR A EXPERIÊNCIA. NENHUMA PESSOA REAL É REPRESENTADA.</div><div class="community-tools"><span data-count="comunidade"></span><label class="search"><span aria-hidden="true">⌕</span><input type="search" data-search="comunidade" placeholder="Buscar pessoas ou interesses…" aria-label="Buscar pessoas ou interesses"></label></div><div class="community-grid" data-list="comunidade">${people.map(personCard).join("")}</div><p class="empty" data-empty="comunidade" hidden>Nenhum perfil encontrado.</p><section class="next-step"><div class="kicker">CONTRIBUIÇÕES</div><p>Na versão conectada, esta área reunirá artigos e projetos publicados por cada estudante. Para esta apresentação, consulte os exemplos no Laboratório e na Revista.</p><a class="link" href="#revista">Explorar publicações ↗</a></section></main>`;
  }

  function about() {
    return `<main id="top" class="wrap about"><section><div class="kicker">MARGEM / UMA PUBLICAÇÃO EM CONSTRUÇÃO</div><h1>Conhecer é um<br>gesto de <em>partilha.</em></h1><p class="lead">A MARGEM é uma proposta de revista digital para reunir investigação, criação e pensamento estudantil em um espaço aberto à curiosidade.</p><div class="about-art">${art("culture")}</div></section><section class="about-columns"><h2>Uma plataforma para<br><em>ideias em processo.</em></h2><div><p>Entre uma pergunta e uma descoberta existem tentativas, conversas e revisões. A proposta desta iniciativa é dar visibilidade a esse percurso: textos editoriais, projetos de ciência e tecnologia e perfis que apresentam quem contribui.</p><p>O site está em fase demonstrativa para uma feira escolar. Como não foram fornecidos dados confirmados sobre escola, equipe ou autores, todo perfil e publicação de exemplo está identificado como fictício. A plataforma ainda não recebe cadastros nem conteúdo de visitantes.</p></div></section><section class="principles"><article><b>01</b><h3>Curiosidade</h3><p>Uma boa pergunta abre espaço para explorar diferentes caminhos.</p></article><article><b>02</b><h3>Autoria</h3><p>Ideias ganham contexto quando apresentam quem pesquisou e como.</p></article><article><b>03</b><h3>Partilha</h3><p>Conhecimento circula melhor quando pode ser lido, discutido e retomado.</p></article></section><section class="next-step"><div class="kicker">PRÓXIMAS ETAPAS DO PROJETO</div><p>Autenticação Google, perfis editáveis, envio de publicações e painel de aprovação serão conectados depois desta etapa visual. Nenhuma conta ou credencial é simulada nesta versão.</p></section></main>`;
  }

  function demoBanner() {
    return `<div class="demo-banner">✳ &nbsp; EXEMPLO FICTÍCIO · NÃO REPRESENTA PRODUÇÃO REAL DE ESTUDANTES</div>`;
  }

  function articlePage(slug) {
    const item = articles.find(function (entry) { return entry.slug === slug; });
    if (!item) return `<main id="top" class="wrap missing"><h1>Artigo não encontrado.</h1><a class="link" href="#revista">Voltar à Revista ↗</a></main>`;
    return `<main id="top" class="wrap detail"><a class="link" href="#revista">← Voltar à Revista</a>${demoBanner()}<header class="detail-head"><div class="kicker">${escapeHtml(item.category)} · LEITURA DEMONSTRATIVA</div><h1>${escapeHtml(item.title)}</h1><p>${escapeHtml(item.subtitle)}</p><div class="byline">AUTORIA DEMONSTRATIVA · <a href="#perfil/${item.handle}">${escapeHtml(item.author)}</a> · EXEMPLO DE DATA</div></header><div class="detail-cover">${art(item.art)}</div><article class="prose"><p class="opening">${escapeHtml(item.summary)}</p>${item.body.map(function (paragraph) { return `<p>${escapeHtml(paragraph)}</p>`; }).join("")}<section class="refs"><div class="kicker">FONTES E REFERÊNCIAS</div>${(item.refs || ["Campo de referência reservado para a publicação real."]).map(function (ref) { return `<p>${escapeHtml(ref)}</p>`; }).join("")}</section></article><div class="related"><h2>Mais ideias na <em>Revista.</em></h2><a class="link" href="#revista">Ver todas ↗</a></div></main>`;
  }

  function projectPage(slug) {
    const item = projects.find(function (entry) { return entry.slug === slug; });
    if (!item) return `<main id="top" class="wrap missing"><h1>Projeto não encontrado.</h1><a class="link" href="#laboratorio">Voltar ao Laboratório ↗</a></main>`;
    return `<main id="top" class="wrap detail lab-detail"><a class="link" href="#laboratorio">← Voltar ao Laboratório</a>${demoBanner()}<header class="project-head"><div class="kicker">LABORATÓRIO · ${escapeHtml(item.category)}</div><h1>${escapeHtml(item.title)}</h1><p>${escapeHtml(item.subtitle)}</p><div class="byline">POR <a href="#perfil/${item.handle}">${escapeHtml(item.author)}</a> · ${escapeHtml(item.format)} · EXEMPLO</div></header><div class="detail-cover">${art(item.art)}</div><div class="project-detail-grid"><section><small>A PERGUNTA</small><h2>${escapeHtml(item.question)}</h2><div class="lab-spec"><span>ÁREA</span><b>${escapeHtml(item.category)}</b><span>FORMATO</span><b>${escapeHtml(item.format)}</b></div></section><div><section><small>MÉTODO / PROCESSO</small><p>${escapeHtml(item.method)}</p></section><section><small>RESULTADOS / REFLEXÕES</small><p>${escapeHtml(item.results)}</p></section><section><small>MÍDIAS E ARQUIVOS</small><p>Imagens, vídeos ou código poderão ser associados a contribuições reais depois da conexão com o armazenamento seguro.</p></section></div></div></main>`;
  }

  function profilePage(handle) {
    const person = people.find(function (entry) { return entry.handle === handle; });
    if (!person) return `<main id="top" class="wrap missing"><h1>Perfil não encontrado.</h1><a class="link" href="#comunidade">Voltar à Comunidade ↗</a></main>`;
    const authoredArticles = articles.filter(function (entry) { return entry.handle === handle; });
    const authoredProjects = projects.filter(function (entry) { return entry.handle === handle; });
    return `<main id="top" class="wrap profile-detail">${demoBanner()}<header class="profile-head"><div class="avatar big ${person.tone}">${escapeHtml(person.initials)}</div><div><div class="kicker">PERFIL DEMONSTRATIVO</div><h1>${escapeHtml(person.name)}</h1><p>${escapeHtml(person.bio)}</p><div class="interests">${person.interests.map(function (interest) { return `<span>${escapeHtml(interest)}</span>`; }).join("")}</div></div></header><section class="profile-contrib"><h2>Artigos na <em>Revista.</em></h2><div class="article-grid">${authoredArticles.length ? authoredArticles.map(articleCard).join("") : `<p class="empty">Nenhum artigo demonstrativo associado.</p>`}</div><h2>Projetos no <em>Laboratório.</em></h2><div class="project-grid">${authoredProjects.length ? authoredProjects.map(projectCard).join("") : `<p class="empty">Nenhum projeto demonstrativo associado.</p>`}</div></section></main>`;
  }

  function setupSearch(page) {
    const key = page === "comunidade" ? "comunidade" : page;
    if (!["revista", "laboratorio", "comunidade"].includes(key)) return;
    const input = document.querySelector(`[data-search="${key}"]`);
    const list = document.querySelector(`[data-list="${key}"]`);
    const count = document.querySelector(`[data-count="${key}"]`);
    const empty = document.querySelector(`[data-empty="${key}"]`);
    if (!input || !list) return;
    let selected = "Todas";
    function update() {
      const term = input.value.trim().toLocaleLowerCase("pt-BR");
      let visible = 0;
      list.querySelectorAll("[data-filter-card]").forEach(function (card) {
        const matchesTerm = !term || card.textContent.toLocaleLowerCase("pt-BR").includes(term);
        const categoriesText = (card.dataset.category || "").toLocaleLowerCase("pt-BR");
        const matchesCategory = selected === "Todas" || categoriesText.includes(selected.toLocaleLowerCase("pt-BR"));
        card.hidden = !(matchesTerm && matchesCategory);
        if (!card.hidden) visible += 1;
      });
      if (count) count.textContent = `${visible} ${key === "comunidade" ? "PERFIS" : "PUBLICAÇÃO" + (visible === 1 ? "" : "ÕES")}`;
      if (empty) empty.hidden = visible > 0;
    }
    input.addEventListener("input", update);
    document.querySelectorAll(`[data-chips="${key}"] button`).forEach(function (button) {
      button.addEventListener("click", function () {
        selected = button.dataset.cat;
        document.querySelectorAll(`[data-chips="${key}"] button`).forEach(function (chip) {
          chip.classList.toggle("selected", chip === button);
        });
        update();
      });
    });
    update();
  }

  function render() {
    const parts = location.hash.slice(1).split("/");
    const page = parts[0] || "home";
    const slug = parts[1] || "";
    const routes = {
      home: home,
      revista: function () { return collection("revista"); },
      laboratorio: function () { return collection("laboratorio"); },
      comunidade: community,
      sobre: about,
      artigo: function () { return articlePage(slug); },
      projeto: function () { return projectPage(slug); },
      perfil: function () { return profilePage(slug); }
    };
    const titles = { home: "MARGEM — Conhecimento em circulação", revista: "Revista — MARGEM", laboratorio: "Laboratório — MARGEM", comunidade: "Comunidade — MARGEM", sobre: "Sobre — MARGEM", artigo: "Artigo demonstrativo — MARGEM", projeto: "Projeto demonstrativo — MARGEM", perfil: "Perfil demonstrativo — MARGEM" };
    document.querySelector("#app").innerHTML = shell((routes[page] || home)(), page);
    document.title = titles[page] || titles.home;
    const menu = document.querySelector(".menu");
    const nav = document.querySelector(".nav");
    menu.addEventListener("click", function () {
      const open = menu.getAttribute("aria-expanded") === "true";
      menu.setAttribute("aria-expanded", String(!open));
      menu.setAttribute("aria-label", open ? "Abrir navegação" : "Fechar navegação");
      nav.classList.toggle("open", !open);
    });
    nav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        nav.classList.remove("open");
        menu.setAttribute("aria-expanded", "false");
      });
    });
    setupSearch(page);
  }

  window.addEventListener("hashchange", render);
  if (!location.hash) location.hash = "home";
  else render();
}());
