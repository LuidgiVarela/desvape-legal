'use strict';

document.querySelectorAll('[data-year]').forEach((el) => {
  el.textContent = String(new Date().getFullYear());
});

// Content stays visible without JavaScript or IntersectionObserver support.
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
if (!reduceMotion.matches && 'IntersectionObserver' in window) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.remove('reveal-pending');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.08 });
  document.querySelectorAll('.reveal').forEach((el) => {
    el.classList.add('reveal-pending');
    observer.observe(el);
  });
  reduceMotion.addEventListener('change', () => {
    if (reduceMotion.matches) {
      observer.disconnect();
      document.querySelectorAll('.reveal-pending').forEach((el) => el.classList.remove('reveal-pending'));
    }
  });
}

// The small demo is the only moving media loaded on the initial page.
// Pause off-screen/in background; respect reduced motion and data-saving settings.
const demo = document.querySelector('#app-demo');
const videoToggle = document.querySelector('#video-toggle');
if (demo && videoToggle) {
  const status = document.querySelector('#video-status');
  let inView = true;
  let wantsPlayback = !reduceMotion.matches && !navigator.connection?.saveData;
  let failed = false;
  demo.muted = true;
  demo.autoplay = wantsPlayback;
  videoToggle.hidden = false;

  function updateVideoButton() {
    videoToggle.textContent = demo.paused ? 'Reproduzir vídeo' : 'Pausar vídeo';
  }
  function syncPlayback() {
    if (failed) return;
    if (wantsPlayback && inView && !document.hidden) {
      demo.play().then(() => {
        // A play promise may finish after the visitor scrolls away or pauses.
        if (!wantsPlayback || !inView || document.hidden) demo.pause();
      }).catch(() => {
        // Browser autoplay restrictions are normal; retain poster and manual play.
        updateVideoButton();
      });
    } else {
      demo.pause();
    }
  }
  videoToggle.addEventListener('click', () => {
    wantsPlayback = demo.paused;
    syncPlayback();
  });
  demo.addEventListener('play', updateVideoButton);
  demo.addEventListener('pause', updateVideoButton);
  const failVideo = () => {
    failed = true;
    demo.pause();
    videoToggle.hidden = true;
    status.textContent = 'A prévia está indisponível no momento. Você ainda pode conhecer os recursos abaixo.';
  };
  demo.addEventListener('error', failVideo);
  demo.querySelector('source').addEventListener('error', failVideo);
  document.addEventListener('visibilitychange', syncPlayback);
  reduceMotion.addEventListener('change', () => {
    wantsPlayback = !reduceMotion.matches && !navigator.connection?.saveData;
    demo.autoplay = wantsPlayback;
    syncPlayback();
  });
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(([entry]) => {
      inView = entry.isIntersecting;
      syncPlayback();
    }, { threshold: 0.1 });
    observer.observe(demo);
  }
  updateVideoButton();
  syncPlayback();
}

