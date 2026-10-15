'use strict';

// Add only real app captures here. See assets/README.md for the exact format.
// Empty by design: no missing images are requested and no fake app UI is shown.
const screenshots = [];

function productFigure(shot, hero = false) {
  const figure = document.createElement('figure');
  figure.className = 'product-shot';
  const frame = document.createElement('div');
  frame.className = 'phone';
  const img = document.createElement('img');
  img.alt = shot.alt;
  img.width = shot.width;
  img.height = shot.height;
  img.loading = hero ? 'eager' : 'lazy';
  img.decoding = 'async';
  if (hero) img.fetchPriority = 'high';
  const caption = document.createElement('figcaption');
  caption.textContent = shot.label;
  frame.append(img);
  figure.append(frame, caption);
  return { figure, img };
}

const gallery = document.querySelector('#screenshots');
const product = document.querySelector('#produto');
const heroVisual = document.querySelector('#hero-visual');
if (gallery && product && heroVisual) {
  if (screenshots.length) product.hidden = false;
  screenshots.forEach((shot) => {
    const { figure, img } = productFigure(shot);
    // Reserve space for lazy loading; reveal each frame only when its image loads.
    figure.style.visibility = 'hidden';
    img.addEventListener('load', () => { figure.style.visibility = 'visible'; }, { once: true });
    img.addEventListener('error', () => {
      figure.remove();
      if (!gallery.querySelector('img')) product.hidden = true;
    }, { once: true });
    gallery.append(figure);
    img.src = shot.src;
    if (shot.hero) {
      const main = productFigure(shot, true);
      main.img.addEventListener('load', () => heroVisual.replaceChildren(main.figure), { once: true });
      main.img.src = shot.src;
    }
  });
}

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
