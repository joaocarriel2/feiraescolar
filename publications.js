/**
 * ENTRELINHAS CCMPR — Publications & User Profiles Engine
 * Armazenamento persistente de publicações, mídias e perfis discentes
 */

;(function() {
  'use strict';

  const STORAGE_PUBS = 'entrelinhas_publications';
  const STORAGE_USERS = 'entrelinhas_users';
  const STORAGE_CURRENT_USER = 'entrelinhas_current_user_id';
  const DB_NAME = 'entrelinhas_db';
  const DB_VERSION = 1;
  const STORE_MEDIA = 'media';

  let _db = null;
  const _listeners = {};

  function uuid(prefix = 'pub') {
    return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  function emit(event, data) {
    (_listeners[event] || []).forEach(cb => {
      try { cb(data); } catch(e) { console.error(e); }
    });
  }

  /* ── IndexedDB ─────────────────────────────────────────────────────────── */
  function openDB() {
    return new Promise((resolve) => {
      if (_db) { resolve(_db); return; }
      if (!window.indexedDB) { resolve(null); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = e => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_MEDIA)) {
          db.createObjectStore(STORE_MEDIA, { keyPath: 'publicationId' });
        }
      };
      req.onsuccess = e => {
        _db = e.target.result;
        resolve(_db);
      };
      req.onerror = () => resolve(null);
    });
  }

  /* ── Compressão de Imagens & Thumbnails de Vídeo ───────────────────────── */
  function compressImage(file, maxDimension = 1280, quality = 0.8) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = e => {
        const img = new Image();
        img.onload = () => {
          const compress = (maxDim, q) => {
            const canvas = document.createElement('canvas');
            let w = img.width;
            let h = img.height;
            if (w > h) {
              if (w > maxDim) {
                h = Math.round((h * maxDim) / w);
                w = maxDim;
              }
            } else {
              if (h > maxDim) {
                w = Math.round((w * maxDim) / h);
                h = maxDim;
              }
            }
            canvas.width = w;
            canvas.height = h;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, w, h);
            return canvas.toDataURL('image/jpeg', q);
          };

          resolve({
            data: compress(maxDimension, quality),
            thumbnail: compress(320, 0.65),
            mimeType: 'image/jpeg'
          });
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function generateVideoThumbnail(file) {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.muted = true;
      video.playsInline = true;
      video.src = url;
      video.onloadeddata = () => {
        video.currentTime = Math.min(1.0, (video.duration || 1) / 2);
      };
      video.onseeked = () => {
        const canvas = document.createElement('canvas');
        canvas.width = 360;
        canvas.height = Math.round(360 * (video.videoHeight || 9) / (video.videoWidth || 16)) || 202;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const thumbnail = canvas.toDataURL('image/jpeg', 0.65);
        URL.revokeObjectURL(url);
        resolve(thumbnail);
      };
      video.onerror = () => {
        URL.revokeObjectURL(url);
        resolve('');
      };
    });
  }

  /* ── Perfis Discentes (UsersDB) ────────────────────────────────────────── */
  const DEFAULT_USERS = [
    {
      id: 'author-joao',
      username: 'joaocavalli',
      name: 'João da Silva',
      year: '3º Ano A — Ensino Médio',
      school: 'CCM João Cavalli da Costa',
      bio: 'Estudante pesquisador participante da Maratona Tech e entusiasta de hardware livre e jornalismo estudantil.',
      avatarUrl: '',
      bannerUrl: 'assets/tech/maratona-tech-1.jpg',
      interests: ['Robótica & IA', 'Iniciação Científica', 'Fotografia', 'Jornalismo'],
      links: [
        { label: 'Currículo Lattes', url: 'http://lattes.cnpq.br/' },
        { label: 'GitHub Projetos', url: 'https://github.com/' }
      ]
    },
    {
      id: 'author-ana',
      username: 'anaclara.m',
      name: 'Ana Clara Moreira',
      year: '2º Ano B — Humanidades',
      school: 'CCM João Cavalli da Costa',
      bio: 'Fotógrafa documental apaixonada pelo registro do cotidiano escolar e da arquitetura do Paraná.',
      avatarUrl: '',
      bannerUrl: 'assets/tech/maratona-tech-2.jpg',
      interests: ['Fotografia Documental', 'Sociologia Urbana', 'Patrimônio'],
      links: [
        { label: 'Portfólio Visual', url: 'https://instagram.com/' }
      ]
    },
    {
      id: 'author-sofia',
      username: 'sofia.rezende',
      name: 'Sofia Rezende',
      year: '3º Ano B — Meio Ambiente',
      school: 'CCM João Cavalli da Costa',
      bio: 'Líder do Grêmio de Ciências. Pesquisando sensores ambientais e biomateriais alternativos para sustentabilidade.',
      avatarUrl: '',
      bannerUrl: 'assets/lab/trabalho-fisica.jpg',
      interests: ['Química Ambiental', 'Robótica IoT', 'Biologia'],
      links: [
        { label: 'Projeto Feira de Ciências', url: 'https://febrace.org.br/' }
      ]
    },
    {
      id: 'author-rodrigo',
      username: 'rodrigo.poeta',
      name: 'Rodrigo Fonseca',
      year: '3º Ano C — Letras',
      school: 'CCM João Cavalli da Costa',
      bio: 'Editor do fanzine independente "Entrelinhas Poéticas" e pesquisador da literatura moderna paranaense.',
      avatarUrl: '',
      bannerUrl: 'assets/literatura/poesia-estudante-1.jpg',
      interests: ['Literatura', 'Poesia Concreta', 'Fanzines'],
      links: [
        { label: 'Coletivo Poético', url: 'https://medium.com/' }
      ]
    },
    {
      id: 'author-leticia',
      username: 'leticia.livros',
      name: 'Letícia & Heloísa',
      year: '1º Ano A — Clube do Livro',
      school: 'CCM João Cavalli da Costa',
      bio: 'Mediadoras de leitura do colégio. Apresentamos resenhas em vídeo de clássicos e novas leituras juvenis.',
      avatarUrl: '',
      bannerUrl: 'assets/artes/trabalho-arte.jpg',
      interests: ['Crítica Literária', 'Audiovisual', 'Teatro'],
      links: [
        { label: 'Canal de Resenhas', url: 'https://youtube.com/' }
      ]
    },
    {
      id: 'author-gabriel',
      username: 'gabriel.cavalli',
      name: 'Gabriel Souza',
      year: '3º Ano A — Cívico-Militar',
      school: 'CCM João Cavalli da Costa',
      bio: 'Líder do Pelotão de Guarda de Honra e participante ativo dos projetos de artes visuais e cidadania participativa.',
      avatarUrl: '',
      bannerUrl: 'assets/institucional/pelotao-bandeiras.mp4',
      interests: ['Civismo & Liderança', 'Escultura', 'Comunicação Comunitária'],
      links: [
        { label: 'Portal Cívico CCMPR', url: 'https://www.educacao.pr.gov.br/' }
      ]
    }
  ];

  function loadUsers() {
    try {
      const stored = localStorage.getItem(STORAGE_USERS);
      if (!stored) return DEFAULT_USERS;
      const parsed = JSON.parse(stored);
      let updated = false;
      DEFAULT_USERS.forEach(def => {
        if (!parsed.some(u => u.id === def.id)) {
          parsed.push(def);
          updated = true;
        }
      });
      if (updated) persistUsers(parsed);
      return parsed;
    } catch(e) {
      return DEFAULT_USERS;
    }
  }

  function persistUsers(users) {
    try {
      localStorage.setItem(STORAGE_USERS, JSON.stringify(users));
    } catch(e) {
      console.warn('[UsersDB] Erro ao persistir usuários');
    }
  }

  const UsersDB = {
    getAll() {
      return loadUsers();
    },

    getById(id) {
      const users = loadUsers();
      return users.find(u => u.id === id) || null;
    },

    getByUsername(username) {
      const clean = (username || '').replace(/^@/, '').toLowerCase();
      const users = loadUsers();
      return users.find(u => (u.username || '').toLowerCase() === clean) || null;
    },

    getCurrentUserId() {
      return localStorage.getItem(STORAGE_CURRENT_USER) || 'author-joao';
    },

    getCurrentUser() {
      const currentId = this.getCurrentUserId();
      return this.getById(currentId) || DEFAULT_USERS[0];
    },

    setCurrentUserId(id) {
      localStorage.setItem(STORAGE_CURRENT_USER, id);
      emit('user_changed', this.getCurrentUser());
    },

    saveUser(userData) {
      const users = loadUsers();
      const idx = users.findIndex(u => u.id === userData.id);
      if (idx >= 0) {
        users[idx] = { ...users[idx], ...userData };
      } else {
        if (!userData.id) userData.id = uuid('user');
        users.push(userData);
      }
      persistUsers(users);

      // Atualiza o autor nas publicações existentes do mesmo usuário
      PublicacoesDB.updateAuthorMeta(userData);

      emit('user_updated', userData);
      return userData;
    }
  };

  /* ── Acervo Multimídia Cavalli & Demonstração ──────────────────────────── */
  const DEMO_PUBLICATIONS = [
    {
      id: 'pub-cavalli-1',
      title: 'Maratona Tech: Alunos do Cavalli em Imersão de Inovação e Tecnologia',
      caption: 'Registros da participação ativa dos estudantes nos desafios de programação e ideação tecnológica.',
      description: 'Durante a Maratona Tech realizada no colégio, nossas equipes colocaram em prática competências de pensamento computacional, raciocínio lógico e resolução de problemas cívicos e urbanos.\n\nA atividade mobilizou turmas do Ensino Fundamental e Médio, culminando em projetos de aplicativos e automação com foco nas necessidades da comunidade escolar e dos bairros vizinhos ao CCM João Cavalli da Costa.',
      context: 'Iniciativa promovida pelo Departamento de Tecnologias Educacionais e Grêmio de Robótica do Colégio Cívico-Militar João Cavalli da Costa.',
      category: 'ciencias',
      author: {
        id: 'author-joao',
        name: 'João da Silva',
        photoUrl: '',
        year: '3º Ano A — Ensino Médio',
        school: 'CCM João Cavalli da Costa'
      },
      collaborators: ['Prof. Dr. Ricardo D’Ávila', 'Equipe Dev Cavalli'],
      media: [
        {
          type: 'image',
          data: 'assets/tech/maratona-tech-1.jpg',
          thumbnail: 'assets/tech/maratona-tech-1.jpg',
          mimeType: 'image/jpeg'
        },
        {
          type: 'image',
          data: 'assets/tech/maratona-tech-2.jpg',
          thumbnail: 'assets/tech/maratona-tech-2.jpg',
          mimeType: 'image/jpeg'
        },
        {
          type: 'image',
          data: 'assets/tech/maratona-tech-3.jpg',
          thumbnail: 'assets/tech/maratona-tech-3.jpg',
          mimeType: 'image/jpeg'
        }
      ],
      status: 'published',
      createdAt: '2026-09-18T14:30:00Z',
      publishedAt: '2026-09-18T16:00:00Z'
    },
    {
      id: 'pub-cavalli-2',
      title: 'Foguetes de Garrafa PET e Hidrodinâmica: Experimentos Práticos de Física',
      caption: 'Lançamentos de foguetes movidos a água e ar pressurizado desenvolvidos no pátio do colégio.',
      description: 'Aliando as Leis de Newton, mecânica dos fluidos e aerodinâmica de bicos injetores, os alunos confeccionaram modelos com garrafas reutilizadas e aletas estabilizadoras em polímero.\n\nOs testes de lançamento contaram com medição angular e cálculo de apogeu por trigonometria, atingindo alcances de mais de 65 metros de trajetória.',
      context: 'Projeto experimental da Mostra Científica do CCM João Cavalli da Costa — Área de Física e Astronáutica Escolar.',
      category: 'ciencias',
      author: {
        id: 'author-sofia',
        name: 'Sofia Rezende',
        photoUrl: '',
        year: '3º Ano B — Meio Ambiente',
        school: 'CCM João Cavalli da Costa'
      },
      collaborators: ['Prof. Marcos Vinicius', 'Turma 3º B'],
      media: [
        {
          type: 'video',
          data: 'assets/lab/experimento-foguete.mp4',
          thumbnail: 'assets/lab/trabalho-fisica.jpg',
          mimeType: 'video/mp4'
        },
        {
          type: 'image',
          data: 'assets/lab/trabalho-fisica.jpg',
          thumbnail: 'assets/lab/trabalho-fisica.jpg',
          mimeType: 'image/jpeg'
        }
      ],
      status: 'published',
      createdAt: '2026-09-12T10:15:00Z',
      publishedAt: '2026-09-12T11:00:00Z'
    },
    {
      id: 'pub-cavalli-3',
      title: 'Vozes em Verso: Antologia de Poesias Manuscritas dos Alunos do Cavalli',
      caption: 'Trabalhos artesanais em cartolina e caligrafia explorando identidade, saudade e juventude.',
      description: 'Uma série poética expressiva produzida na disciplina de Língua Portuguesa. Os estudantes uniram colagens, traços manuais e versos livres para compor painéis expostos no saguão principal do colégio.\n\nA sensibilidade estética de cada texto revela a rica vida interior e o protagonismo juvenil presente em nossas salas de aula.',
      context: 'Exposição literária coordenada pela área de Linguagens do CCM João Cavalli da Costa.',
      category: 'literatura',
      author: {
        id: 'author-rodrigo',
        name: 'Rodrigo Fonseca',
        photoUrl: '',
        year: '3º Ano C — Letras',
        school: 'CCM João Cavalli da Costa'
      },
      collaborators: ['Prof.ª Ana Paula Ramos', 'Turma de Poesia'],
      media: [
        {
          type: 'image',
          data: 'assets/literatura/poesia-estudante-1.jpg',
          thumbnail: 'assets/literatura/poesia-estudante-1.jpg',
          mimeType: 'image/jpeg'
        },
        {
          type: 'image',
          data: 'assets/literatura/poesia-estudante-2.jpg',
          thumbnail: 'assets/literatura/poesia-estudante-2.jpg',
          mimeType: 'image/jpeg'
        },
        {
          type: 'image',
          data: 'assets/literatura/poesia-estudante-3.jpg',
          thumbnail: 'assets/literatura/poesia-estudante-3.jpg',
          mimeType: 'image/jpeg'
        }
      ],
      status: 'published',
      createdAt: '2026-08-25T11:00:00Z',
      publishedAt: '2026-08-25T14:30:00Z'
    },
    {
      id: 'pub-cavalli-4',
      title: 'Resenhas Literárias em Vídeo: O Clube do Livro Entrelinhas Entra em Ação',
      caption: 'Estudantes recomendam e analisam obras da biblioteca escolar em gravações dinâmicas.',
      description: 'Com o objetivo de estimular a leitura crítica e a oratória, o projeto de resenhas em vídeo convida alunos a compartilharem suas percepções sobre obras clássicas e contemporâneas do acervo escolar.\n\nNesta edição, Letícia e Heloísa apresentam detalhes de narrativa, desenvolvimento de personagens e a relevância temática de suas leituras mais recentes.',
      context: 'Clube de Leitura e Produção Audiovisual do Colégio Cívico-Militar João Cavalli da Costa.',
      category: 'video',
      author: {
        id: 'author-leticia',
        name: 'Letícia & Heloísa',
        photoUrl: '',
        year: '1º Ano A — Clube do Livro',
        school: 'CCM João Cavalli da Costa'
      },
      collaborators: ['Prof.ª Marluce', 'Grêmio Literário'],
      media: [
        {
          type: 'video',
          data: 'assets/literatura/resenha-leticia.mp4',
          thumbnail: 'assets/artes/trabalho-arte.jpg',
          mimeType: 'video/mp4'
        },
        {
          type: 'video',
          data: 'assets/literatura/resenha-helo-luiza.mp4',
          thumbnail: 'assets/artes/trabalho-arte.jpg',
          mimeType: 'video/mp4'
        }
      ],
      status: 'published',
      createdAt: '2026-08-10T15:20:00Z',
      publishedAt: '2026-08-10T16:00:00Z'
    },
    {
      id: 'pub-cavalli-5',
      title: 'Cores, Formas e Expressão: Mostra de Artes Visuais e Maquetes do Cavalli',
      caption: 'Pinturas acrílicas, painéis em aquarela e composições tridimensionais dos estudantes.',
      description: 'A mostra de artes visuais reuniu trabalhos práticos que dialogam com movimentos artísticos brasileiros e a iconografia local do Paraná.\n\nAs obras refletem o domínio de técnicas de pigmentação, sombreamento e representação espacial trabalhadas ao longo do trimestre letivo.',
      context: 'Curadoria realizada pelo Departamento de Artes e Humanidades do CCM João Cavalli da Costa.',
      category: 'arte',
      author: {
        id: 'author-ana',
        name: 'Ana Clara Moreira',
        photoUrl: '',
        year: '2º Ano B — Humanidades',
        school: 'CCM João Cavalli da Costa'
      },
      collaborators: ['Prof.ª Carla Souza'],
      media: [
        {
          type: 'image',
          data: 'assets/artes/trabalho-arte.jpg',
          thumbnail: 'assets/artes/trabalho-arte.jpg',
          mimeType: 'image/jpeg'
        },
        {
          type: 'image',
          data: 'assets/artes/trabalho-aluno-1.jpg',
          thumbnail: 'assets/artes/trabalho-aluno-1.jpg',
          mimeType: 'image/jpeg'
        },
        {
          type: 'image',
          data: 'assets/artes/trabalho-aluno-2.jpg',
          thumbnail: 'assets/artes/trabalho-aluno-2.jpg',
          mimeType: 'image/jpeg'
        }
      ],
      status: 'published',
      createdAt: '2026-07-28T09:40:00Z',
      publishedAt: '2026-07-28T10:30:00Z'
    },
    {
      id: 'pub-cavalli-6',
      title: 'Automação e Segurança: Protótipo de Sensor de Fumaça com Arduino',
      caption: 'Experimento do Grêmio de Robótica para detecção precoce de gases e emissão de alertas sonoros.',
      description: 'Integrando programação em C++, microcontrolador e sensor MQ-2 com sinalizador piezoelétrico, a equipe desenvolveu e calibrou um sistema de monitoramento de risco para ambientes escolares.\n\nO circuito foi testado em ambiente controlado, comprovando resposta em menos de 1,2 segundo.',
      context: 'Projeto de Iniciação Científica Júnior em Hardware Livre e Eletrônica.',
      category: 'ciencias',
      author: {
        id: 'author-joao',
        name: 'João da Silva',
        photoUrl: '',
        year: '3º Ano A — Ensino Médio',
        school: 'CCM João Cavalli da Costa'
      },
      collaborators: ['Prof. Eng. Roberto Santos', 'Grêmio de Robótica'],
      media: [
        {
          type: 'video',
          data: 'assets/lab/sensor-fumaca.mp4',
          thumbnail: 'assets/tech/maratona-tech-5.jpg',
          mimeType: 'video/mp4'
        },
        {
          type: 'image',
          data: 'assets/tech/maratona-tech-4.jpg',
          thumbnail: 'assets/tech/maratona-tech-4.jpg',
          mimeType: 'image/jpeg'
        }
      ],
      status: 'published',
      createdAt: '2026-07-15T14:10:00Z',
      publishedAt: '2026-07-15T15:00:00Z'
    },
    {
      id: 'pub-cavalli-7',
      title: 'Morfologia Vegetal e Botânica Prática: Investigação Científica no 7º Ano',
      caption: 'Análise taxonômica de espécies locais e produção de herbário vivo com apoio de microscopia.',
      description: 'Os estudantes do 7º ano investigaram a anatomia e as adaptações fisiológicas de espécimes vegetais coletados no entorno do colégio.\n\nCom auxílio de lupas e microscópios didáticos, as equipes registraram estruturas celulares e estômatos em vídeo, compreendendo os ciclos de respiração e fotossíntese de forma prática e colaborativa.',
      context: 'Atividade interdisciplinar de Ciências Naturais do Ensino Fundamental — CCM João Cavalli da Costa.',
      category: 'ciencias',
      author: {
        id: 'author-sofia',
        name: 'Sofia Rezende',
        photoUrl: '',
        year: '3º Ano B — Meio Ambiente',
        school: 'CCM João Cavalli da Costa'
      },
      collaborators: ['Prof.ª Mariana Klein', 'Turma 7º Ano B'],
      media: [
        {
          type: 'video',
          data: 'assets/lab/botanica-7ano.mp4',
          thumbnail: 'assets/tech/maratona-tech-6.jpg',
          mimeType: 'video/mp4'
        },
        {
          type: 'image',
          data: 'assets/tech/maratona-tech-6.jpg',
          thumbnail: 'assets/tech/maratona-tech-6.jpg',
          mimeType: 'image/jpeg'
        }
      ],
      status: 'published',
      createdAt: '2026-07-02T13:00:00Z',
      publishedAt: '2026-07-02T14:15:00Z'
    },
    {
      id: 'pub-cavalli-8',
      title: 'Solenidade Cívica e Formação Cidadã: Hino Nacional, Guarda de Honra e Ordem Unida',
      caption: 'Momentos de integração cívica, disciplina consciente e respeito aos símbolos nacionais no pátio central.',
      description: 'O Colégio Cívico-Militar João Cavalli da Costa reuniu o corpo discente e o corpo docente para o cerimonial cívico trimestral.\n\nO evento contou com apresentação do Pelotão de Bandeiras, execução solene do Hino Nacional Brasileiro e desfile de ordem unida, fortalecendo valores de companheirismo, liderança e dever cívico na formação dos jovens paranaenses.',
      context: 'Cerimonial Cívico e Institucional do Colégio Cívico-Militar João Cavalli da Costa.',
      category: 'comunidade',
      author: {
        id: 'author-gabriel',
        name: 'Gabriel Souza',
        photoUrl: '',
        year: '3º Ano A — Cívico-Militar',
        school: 'CCM João Cavalli da Costa'
      },
      collaborators: ['Pelotão de Guarda de Honra', 'Direção Cívico-Militar'],
      media: [
        {
          type: 'video',
          data: 'assets/institucional/alunos-hino.mp4',
          thumbnail: 'assets/branding/logo-ccm.jpg',
          mimeType: 'video/mp4'
        },
        {
          type: 'video',
          data: 'assets/institucional/pelotao-bandeiras.mp4',
          thumbnail: 'assets/branding/logo-cavalli.jpg',
          mimeType: 'video/mp4'
        },
        {
          type: 'video',
          data: 'assets/institucional/escola-marchando.mp4',
          thumbnail: 'assets/branding/logo-ccm.jpg',
          mimeType: 'video/mp4'
        }
      ],
      status: 'published',
      createdAt: '2026-06-20T08:30:00Z',
      publishedAt: '2026-06-20T10:00:00Z'
    },
    {
      id: 'pub-cavalli-9',
      title: 'Estudos Cromáticos e Escultura: As Composições Tridimensionais do Cavalli',
      caption: 'Pesquisas formais em volume, massa e texturas desenvolvidas no Ateliê de Artes do colégio.',
      description: 'Aprofundando os estudos de teoria das cores e tridimensionalidade, os estudantes exploraram técnicas escultóricas com materiais mistos e modelagem.\n\nCada trabalho traduz reflexões sobre espaço urbano, arquitetura modernista e sensações térmicas, materializadas em obras que enriquecem o acervo artístico da escola.',
      context: 'Projeto de Artes Visuais e Expressão Plástica — Ensino Médio do CCM João Cavalli.',
      category: 'arte',
      author: {
        id: 'author-ana',
        name: 'Ana Clara Moreira',
        photoUrl: '',
        year: '2º Ano B — Humanidades',
        school: 'CCM João Cavalli da Costa'
      },
      collaborators: ['Prof.ª Carla Souza', 'Ateliê Aberto Cavalli'],
      media: [
        {
          type: 'image',
          data: 'assets/artes/trabalho-aluno-3.jpg',
          thumbnail: 'assets/artes/trabalho-aluno-3.jpg',
          mimeType: 'image/jpeg'
        },
        {
          type: 'image',
          data: 'assets/artes/trabalho-aluno-4.jpg',
          thumbnail: 'assets/artes/trabalho-aluno-4.jpg',
          mimeType: 'image/jpeg'
        },
        {
          type: 'image',
          data: 'assets/artes/trabalho-aluno-5.jpg',
          thumbnail: 'assets/artes/trabalho-aluno-5.jpg',
          mimeType: 'image/jpeg'
        },
        {
          type: 'image',
          data: 'assets/artes/trabalho-aluno-6.jpg',
          thumbnail: 'assets/artes/trabalho-aluno-6.jpg',
          mimeType: 'image/jpeg'
        }
      ],
      status: 'published',
      createdAt: '2026-05-18T10:15:00Z',
      publishedAt: '2026-05-18T11:45:00Z'
    },
    {
      id: 'pub-cavalli-10',
      title: 'Clube do Livro Entrelinhas: Análise da Obra e Debate Crítico com Taís',
      caption: 'Produção de resenha crítica em vídeo discutindo narrativa e desenvolvimento de personagens.',
      description: 'Em continuidade às atividades de mediação literária e letramento digital, o Clube do Livro apresenta a resenha analítica gravada pela estudante Taís.\n\nA produção destaca os elementos estéticos do enredo, o contexto sócio-histórico da narrativa e propõe reflexões para a comunidade escolar sobre a literatura contemporânea.',
      context: 'Oficina de Crítica Literária e Produção Audiovisual do CCM João Cavalli da Costa.',
      category: 'video',
      author: {
        id: 'author-leticia',
        name: 'Letícia & Heloísa',
        photoUrl: '',
        year: '1º Ano A — Clube do Livro',
        school: 'CCM João Cavalli da Costa'
      },
      collaborators: ['Taís da Silva', 'Prof.ª Marluce'],
      media: [
        {
          type: 'video',
          data: 'assets/literatura/resenha-tais.mp4',
          thumbnail: 'assets/literatura/poesia-estudante-4.jpg',
          mimeType: 'video/mp4'
        },
        {
          type: 'image',
          data: 'assets/literatura/poesia-estudante-4.jpg',
          thumbnail: 'assets/literatura/poesia-estudante-4.jpg',
          mimeType: 'image/jpeg'
        }
      ],
      status: 'published',
      createdAt: '2026-05-04T16:30:00Z',
      publishedAt: '2026-05-04T17:15:00Z'
    }
  ];

  /* ── Gestão de Publicações (PublicacoesDB) ──────────────────────────────── */
  function loadPubs() {
    try {
      const stored = localStorage.getItem(STORAGE_PUBS);
      return stored ? JSON.parse(stored) : [];
    } catch(e) {
      return [];
    }
  }

  function persistPubs(publications) {
    try {
      localStorage.setItem(STORAGE_PUBS, JSON.stringify(publications));
    } catch(e) {
      console.warn('[PublicacoesDB] localStorage cheio — persistindo dados essenciais');
    }
  }

  async function saveMediaToDB(publicationId, mediaArray) {
    const db = await openDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      tx.objectStore(STORE_MEDIA).put({ publicationId, media: mediaArray });
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  }

  async function getMediaFromDB(publicationId) {
    const db = await openDB();
    if (!db) return [];
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MEDIA, 'readonly');
      const req = tx.objectStore(STORE_MEDIA).get(publicationId);
      req.onsuccess = e => resolve(e.target.result ? e.target.result.media : []);
      req.onerror = () => resolve([]);
    });
  }

  async function deleteMediaFromDB(publicationId) {
    const db = await openDB();
    if (!db) return;
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_MEDIA, 'readwrite');
      tx.objectStore(STORE_MEDIA).delete(publicationId);
      tx.oncomplete = resolve;
      tx.onerror = resolve;
    });
  }

  const PublicacoesDB = {
    async init() {
      await openDB();
    },

    getAll(filters = {}) {
      let pubs = loadPubs();
      if (filters.status) {
        pubs = pubs.filter(p => p.status === filters.status);
      }
      if (filters.category && filters.category !== 'all') {
        pubs = pubs.filter(p => p.category === filters.category);
      }
      if (filters.authorId) {
        pubs = pubs.filter(p => p.author && p.author.id === filters.authorId);
      }
      return pubs.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    },

    getById(id) {
      return loadPubs().find(p => p.id === id) || null;
    },

    getByAuthor(authorId) {
      return this.getAll({ authorId, status: 'published' });
    },

    save(publication) {
      const pubs = loadPubs();
      if (!publication.id) {
        publication.id = uuid('pub');
      }
      if (!publication.createdAt) {
        publication.createdAt = new Date().toISOString();
      }

      const idx = pubs.findIndex(p => p.id === publication.id);
      if (idx >= 0) {
        pubs[idx] = { ...pubs[idx], ...publication };
      } else {
        pubs.unshift(publication);
      }

      persistPubs(pubs);
      emit('change', pubs);
      emit('saved', publication);
      return publication;
    },

    delete(id) {
      const pubs = loadPubs().filter(p => p.id !== id);
      persistPubs(pubs);
      deleteMediaFromDB(id);
      emit('change', pubs);
      emit('deleted', id);
      return true;
    },

    updateAuthorMeta(userData) {
      const pubs = loadPubs();
      let changed = false;
      pubs.forEach(p => {
        if (p.author && p.author.id === userData.id) {
          p.author.name = userData.name;
          p.author.year = userData.year;
          p.author.school = userData.school;
          p.author.photoUrl = userData.avatarUrl || '';
          changed = true;
        }
      });
      if (changed) {
        persistPubs(pubs);
        emit('change', pubs);
      }
    },

    async saveMedia(publicationId, mediaArray) {
      await saveMediaToDB(publicationId, mediaArray);
    },

    async getMedia(publicationId) {
      const fromDB = await getMediaFromDB(publicationId);
      if (fromDB && fromDB.length > 0) return fromDB;
      const pub = this.getById(publicationId);
      return pub ? (pub.media || []) : [];
    },

    compressImage,
    generateVideoThumbnail,

    async seedDemoData() {
      const existing = loadPubs();
      if (existing.length === 0) {
        persistPubs(DEMO_PUBLICATIONS);
        emit('change', DEMO_PUBLICATIONS);
      } else {
        let updated = false;
        DEMO_PUBLICATIONS.forEach(demo => {
          if (!existing.some(p => p.id === demo.id)) {
            existing.push(demo);
            updated = true;
          }
        });
        if (updated) {
          persistPubs(existing);
          emit('change', existing);
        }
      }
    },

    on(event, callback) {
      if (!_listeners[event]) _listeners[event] = [];
      _listeners[event].push(callback);
    },

    off(event, callback) {
      if (!_listeners[event]) return;
      _listeners[event] = _listeners[event].filter(cb => cb !== callback);
    }
  };

  window.PublicacoesDB = PublicacoesDB;
  window.UsersDB = UsersDB;
})();
