(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const isCoarsePointer = window.matchMedia('(pointer: coarse)').matches;

  /* ============ FOOTER YEAR ============ */
  const yearEl = document.getElementById('year');
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  /* ============ STICKY NAV SHRINK ============ */
  const navWrapper = document.getElementById('site-nav');
  if (navWrapper) {
    const onScroll = () => {
      navWrapper.classList.toggle('scrolled', window.scrollY > 40);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
  }

  /* ============ MOBILE NAV TOGGLE ============ */
  const navToggle = document.getElementById('nav-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  if (navToggle && mobileMenu) {
    const focusableSelector = 'a[href], button:not([disabled])';
    const closeMenu = () => {
      navToggle.setAttribute('aria-expanded', 'false');
      mobileMenu.classList.remove('open');
      document.body.style.overflow = '';
      navToggle.focus();
    };
    const openMenu = () => {
      navToggle.setAttribute('aria-expanded', 'true');
      mobileMenu.classList.add('open');
      document.body.style.overflow = 'hidden';
      const firstLink = mobileMenu.querySelector(focusableSelector);
      if (firstLink) firstLink.focus();
    };
    navToggle.addEventListener('click', () => {
      const isOpen = navToggle.getAttribute('aria-expanded') === 'true';
      isOpen ? closeMenu() : openMenu();
    });
    mobileMenu.querySelectorAll('a').forEach(link => link.addEventListener('click', closeMenu));
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && navToggle.getAttribute('aria-expanded') === 'true') closeMenu();
    });
    // Trap focus inside the mobile menu while it's open
    mobileMenu.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab' || navToggle.getAttribute('aria-expanded') !== 'true') return;
      const focusable = Array.from(mobileMenu.querySelectorAll(focusableSelector));
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  }

  /* ============ SCROLL REVEAL ============ */
  const revealEls = document.querySelectorAll('.reveal, .reveal-left, .reveal-right, .reveal-scale');
  if ('IntersectionObserver' in window && revealEls.length) {
    const revealObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry, i) => {
        if (entry.isIntersecting) {
          const delay = reduceMotion ? 0 : (i % 6) * 70;
          setTimeout(() => entry.target.classList.add('in-view'), delay);
          revealObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -40px 0px' });
    revealEls.forEach(el => revealObserver.observe(el));
  } else {
    revealEls.forEach(el => el.classList.add('in-view'));
  }

  /* ============ ANIMATED COUNTERS ============ */
  const counters = document.querySelectorAll('.stat-number[data-count]');
  const formatNumber = (value, el) => {
    const decimals = parseInt(el.dataset.decimals || '0', 10);
    const format = el.dataset.format;
    let str = decimals ? value.toFixed(decimals) : Math.round(value).toString();
    if (format === 'comma') {
      const parts = str.split('.');
      parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
      str = parts.join('.');
    }
    return str + (el.dataset.suffix || '');
  };

  const animateCounter = (el) => {
    const target = parseFloat(el.dataset.count);
    if (reduceMotion) {
      el.textContent = formatNumber(target, el);
      return;
    }
    const duration = 1200;
    const start = performance.now();
    const easeOutQuad = t => 1 - (1 - t) * (1 - t);

    const tick = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = easeOutQuad(progress);
      el.textContent = formatNumber(target * eased, el);
      if (progress < 1) {
        requestAnimationFrame(tick);
      } else {
        el.classList.add('count-complete');
      }
    };
    requestAnimationFrame(tick);
  };

  if ('IntersectionObserver' in window && counters.length) {
    const counterObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          counterObserver.unobserve(entry.target);
        }
      });
    }, { threshold: 0.6 });
    counters.forEach(el => counterObserver.observe(el));
  } else {
    counters.forEach(el => { el.textContent = formatNumber(parseFloat(el.dataset.count), el); });
  }

  /* ============ MAGNETIC BUTTONS ============ */
  if (!reduceMotion && !isCoarsePointer) {
    document.querySelectorAll('[data-magnetic]').forEach(btn => {
      let bounds;
      const strength = 0.3;

      btn.addEventListener('mouseenter', () => { bounds = btn.getBoundingClientRect(); });

      btn.addEventListener('mousemove', (e) => {
        if (!bounds) bounds = btn.getBoundingClientRect();
        const relX = e.clientX - bounds.left - bounds.width / 2;
        const relY = e.clientY - bounds.top - bounds.height / 2;
        btn.style.transform = `translate(${relX * strength}px, ${relY * strength}px)`;
      });

      btn.addEventListener('mouseleave', () => {
        btn.style.transform = 'translate(0, 0)';
      });
    });
  }

  /* ============ TESTIMONIAL CAROUSEL ============ */
  const track = document.getElementById('testimonial-track');
  if (track) {
    const slides = Array.from(track.querySelectorAll('.testimonial-slide'));
    const dotsWrap = document.getElementById('t-dots');
    const prevBtn = document.getElementById('t-prev');
    const nextBtn = document.getElementById('t-next');
    let current = 0;
    let autoTimer;

    slides.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = 't-dot';
      dot.setAttribute('role', 'tab');
      dot.setAttribute('aria-label', `Show testimonial ${i + 1}`);
      dot.addEventListener('click', () => goTo(i));
      dotsWrap.appendChild(dot);
    });
    const dots = Array.from(dotsWrap.children);

    function goTo(index) {
      slides[current].classList.remove('active');
      slides[current].setAttribute('aria-hidden', 'true');
      dots[current].classList.remove('active');

      current = (index + slides.length) % slides.length;

      slides[current].classList.add('active');
      slides[current].setAttribute('aria-hidden', 'false');
      dots[current].classList.add('active');
    }

    function startAuto() {
      if (reduceMotion) return;
      stopAuto();
      autoTimer = setInterval(() => goTo(current + 1), 6000);
    }
    function stopAuto() { clearInterval(autoTimer); }

    goTo(0);
    prevBtn.addEventListener('click', () => { goTo(current - 1); startAuto(); });
    nextBtn.addEventListener('click', () => { goTo(current + 1); startAuto(); });
    track.closest('.testimonial-carousel').addEventListener('mouseenter', stopAuto);
    track.closest('.testimonial-carousel').addEventListener('mouseleave', startAuto);
    track.closest('.testimonial-carousel').addEventListener('focusin', stopAuto);
    track.closest('.testimonial-carousel').addEventListener('focusout', startAuto);
    startAuto();
  }

  /* ============ FAQ ACCORDION ============ */
  document.querySelectorAll('.accordion-trigger').forEach(trigger => {
    trigger.addEventListener('click', () => {
      const item = trigger.closest('.accordion-item');
      const isOpen = item.classList.contains('open');

      item.parentElement.querySelectorAll('.accordion-item.open').forEach(openItem => {
        if (openItem !== item) {
          openItem.classList.remove('open');
          openItem.querySelector('.accordion-trigger').setAttribute('aria-expanded', 'false');
        }
      });

      item.classList.toggle('open', !isOpen);
      trigger.setAttribute('aria-expanded', String(!isOpen));
    });
  });

  /* ============ FILTER TABS (Portfolio / Case Studies) ============ */
  document.querySelectorAll('.filter-tabs').forEach(tabGroup => {
    const targetSelector = tabGroup.dataset.target;
    const items = targetSelector ? Array.from(document.querySelectorAll(targetSelector)) : [];
    const buttons = Array.from(tabGroup.querySelectorAll('.filter-btn'));

    buttons.forEach(btn => {
      btn.addEventListener('click', () => {
        buttons.forEach(b => b.setAttribute('aria-pressed', 'false'));
        btn.setAttribute('aria-pressed', 'true');
        const filter = btn.dataset.filter;

        items.forEach(item => {
          const show = filter === 'all' || item.dataset.category === filter;
          item.hidden = !show;
        });
      });
    });
  });

  /* ============ PRICING TOGGLE (Monthly / Project) ============ */
  const pricingToggle = document.getElementById('pricing-toggle');
  if (pricingToggle) {
    const monthlyLabel = document.getElementById('pricing-label-monthly');
    const projectLabel = document.getElementById('pricing-label-project');
    const amounts = document.querySelectorAll('[data-monthly][data-project]');

    const setMode = (isProject) => {
      pricingToggle.setAttribute('aria-checked', String(isProject));
      monthlyLabel && monthlyLabel.classList.toggle('active', !isProject);
      projectLabel && projectLabel.classList.toggle('active', isProject);
      amounts.forEach(el => {
        el.textContent = isProject ? el.dataset.project : el.dataset.monthly;
      });
    };

    pricingToggle.addEventListener('click', () => {
      const isProject = pricingToggle.getAttribute('aria-checked') === 'true';
      setMode(!isProject);
    });
    setMode(false);
  }

  /* ============ FORM CHIPS (multi-select toggle) ============ */
  document.querySelectorAll('.form-chips').forEach(group => {
    group.querySelectorAll('.form-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const pressed = chip.getAttribute('aria-pressed') === 'true';
        chip.setAttribute('aria-pressed', String(!pressed));
      });
    });
  });

  /* ============ CONTACT FORM VALIDATION + SUBMIT ============ */
  const contactForm = document.getElementById('contact-form');
  if (contactForm) {
    const requiredFields = contactForm.querySelectorAll('[required]');

    const validateField = (field) => {
      const group = field.closest('.form-group');
      const valid = field.checkValidity();
      if (group) group.classList.toggle('has-error', !valid);
      return valid;
    };

    requiredFields.forEach(field => {
      field.addEventListener('blur', () => validateField(field));
    });

    contactForm.addEventListener('submit', (e) => {
      e.preventDefault();
      let allValid = true;
      requiredFields.forEach(field => {
        if (!validateField(field)) allValid = false;
      });
      if (!allValid) {
        const firstError = contactForm.querySelector('.has-error .form-input, .has-error .form-textarea');
        if (firstError) firstError.focus();
        return;
      }

      const card = contactForm.closest('.form-card');
      const success = document.getElementById('form-success');
      if (card && success) {
        card.classList.add('submitted');
        success.classList.add('show');
        success.setAttribute('tabindex', '-1');
        success.focus();
      }
      /* In production: send form data to your backend/email service here
         before showing the success state. */
    });
  }

  /* ============ BLOG SEARCH + CATEGORY FILTER (combined) ============ */
  const blogSearchInput = document.getElementById('blog-search-input');
  const blogItems = Array.from(document.querySelectorAll('.blog-item'));
  const blogEmptyState = document.getElementById('blog-search-empty');

  if (blogItems.length) {
    const activeCategoryBtn = () => document.querySelector('.filter-tabs .filter-btn[aria-pressed="true"]');

    const applyBlogFilters = () => {
      const query = (blogSearchInput ? blogSearchInput.value : '').trim().toLowerCase();
      const catBtn = activeCategoryBtn();
      const category = catBtn ? catBtn.dataset.filter : 'all';
      let visibleCount = 0;

      blogItems.forEach(item => {
        const matchesCategory = category === 'all' || item.dataset.category === category;
        const haystack = (item.dataset.search || item.textContent).toLowerCase();
        const matchesQuery = !query || haystack.includes(query);
        const show = matchesCategory && matchesQuery;
        item.hidden = !show;
        if (show) visibleCount++;
      });

      if (blogEmptyState) blogEmptyState.classList.toggle('show', visibleCount === 0);
    };

    if (blogSearchInput) {
      blogSearchInput.addEventListener('input', applyBlogFilters);
    }
    document.querySelectorAll('.filter-tabs .filter-btn').forEach(btn => {
      btn.addEventListener('click', () => setTimeout(applyBlogFilters, 0));
    });
  }

  /* ============ NEWSLETTER FORM ============ */
  document.querySelectorAll('.newsletter-form').forEach(form => {
    form.addEventListener('submit', (e) => {
      e.preventDefault();
      const emailField = form.querySelector('input[type="email"]');
      if (emailField && !emailField.checkValidity()) {
        emailField.focus();
        return;
      }
      const box = form.closest('.newsletter-box');
      const successMsg = box ? box.querySelector('.newsletter-success') : null;
      if (box) box.classList.add('submitted');
      if (successMsg) successMsg.classList.add('show');
      /* In production: send email to your list provider (e.g. Resend/Mailchimp) here. */
    });
  });

  /* ============ READING PROGRESS BAR (single blog post) ============ */
  const progressBar = document.getElementById('reading-progress');
  const postContent = document.querySelector('.post-content');
  if (progressBar && postContent) {
    const updateProgress = () => {
      const rect = postContent.getBoundingClientRect();
      const total = postContent.offsetHeight - window.innerHeight;
      const scrolled = Math.min(Math.max(-rect.top, 0), total);
      const pct = total > 0 ? (scrolled / total) * 100 : 0;
      progressBar.style.width = pct + '%';
    };
    updateProgress();
    window.addEventListener('scroll', updateProgress, { passive: true });
    window.addEventListener('resize', updateProgress);
  }

  /* ============ TABLE OF CONTENTS — SCROLL SPY ============ */
  const tocLinks = Array.from(document.querySelectorAll('.toc a'));
  if (tocLinks.length && 'IntersectionObserver' in window) {
    const headingIds = tocLinks.map(a => a.getAttribute('href').replace('#', ''));
    const headings = headingIds.map(id => document.getElementById(id)).filter(Boolean);

    const tocObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const link = tocLinks.find(a => a.getAttribute('href') === '#' + entry.target.id);
        if (!link) return;
        if (entry.isIntersecting) {
          tocLinks.forEach(a => a.classList.remove('active'));
          link.classList.add('active');
        }
      });
    }, { rootMargin: '-15% 0px -70% 0px', threshold: 0 });

    headings.forEach(h => tocObserver.observe(h));

    tocLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = document.getElementById(link.getAttribute('href').replace('#', ''));
        if (target) {
          target.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'start' });
        }
      });
    });
  }

  /* ============ PARTICLE BACKGROUND (hero only, canvas) ============ */
  const canvas = document.getElementById('particle-canvas');
  if (canvas && !reduceMotion) {
    const ctx = canvas.getContext('2d');
    const hero = document.querySelector('.hero, .page-hero');
    let particles = [];
    let animId;
    let heroHeight = 0;

    function resize() {
      heroHeight = hero ? hero.offsetHeight : window.innerHeight;
      canvas.width = window.innerWidth;
      canvas.height = heroHeight;
      canvas.style.height = heroHeight + 'px';
      const count = Math.min(70, Math.floor((window.innerWidth * heroHeight) / 18000));
      particles = Array.from({ length: count }, () => createParticle());
    }

    function createParticle() {
      return {
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        r: Math.random() * 1.8 + 0.6,
        vx: (Math.random() - 0.5) * 0.18,
        vy: (Math.random() - 0.5) * 0.18,
        alpha: Math.random() * 0.4 + 0.15
      };
    }

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 0) p.x = canvas.width;
        if (p.x > canvas.width) p.x = 0;
        if (p.y < 0) p.y = canvas.height;
        if (p.y > canvas.height) p.y = 0;

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(230, 168, 68, ${p.alpha})`;
        ctx.fill();
      });

      // connect nearby particles with faint lines
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 110) {
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(230, 168, 68, ${0.08 * (1 - dist / 110)})`;
            ctx.lineWidth = 1;
            ctx.stroke();
          }
        }
      }
      animId = requestAnimationFrame(draw);
    }

    let resizeTimer;
    window.addEventListener('resize', () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(resize, 200);
    });

    // Pause when off-screen for performance
    const canvasObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          if (!animId) draw();
        } else {
          cancelAnimationFrame(animId);
          animId = null;
        }
      });
    }, { threshold: 0 });

    resize();
    if (hero) canvasObserver.observe(hero);
    else draw();
  } else if (canvas) {
    canvas.style.display = 'none';
  }

})();
