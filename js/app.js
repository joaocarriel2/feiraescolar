/**
 * ENTRELINHAS CCMPR — Application Controller & Interactive Experience
 * Sistema de Publicações Multimídia, Perfis Editáveis e Gestão de Conteúdo
 */

document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  let currentView = 'capa';
  let currentStep = 1;
  let selectedMedia = []; // [{ file, type, data, thumbnail, mimeType }]
  let activeFilter = 'all';
  let dragSrcIndex = null;
  let currentDetailId = null;
  let viewingAuthorId = null;
  let editingPubId = null; // null se criando nova, string se editando existente
  let carouselIndex = 0;
  let carouselMedia = [];
  let activeObjectUrls = [];

  // Pilha de Histórico de Navegação Real (Universal Back Button)
  let navigationHistory = [{ view: 'capa', params: {} }];
  let isBackNavigating = false;
  let lastBackTime = 0;

  function pushNavigationHistory(view, params = {}) {
    if (isBackNavigating) return;
    const last = navigationHistory[navigationHistory.length - 1];
    if (last && last.view === view && JSON.stringify(last.params || {}) === JSON.stringify(params || {})) {
      return;
    }
    if (navigationHistory.length >= 30) {
      navigationHistory.shift();
    }
    navigationHistory.push({ view, params: { ...params } });
  }

  function goBack() {
    const now = Date.now();
    if (now - lastBackTime < 250) return; // Debounce anti-duplo clique
    lastBackTime = now;

    if (navigationHistory.length > 1) {
      navigationHistory.pop(); // Remove a visualização atual do topo
      const prev = navigationHistory[navigationHistory.length - 1]; // Pega a anterior que agora é o topo
      if (prev) {
        isBackNavigating = true;
        navigateTo(prev.view, prev.params || {});
        isBackNavigating = false;
        return;
      }
    }
    fallbackGoBack();
  }

  function fallbackGoBack() {
    if (currentView === 'detalhe' || currentView === 'criar') {
      navigateTo('publicacoes');
    } else if (currentView === 'perfil') {
      navigateTo('comunidade');
    } else if (currentView === 'lab' || currentView === 'comunidade' || currentView === 'publicacoes') {
      navigateTo('capa');
    } else {
      navigateTo('capa');
    }
  }

  // Exportar funções imediatamente para escopo global do app
  window.EntrelinhasApp = {
    navigateTo,
    goBack,
    openDetail,
    openAuthorProfile,
    editPublication,
    confirmDeletePublication,
    removeTempLink,
    showToast
  };

  // ── Inicialização ─────────────────────────────────────────────────────────
  await PublicacoesDB.init();
  await PublicacoesDB.seedDemoData();

  setupNavigation();
  setupDrawer();
  setupUploadZone();
  setupStepper();
  setupFilters();
  setupCollaboratorInput();
  setupProfileEditor();
  setupUserSwitcher();
  updateHeaderUserDisplay();
  renderFeed('all');

  // Atualizar quando o usuário mudar
  UsersDB.getCurrentUser();

  // ── Roteador / Navegação SPA ──────────────────────────────────────────────
  function setupNavigation() {
    // Delegação unificada de cliques para navegação rápida e botões de voltar
    document.addEventListener('click', (e) => {
      // 1. Botão de voltar
      const backBtn = e.target.closest('.back-btn-apple, [data-action="go-back"]');
      if (backBtn) {
        e.preventDefault();
        e.stopPropagation();
        goBack();
        return;
      }

      // 2. Links e botões com data-view
      const viewEl = e.target.closest('[data-view]');
      if (viewEl && !viewEl.closest('#user-switcher-select')) {
        e.preventDefault();
        const view = viewEl.getAttribute('data-view');
        const authorId = viewEl.getAttribute('data-author-id');
        const pubId = viewEl.getAttribute('data-pub-id');

        if (view === 'perfil') {
          navigateTo('perfil', { authorId: authorId || UsersDB.getCurrentUserId() });
        } else if (view === 'detalhe') {
          navigateTo('detalhe', { id: pubId });
        } else {
          navigateTo(view);
        }
      }
    });

    // Suporte nativo ao evento popstate (botão voltar físico/gesto no celular)
    window.addEventListener('popstate', (e) => {
      if (e.state && e.state.view) {
        isBackNavigating = true;
        navigateTo(e.state.view, e.state.params || {});
        isBackNavigating = false;
      } else {
        goBack();
      }
    });
  }

  function navigateTo(viewName, params = {}) {
    if (!isBackNavigating) {
      pushNavigationHistory(viewName, params);
      try {
        window.history.pushState({ view: viewName, params }, '', '#' + viewName);
      } catch(e) {}
    }

    if (currentView === 'detalhe') {
      activeObjectUrls.forEach(url => URL.revokeObjectURL(url));
      activeObjectUrls = [];
    }

    document.querySelectorAll('.view-section').forEach(s => {
      s.classList.add('hidden');
      s.classList.remove('active');
    });

    const target = document.getElementById('view-' + viewName);
    if (target) {
      target.classList.remove('hidden');
      target.classList.add('active');
    }

    currentView = viewName;

    // Atualizar navegação inferior
    document.querySelectorAll('#bottom-nav .nav-btn').forEach(btn => {
      const btnView = btn.getAttribute('data-view');
      if (btnView === viewName) {
        btn.classList.add('text-primary', 'font-bold');
        btn.classList.remove('text-on-surface-variant');
      } else {
        btn.classList.remove('text-primary', 'font-bold');
        btn.classList.add('text-on-surface-variant');
      }
    });

    toggleDrawer(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });

    if (viewName === 'publicacoes') {
      renderFeed(activeFilter);
    } else if (viewName === 'criar') {
      if (params.editId) {
        loadPublicationForEdit(params.editId);
      } else if (params.reset !== false && selectedMedia.length === 0) {
        resetForm();
      }
    } else if (viewName === 'detalhe') {
      if (params.id) {
        renderDetailContent(params.id);
      }
    } else if (viewName === 'perfil') {
      const targetAuthorId = params.authorId || UsersDB.getCurrentUserId();
      renderProfileContent(targetAuthorId);
    }
  }

  // ── Drawer Lateral ────────────────────────────────────────────────────────
  function setupDrawer() {
    const toggle = document.getElementById('drawer-toggle');
    const backdrop = document.getElementById('drawer-backdrop');
    const closeBtn = document.getElementById('drawer-close');

    if (toggle) toggle.addEventListener('click', () => toggleDrawer(true));
    if (backdrop) backdrop.addEventListener('click', () => toggleDrawer(false));
    if (closeBtn) closeBtn.addEventListener('click', () => toggleDrawer(false));
  }

  function toggleDrawer(open) {
    const drawer = document.getElementById('editorial-drawer');
    const backdrop = document.getElementById('drawer-backdrop');
    if (!drawer || !backdrop) return;
    if (open) {
      drawer.classList.remove('-translate-x-full');
      backdrop.classList.remove('opacity-0', 'pointer-events-none');
      backdrop.classList.add('opacity-100');
    } else {
      drawer.classList.add('-translate-x-full');
      backdrop.classList.add('opacity-0', 'pointer-events-none');
      backdrop.classList.remove('opacity-100');
    }
  }

  // ── Atualização do Avatar e Info do Usuário no Header ─────────────────────
  function updateHeaderUserDisplay() {
    const currentUser = UsersDB.getCurrentUser();
    const avatarEl = document.getElementById('header-user-avatar');
    if (avatarEl) {
      if (currentUser.avatarUrl) {
        avatarEl.innerHTML = `<img src="${currentUser.avatarUrl}" class="w-full h-full rounded-full object-cover"/>`;
      } else {
        avatarEl.textContent = authorInitials(currentUser.name);
      }
    }

    const drawerUserEl = document.getElementById('drawer-current-user-name');
    if (drawerUserEl) drawerUserEl.textContent = currentUser.name;
    const drawerUserRoleEl = document.getElementById('drawer-current-user-role');
    if (drawerUserRoleEl) drawerUserRoleEl.textContent = `@${currentUser.username} · ${currentUser.year}`;
  }

  // ── Seletor de Usuário / Simulação de Contas ──────────────────────────────
  function setupUserSwitcher() {
    const switcher = document.getElementById('user-switcher-select');
    if (!switcher) return;

    const users = UsersDB.getAll();
    switcher.innerHTML = users.map(u => `
      <option value="${u.id}" ${u.id === UsersDB.getCurrentUserId() ? 'selected' : ''}>
        ${u.name} (@${u.username})
      </option>
    `).join('');

    switcher.addEventListener('change', () => {
      UsersDB.setCurrentUserId(switcher.value);
      updateHeaderUserDisplay();
      showToast(`Alternado para o perfil de ${UsersDB.getCurrentUser().name}`, 'info');
      if (currentView === 'perfil') {
        openAuthorProfile(switcher.value);
      }
    });
  }

  // ── Feed de Publicações Multimídia ───────────────────────────────────────
  function formatDate(isoStr) {
    if (!isoStr) return 'Recentemente';
    const d = new Date(isoStr);
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
  }

  function categoryLabel(cat) {
    const map = {
      fotografia: 'Fotografia',
      ensaio: 'Ensaio',
      ciencias: 'Ciências & Tech',
      arte: 'Artes Visuais',
      video: 'Audiovisual',
      literatura: 'Literatura',
      outro: 'Geral'
    };
    return map[cat] || (cat || 'Geral').toUpperCase();
  }

  function authorInitials(name) {
    if (!name) return 'CC';
    return name.split(' ').filter(Boolean).map(w => w[0]).slice(0, 2).join('').toUpperCase();
  }

  function renderFeed(filter = 'all') {
    activeFilter = filter;
    const feed = document.getElementById('pub-feed');
    const emptyState = document.getElementById('pub-empty-state');
    if (!feed) return;

    const pubs = PublicacoesDB.getAll({
      status: 'published',
      category: filter === 'all' ? undefined : filter
    });

    feed.innerHTML = '';

    if (pubs.length === 0) {
      if (emptyState) {
        emptyState.classList.remove('hidden');
        feed.appendChild(emptyState);
      }
      return;
    }

    if (emptyState) emptyState.classList.add('hidden');

    const cardGenerators = [createCardA, createCardB, createCardC];

    pubs.forEach((pub, idx) => {
      const generator = cardGenerators[idx % 3];
      const card = generator(pub, idx);
      card.classList.add('pub-card-enter');
      card.style.animationDelay = (idx * 0.04) + 's';
      feed.appendChild(card);
    });
  }

  /* Card Tipo A: Hero Editorial Destaque */
  function createCardA(pub, idx) {
    const thumb = (pub.media && pub.media[0]) ? (pub.media[0].thumbnail || pub.media[0].data) : 'assets/tech/maratona-tech-1.jpg';
    const isVideo = pub.media && pub.media[0] && pub.media[0].type === 'video';
    const el = document.createElement('article');
    el.className = 'pub-card pub-card-hero bg-surface-container-lowest shadow-md overflow-hidden cursor-pointer flex flex-col rounded-sm';
    el.setAttribute('data-pub-id', pub.id);

    el.innerHTML = `
      <div class="relative w-full overflow-hidden bg-primary-container" style="aspect-ratio: 16/10;">
        <img class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" src="${thumb}" alt="${pub.title}" loading="lazy"/>
        <div class="absolute inset-0 bg-gradient-to-t from-primary/90 via-primary/25 to-transparent"></div>
        <div class="absolute top-3 left-3 flex items-center gap-2">
          <span class="px-2.5 py-0.5 bg-secondary-fixed text-on-secondary-fixed font-meta-code text-[11px] font-bold uppercase tracking-wider shadow-sm">
            ${categoryLabel(pub.category)}
          </span>
          ${isVideo ? '<span class="px-2 py-0.5 bg-black/65 backdrop-blur-sm text-white font-meta-code text-[10px] flex items-center gap-1 shadow-sm"><span class="material-symbols-outlined text-[14px]">play_circle</span> VÍDEO</span>' : ''}
        </div>
        <div class="absolute bottom-3 left-3 right-3 flex items-center justify-between text-on-primary">
          <div class="flex items-center gap-2.5 author-clickable hover:opacity-90" data-author-id="${pub.author ? pub.author.id : ''}">
            <div class="w-8 h-8 rounded-full bg-secondary-container text-on-secondary-container flex items-center justify-center font-bold text-[11px] shadow-sm">
              ${authorInitials(pub.author ? pub.author.name : '')}
            </div>
            <div>
              <p class="font-bold text-[13px] leading-tight text-white">${pub.author ? pub.author.name : 'Estudante Cavalli'}</p>
              <p class="text-[11px] text-white/80">${pub.author ? pub.author.year : 'CCM João Cavalli'} · ${formatDate(pub.publishedAt || pub.createdAt)}</p>
            </div>
          </div>
          ${pub.media && pub.media.length > 1 ? `<span class="bg-black/60 px-2 py-0.5 text-[11px] flex items-center gap-1 font-meta-code"><span class="material-symbols-outlined text-[13px]">photo_library</span> ${pub.media.length}</span>` : ''}
        </div>
      </div>
      <div class="p-space-md flex flex-col justify-between flex-1 gap-space-xs">
        <div>
          <h2 class="font-headline-sm text-headline-sm text-primary leading-snug hover:text-secondary transition-colors">${pub.title}</h2>
          <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed line-clamp-2 mt-1.5">${pub.caption || pub.description || ''}</p>
        </div>
        <div class="flex items-center justify-between pt-space-xs border-t border-outline-variant/20 mt-2">
          <span class="font-meta-code text-[11px] text-secondary font-semibold uppercase tracking-wider">${pub.collaborators && pub.collaborators.length ? '+' + pub.collaborators.length + ' colab.' : 'Autoria Individual'}</span>
          <span class="inline-flex items-center gap-1 text-primary font-label-md text-label-md font-bold hover:translate-x-0.5 transition-transform">
            Ver Completo <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
          </span>
        </div>
      </div>`;

    el.addEventListener('click', (e) => {
      const authorTarget = e.target.closest('.author-clickable');
      if (authorTarget && pub.author) {
        e.stopPropagation();
        openAuthorProfile(pub.author.id);
        return;
      }
      openDetail(pub.id);
    });

    return el;
  }

  /* Card Tipo B: Duplo Horizontal */
  function createCardB(pub, idx) {
    const thumb = (pub.media && pub.media[0]) ? (pub.media[0].thumbnail || pub.media[0].data) : 'assets/tech/maratona-tech-2.jpg';
    const isVideo = pub.media && pub.media[0] && pub.media[0].type === 'video';
    const el = document.createElement('article');
    el.className = 'pub-card pub-card-duplo bg-surface-container-lowest shadow-sm overflow-hidden cursor-pointer grid grid-cols-5 rounded-sm';
    el.setAttribute('data-pub-id', pub.id);

    el.innerHTML = `
      <div class="col-span-2 relative overflow-hidden bg-primary-container" style="min-height: 160px;">
        <img class="w-full h-full object-cover transition-transform duration-500 hover:scale-105" src="${thumb}" alt="${pub.title}" loading="lazy"/>
        ${isVideo ? '<span class="absolute bottom-2 left-2 w-7 h-7 rounded-full bg-black/70 text-white flex items-center justify-center shadow-md"><span class="material-symbols-outlined text-[16px]">play_arrow</span></span>' : ''}
      </div>
      <div class="col-span-3 p-space-md flex flex-col justify-between gap-space-xs">
        <div>
          <span class="font-meta-code text-[10px] text-secondary uppercase font-bold tracking-widest">${categoryLabel(pub.category)}</span>
          <h2 class="font-headline-sm text-body-md text-primary leading-snug font-semibold mt-1 line-clamp-2 hover:text-secondary transition-colors">${pub.title}</h2>
          <p class="font-body-sm text-[12px] text-on-surface-variant line-clamp-2 mt-1 leading-snug">${pub.caption || pub.description || ''}</p>
        </div>
        <div class="pt-2 border-t border-outline-variant/20 flex items-center justify-between">
          <div class="author-clickable hover:opacity-80" data-author-id="${pub.author ? pub.author.id : ''}">
            <p class="font-label-sm text-[11px] text-primary font-bold leading-none">${pub.author ? pub.author.name : 'Estudante'}</p>
            <p class="text-[10px] text-on-surface-variant">${formatDate(pub.publishedAt || pub.createdAt)}</p>
          </div>
          <span class="material-symbols-outlined text-primary text-[18px]">arrow_forward</span>
        </div>
      </div>`;

    el.addEventListener('click', (e) => {
      const authorTarget = e.target.closest('.author-clickable');
      if (authorTarget && pub.author) {
        e.stopPropagation();
        openAuthorProfile(pub.author.id);
        return;
      }
      openDetail(pub.id);
    });

    return el;
  }

  /* Card Tipo C: Tipográfico Nobre */
  function createCardC(pub, idx) {
    const el = document.createElement('article');
    el.className = 'pub-card pub-card-typo p-space-md bg-surface-container shadow-sm cursor-pointer flex flex-col justify-between rounded-sm';
    el.setAttribute('data-pub-id', pub.id);

    el.innerHTML = `
      <div>
        <div class="flex items-center justify-between mb-space-xs">
          <span class="font-meta-code text-[11px] text-secondary uppercase font-bold tracking-widest">${categoryLabel(pub.category)}</span>
          <span class="font-meta-code text-[10px] text-on-surface-variant">${formatDate(pub.publishedAt || pub.createdAt)}</span>
        </div>
        <h2 class="font-headline-sm text-headline-sm text-primary leading-snug mt-1 hover:text-secondary transition-colors">${pub.title}</h2>
        <p class="font-body-sm text-[13px] text-on-surface-variant leading-relaxed line-clamp-3 mt-2">${pub.description || pub.caption || ''}</p>
      </div>
      <div class="flex items-center justify-between mt-space-md pt-space-xs border-t border-outline-variant/30">
        <div class="flex items-center gap-2 author-clickable hover:opacity-80" data-author-id="${pub.author ? pub.author.id : ''}">
          <div class="w-6 h-6 rounded-full bg-primary text-secondary-fixed text-[10px] font-bold flex items-center justify-center">
            ${authorInitials(pub.author ? pub.author.name : '')}
          </div>
          <span class="font-label-sm text-[11px] text-primary font-bold">${pub.author ? pub.author.name : ''}</span>
        </div>
        <span class="text-primary font-label-md text-label-md font-bold flex items-center gap-1">
          Acessar <span class="material-symbols-outlined text-[16px]">arrow_forward</span>
        </span>
      </div>`;

    el.addEventListener('click', (e) => {
      const authorTarget = e.target.closest('.author-clickable');
      if (authorTarget && pub.author) {
        e.stopPropagation();
        openAuthorProfile(pub.author.id);
        return;
      }
      openDetail(pub.id);
    });

    return el;
  }

  // ── Filtros por Categoria ────────────────────────────────────────────────
  function setupFilters() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        const filter = chip.getAttribute('data-filter') || 'all';
        renderFeed(filter);
      });
    });
  }

  // ── Página Individual da Publicação ──────────────────────────────────────
  function openDetail(id) {
    navigateTo('detalhe', { id });
  }

  async function renderDetailContent(id) {
    currentDetailId = id;
    const pub = PublicacoesDB.getById(id);
    if (!pub) {
      showToast('Publicação não encontrada', 'error');
      navigateTo('publicacoes');
      return;
    }

    const media = await PublicacoesDB.getMedia(id);
    const currentUser = UsersDB.getCurrentUser();
    const isOwner = (pub.author && pub.author.id === currentUser.id);

    // Controles de autor (Editar / Excluir no detalhe se for o autor)
    const authorActionsEl = document.getElementById('detalhe-owner-actions');
    if (authorActionsEl) {
      if (isOwner) {
        authorActionsEl.classList.remove('hidden');
        authorActionsEl.innerHTML = `
          <button class="author-action-btn edit" id="btn-edit-current-pub">
            <span class="material-symbols-outlined text-[15px]">edit</span> Editar
          </button>
          <button class="author-action-btn delete" id="btn-delete-current-pub">
            <span class="material-symbols-outlined text-[15px]">delete</span> Excluir
          </button>
        `;
        document.getElementById('btn-edit-current-pub').onclick = () => editPublication(pub.id);
        document.getElementById('btn-delete-current-pub').onclick = () => confirmDeletePublication(pub.id);
      } else {
        authorActionsEl.classList.add('hidden');
      }
    }

    document.getElementById('detalhe-category-header').textContent = categoryLabel(pub.category);
    document.getElementById('detalhe-category').textContent = categoryLabel(pub.category);
    document.getElementById('detalhe-title').textContent = pub.title || 'Sem título';

    const captionEl = document.getElementById('detalhe-caption');
    if (captionEl) {
      captionEl.textContent = pub.caption ? `“${pub.caption}”` : '';
      captionEl.style.display = pub.caption ? 'block' : 'none';
    }

    const descEl = document.getElementById('detalhe-description');
    if (descEl) descEl.textContent = pub.description || pub.caption || '';

    // Bloco de Autor
    const authorAvatar = document.getElementById('detalhe-author-avatar');
    if (authorAvatar) {
      if (pub.author && pub.author.photoUrl) {
        authorAvatar.innerHTML = `<img src="${pub.author.photoUrl}" class="w-full h-full rounded-full object-cover"/>`;
      } else {
        authorAvatar.textContent = authorInitials(pub.author ? pub.author.name : '');
      }
    }

    const authorName = document.getElementById('detalhe-author-name');
    if (authorName) authorName.textContent = pub.author ? pub.author.name : 'Estudante Autor';

    const authorMeta = document.getElementById('detalhe-author-meta');
    if (authorMeta) {
      const schoolInfo = pub.author ? `${pub.author.year} · ${pub.author.school}` : 'CCM João Cavalli da Costa';
      authorMeta.textContent = `${schoolInfo} · ${formatDate(pub.publishedAt || pub.createdAt)}`;
    }

    const authorBlock = document.getElementById('detalhe-author');
    if (authorBlock && pub.author) {
      authorBlock.style.cursor = 'pointer';
      authorBlock.onclick = () => openAuthorProfile(pub.author.id);
    }

    // Contexto de produção
    const ctxBlock = document.getElementById('detalhe-context-block');
    const ctxText = document.getElementById('detalhe-context');
    if (pub.context) {
      if (ctxBlock) ctxBlock.classList.remove('hidden');
      if (ctxText) ctxText.textContent = pub.context;
    } else {
      if (ctxBlock) ctxBlock.classList.add('hidden');
    }

    // Colaboradores
    const colabsBlock = document.getElementById('detalhe-colabs-block');
    const colabsContainer = document.getElementById('detalhe-colabs');
    if (pub.collaborators && pub.collaborators.length > 0) {
      if (colabsBlock) colabsBlock.classList.remove('hidden');
      if (colabsContainer) {
        colabsContainer.innerHTML = pub.collaborators.map(c => `
          <span class="px-space-sm py-1 bg-surface-container font-meta-code text-[11px] text-primary font-bold uppercase tracking-wider border border-outline-variant/30">
            ${c}
          </span>
        `).join('');
      }
    } else {
      if (colabsBlock) colabsBlock.classList.add('hidden');
    }

    renderCarousel(media);
    renderRelated(pub.category, id);

    const backBtn = document.getElementById('detalhe-back');
    if (backBtn) {
      backBtn.onclick = (e) => {
        e.preventDefault();
        goBack();
      };
      const labelSpan = backBtn.querySelector('span:last-child');
      if (labelSpan) {
        labelSpan.textContent = 'Voltar';
      }
    }
  }

  function renderCarousel(media) {
    carouselMedia = media;
    carouselIndex = 0;
    const track = document.getElementById('carousel-track');
    const dots = document.getElementById('carousel-dots');
    const prevBtn = document.getElementById('carousel-prev');
    const nextBtn = document.getElementById('carousel-next');
    if (!track) return;

    if (!media || media.length === 0) {
      track.innerHTML = `
        <div class="carousel-slide h-full flex items-center justify-center bg-surface-container">
          <span class="material-symbols-outlined text-[48px] text-on-surface-variant">image</span>
        </div>`;
      if (dots) dots.innerHTML = '';
      if (prevBtn) prevBtn.classList.add('hidden');
      if (nextBtn) nextBtn.classList.add('hidden');
      return;
    }

    track.innerHTML = media.map((m, i) => {
      let src = m.data || m.thumbnail || '';
      if (m.type === 'video') {
        if (m.file) {
          src = URL.createObjectURL(m.file);
          activeObjectUrls.push(src);
        }
        return `
          <div class="carousel-slide h-full">
            <video class="w-full h-full object-contain bg-black" src="${src}" controls playsinline></video>
          </div>`;
      }
      return `
        <div class="carousel-slide h-full">
          <img class="w-full h-full object-cover" src="${src}" alt="Mídia ${i + 1}" loading="${i === 0 ? 'eager' : 'lazy'}"/>
        </div>`;
    }).join('');

    if (dots) {
      if (media.length > 1) {
        dots.innerHTML = media.map((_, i) => `
          <div class="carousel-dot ${i === 0 ? 'active' : ''}" data-idx="${i}"></div>
        `).join('');
        dots.querySelectorAll('.carousel-dot').forEach(dot => {
          dot.addEventListener('click', () => goToSlide(parseInt(dot.dataset.idx)));
        });
      } else {
        dots.innerHTML = '';
      }
    }

    if (prevBtn && nextBtn) {
      if (media.length > 1) {
        prevBtn.classList.remove('hidden');
        nextBtn.classList.remove('hidden');
        prevBtn.onclick = () => goToSlide(carouselIndex - 1);
        nextBtn.onclick = () => goToSlide(carouselIndex + 1);
      } else {
        prevBtn.classList.add('hidden');
        nextBtn.classList.add('hidden');
      }
    }

    goToSlide(0);
  }

  function goToSlide(idx) {
    const track = document.getElementById('carousel-track');
    if (!track || !carouselMedia.length) return;
    carouselIndex = (idx + carouselMedia.length) % carouselMedia.length;
    track.style.transform = `translateX(-${carouselIndex * 100}%)`;
    document.querySelectorAll('#carousel-dots .carousel-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === carouselIndex);
    });
  }

  function renderRelated(category, excludeId) {
    const container = document.getElementById('detalhe-related');
    if (!container) return;

    const related = PublicacoesDB.getAll({ status: 'published' })
      .filter(p => p.id !== excludeId && p.category === category)
      .slice(0, 3);

    if (related.length === 0) {
      container.innerHTML = '<p class="font-body-sm text-body-sm text-on-surface-variant">Nenhuma outra publicação nesta categoria no momento.</p>';
      return;
    }

    container.innerHTML = related.map(pub => {
      const thumb = (pub.media && pub.media[0]) ? (pub.media[0].thumbnail || pub.media[0].data) : 'assets/tech/maratona-tech-3.jpg';
      return `
        <div class="flex items-center gap-space-md p-space-xs bg-surface-container-lowest border border-outline-variant/30 cursor-pointer pub-related-item hover:border-secondary transition-colors" data-pub-id="${pub.id}">
          <div class="w-16 h-16 bg-primary-container overflow-hidden shrink-0">
            <img class="w-full h-full object-cover" src="${thumb}" alt="${pub.title}"/>
          </div>
          <div class="flex-1 min-w-0 pr-space-xs">
            <span class="font-meta-code text-[10px] text-secondary uppercase font-bold tracking-wider">${categoryLabel(pub.category)}</span>
            <p class="font-headline-sm text-[13px] text-primary font-semibold leading-snug line-clamp-2 mt-0.5">${pub.title}</p>
            <p class="font-label-sm text-[11px] text-on-surface-variant mt-0.5">${pub.author ? pub.author.name : ''} · ${formatDate(pub.publishedAt)}</p>
          </div>
        </div>`;
    }).join('');

    container.querySelectorAll('.pub-related-item').forEach(el => {
      el.addEventListener('click', () => openDetail(el.getAttribute('data-pub-id')));
    });
  }

  // ── Perfil do Estudante / Autor ──────────────────────────────────────────
  function openAuthorProfile(authorId) {
    viewingAuthorId = authorId;
    const authorUser = UsersDB.getById(authorId) || {
      id: authorId,
      name: 'Estudante Cavalli',
      username: 'estudante',
      year: 'Ensino Médio Integrado',
      school: 'CCM João Cavalli da Costa',
      bio: 'Perfil discente do Colégio Cívico-Militar João Cavalli da Costa.',
      interests: ['Iniciação Científica'],
      links: []
    };

    const currentLoggedInUser = UsersDB.getCurrentUser();
    const isSelf = (currentLoggedInUser.id === authorId);

    // Banner de Capa
    const coverEl = document.getElementById('perfil-cover-image');
    if (coverEl) {
      coverEl.src = authorUser.bannerUrl || 'assets/tech/maratona-tech-1.jpg';
    }

    // Avatar
    const avatarEl = document.getElementById('perfil-author-avatar');
    if (avatarEl) {
      if (authorUser.avatarUrl) {
        avatarEl.innerHTML = `<img src="${authorUser.avatarUrl}" class="w-full h-full rounded-full object-cover"/>`;
      } else {
        avatarEl.textContent = authorInitials(authorUser.name);
      }
    }

    // Nome e @username
    const nameEl = document.getElementById('perfil-author-name');
    if (nameEl) nameEl.textContent = authorUser.name;
    const handleEl = document.getElementById('perfil-author-username');
    if (handleEl) handleEl.textContent = `@${authorUser.username}`;

    // Turma / Escola
    const schoolEl = document.getElementById('perfil-author-school');
    if (schoolEl) schoolEl.textContent = `${authorUser.year} · ${authorUser.school}`;

    // Biografia
    const bioEl = document.getElementById('perfil-author-bio');
    if (bioEl) {
      bioEl.textContent = authorUser.bio || 'Nenhuma biografia informada ainda.';
    }

    // Áreas de Interesse
    const interestsEl = document.getElementById('perfil-author-interests');
    if (interestsEl) {
      const interests = authorUser.interests || [];
      if (interests.length > 0) {
        interestsEl.innerHTML = interests.map(int => `
          <span class="interest-tag">
            <span class="w-1.5 h-1.5 rounded-full bg-secondary"></span>
            ${int}
          </span>
        `).join('');
        interestsEl.parentElement.classList.remove('hidden');
      } else {
        interestsEl.parentElement.classList.add('hidden');
      }
    }

    // Links Externos
    const linksEl = document.getElementById('perfil-author-links');
    if (linksEl) {
      const links = authorUser.links || [];
      if (links.length > 0) {
        linksEl.innerHTML = links.map(l => `
          <a href="${l.url}" target="_blank" rel="noopener noreferrer" class="link-pill">
            <span class="material-symbols-outlined text-[15px] text-secondary">link</span>
            <span>${l.label || l.url}</span>
          </a>
        `).join('');
        linksEl.parentElement.classList.remove('hidden');
      } else {
        linksEl.parentElement.classList.add('hidden');
      }
    }

    // Botão de Edição (Apenas visível se for o próprio usuário!)
    const editBtn = document.getElementById('btn-open-edit-profile');
    if (editBtn) {
      if (isSelf) {
        editBtn.classList.remove('hidden');
        editBtn.onclick = () => openEditProfileModal();
      } else {
        editBtn.classList.add('hidden');
      }
    }

    // Botão de criar publicação a partir do próprio perfil
    const quickCreateBtn = document.getElementById('btn-perfil-quick-create');
    if (quickCreateBtn) {
      quickCreateBtn.style.display = isSelf ? 'flex' : 'none';
      quickCreateBtn.onclick = () => navigateTo('criar');
    }

    // Publicações do autor
    renderAuthorPublications(authorId, isSelf);

    navigateTo('perfil');
  }

  function renderAuthorPublications(authorId, isSelf) {
    const authorPubs = PublicacoesDB.getAll().filter(p => p.author && p.author.id === authorId);

    const countEl = document.getElementById('perfil-pub-count');
    if (countEl) countEl.textContent = authorPubs.length.toString();

    const galleryEl = document.getElementById('perfil-publications-grid');
    if (!galleryEl) return;

    if (authorPubs.length === 0) {
      galleryEl.innerHTML = `
        <div class="col-span-full py-12 text-center bg-surface-container-low border border-dashed border-outline-variant/60 p-space-lg">
          <span class="material-symbols-outlined text-[36px] text-on-surface-variant mb-1">photo_library</span>
          <p class="font-body-md text-on-surface font-semibold">Nenhuma publicação registrada ainda</p>
          <p class="font-body-sm text-body-sm text-on-surface-variant mt-0.5">
            ${isSelf ? 'Você ainda não compartilhou nenhuma produção. Clique abaixo para começar!' : 'Este estudante ainda não tem publicações aprovadas.'}
          </p>
          ${isSelf ? `
            <button onclick="window.EntrelinhasApp.navigateTo('criar')" class="mt-4 px-space-md py-2 bg-primary text-on-primary font-meta-code text-[11px] uppercase tracking-wider font-bold shadow-sm">
              Criar Minha Primeira Publicação
            </button>
          ` : ''}
        </div>`;
      return;
    }

    galleryEl.innerHTML = authorPubs.map(pub => {
      const thumb = (pub.media && pub.media[0]) ? (pub.media[0].thumbnail || pub.media[0].data) : 'assets/tech/maratona-tech-1.jpg';
      const isVideo = pub.media && pub.media[0] && pub.media[0].type === 'video';

      return `
        <div class="bg-surface-container-lowest border border-outline-variant/30 overflow-hidden shadow-sm flex flex-col justify-between group profile-pub-card" data-pub-id="${pub.id}">
          <div class="aspect-video sm:aspect-square bg-primary-container overflow-hidden relative cursor-pointer" onclick="window.EntrelinhasApp.openDetail('${pub.id}')">
            <img class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" src="${thumb}" alt="${pub.title}"/>
            <div class="absolute inset-0 bg-gradient-to-t from-primary/80 via-transparent to-transparent flex flex-col justify-end p-2.5 text-white">
              <span class="font-meta-code text-[9px] text-secondary-fixed uppercase font-bold tracking-wider">${categoryLabel(pub.category)}</span>
              <p class="font-headline-sm text-[12px] font-semibold leading-tight line-clamp-1">${pub.title}</p>
            </div>
            ${isVideo ? '<span class="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center"><span class="material-symbols-outlined text-[14px]">play_arrow</span></span>' : ''}
          </div>
          ${isSelf ? `
            <div class="p-2 bg-surface-container flex items-center justify-between border-t border-outline-variant/20">
              <span class="font-meta-code text-[9px] text-on-surface-variant uppercase">${formatDate(pub.publishedAt || pub.createdAt)}</span>
              <div class="flex items-center gap-1.5">
                <button class="author-action-btn edit" onclick="window.EntrelinhasApp.editPublication('${pub.id}')" title="Editar Publicação">
                  <span class="material-symbols-outlined text-[13px]">edit</span>
                  <span>Editar</span>
                </button>
                <button class="author-action-btn delete" onclick="window.EntrelinhasApp.confirmDeletePublication('${pub.id}')" title="Excluir Publicação">
                  <span class="material-symbols-outlined text-[13px]">delete</span>
                </button>
              </div>
            </div>
          ` : `
            <div class="p-2 bg-surface-container flex items-center justify-between border-t border-outline-variant/20">
              <span class="font-meta-code text-[9px] text-on-surface-variant uppercase">${formatDate(pub.publishedAt || pub.createdAt)}</span>
              <button onclick="window.EntrelinhasApp.openDetail('${pub.id}')" class="text-primary font-label-sm text-[11px] font-bold flex items-center gap-0.5">
                Ver <span class="material-symbols-outlined text-[14px]">arrow_forward</span>
              </button>
            </div>
          `}
        </div>`;
    }).join('');
  }

  // ── Modal de Edição de Perfil ─────────────────────────────────────────────
  let tempAvatarBase64 = null;
  let tempBannerBase64 = null;
  let tempInterests = [];
  let tempLinks = [];

  function setupProfileEditor() {
    // Inputs de arquivo no modal de edição
    const avatarInput = document.getElementById('edit-profile-avatar-input');
    const bannerInput = document.getElementById('edit-profile-banner-input');

    if (avatarInput) {
      avatarInput.addEventListener('change', async () => {
        if (avatarInput.files && avatarInput.files[0]) {
          const comp = await PublicacoesDB.compressImage(avatarInput.files[0], 360, 0.85);
          tempAvatarBase64 = comp.data;
          const preview = document.getElementById('edit-profile-avatar-preview');
          if (preview) preview.src = tempAvatarBase64;
          showToast('Foto de perfil carregada.', 'info');
        }
      });
    }

    if (bannerInput) {
      bannerInput.addEventListener('change', async () => {
        if (bannerInput.files && bannerInput.files[0]) {
          const comp = await PublicacoesDB.compressImage(bannerInput.files[0], 1280, 0.8);
          tempBannerBase64 = comp.data;
          const preview = document.getElementById('edit-profile-banner-preview');
          if (preview) preview.src = tempBannerBase64;
          showToast('Imagem de capa carregada.', 'info');
        }
      });
    }

    // Adição de links
    const addLinkBtn = document.getElementById('btn-add-profile-link');
    if (addLinkBtn) {
      addLinkBtn.addEventListener('click', () => {
        const labelInput = document.getElementById('new-link-label');
        const urlInput = document.getElementById('new-link-url');
        const label = labelInput?.value.trim();
        const url = urlInput?.value.trim();

        if (!label || !url) {
          showToast('Informe o rótulo e a URL do link.', 'error');
          return;
        }

        tempLinks.push({ label, url });
        labelInput.value = '';
        urlInput.value = '';
        renderEditLinks();
      });
    }

    // Botões Salvar / Cancelar Edição de Perfil
    const saveBtn = document.getElementById('btn-save-profile');
    if (saveBtn) saveBtn.addEventListener('click', saveProfileChanges);

    const cancelBtn = document.getElementById('btn-cancel-profile-edit');
    if (cancelBtn) cancelBtn.addEventListener('click', closeEditProfileModal);
  }

  function openEditProfileModal() {
    const user = UsersDB.getCurrentUser();
    tempAvatarBase64 = user.avatarUrl || null;
    tempBannerBase64 = user.bannerUrl || null;
    tempInterests = [...(user.interests || [])];
    tempLinks = [...(user.links || [])];

    document.getElementById('edit-profile-name').value = user.name || '';
    document.getElementById('edit-profile-username').value = user.username || '';
    document.getElementById('edit-profile-year').value = user.year || '';
    document.getElementById('edit-profile-school').value = user.school || '';
    document.getElementById('edit-profile-bio').value = user.bio || '';

    const avatarPreview = document.getElementById('edit-profile-avatar-preview');
    if (avatarPreview) {
      avatarPreview.src = tempAvatarBase64 || 'assets/branding/logo-cavalli.jpg';
    }

    const bannerPreview = document.getElementById('edit-profile-banner-preview');
    if (bannerPreview) {
      bannerPreview.src = tempBannerBase64 || 'assets/tech/maratona-tech-1.jpg';
    }

    renderEditInterests();
    renderEditLinks();

    const modal = document.getElementById('modal-edit-profile');
    if (modal) modal.classList.remove('hidden');
  }

  function closeEditProfileModal() {
    const modal = document.getElementById('modal-edit-profile');
    if (modal) modal.classList.add('hidden');
  }

  function renderEditInterests() {
    const container = document.getElementById('edit-interests-container');
    if (!container) return;

    const available = [
      'Iniciação Científica', 'Robótica & IA', 'Fotografia Documental',
      'Literatura & Poesia', 'Artes Visuais', 'Filosofia', 'Sociologia',
      'Química Ambiental', 'Audiovisual & Cinema', 'Astronáutica'
    ];

    container.innerHTML = available.map(tag => {
      const isSelected = tempInterests.includes(tag);
      return `
        <button type="button" class="filter-chip px-2.5 py-1 text-[11px] font-semibold ${isSelected ? 'active' : ''}" data-interest="${tag}">
          ${isSelected ? '✓ ' : '+ '} ${tag}
        </button>
      `;
    }).join('');

    container.querySelectorAll('button').forEach(btn => {
      btn.addEventListener('click', () => {
        const tag = btn.getAttribute('data-interest');
        if (tempInterests.includes(tag)) {
          tempInterests = tempInterests.filter(t => t !== tag);
        } else {
          tempInterests.push(tag);
        }
        renderEditInterests();
      });
    });
  }

  function renderEditLinks() {
    const container = document.getElementById('edit-links-list');
    if (!container) return;

    if (tempLinks.length === 0) {
      container.innerHTML = '<p class="text-[11px] text-on-surface-variant italic">Nenhum link adicionado ainda.</p>';
      return;
    }

    container.innerHTML = tempLinks.map((link, idx) => `
      <div class="flex items-center justify-between p-2 bg-surface-container text-[12px] border border-outline-variant/30">
        <div>
          <span class="font-bold text-primary">${link.label}</span>
          <span class="text-on-surface-variant block text-[10px] truncate max-w-[240px]">${link.url}</span>
        </div>
        <button type="button" class="text-error hover:font-bold p-1" onclick="window.EntrelinhasApp.removeTempLink(${idx})" title="Remover link">
          ✕
        </button>
      </div>
    `).join('');
  }

  function removeTempLink(idx) {
    tempLinks.splice(idx, 1);
    renderEditLinks();
  }

  function saveProfileChanges() {
    const name = document.getElementById('edit-profile-name').value.trim();
    const rawUsername = document.getElementById('edit-profile-username').value.trim();
    const cleanUsername = rawUsername.replace(/^@/, '').toLowerCase();
    const year = document.getElementById('edit-profile-year').value.trim();
    const school = document.getElementById('edit-profile-school').value.trim();
    const bio = document.getElementById('edit-profile-bio').value.trim();

    if (!name || !cleanUsername) {
      showToast('Nome de exibição e nome de usuário são obrigatórios.', 'error');
      return;
    }

    const current = UsersDB.getCurrentUser();
    const updated = {
      ...current,
      name,
      username: cleanUsername,
      year: year || current.year,
      school: school || current.school,
      bio,
      avatarUrl: tempAvatarBase64 || current.avatarUrl,
      bannerUrl: tempBannerBase64 || current.bannerUrl,
      interests: tempInterests,
      links: tempLinks
    };

    UsersDB.saveUser(updated);
    updateHeaderUserDisplay();
    closeEditProfileModal();
    showToast('Perfil acadêmico atualizado com sucesso!', 'success');

    openAuthorProfile(updated.id);
  }

  // ── Edição & Exclusão de Publicações Próprias ─────────────────────────────
  function confirmDeletePublication(pubId) {
    const pub = PublicacoesDB.getById(pubId);
    if (!pub) return;

    showConfirmModal(
      `Tem certeza que deseja excluir a publicação "${pub.title}"? Esta ação removerá os arquivos e não poderá ser desfeita.`,
      () => {
        PublicacoesDB.delete(pubId);
        showToast('Publicação excluída com sucesso.', 'info');
        if (currentView === 'detalhe') {
          navigateTo('publicacoes');
        } else if (currentView === 'perfil') {
          openAuthorProfile(viewingAuthorId || UsersDB.getCurrentUserId());
        } else {
          renderFeed(activeFilter);
        }
      }
    );
  }

  async function loadPublicationForEdit(pubId) {
    const pub = PublicacoesDB.getById(pubId);
    if (!pub) {
      showToast('Publicação não encontrada para edição', 'error');
      return;
    }

    editingPubId = pubId;
    selectedMedia = [];

    // Carregar mídias existentes
    const media = await PublicacoesDB.getMedia(pubId);
    selectedMedia = (media || []).map(m => ({
      type: m.type,
      data: m.data,
      thumbnail: m.thumbnail,
      mimeType: m.mimeType
    }));

    document.getElementById('pub-title').value = pub.title || '';
    document.getElementById('pub-category').value = pub.category || '';
    document.getElementById('pub-caption').value = pub.caption || '';
    document.getElementById('pub-description').value = pub.description || '';
    document.getElementById('pub-context').value = pub.context || '';

    document.querySelectorAll('.colab-chip').forEach(el => el.remove());
    if (pub.collaborators && pub.collaborators.length > 0) {
      pub.collaborators.forEach(c => addColabChip(c));
    }

    renderMediaPreviews();
    goToStep(1);

    const submitBtn = document.getElementById('btn-submit-approval');
    if (submitBtn) {
      submitBtn.innerHTML = `
        <span class="material-symbols-outlined text-[18px]">save</span>
        <span>Salvar Alterações</span>
      `;
    }
  }

  function editPublication(pubId) {
    navigateTo('criar', { editId: pubId });
  }

  // ── Sistema de Criação de Publicações (Stepper & Upload) ──────────────────
  function setupUploadZone() {
    const zone = document.getElementById('upload-zone');
    const fileInput = document.getElementById('file-input');
    if (!zone || !fileInput) return;

    zone.addEventListener('dragover', e => {
      e.preventDefault();
      zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => zone.classList.remove('drag-over'));

    zone.addEventListener('drop', e => {
      e.preventDefault();
      zone.classList.remove('drag-over');
      processFiles(Array.from(e.dataTransfer.files));
    });

    fileInput.addEventListener('change', () => {
      processFiles(Array.from(fileInput.files));
      fileInput.value = '';
    });
  }

  async function processFiles(files) {
    if (!files || files.length === 0) return;

    const remainingSlots = 10 - selectedMedia.length;
    if (remainingSlots <= 0) {
      showToast('Limite máximo de 10 mídias atingido.', 'info');
      return;
    }

    const toProcess = files.slice(0, remainingSlots);
    showToast(`Processando ${toProcess.length} arquivo(s)...`, 'info');

    for (const file of toProcess) {
      if (file.size > 25 * 1024 * 1024) {
        showToast(`Arquivo muito grande: ${file.name} (máx 25MB)`, 'error');
        continue;
      }

      if (file.type.startsWith('image/')) {
        try {
          const comp = await PublicacoesDB.compressImage(file);
          selectedMedia.push({
            file,
            type: 'image',
            data: comp.data,
            thumbnail: comp.thumbnail,
            mimeType: file.type
          });
        } catch(err) {
          console.error(err);
        }
      } else if (file.type.startsWith('video/')) {
        try {
          const thumb = await PublicacoesDB.generateVideoThumbnail(file);
          selectedMedia.push({
            file,
            type: 'video',
            data: '',
            thumbnail: thumb,
            mimeType: file.type
          });
        } catch(err) {
          console.error(err);
        }
      } else {
        showToast(`Formato não suportado: ${file.name}`, 'error');
      }
    }

    renderMediaPreviews();
    showToast('Mídia adicionada com sucesso!', 'success');
  }

  function renderMediaPreviews() {
    const grid = document.getElementById('media-previews');
    const counter = document.getElementById('media-counter');
    const section = document.getElementById('media-section');
    if (!grid) return;

    if (counter) counter.textContent = `${selectedMedia.length} de 10 arquivos`;
    if (section) section.classList.toggle('hidden', selectedMedia.length === 0);

    grid.innerHTML = selectedMedia.map((m, i) => `
      <div class="media-preview-item" draggable="true" data-idx="${i}">
        <img src="${m.thumbnail || m.data}" alt="Preview ${i + 1}"/>
        ${m.type === 'video' ? '<div class="video-indicator"><span class="material-symbols-outlined text-[12px]">play_arrow</span></div>' : ''}
        ${i === 0 ? '<div class="cover-badge">Capa</div>' : ''}
        <button class="remove-btn" data-idx="${i}" title="Remover" onclick="event.stopPropagation()">✕</button>
      </div>
    `).join('');

    grid.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.getAttribute('data-idx'));
        selectedMedia.splice(idx, 1);
        renderMediaPreviews();
      });
    });

    grid.querySelectorAll('.media-preview-item').forEach(item => {
      item.addEventListener('dragstart', e => {
        dragSrcIndex = parseInt(item.getAttribute('data-idx'));
        item.classList.add('dragging');
        e.dataTransfer.effectAllowed = 'move';
      });

      item.addEventListener('dragend', () => {
        item.classList.remove('dragging');
        grid.querySelectorAll('.media-preview-item').forEach(el => el.classList.remove('drag-target'));
      });

      item.addEventListener('dragover', e => {
        e.preventDefault();
        item.classList.add('drag-target');
      });

      item.addEventListener('dragleave', () => {
        item.classList.remove('drag-target');
      });

      item.addEventListener('drop', e => {
        e.preventDefault();
        item.classList.remove('drag-target');
        const destIdx = parseInt(item.getAttribute('data-idx'));
        if (dragSrcIndex !== null && dragSrcIndex !== destIdx) {
          const [moved] = selectedMedia.splice(dragSrcIndex, 1);
          selectedMedia.splice(destIdx, 0, moved);
          renderMediaPreviews();
        }
      });
    });
  }

  function setupStepper() {
    const s1next = document.getElementById('step1-next');
    const s2back = document.getElementById('step2-back');
    const s2next = document.getElementById('step2-next');
    const s3back = document.getElementById('step3-back');
    const submitBtn = document.getElementById('btn-submit-approval');
    const draftBtn = document.getElementById('btn-save-draft');

    if (s1next) s1next.addEventListener('click', () => {
      if (selectedMedia.length === 0) {
        showToast('Selecione pelo menos uma fotografia ou vídeo.', 'error');
        return;
      }
      goToStep(2);
    });

    if (s2back) s2back.addEventListener('click', () => goToStep(1));

    if (s2next) s2next.addEventListener('click', () => {
      const title = document.getElementById('pub-title')?.value.trim();
      const cat = document.getElementById('pub-category')?.value;
      if (!title) {
        showToast('Por favor, informe o título da publicação.', 'error');
        document.getElementById('pub-title')?.focus();
        return;
      }
      if (!cat) {
        showToast('Por favor, selecione a categoria temática.', 'error');
        document.getElementById('pub-category')?.focus();
        return;
      }
      goToStep(3);
      updateReviewPreview();
      updateChecklist();
    });

    if (s3back) s3back.addEventListener('click', () => goToStep(2));
    if (submitBtn) submitBtn.addEventListener('click', submitForApproval);
    if (draftBtn) draftBtn.addEventListener('click', saveDraft);
  }

  function goToStep(n) {
    currentStep = n;
    [1, 2, 3].forEach(i => {
      const content = document.getElementById('step-' + i);
      const bubble = document.getElementById('bubble-' + i);
      const line = document.getElementById('line-' + i);
      if (content) content.classList.toggle('hidden', i !== n);
      if (bubble) {
        bubble.className = 'step-bubble ' + (i < n ? 'done' : i === n ? 'active' : 'pending');
        bubble.textContent = i < n ? '✓' : i.toString();
      }
      if (line) line.classList.toggle('done', i < n);
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function updateChecklist() {
    const title = document.getElementById('pub-title')?.value.trim();
    const cat = document.getElementById('pub-category')?.value;

    const setItem = (id, valid) => {
      const el = document.getElementById(id);
      if (!el) return;
      const icon = el.querySelector('.material-symbols-outlined');
      const text = el.querySelector('span:last-child');
      if (icon) {
        icon.textContent = valid ? 'check_circle' : 'radio_button_unchecked';
        icon.className = 'material-symbols-outlined text-[20px] ' + (valid ? 'text-secondary' : 'text-on-surface-variant');
      }
      if (text) {
        text.className = 'font-body-sm text-body-sm ' + (valid ? 'text-on-surface font-semibold' : 'text-on-surface-variant');
      }
    };

    setItem('check-media', selectedMedia.length > 0);
    setItem('check-title', !!title);
    setItem('check-category', !!cat);
  }

  function updateReviewPreview() {
    const container = document.getElementById('review-preview');
    if (!container) return;

    const title = document.getElementById('pub-title')?.value.trim() || 'Título não definido';
    const caption = document.getElementById('pub-caption')?.value.trim();
    const cat = document.getElementById('pub-category')?.value;
    const thumb = selectedMedia.length > 0 ? (selectedMedia[0].thumbnail || selectedMedia[0].data) : null;
    const currentUser = UsersDB.getCurrentUser();

    container.innerHTML = `
      <div class="flex flex-col">
        ${thumb ? `<div class="w-full bg-primary-container overflow-hidden" style="aspect-ratio: 16/9;"><img src="${thumb}" class="w-full h-full object-cover"/></div>` : ''}
        <div class="p-space-md bg-surface-container-lowest">
          <span class="font-meta-code text-[11px] text-secondary uppercase font-bold tracking-widest">${categoryLabel(cat)}</span>
          <h3 class="font-headline-sm text-headline-sm text-primary mt-1">${title}</h3>
          ${caption ? `<p class="font-body-sm text-body-sm text-on-surface-variant mt-1.5 italic">“${caption}”</p>` : ''}
          <div class="flex items-center gap-2 mt-3 pt-2 border-t border-outline-variant/30 text-on-surface-variant text-[11px] font-label-sm">
            <span>Autoria: ${currentUser.name} (${currentUser.year})</span>
            <span>·</span>
            <span>${selectedMedia.length} arquivo(s) multimídia</span>
          </div>
        </div>
      </div>`;
  }

  function collectFormData(status) {
    const title = document.getElementById('pub-title')?.value.trim() || 'Sem Título';
    const caption = document.getElementById('pub-caption')?.value.trim() || '';
    const description = document.getElementById('pub-description')?.value.trim() || '';
    const context = document.getElementById('pub-context')?.value.trim() || '';
    const category = document.getElementById('pub-category')?.value || 'outro';
    const collaborators = Array.from(document.querySelectorAll('.colab-chip')).map(c => c.dataset.value);
    const currentUser = UsersDB.getCurrentUser();

    const data = {
      title,
      caption,
      description,
      context,
      category,
      collaborators,
      author: {
        id: currentUser.id,
        name: currentUser.name,
        photoUrl: currentUser.avatarUrl || '',
        year: currentUser.year,
        school: currentUser.school
      },
      media: selectedMedia.map(m => ({
        type: m.type,
        data: m.data,
        thumbnail: m.thumbnail,
        mimeType: m.mimeType
      })),
      status
    };

    if (editingPubId) {
      data.id = editingPubId;
    } else {
      data.createdAt = new Date().toISOString();
    }

    if (status === 'published') {
      data.publishedAt = new Date().toISOString();
    }

    return data;
  }

  async function saveDraft() {
    const pub = collectFormData('draft');
    const saved = PublicacoesDB.save(pub);
    await PublicacoesDB.saveMedia(saved.id, selectedMedia);
    showToast('Rascunho salvo no seu repositório local.', 'success');
  }

  function submitForApproval() {
    const title = document.getElementById('pub-title')?.value.trim();
    const cat = document.getElementById('pub-category')?.value;

    if (!title || !cat || selectedMedia.length === 0) {
      showToast('Preencha os campos obrigatórios antes do envio.', 'error');
      return;
    }

    const actionText = editingPubId ? 'Confirmar atualização desta publicação?' : 'Sua produção será encaminhada ao Conselho Editorial e publicada no acervo escolar. Deseja confirmar?';

    showConfirmModal(
      actionText,
      async () => {
        const pub = collectFormData('published');
        const saved = PublicacoesDB.save(pub);
        await PublicacoesDB.saveMedia(saved.id, selectedMedia);

        showToast(editingPubId ? 'Publicação atualizada com sucesso!' : 'Publicação enviada e aprovada!', 'success');
        resetForm();

        setTimeout(() => {
          navigateTo('detalhe', { id: saved.id });
        }, 800);
      }
    );
  }

  function setupCollaboratorInput() {
    const input = document.getElementById('colab-input');
    if (!input) return;

    input.addEventListener('keydown', e => {
      if ((e.key === 'Enter' || e.key === ',') && input.value.trim()) {
        e.preventDefault();
        addColabChip(input.value.trim().replace(/^@/, ''));
        input.value = '';
      }
    });
  }

  function addColabChip(name) {
    const container = document.getElementById('colabs-container');
    const input = document.getElementById('colab-input');
    if (!container || !input) return;

    const chip = document.createElement('div');
    chip.className = 'colab-chip';
    chip.dataset.value = name;
    chip.innerHTML = `
      <span>${name}</span>
      <button type="button" onclick="this.parentElement.remove()" title="Remover">✕</button>
    `;
    container.insertBefore(chip, input);
  }

  function resetForm() {
    editingPubId = null;
    selectedMedia = [];
    currentStep = 1;
    renderMediaPreviews();
    goToStep(1);

    ['pub-title', 'pub-caption', 'pub-description', 'pub-context'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = '';
    });

    const cat = document.getElementById('pub-category');
    if (cat) cat.value = '';

    document.querySelectorAll('.colab-chip').forEach(el => el.remove());

    const submitBtn = document.getElementById('btn-submit-approval');
    if (submitBtn) {
      submitBtn.innerHTML = `
        <span class="material-symbols-outlined text-[20px] text-secondary-fixed">send</span>
        <span>Enviar para Publicação</span>
      `;
    }
  }

  // ── Toasts e Modais Editoriais ───────────────────────────────────────────
  function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast ' + type;
    const icons = { success: 'check_circle', error: 'error', info: 'info' };

    toast.innerHTML = `
      <span class="material-symbols-outlined text-[20px] shrink-0">${icons[type] || 'info'}</span>
      <span class="flex-1">${message}</span>
    `;

    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-12px)';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  function showConfirmModal(message, onConfirm) {
    const container = document.getElementById('modal-container');
    if (!container) return;

    const modal = document.createElement('div');
    modal.className = 'modal-overlay';
    modal.innerHTML = `
      <div class="modal-sheet">
        <div class="flex items-center gap-space-sm mb-space-sm">
          <div class="w-10 h-10 rounded-full bg-primary-container text-secondary-fixed flex items-center justify-center shrink-0">
            <span class="material-symbols-outlined text-[22px]">verified_user</span>
          </div>
          <div>
            <span class="font-meta-code text-[10px] text-secondary uppercase font-bold tracking-widest">Protocolo Editorial CCMPR</span>
            <h3 class="font-headline-sm text-subhead-lg text-primary font-bold">Confirmação</h3>
          </div>
        </div>
        <p class="font-body-sm text-body-sm text-on-surface-variant leading-relaxed mb-space-lg">${message}</p>
        <div class="flex flex-col gap-space-sm">
          <button id="modal-confirm-btn" class="w-full py-3 bg-primary text-on-primary font-meta-code text-meta-code uppercase tracking-wider font-bold active:scale-95 transition-transform flex items-center justify-center gap-2 shadow-md">
            <span class="material-symbols-outlined text-[18px]">check</span>
            Confirmar
          </button>
          <button id="modal-cancel-btn" class="w-full py-2.5 text-on-surface-variant font-meta-code text-meta-code uppercase tracking-wider font-semibold">
            Cancelar
          </button>
        </div>
      </div>`;

    container.appendChild(modal);

    const confirmBtn = modal.querySelector('#modal-confirm-btn');
    const cancelBtn = modal.querySelector('#modal-cancel-btn');

    confirmBtn.addEventListener('click', () => {
      modal.remove();
      if (onConfirm) onConfirm();
    });

    cancelBtn.addEventListener('click', () => modal.remove());
    modal.addEventListener('click', e => {
      if (e.target === modal) modal.remove();
    });
  }

  // Exportar funções para escopo global do app
  window.EntrelinhasApp = {
    navigateTo,
    goBack,
    openDetail,
    openAuthorProfile,
    editPublication,
    confirmDeletePublication,
    removeTempLink,
    showToast
  };
});
