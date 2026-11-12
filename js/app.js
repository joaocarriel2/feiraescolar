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
    const thumb = (pub.media && pub.media[0]) ? (pub.media[0].thumbnail || pub.media[0].data) : 'tech/maratona-tech-1.jpg';
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
    const thumb = (pub.media && pub.media[0]) ? (pub.media[0].thumbnail || pub.media[0].data) : 'tech/maratona-tech-2.jpg';
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
      const thumb = (pub.media && pub.media[0]) ? (pub.media[0].thumbnail || pub.media[0].data) : 'tech/maratona-tech-3.jpg';
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
      coverEl.src = authorUser.bannerUrl || 'tech/maratona-tech-1.jpg';
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
        editBtn.onclick
