/* ═══════════════════════════════════════════════════════════
   DESIGN STRUCTUREL DE PROMPT — NORSYS
   script.js — orchestration loader, scroll, micro-interactions
   ═══════════════════════════════════════════════════════════ */

(() => {
  'use strict';

  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Empêche le navigateur de restaurer une ancienne position de scroll au reload,
  // ce qui créait un jitter parasite et déclenchait à tort la logique de topbar.
  if ('scrollRestoration' in history) {
    history.scrollRestoration = 'manual';
  }

  /* ═══════════════════════════════════════════════════════
     1. LOADER — révélation du contenu
     ═══════════════════════════════════════════════════════ */
  function initLoader() {
    const loader = document.getElementById('loader');
    const site = document.getElementById('site');

    // Durée minimale pour que le loader soit perçu (pas un flash),
    // même si tout charge instantanément depuis le cache.
    const MIN_DISPLAY = prefersReducedMotion ? 0 : 900;
    const start = performance.now();

    function reveal() {
      const elapsed = performance.now() - start;
      const wait = Math.max(0, MIN_DISPLAY - elapsed);

      window.setTimeout(() => {
        loader.classList.add('is-hidden');
        site.classList.add('is-revealed');

        // Nettoyage : retirer le loader du DOM une fois la transition CSS terminée
        // pour qu'il ne reste pas un calque fixed inutile en mémoire/layout.
        window.setTimeout(() => {
          loader.remove();
        }, 650);
      }, wait);
    }

    if (document.readyState === 'complete') {
      reveal();
    } else {
      window.addEventListener('load', reveal, { once: true });
    }
  }

  /* ═══════════════════════════════════════════════════════
     2. TOPBAR — accessible au scroll up, masquée au scroll down
     ═══════════════════════════════════════════════════════ */
  function initTopbar() {
    const topbar = document.getElementById('topbar');
    let ticking = false;
    const THRESHOLD = 12; // évite le flicker sur les micro-scrolls
    const TOP_ZONE = 48;  // marge de sécurité généreuse contre le jitter natif du navigateur

    // Le navigateur peut restaurer une position de scroll après reload
    // (scroll restoration native), ce qui fausse notre détection "scroll up/down"
    // au tout premier calcul. On lit la position réelle seulement une fois
    // que la page est stable, plutôt qu'au moment de l'exécution du script.
    let lastY = 0;

    function update() {
      const y = window.scrollY;
      const delta = y - lastY;

      if (y <= TOP_ZONE) {
        // Toujours visible tant qu'on est proche du sommet de page,
        // qu'il s'agisse d'un vrai scroll utilisateur ou d'un jitter natif.
        topbar.classList.remove('is-hidden');
      } else if (delta > THRESHOLD) {
        topbar.classList.add('is-hidden');
      } else if (delta < -THRESHOLD) {
        topbar.classList.remove('is-hidden');
      }

      lastY = y;
      ticking = false;
    }

    window.addEventListener('scroll', () => {
      if (!ticking) {
        window.requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  /* ═══════════════════════════════════════════════════════
     3. CONTRÔLE DE TAILLE DE TEXTE — A− / A+ / reset
     ═══════════════════════════════════════════════════════ */
  function initScaleControl() {
    const root = document.documentElement;
    const btnDown = document.getElementById('scaleDown');
    const btnUp = document.getElementById('scaleUp');
    const btnReset = document.getElementById('scaleReset');
    const valEl = document.getElementById('scaleVal');

    const MIN = 0.75;
    const MAX = 1.5;
    const STEP = 0.08;
    let scale = parseFloat(localStorage.getItem('ds-scale')) || 1;

    function apply() {
      scale = Math.round(scale * 100) / 100;
      root.style.setProperty('--scale', scale);
      valEl.textContent = Math.round(scale * 100) + '%';
      localStorage.setItem('ds-scale', scale);
    }

    btnDown.addEventListener('click', () => {
      scale = Math.max(MIN, scale - STEP);
      apply();
    });
    btnUp.addEventListener('click', () => {
      scale = Math.min(MAX, scale + STEP);
      apply();
    });
    btnReset.addEventListener('click', () => {
      scale = 1;
      apply();
    });

    apply();
  }

  /* ═══════════════════════════════════════════════════════
     HERO — entrée orchestrée en cascade (jouée une fois)
     ═══════════════════════════════════════════════════════ */
  function playHeroIntro() {
    const seq = gsap.utils.toArray('[data-hero-seq]');
    if (!seq.length) return;
    gsap.to(seq, {
      opacity: 1,
      y: 0,
      duration: 0.7,
      ease: 'power3.out',
      stagger: 0.1,
    });
  }

  /* ═══════════════════════════════════════════════════════
     4. GSAP — scroll reveals + parallax très subtil
     ═══════════════════════════════════════════════════════ */
  function initGSAP() {
    if (typeof gsap === 'undefined' || typeof ScrollTrigger === 'undefined') {
      // Fallback gracieux : si GSAP n'a pas chargé, on affiche tout simplement
      // sans animation plutôt que de laisser le contenu invisible.
      document.querySelectorAll('[data-reveal]').forEach((el) => {
        el.style.opacity = '1';
      });
      document.querySelectorAll('[data-hero-seq]').forEach((el) => {
        el.style.opacity = '1';
        el.style.transform = 'none';
      });
      return;
    }

    gsap.registerPlugin(ScrollTrigger);
    document.body.classList.add('gsap-ready');

    if (prefersReducedMotion) {
      gsap.set('[data-reveal]', { opacity: 1 });
      gsap.set('[data-hero-seq]', { opacity: 1, y: 0 });
      return;
    }

    // Reveal orchestré par section — chaque section entre une seule fois,
    // avec un léger décalage interne entre ses cartes pour un effet de cascade.
    document.querySelectorAll('[data-reveal]').forEach((section) => {
      const cards = section.querySelectorAll('.a-card, .p-card, .ex-card, .b-step, .rule-card');

      const tl = gsap.timeline({
        scrollTrigger: {
          trigger: section,
          start: 'top 82%',
          once: true,
        },
      });

      tl.fromTo(
        section,
        { opacity: 0, y: 22 },
        { opacity: 1, y: 0, duration: 0.7, ease: 'power2.out' }
      );

      if (cards.length) {
        tl.fromTo(
          cards,
          { opacity: 0, y: 16 },
          {
            opacity: 1,
            y: 0,
            duration: 0.55,
            ease: 'power2.out',
            stagger: 0.06,
          },
          '-=0.4'
        );
      }
    });

    // Barres d'impact — remplissage au scroll, une seule fois
    const impactRight = document.querySelector('.impact-right');
    if (impactRight) {
      ScrollTrigger.create({
        trigger: impactRight,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          document.querySelectorAll('.i-fill').forEach((bar, i) => {
            const w = bar.getAttribute('data-w');
            gsap.to(bar, {
              width: w + '%',
              duration: 1.3,
              ease: 'power3.out',
              delay: i * 0.1,
            });
          });
        },
      });
    }

    // Parallax très subtil sur le titre hero — translation quasi imperceptible,
    // c'est une respiration, pas un effet démonstratif.
    const heroTitle = document.querySelector('[data-parallax]');
    if (heroTitle) {
      const factor = parseFloat(heroTitle.dataset.parallax) || 0.04;
      gsap.to(heroTitle, {
        y: () => window.innerHeight * factor,
        ease: 'none',
        scrollTrigger: {
          trigger: heroTitle,
          start: 'top top',
          end: 'bottom top',
          scrub: 0.6,
        },
      });
    }

    // L'intro hero démarre quand le loader s'efface (≈ MIN_DISPLAY du loader = 900ms).
    // NB : si MIN_DISPLAY change dans initLoader, ajuster ce délai en conséquence.
    const heroDelay = prefersReducedMotion ? 0 : 950;
    window.setTimeout(playHeroIntro, heroDelay);
  }

  /* ═══════════════════════════════════════════════════════
     5. TILT 3D — cartes, suit la position du curseur, désactivé au touch
     ═══════════════════════════════════════════════════════ */
  function initTilt() {
    if (prefersReducedMotion) return;
    if (window.matchMedia('(hover: none)').matches) return; // pas de tilt sur touch

    const MAX_TILT = 3.5; // degrés — volontairement très contenu, signature "luxe discret"

    document.querySelectorAll('[data-tilt]').forEach((card) => {
      let frame = null;

      card.addEventListener('mousemove', (e) => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          const rect = card.getBoundingClientRect();
          const px = (e.clientX - rect.left) / rect.width - 0.5;
          const py = (e.clientY - rect.top) / rect.height - 0.5;

          card.style.transform = `
            perspective(900px)
            rotateX(${(-py * MAX_TILT).toFixed(2)}deg)
            rotateY(${(px * MAX_TILT).toFixed(2)}deg)
            translateY(-3px)
          `;
          frame = null;
        });
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  /* ═══════════════════════════════════════════════════════
     6. EASTER EGG — assemblage drag-and-drop des 3 ronds
     ═══════════════════════════════════════════════════════ */
  function initEasterEgg() {
    const zone = document.getElementById('eggZone');
    const hint = document.getElementById('eggHint');
    const message = document.getElementById('eggMessage');
    const backBtn = document.getElementById('eggBack');
    const targets = Array.from(document.querySelectorAll('.egg-target'));
    const rings = Array.from(document.querySelectorAll('.egg-ring'));

    if (!zone || !rings.length) return;

    // Ordre attendu = couleurs du logo Norsys : terracotta à gauche (slot 2),
    // bleu au milieu (slot 1), vert à droite (slot 3).
    const EXPECTED = { t: '2', b: '1', g: '3' };

    // Messages d'erreur — ton avenant, valorise l'itération (rotation sans répétition immédiate).
    const ERR_MESSAGES = [
      'Pas tout à fait — mais vous y êtes presque.',
      'Bonne intuition, mauvais ordre. On retente ?',
      "C'est le genre d'erreur qu'on corrige en une itération, justement.",
      "Presque ! L'ordre fait toute la différence.",
      'Pas encore, mais vous progressez à chaque essai.',
    ];
    const HINT_MESSAGES = [
      'Un petit indice : regardez du côté du footer.',
      'Vous tenez le bon principe — la couleur, pas encore l’ordre.',
    ];
    let errorCount = 0;
    let lastMsgIndex = -1;

    function showErrorMessage() {
      errorCount += 1;
      let pool = ERR_MESSAGES;
      // Après 3 essais ratés, on bascule sur un ton plus complice (indice footer).
      if (errorCount >= 3) pool = HINT_MESSAGES;

      let idx = Math.floor(Math.random() * pool.length);
      if (pool.length > 1 && idx === lastMsgIndex) {
        idx = (idx + 1) % pool.length; // évite la répétition immédiate
      }
      lastMsgIndex = idx;

      message.textContent = pool[idx];
      message.classList.add('is-visible', 'is-error');
    }

    function clearErrorMessage() {
      message.classList.remove('is-error');
    }

    // Mapping : quel ring va dans quelle cible (peu importe lequel va où,
    // l'essentiel est que les 3 emplacements soient occupés)
    const placed = new Set();

    function checkComplete() {
      if (placed.size === rings.length) {
        window.setTimeout(() => {
          clearErrorMessage();
          message.textContent = 'Et maintenant : à vous de jouer.';
          message.classList.add('is-visible');
          backBtn.classList.add('is-visible');
        }, 250);
      }
    }

    function snapToTarget(ring, target) {
      const zoneRect = zone.querySelector('.egg-puzzle').getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();

      const left = targetRect.left - zoneRect.left;
      const top = targetRect.top - zoneRect.top;

      ring.style.position = 'absolute';
      ring.style.left = left + 'px';
      ring.style.top = top + 'px';
      ring.classList.add('is-placed');
      ring.setAttribute('draggable', 'false');
      ring.style.cursor = 'default';

      target.classList.add('is-filled');
      placed.add(ring.dataset.ring);
    }

    function distance(a, b) {
      const dx = a.x - b.x;
      const dy = a.y - b.y;
      return Math.sqrt(dx * dx + dy * dy);
    }

    function getCenter(el) {
      const r = el.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }

    // — Implémentation pointer-based (fonctionne souris ET tactile) —
    // Plus fiable que l'API HTML5 Drag and Drop sur mobile.
    rings.forEach((ring) => {
      let dragging = false;
      let offsetX = 0;
      let offsetY = 0;

      function onPointerDown(e) {
        if (ring.classList.contains('is-placed')) return;
        dragging = true;
        ring.classList.add('is-dragging');
        ring.setPointerCapture(e.pointerId);

        const rect = ring.getBoundingClientRect();
        offsetX = e.clientX - rect.left;
        offsetY = e.clientY - rect.top;

        const puzzleRect = zone.querySelector('.egg-puzzle').getBoundingClientRect();
        ring.style.position = 'absolute';
        ring.style.left = (rect.left - puzzleRect.left) + 'px';
        ring.style.top = (rect.top - puzzleRect.top) + 'px';

        // L'indice "continuez à tirer" s'estompe dès la première interaction
        hint.classList.add('is-dimmed');
      }

      function onPointerMove(e) {
        if (!dragging) return;
        const puzzleRect = zone.querySelector('.egg-puzzle').getBoundingClientRect();
        const x = e.clientX - puzzleRect.left - offsetX;
        const y = e.clientY - puzzleRect.top - offsetY;
        ring.style.left = x + 'px';
        ring.style.top = y + 'px';
      }

      function onPointerUp(e) {
        if (!dragging) return;
        dragging = false;
        ring.classList.remove('is-dragging');

        // Cherche la cible vide la plus proche du centre du ring relâché
        const ringCenter = getCenter(ring);
        let closest = null;
        let closestDist = Infinity;

        targets.forEach((target) => {
          if (target.classList.contains('is-filled')) return;
          const d = distance(ringCenter, getCenter(target));
          if (d < closestDist) {
            closestDist = d;
            closest = target;
          }
        });

        const SNAP_RADIUS = 50; // px — tolérance généreuse, on veut que ça marche du premier coup

        if (closest && closestDist < SNAP_RADIUS) {
          // Jeu d'ordre : le ring ne se pose que dans SA cible (couleurs du logo).
          if (EXPECTED[ring.dataset.ring] === closest.dataset.slot) {
            clearErrorMessage();
            snapToTarget(ring, closest);
            checkComplete();
          } else {
            // Bonne zone, mauvais ordre : on refuse le snap et on encourage.
            showErrorMessage();
          }
        }
        // Si raté (hors zone ou mauvais ordre) : le ring reste où il est, libre de réessayer.
      }

      ring.addEventListener('pointerdown', onPointerDown);
      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
    });

    backBtn.addEventListener('click', () => {
      window.scrollTo({ top: 0, behavior: prefersReducedMotion ? 'auto' : 'smooth' });
    });
  }

  /* ═══════════════════════════════════════════════════════
     INIT — séquence d'orchestration au chargement
     ═══════════════════════════════════════════════════════ */
  function init() {
    initLoader();
    initTopbar();
    initScaleControl();
    initGSAP();
    initTilt();
    initEasterEgg();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