// Reuse the supplied, self-contained Three.js viewer only after explicit interest.
// No CDN, new runtime package, audio or perpetual animation loop is needed.
const mascotButton = document.querySelector('#mascot-load');
if (mascotButton) {
  const stage = document.querySelector('#mascot-stage');
  const status = document.querySelector('#mascot-status');
  const controls = document.querySelector('#mascot-controls');
  const turn = document.querySelector('#mascot-turn');
  let viewer = null;
  let frame = null;
  let active = true;
  let loading = false;
  let loadAttempt = 0;
  let timeout;
  let abort;

  // Local-file browsing keeps the supplied SVG fallback. Serve over HTTP for 3D.
  mascotButton.hidden = !['http:', 'https:'].includes(location.protocol);
  function syncMascot() {
    viewer?.control({ active: active && !document.hidden, motion: false, mood: 'calm' });
    if (active && !document.hidden) viewer?.rotate(Number(turn.value) / 100);
  }
  function fallback() {
    loadAttempt++;
    clearTimeout(timeout);
    abort?.abort();
    frame?.remove();
    frame = null;
    viewer = null;
    loading = false;
    stage.classList.remove('is-ready');
    controls.hidden = true;
    mascotButton.hidden = false;
    mascotButton.disabled = false;
    mascotButton.textContent = 'Tentar novamente';
    status.textContent = 'O pinguim fica por aqui. A versão interativa não carregou desta vez.';
  }
  function asBase64(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i += 8192) {
      binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    }
    return btoa(binary);
  }
  mascotButton.addEventListener('click', async () => {
    if (loading || viewer) return;
    loading = true;
    const attempt = ++loadAttempt;
    mascotButton.disabled = true;
    status.textContent = 'Preparando seu companheiro…';
    abort = new AbortController();
    timeout = setTimeout(fallback, 15000);
    try {
      const response = await fetch('assets/mascot3d/companion.glb', { signal: abort.signal });
      if (!response.ok) throw new Error('Model unavailable');
      const base64 = asBase64(await response.arrayBuffer());
      if (attempt !== loadAttempt) return;
      frame = document.createElement('iframe');
      frame.title = 'Pinguim do DesVape';
      frame.tabIndex = -1;
      frame.setAttribute('aria-hidden', 'true');
      frame.addEventListener('error', () => { if (attempt === loadAttempt) fallback(); }, { once: true });
      frame.addEventListener('load', () => {
        if (attempt !== loadAttempt) return;
        try {
          const child = frame.contentWindow;
          const api = child.desvapeMascot;
          if (!api) throw new Error('Viewer unavailable');
          child.MascotBridge = {
            postMessage(message) {
              if (attempt !== loadAttempt) return;
              if (message === 'error') fallback();
              if (message === 'ready') {
                clearTimeout(timeout);
                viewer = api;
                loading = false;
                syncMascot();
                stage.classList.add('is-ready');
                controls.hidden = false;
                const hadFocus = document.activeElement === mascotButton;
                mascotButton.hidden = true;
                status.textContent = 'Seu companheiro de jornada.';
                // Move focus only if the visitor is still using the activation button.
                if (hadFocus) turn.focus({ preventScroll: true });
              }
            }
          };
          api.load(base64, { idle: 'Idle', positive: 'Positive', attention: 'Attention' });
        } catch { fallback(); }
      }, { once: true });
      frame.src = 'assets/mascot3d/viewer.html';
      stage.append(frame);
    } catch {
      if (attempt === loadAttempt) fallback();
    }
  });
  turn.addEventListener('input', () => {
    const value = Number(turn.value);
    turn.setAttribute('aria-valuetext', value === 0 ? 'De frente' : `${Math.abs(value)}% para a ${value < 0 ? 'esquerda' : 'direita'}`);
    viewer?.rotate(value / 100);
  });
  document.addEventListener('visibilitychange', syncMascot);
  if ('IntersectionObserver' in window) {
    new IntersectionObserver(([entry]) => {
      active = entry.isIntersecting;
      syncMascot();
    }, { threshold: 0.05 }).observe(stage);
  }
}

