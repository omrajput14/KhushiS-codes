const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];

/* ---------- things that work without GSAP ---------- */
const now = new Date();
$('#date').textContent = `${now.toLocaleString('en', { month: 'short' }).toUpperCase()} '${String(now.getFullYear()).slice(-2)}`;
$$('.year').forEach(el => (el.textContent = now.getFullYear()));

const tick = () => {
  const o = { hour: 'numeric', minute: '2-digit', second: '2-digit' };
  $('#time-ist').textContent = new Date().toLocaleTimeString('en-US', { ...o, timeZone: 'Asia/Kolkata' });
  $('#time-you').textContent = new Date().toLocaleTimeString('en-US', o);
};
tick();
setInterval(tick, 1000);

// menu
const menu = $('#menu');
const toggleMenu = open => {
  document.body.classList.toggle('menu-open', open);
  menu.inert = !open;
  $('#menu-btn').setAttribute('aria-expanded', open);
  if (open) $('#menu-close').focus();
};
$('#menu-btn').onclick = () => toggleMenu(true);
$('#menu-close').onclick = $('.scrim').onclick = () => toggleMenu(false);
$$('#menu a').forEach(a => a.addEventListener('click', () => toggleMenu(false)));
addEventListener('keydown', e => e.key === 'Escape' && toggleMenu(false));

// speaking slider (manual only — no auto-rotate, so readers keep control)
const slides = $$('.slide');
let si = 0;
const show = n => {
  slides[si].classList.remove('on');
  si = (n + slides.length) % slides.length;
  slides[si].classList.add('on');
  $('#slide-n').textContent = si + 1;
};
$('#prev').onclick = () => show(si - 1);
$('#next').onclick = () => show(si + 1);

// endless tools strip: duplicate the set so translateX(-50%) loops seamlessly
const tools = $('.tools');
tools.append(...[...tools.children].map(n => Object.assign(n.cloneNode(true), { ariaHidden: 'true' })));

/* ---------- animated layer ---------- */
if (window.gsap && window.ScrollTrigger && window.Lenis) init();
else { $('#loader').remove(); document.documentElement.classList.remove('js'); }

// wrap every letter in .l inside a clipped .w word; keeps a screen-reader copy of the text
function split(el) {
  const text = el.textContent.replace(/\s+/g, ' ').trim();
  (function walk(node) {
    [...node.childNodes].forEach(n => {
      if (n.nodeType === 1 && n.tagName !== 'BR') return walk(n);
      if (n.nodeType !== 3) return;
      const frag = document.createDocumentFragment();
      n.textContent.split(/(\s+)/).forEach(word => {
        if (!word) return;
        if (!word.trim()) return frag.append(' ');
        const w = document.createElement('span');
        w.className = 'w';
        w.ariaHidden = 'true';
        for (const ch of word) {
          const l = document.createElement('span');
          l.className = 'l';
          l.textContent = ch;
          w.append(l);
        }
        frag.append(w);
      });
      n.replaceWith(frag);
    });
  })(el);
  el.prepend(Object.assign(document.createElement('span'), { className: 'sr', textContent: text }));
  return $$('.l', el);
}

