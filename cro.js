(() => {
  'use strict';

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ============ FOCUS TRAP HELPER (shared by all modals) ============ */
  const trapFocus = (modal) => {
    const focusable = modal.querySelectorAll('a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])');
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    modal.addEventListener('keydown', (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault(); last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault(); first.focus();
      }
    });
  };

  const openModal = (backdrop) => {
    if (!backdrop) return;
    backdrop.classList.add('open');
    backdrop.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    const box = backdrop.querySelector('.modal-box');
    if (box) { box.setAttribute('tabindex', '-1'); box.focus(); }
  };

  const closeModal = (backdrop) => {
    if (!backdrop) return;
    backdrop.classList.remove('open');
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  };

  document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
    trapFocus(backdrop);
    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) closeModal(backdrop);
    });
    backdrop.querySelectorAll('.modal-close, [data-modal-close]').forEach(btn => {
      btn.addEventListener('click', () => closeModal(backdrop));
    });
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    document.querySelectorAll('.modal-backdrop.open').forEach(closeModal);
  });

  /* ============ CERTIFICATE LIGHTBOX ============ */
  const certModal = document.getElementById('cert-modal');
  if (certModal) {
    const certImg = document.getElementById('cert-modal-img');
    const certTitle = document.getElementById('cert-modal-title');
    document.querySelectorAll('[data-cert-modal]').forEach(btn => {
      btn.addEventListener('click', () => {
        certImg.src = btn.dataset.certImg;
        certImg.alt = btn.dataset.certTitle;
        certTitle.textContent = btn.dataset.certTitle;
        openModal(certModal);
      });
    });
  }

  /* ============ VIDEO SHOWCASE: play-on-view + sound toggle ============ */
  const showcaseVideos = document.querySelectorAll('.video-card-el');
  if (showcaseVideos.length) {
    if ('IntersectionObserver' in window && !reduceMotion) {
      const videoObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
          const vid = entry.target;
          if (entry.isIntersecting) {
            vid.play().catch(() => {});
          } else {
            vid.pause();
          }
        });
      }, { threshold: 0.5 });
      showcaseVideos.forEach(vid => videoObserver.observe(vid));
    }
    // If reduced motion is preferred, videos stay paused on their poster frame.
  }

  document.querySelectorAll('.video-sound-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const video = btn.closest('.video-card').querySelector('.video-card-el');
      video.muted = !video.muted;
      btn.setAttribute('aria-pressed', String(!video.muted));
      btn.setAttribute('aria-label', video.muted ? 'Unmute video' : 'Mute video');
    });
  });

  /* ============ ANNOUNCEMENT BAR DISMISS (in-memory only, no storage) ============ */
  const announcementBar = document.getElementById('announcement-bar');
  if (announcementBar) {
    const closeBtn = announcementBar.querySelector('.announcement-bar-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        announcementBar.classList.add('hidden');
      });
    }
  }

  /* ============ FLOATING ACTION CLUSTER ============ */
  const fabCluster = document.getElementById('floating-actions');
  if (fabCluster) {
    const mainBtn = fabCluster.querySelector('.fab-main');
    if (mainBtn) {
      mainBtn.addEventListener('click', () => {
        const isOpen = fabCluster.classList.toggle('open');
        mainBtn.setAttribute('aria-expanded', String(isOpen));
      });
    }
  }

  /* ============ BOOKING MODAL (Calendly placeholder) TRIGGERS ============ */
  const bookingModal = document.getElementById('booking-modal');
  document.querySelectorAll('[data-open-booking]').forEach(trigger => {
    trigger.addEventListener('click', (e) => {
      e.preventDefault();
      openModal(bookingModal);
    });
  });

  /* ============ FLOATING ACTIONS: reveal after scrolling past hero ============ */
  if (fabCluster) {
    const heroForFab = document.querySelector('.hero, .page-hero');
    const revealFab = () => {
      const threshold = heroForFab ? heroForFab.offsetHeight * 0.7 : 400;
      fabCluster.classList.toggle('visible', window.scrollY > threshold);
    };
    window.addEventListener('scroll', revealFab, { passive: true });
    revealFab();
  }

  /* ============ STICKY MOBILE CTA BAR ============ */
  const stickyMobileCta = document.getElementById('sticky-mobile-cta');
  if (stickyMobileCta) {
    let dismissed = false;
    const closeBtn = stickyMobileCta.querySelector('.sticky-mobile-cta-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        dismissed = true;
        stickyMobileCta.classList.remove('visible');
      });
    }
    const heroEl = document.querySelector('.hero, .page-hero');
    const onScroll = () => {
      if (dismissed) return;
      const threshold = heroEl ? heroEl.offsetHeight * 0.6 : 400;
      stickyMobileCta.classList.toggle('visible', window.scrollY > threshold);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  /* ============ EXIT INTENT POPUP ============ */
  const exitModal = document.getElementById('exit-modal');
  if (exitModal && !reduceMotion) {
    let hasShown = false;
    const maybeShow = () => {
      if (hasShown) return;
      hasShown = true;
      openModal(exitModal);
      document.removeEventListener('mouseout', handleMouseOut);
    };
    const handleMouseOut = (e) => {
      if (e.clientY <= 0 && !e.relatedTarget) maybeShow();
    };
    // Only wire up on desktop-sized viewports; exit intent via cursor doesn't apply on touch
    if (window.matchMedia('(min-width: 1024px)').matches) {
      setTimeout(() => {
        document.addEventListener('mouseout', handleMouseOut);
      }, 4000); // grace period so it never fires immediately on page load
    }
  }

  /* ============ LEAD FORMS (modal + inline) ============ */
  document.querySelectorAll('.lead-form').forEach(form => {
    const requiredFields = form.querySelectorAll('[required]');

    const validateField = (field) => {
      const group = field.closest('.form-group');
      const valid = field.checkValidity();
      if (group) group.classList.toggle('has-error', !valid);
      return valid;
    };
    requiredFields.forEach(field => field.addEventListener('blur', () => validateField(field)));

    form.addEventListener('submit', (e) => {
      e.preventDefault();
      let allValid = true;
      requiredFields.forEach(field => { if (!validateField(field)) allValid = false; });
      if (!allValid) return;

      form.classList.add('submitted');
      const successEl = form.parentElement.querySelector('.lead-form-success');
      if (successEl) {
        successEl.classList.add('show');
        successEl.setAttribute('tabindex', '-1');
        successEl.focus();
      }
      /* In production: POST this data to your CRM/email service before showing success. */
    });
  });

})();
