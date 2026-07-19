(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const hasFinePointer = window.matchMedia('(pointer: fine)').matches;
  const html = document.documentElement;

  if (!hasFinePointer || reduceMotion) html.classList.add('no-fine-pointer');

  /* ============ LOADING SCREEN ============ */
  const loadingScreen = document.getElementById('loading-screen');
  if (loadingScreen) {
    const hideLoader = () => loadingScreen.classList.add('hidden');
    if (document.readyState === 'complete') {
      setTimeout(hideLoader, 250);
    } else {
      window.addEventListener('load', () => setTimeout(hideLoader, 250));
    }
    // Safety net: never block the page for more than 2.5s
    setTimeout(hideLoader, 2500);
  }

  /* ============ PAGE TRANSITION ON INTERNAL NAVIGATION ============ */
  const transitionEl = document.getElementById('page-transition');
  if (transitionEl && !reduceMotion) {
    document.querySelectorAll('a[href]').forEach(link => {
      const href = link.getAttribute('href');
      const isInternal = href && !href.startsWith('http') && !href.startsWith('#')
        && !href.startsWith('mailto:') && !href.startsWith('tel:') && link.target !== '_blank';
      if (!isInternal) return;

      link.addEventListener('click', (e) => {
        e.preventDefault();
        transitionEl.classList.add('active');
        setTimeout(() => { window.location.href = href; }, 420);
      });
    });
  }

  /* ============ CUSTOM CURSOR ============ */
  const cursorDot = document.querySelector('.cursor-dot');
  const cursorRing = document.querySelector('.cursor-ring');
  if (cursorDot && cursorRing && hasFinePointer && !reduceMotion) {
    html.classList.add('has-custom-cursor');
    let ringX = window.innerWidth / 2, ringY = window.innerHeight / 2;
    let targetX = ringX, targetY = ringY;

    window.addEventListener('mousemove', (e) => {
      targetX = e.clientX; targetY = e.clientY;
      cursorDot.style.transform = `translate(${targetX}px, ${targetY}px) translate(-50%, -50%)`;
    });

    const animateRing = () => {
      ringX += (targetX - ringX) * 0.18;
      ringY += (targetY - ringY) * 0.18;
      cursorRing.style.transform = `translate(${ringX}px, ${ringY}px) translate(-50%, -50%)`;
      requestAnimationFrame(animateRing);
    };
    requestAnimationFrame(animateRing);

    document.addEventListener('mouseleave', () => document.body.classList.add('cursor-hidden'));
    document.addEventListener('mouseenter', () => document.body.classList.remove('cursor-hidden'));

    document.querySelectorAll('a, button, [data-tilt], input, textarea, select').forEach(el => {
      el.addEventListener('mouseenter', () => cursorRing.classList.add('cursor-hover'));
      el.addEventListener('mouseleave', () => cursorRing.classList.remove('cursor-hover'));
    });
  }

  /* ============ MOUSE GLOW (spotlight within a zone) ============ */
  if (hasFinePointer && !reduceMotion) {
    document.querySelectorAll('.mouse-glow-zone').forEach(zone => {
      zone.addEventListener('mousemove', (e) => {
        const rect = zone.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width) * 100;
        const y = ((e.clientY - rect.top) / rect.height) * 100;
        zone.style.setProperty('--mx', x + '%');
        zone.style.setProperty('--my', y + '%');
      });
    });
  }

  /* ============ 3D TILT CARDS (with cursor-reactive glow) ============ */
  if (hasFinePointer && !reduceMotion) {
    document.querySelectorAll('[data-tilt]').forEach(card => {
      const strength = parseFloat(card.dataset.tiltStrength) || 8;
      let bounds;

      if (!card.querySelector('.tilt-glare') && getComputedStyle(card).position === 'static') {
        card.style.position = 'relative';
      }
      const glare = document.createElement('div');
      glare.className = 'tilt-glare';
      card.appendChild(glare);

      card.addEventListener('mouseenter', () => { bounds = card.getBoundingClientRect(); });

      card.addEventListener('mousemove', (e) => {
        if (!bounds) bounds = card.getBoundingClientRect();
        const px = (e.clientX - bounds.left) / bounds.width - 0.5;
        const py = (e.clientY - bounds.top) / bounds.height - 0.5;
        card.style.transform = `perspective(800px) rotateX(${(-py * strength).toFixed(2)}deg) rotateY(${(px * strength).toFixed(2)}deg) translateZ(4px)`;
        card.style.setProperty('--mx', ((px + 0.5) * 100).toFixed(1) + '%');
        card.style.setProperty('--my', ((py + 0.5) * 100).toFixed(1) + '%');
      });

      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg)';
      });
    });
  }

  /* ============ PARALLAX (scroll-driven, rAF throttled) ============ */
  const parallaxEls = document.querySelectorAll('[data-parallax]');
  if (parallaxEls.length && !reduceMotion) {
    let ticking = false;
    const applyParallax = () => {
      const viewportH = window.innerHeight;
      parallaxEls.forEach(el => {
        const speed = parseFloat(el.dataset.parallax) || 0.15;
        const rect = el.getBoundingClientRect();
        const offset = (rect.top - viewportH / 2) * speed * -1;
        el.style.transform = `translate3d(0, ${offset.toFixed(1)}px, 0)`;
      });
      ticking = false;
    };
    window.addEventListener('scroll', () => {
      if (!ticking) { requestAnimationFrame(applyParallax); ticking = true; }
    }, { passive: true });
    applyParallax();
  }

  /* ============ ANIMATED TEXT REVEAL (splits into words, reveals on scroll) ============ */
  document.querySelectorAll('[data-animate-text]').forEach(el => {
    const text = el.textContent;
    const words = text.split(' ');
    el.innerHTML = words
      .map(word => `<span class="word"><span>${word}</span></span>`)
      .join(' ');
  });

  const animTextEls = document.querySelectorAll('[data-animate-text]');
  if ('IntersectionObserver' in window && animTextEls.length) {
    const textObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const words = entry.target.querySelectorAll('.word span');
          words.forEach((w, i) => {
            w.style.transitionDelay = reduceMotion ? '0ms' : `${i * 40}ms`;
          });
          entry.target.classList.add('in-view');
          textObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.4 });
    animTextEls.forEach(el => textObserver.observe(el));
  } else {
    animTextEls.forEach(el => el.classList.add('in-view'));
  }

  /* ============ BUTTON RIPPLE ============ */
  if (!reduceMotion) {
    document.querySelectorAll('.btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const rect = btn.getBoundingClientRect();
        const ripple = document.createElement('span');
        const size = Math.max(rect.width, rect.height);
        ripple.className = 'ripple';
        ripple.style.width = ripple.style.height = size + 'px';
        ripple.style.left = (e.clientX - rect.left - size / 2) + 'px';
        ripple.style.top = (e.clientY - rect.top - size / 2) + 'px';
        btn.appendChild(ripple);
        ripple.addEventListener('animationend', () => ripple.remove());
      });
    });
  }

})();