function init() {
  gsap.registerPlugin(ScrollTrigger);
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) gsap.globalTimeline.timeScale(25);

  // smooth scroll
  const lenis = new Lenis({ duration: reduce ? 0.05 : 1.2 });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(t => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
  lenis.stop();
  $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
    e.preventDefault();
    const id = a.getAttribute('href');
    lenis.scrollTo(id === '#home' ? 0 : id, { duration: 2 });
  }));

  // letter reveals
  $$('[data-split]').forEach(el => {
    const letters = split(el);
    if (el.dataset.split === 'intro') return;
    gsap.to(letters, {
      y: 0, duration: 0.9, ease: 'power4.inOut', stagger: Math.min(0.03, 0.8 / letters.length),
      scrollTrigger: { trigger: el, start: 'top 90%', toggleActions: 'play none none reverse' },
    });
  });
  $$('[data-fade]').forEach(el => gsap.from(el, {
    y: 40, autoAlpha: 0, duration: 1.1, ease: 'power3.out',
    scrollTrigger: { trigger: el, start: 'top 92%', toggleActions: 'play none none reverse' },
  }));

  // loader: text rises, then the panel lifts off with its curved bottom flattening
  const loader = $('#loader'), svg = $('#loader > svg'), path = $('#loader path');
  const W = innerWidth, H = innerHeight, bulge = H * (W < 600 ? 0.15 : W < 900 ? 0.2 : 0.3);
  svg.setAttribute('width', W);
  svg.setAttribute('height', H + bulge);
  path.setAttribute('d', `M0 0 L${W} 0 L${W} ${H} Q${W / 2} ${H + bulge} 0 ${H} L0 0`);
  gsap.to('.lt', { y: 0, duration: 1, ease: 'power2.inOut', stagger: 0.1, delay: 0.2 });

  const loaded = document.readyState === 'complete' ? null : new Promise(r => addEventListener('load', r, { once: true }));
  Promise.all([
    new Promise(r => setTimeout(r, 1600)),
    Promise.race([loaded, new Promise(r => setTimeout(r, 4000))]), // don't hold the page hostage on slow networks
  ]).then(() => {
    gsap.timeline()
      .to('.lt', { y: '-110%', duration: 0.6, ease: 'power2.in', stagger: 0.05 })
      .to(loader, { yPercent: -100, duration: 1.1, ease: 'power2.inOut', onStart: () => { scrollTo(0, 0); intro(); } }, '-=0.1')
      .to(path, { attr: { d: `M0 0 L${W} 0 L${W} ${H} Q${W / 2} ${H} 0 ${H} L0 0` }, duration: 1.1, ease: 'power2.inOut' }, '<20%')
      .add(() => {
        loader.remove();
        document.body.classList.remove('locked');
        lenis.start();
        ScrollTrigger.refresh();
      });
  });

  function intro() {
    const d = 0.25, ease = 'power4.inOut';
    gsap.to('#top-bar', { y: 0, duration: 1.5, ease, delay: d });
    gsap.to('.hero-name .l', { y: 0, duration: 1.5, ease, stagger: 0.05, delay: d });
    gsap.fromTo('#star', { rotate: -270, scale: 0 }, { rotate: 0, scale: 1, duration: 1.7, ease, delay: d });
    gsap.to('.hero-img .overlay', { yPercent: 100, duration: 1.5, ease, delay: d + 0.15 });
    gsap.from('.hero-img img', { scale: 1.4, duration: 1.8, ease, delay: d + 0.15 });
    gsap.from(['#down-arrow', '#hero-btn', '.hero-right'], { y: 80, autoAlpha: 0, duration: 1.5, ease, delay: d + 0.2, stagger: 0.08 });
    gsap.to('.who .l', { y: 0, duration: 1.5, ease, stagger: 0.004, delay: d + 0.2 });
  }

  // hero sinks back as the next section slides over it
  gsap.to('#home', { scale: 0.9, opacity: 0.5, ease: 'none', scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: 1 } });
  gsap.to('#star svg', { rotate: 360, ease: 'none', scrollTrigger: { trigger: '#home', start: 'top top', end: 'bottom top', scrub: 1 } });

  // floating menu button: always on mobile, appears after the hero on desktop
  gsap.matchMedia()
    .add('(max-width: 900px)', () => { gsap.set('#menu-btn', { scale: 1 }); })
    .add('(min-width: 901px)', () => {
      gsap.to('#menu-btn', { scale: 1, duration: 0.6, ease: 'back.out(2)', scrollTrigger: { trigger: '#home', start: 'bottom 60%', toggleActions: 'play none none reverse' } });
    });

  // big marquee rows drift sideways with scroll
  $$('.mq-row').forEach((row, i) => gsap.fromTo(row, { x: -250 * (i + 1) }, {
    x: 0, ease: 'none', scrollTrigger: { trigger: '#marquee', start: 'top bottom', end: 'bottom top', scrub: 1 },
  }));

  // projects: sticky index rolls to the active card's number
  const idx = $('#index span');
  let cur = 0;
  $$('.work').forEach((card, i) => {
    ScrollTrigger.create({
      trigger: card, start: 'top 50%', end: 'bottom 50%',
      onToggle: s => {
        if (!s.isActive || i === cur) return;
        const dir = i > cur ? 1 : -1;
        cur = i;
        gsap.timeline()
          .to(idx, { yPercent: -100 * dir, duration: 0.25, ease: 'power2.in' })
          .add(() => (idx.textContent = `${String(i + 1).padStart(2, '0')}.`))
          .fromTo(idx, { yPercent: 100 * dir }, { yPercent: 0, duration: 0.35, ease: 'power2.out' });
      },
    });
    gsap.fromTo($('img', card), { yPercent: -5 }, { yPercent: 5, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  // dark cards grow into place
  $$('.about-card, .contact-card').forEach(card => gsap.from(card, {
    scale: 0.92, ease: 'none', scrollTrigger: { trigger: card, start: 'top bottom', end: 'top 35%', scrub: 1 },
  }));

  // magnetic buttons
  $$('.magnetic').forEach(el => {
    const opts = { duration: 1, ease: 'elastic.out(1, 0.3)' };
    const toX = gsap.quickTo(el, 'x', opts), toY = gsap.quickTo(el, 'y', opts);
    el.addEventListener('mousemove', e => {
      const r = el.getBoundingClientRect();
      toX(((e.clientX - r.left) / r.width - 0.5) * 40);
      toY(((e.clientY - r.top) / r.height - 0.5) * 40);
    });
    el.addEventListener('mouseleave', () => { toX(0); toY(0); });
  });
}