// The configured public Supabase endpoint stores consented launch-list registrations.
const waitlistForm = document.querySelector('#waitlist-form');
if (waitlistForm) {
  const emailInput = document.querySelector('#waitlist-email');
  const emailError = document.querySelector('#email-error');
  const consentInput = document.querySelector('#waitlist-consent');
  const button = document.querySelector('#waitlist-submit');
  const feedback = document.querySelector('#waitlist-feedback');
  const startedAt = Date.now();
  let inFlight = false;
  let submitted = false;
  let timeoutId;

  function showFeedback(message, error = false) {
    feedback.textContent = message;
    feedback.classList.toggle('is-error', error);
    feedback.classList.add('is-visible');
  }
  function hideFeedback() {
    feedback.textContent = '';
    feedback.classList.remove('is-visible', 'is-error');
  }
  function validateEmail() {
    const value = emailInput.value.trim();
    const valid = value.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) && !value.includes('..');
    emailInput.setCustomValidity(valid || value === '' ? '' : 'Digite um e-mail válido.');
    emailError.textContent = valid || value === '' ? '' : 'Confira o endereço de e-mail.';
    return valid;
  }
  emailInput.addEventListener('input', () => {
    validateEmail();
    emailInput.setCustomValidity('');
    hideFeedback();
  });
  consentInput.addEventListener('change', hideFeedback);
  waitlistForm.querySelectorAll('input[name="platform"]').forEach(input => input.addEventListener('change', hideFeedback));

  waitlistForm.addEventListener('submit', async event => {
    event.preventDefault();
    if (inFlight || submitted) return;
    hideFeedback();
    if (!validateEmail()) {
      if (emailInput.value.trim() === '') emailInput.setCustomValidity('Informe seu e-mail.');
      emailInput.reportValidity();
      emailInput.focus();
      return;
    }
    if (!consentInput.checked) {
      consentInput.setCustomValidity('É preciso aceitar receber o aviso de lançamento.');
      consentInput.reportValidity();
      consentInput.focus();
      return;
    }
    consentInput.setCustomValidity('');

    const endpoint = window.DESVAPE_WAITLIST_API;
    if (typeof endpoint !== 'string' || !endpoint.trim()) {
      showFeedback('A lista de espera ainda está sendo preparada. Tente novamente em breve.', true);
      return;
    }
    let apiURL;
    try { apiURL = new URL(endpoint.trim(), window.location.href); }
    catch {
      showFeedback('Não foi possível concluir o cadastro agora. Tente novamente em instantes.', true);
      return;
    }
    if (!['https:', ...(apiURL.hostname === 'localhost' ? ['http:'] : [])].includes(apiURL.protocol)) {
      showFeedback('Não foi possível concluir o cadastro agora. Tente novamente em instantes.', true);
      return;
    }

    const query = new URLSearchParams(window.location.search);
    const utm = Object.fromEntries(['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']
      .map(key => [key, query.get(key)])
      .filter(([, value]) => value));
    const platform = waitlistForm.querySelector('input[name="platform"]:checked')?.value || null;
    const payload = {
      email: emailInput.value.trim(), platform, consent: true,
      company: waitlistForm.querySelector('[name="company"]').value,
      elapsed_ms: Date.now() - startedAt, utm,
    };
    const controller = new AbortController();
    timeoutId = setTimeout(() => controller.abort(), 12_000);
    inFlight = true;
    button.disabled = true;
    button.textContent = 'Enviando…';
    try {
      const response = await fetch(apiURL.href, {
        method: 'POST', mode: 'cors', credentials: 'omit', cache: 'no-store',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload), signal: controller.signal,
      });
      let result = {};
      try { result = await response.json(); } catch { /* An invalid response is a failed submission. */ }
      if (!response.ok || result.ok !== true) {
        if (response.status === 400 && result.error === 'invalid_email') {
          emailInput.setCustomValidity('Digite um e-mail válido.');
          emailError.textContent = 'Confira o endereço de e-mail.';
          emailInput.reportValidity();
          emailInput.focus();
        } else if (response.status === 429) {
          showFeedback('Muitas tentativas em pouco tempo. Aguarde alguns minutos e tente novamente.', true);
        } else {
          showFeedback('Não foi possível salvar sua inscrição. Verifique a conexão e tente novamente.', true);
        }
        return;
      }
      submitted = true;
      waitlistForm.dataset.registered = 'true';
      emailError.textContent = '';
      showFeedback('Prontinho! Você está na lista. 💚');
      button.textContent = 'Inscrição confirmada 💚';
      waitlistForm.querySelectorAll('input').forEach(input => { input.disabled = true; });
      button.setAttribute('aria-label', 'Inscrição confirmada na lista de espera');
      waitlistForm.dispatchEvent(new CustomEvent('waitlist:registered'));
    } catch {
      showFeedback(controller.signal.aborted
        ? 'A conexão demorou mais que o esperado. Confira sua internet e tente novamente.'
        : 'Não foi possível salvar sua inscrição. Verifique a conexão e tente novamente.', true);
    } finally {
      clearTimeout(timeoutId);
      inFlight = false;
      if (!submitted) {
        button.disabled = false;
        button.textContent = 'Quero entrar na lista de espera';
      }
    }
  });
}

const waitlistSection = document.querySelector('#lista-de-espera');
const mobileWaitlistCTA = document.querySelector('#mobile-waitlist-cta');
if (waitlistSection && mobileWaitlistCTA && 'IntersectionObserver' in window) {
  const visibilityObserver = new IntersectionObserver(([entry]) => {
    const show = window.matchMedia('(max-width: 600px)').matches
      && entry.intersectionRatio < 0.45
      && document.querySelector('#waitlist-form')?.dataset.registered !== 'true';
    mobileWaitlistCTA.classList.toggle('is-visible', show);
    mobileWaitlistCTA.hidden = !show;
    document.body.classList.toggle('mobile-cta-visible', show);
  }, { threshold: [0, 0.45, 1] });
  visibilityObserver.observe(waitlistSection);
  waitlistForm?.addEventListener('waitlist:registered', () => {
    mobileWaitlistCTA.hidden = true;
    mobileWaitlistCTA.classList.remove('is-visible');
    document.body.classList.remove('mobile-cta-visible');
  });
}
