/* ══════════════════════════════════════════
   STITCH — main.js
   Gen-Z E-Commerce Interactions
══════════════════════════════════════════ */

'use strict';

/* ── Utility: Toast ── */
function showToast(msg, type) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show' + (type ? ' ' + type : '');
  clearTimeout(el._timer);
  el._timer = setTimeout(() => el.className = 'toast', 2400);
}

/* ══════════════════════════════════════════
   PRODUCT DATA STORE
══════════════════════════════════════════ */
const PRODUCTS = {
  'plain-joggers': {
    id: 'plain-joggers',
    name: 'Signature Wide-Leg Joggers',
    subtitle: 'Plain Black — Embroidered Logo',
    tag: 'Streetwear Essentials',
    price: 699,
    inStock: true,
    stock: 'In Stock',
    badge: 'NEW',
    images: [
      'Plain_joggers1/Plain_joggers_4.png',
      'Plain_joggers1/plain_joggers_1.jpeg',
      'Plain_joggers1/Plain_joggers_2.jpeg',
      'Plain_joggers1/Plain_joggers_3.jpeg',
    ],
    desc: 'Clean lines. Minimal flex. Our wide-leg joggers in jet black are cut for the streets and built to last. The embroidered STITCH logo on the thigh keeps it subtle but unmistakable — no loud graphics, just a silhouette that speaks for itself. Relaxed enough for every day, sharp enough to pull up anywhere.',
    features: [
      'Premium heavyweight cotton blend',
      'Wide-leg relaxed fit — unisex sizing',
      'Embroidered STITCH logo on left thigh',
      'Elastic waistband with adjustable drawstring',
      'Deep side pockets — phone fits',
      'Soft & breathable — all day comfort',
    ],
    keywords: 'plain joggers black minimal essential wide-leg embroidered logo',
  },
  'printed-joggers': {
    id: 'printed-joggers',
    name: 'Gothic Cathedral Joggers',
    subtitle: 'Printed Black — Gothic Artwork',
    tag: 'Limited Edition Drop',
    price: 999,
    inStock: false,
    stock: 'Out of Stock',
    badge: 'SOLD OUT',
    images: [
      'Printed_joggers_1/printed_joggers_6.png',
      'Printed_joggers_1/printed_joggers_7.png',
      'Printed_joggers_1/printed_joggers_3.jpeg',
      'Printed_joggers_1/printed_joggers_8.png',
      'Printed_joggers_1/printed_joggers_4.jpeg',
      'Printed_joggers_1/printed_joggers_5.jpeg',
    ],
    desc: 'Not everyone can wear this. Dark cathedral stonework runs down both legs — gargoyles perched on iron arches, sacred geometry etched in heavy print. The STITCH mark sits high on the thigh like a seal of ownership. This isn\'t just a jogger. It\'s a statement. A limited run for those who move differently.',
    features: [
      'Premium heavyweight cotton — soft & durable',
      'Full gothic cathedral side panel print',
      'Signature STITCH logo on left thigh',
      'Breathable fabric — built for all-day wear',
      'Wide-leg fit — unisex sizing',
      'Limited run — once it\'s gone, it\'s gone',
    ],
    keywords: 'printed joggers gothic cathedral streetwear limited artwork',
  },
  'thorn-tee': {
    id: 'thorn-tee',
    name: 'Thorn Tee',
    subtitle: 'Acid-Wash Black — Thorn Artwork',
    tag: 'Drop 02 Tee',
    price: 599,
    inStock: false,
    stock: 'Out of Stock',
    badge: 'SOLD OUT',
    images: [
      'printed jogger 2/tshirt design.png',
      'printed jogger 2/jogger design.png',
      'printed jogger 2/design 1.png',
    ],
    desc: 'Heavy oversized tee with razor-sharp thorn artwork crawling up both sides. Acid-washed jet black so no two pieces fade exactly the same. The STITCH crest sits dead-center, small and clean. Pairs perfectly with the Thorn Joggers for the full Drop 02 look.',
    features: [
      'Heavyweight 240 GSM cotton',
      'Acid-wash finish — every piece is one of one',
      'Oversized boxy fit — unisex',
      'Side-panel thorn print — sharp & high-contrast',
      'Centered STITCH crest on chest',
      'Reinforced double-stitched seams',
    ],
    keywords: 'thorn tee tshirt gothic black streetwear acid wash drop 02 oversized',
  },
  'thorn-combo': {
    id: 'thorn-combo',
    name: 'Thorn Drop Bundle',
    subtitle: 'Thorn Tee + Cathedral Joggers — Combo Drop',
    tag: 'Combo Offer · Save ₹199',
    price: 1399, // Tee ₹599 + Joggers ₹999 = ₹1598 → bundle ₹1399
    inStock: false,
    stock: 'Out of Stock',
    badge: 'COMBO',
    images: [
      'printed jogger 2/design 1.png',
      'printed jogger 2/tshirt design.png',
      'printed jogger 2/jogger design.png',
    ],
    desc: 'The full Drop 02 fit, bundled and discounted. One Thorn Tee and one pair of Gothic Cathedral Joggers — together for ₹1399 instead of ₹1598. Same heavy fabric, same sharp print language, head to toe. Limited combo allocation.',
    features: [
      'Includes 1× Thorn Tee + 1× Cathedral Joggers',
      'Save ₹199 vs buying separately',
      'Matched aesthetic — full Drop 02 look',
      'Pick same or different sizes for tee & joggers at delivery',
      'Strictly limited combo allocation',
    ],
    keywords: 'combo bundle thorn tee jogger gothic streetwear drop 02 set offer',
  },
};

/* ══════════════════════════════════════════
   BRAND LOGO — Needle Draw Animation
══════════════════════════════════════════ */
(function initLogoAnimation() {
  const mark    = document.getElementById('logo-mark');
  const detail  = document.getElementById('logo-mark-detail');
  const letters = Array.from(document.querySelectorAll('#stitch-logo-svg .logo-letter'));
  const estd    = Array.from(document.querySelectorAll('#stitch-logo-svg .logo-estd'));

  if (!mark) return;

  const pathLen = mark.getTotalLength();

  function reset() {
    mark.style.transition       = 'none';
    mark.style.strokeDasharray  = pathLen;
    mark.style.strokeDashoffset = pathLen;
    mark.style.fill             = 'transparent';
    if (detail) { detail.style.transition = 'none'; detail.style.opacity = '0'; }
    letters.forEach(l => { l.style.transition = 'none'; l.style.opacity = '0'; });
    estd.forEach(e    => { e.style.transition = 'none'; e.style.opacity = '0'; });
  }

  function run() {
    reset();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      mark.style.transition       = 'stroke-dashoffset 1.2s cubic-bezier(0.25,0.1,0.25,1)';
      mark.style.strokeDashoffset = '0';

      setTimeout(() => {
        mark.style.transition = 'fill 0.3s ease';
        mark.style.fill       = 'currentColor';
      }, 1250);

      if (detail) {
        setTimeout(() => {
          detail.style.transition = 'opacity 0.2s ease';
          detail.style.opacity    = '1';
        }, 1400);
      }

      letters.forEach((l, i) => {
        setTimeout(() => {
          l.style.transition = 'opacity 0.22s ease';
          l.style.opacity    = '1';
        }, 1500 + i * 70);
      });

      setTimeout(() => {
        estd.forEach(e => {
          e.style.transition = 'opacity 0.25s ease';
          e.style.opacity    = '1';
        });
      }, 2000);

      setTimeout(run, 3500);
    }));
  }

  run();
})();

/* ══════════════════════════════════════════
   SCROLL — Landing logo shrink + navbar reveal
══════════════════════════════════════════ */
(function initScrollTransition() {
  const navbar      = document.getElementById('navbar');
  const bigLogoWrap = document.getElementById('bigLogoWrap');
  const landing     = document.querySelector('.landing-stage');
  if (!landing || !bigLogoWrap) return;

  let ticking = false;

  function update() {
    const scrollY     = window.scrollY;
    const triggerEnd  = window.innerHeight * 0.45;
    const progress    = Math.min(1, Math.max(0, scrollY / triggerEnd));

    bigLogoWrap.style.setProperty('--logo-progress', progress.toFixed(3));
    document.documentElement.style.setProperty('--logo-progress', progress.toFixed(3));

    bigLogoWrap.dataset.collapsed = progress > 0.85 ? 'true' : 'false';
    navbar.classList.toggle('scrolled', scrollY > 40);

    ticking = false;
  }

  window.addEventListener('scroll', () => {
    if (!ticking) { requestAnimationFrame(update); ticking = true; }
  }, { passive: true });

  update();
})();

/* Nav logo click → scroll to top */
const navLogo = document.getElementById('navLogo');
if (navLogo) {
  navLogo.addEventListener('click', e => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ══════════════════════════════════════════
   MOBILE MENU
══════════════════════════════════════════ */
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');
const closeMenu  = document.getElementById('closeMenu');
const overlay    = document.getElementById('overlay');

function openMenu() {
  mobileMenu.classList.add('open');
  overlay.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeMenuFn() {
  mobileMenu.classList.remove('open');
  overlay.classList.remove('active');
  document.body.style.overflow = '';
}

if (hamburger) hamburger.addEventListener('click', openMenu);
if (closeMenu) closeMenu.addEventListener('click', closeMenuFn);
if (overlay) overlay.addEventListener('click', closeMenuFn);

/* ══════════════════════════════════════════
   HERO SLIDER (Story-style)
══════════════════════════════════════════ */
const slides   = document.querySelectorAll('.hero-slide');
const bars     = document.querySelectorAll('.story-bar');
const prevBtn  = document.getElementById('heroPrev');
const nextBtn  = document.getElementById('heroNext');

let currentSlide = 0;
let autoTimer    = null;
const SLIDE_DURATION = 5000;

function goToSlide(index) {
  slides[currentSlide].classList.remove('active');
  bars[currentSlide].classList.remove('active');
  bars[currentSlide].classList.add('done');

  currentSlide = (index + slides.length) % slides.length;

  if (currentSlide === 0) bars.forEach(b => b.classList.remove('done'));

  slides[currentSlide].classList.add('active');
  bars.forEach(b => b.querySelector('.story-fill').style.animation = 'none');

  const fill = bars[currentSlide].querySelector('.story-fill');
  void fill.offsetWidth;
  fill.style.animation = '';
  bars[currentSlide].classList.add('active');
  bars[currentSlide].classList.remove('done');
}

function nextSlide() { goToSlide(currentSlide + 1); }
function prevSlide() { goToSlide(currentSlide - 1); }

function startAuto() {
  clearInterval(autoTimer);
  autoTimer = setInterval(nextSlide, SLIDE_DURATION);
}

if (nextBtn) nextBtn.addEventListener('click', () => { nextSlide(); startAuto(); });
if (prevBtn) prevBtn.addEventListener('click', () => { prevSlide(); startAuto(); });

let touchStartX = 0;
const heroEl = document.querySelector('.hero');
if (heroEl) {
  heroEl.addEventListener('touchstart', e => { touchStartX = e.touches[0].clientX; }, { passive: true });
  heroEl.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - touchStartX;
    if (Math.abs(dx) > 50) { dx < 0 ? nextSlide() : prevSlide(); startAuto(); }
  }, { passive: true });
}

if (slides.length) { goToSlide(0); startAuto(); }

/* ── Category pills ── */
document.querySelectorAll('.cat-pill').forEach(pill => {
  pill.addEventListener('click', function () {
    document.querySelectorAll('.cat-pill').forEach(p => p.classList.remove('active'));
    this.classList.add('active');
  });
});

/* ── Scroll reveal ── */
const revealEls = document.querySelectorAll(
  '.product-card, .collection-tile, .insta-tile, .section-header'
);
revealEls.forEach(el => el.classList.add('reveal'));

const revealObserver = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      const parent   = entry.target.parentElement;
      const siblings = [...parent.querySelectorAll('.reveal')];
      const idx      = siblings.indexOf(entry.target);
      setTimeout(() => entry.target.classList.add('visible'), idx * 60);
      revealObserver.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

revealEls.forEach(el => revealObserver.observe(el));

/* ══════════════════════════════════════════
   PRODUCT CARD SLIDESHOWS (auto-rotating)
══════════════════════════════════════════ */
document.querySelectorAll('.product-card').forEach(card => {
  const slides = card.querySelectorAll('.card-slide');
  const dotsContainer = card.querySelector('.card-dots');
  if (slides.length < 2) return;

  // Create dots
  slides.forEach((_, i) => {
    const dot = document.createElement('span');
    dot.className = 'card-dot' + (i === 0 ? ' active' : '');
    dotsContainer.appendChild(dot);
  });

  let current = 0;
  const dots = dotsContainer.querySelectorAll('.card-dot');

  function go(idx) {
    slides[current].classList.remove('active');
    dots[current].classList.remove('active');
    current = (idx + slides.length) % slides.length;
    slides[current].classList.add('active');
    dots[current].classList.add('active');
  }

  // Auto-rotate every 3s
  setInterval(() => go(current + 1), 3000);
});

/* ══════════════════════════════════════════
   PRODUCT DETAIL MODAL (PDP)
══════════════════════════════════════════ */
const pdpOverlay   = document.getElementById('pdpOverlay');
const pdpSlideshow = document.getElementById('pdpSlideshow');
const pdpDots      = document.getElementById('pdpDots');
let pdpCurrent     = 0;
let pdpImages      = [];
let pdpAutoTimer   = null;
let pdpProduct     = null;

function openPDP(productId) {
  const p = PRODUCTS[productId];
  if (!p) return;
  pdpProduct = p;
  pdpImages  = p.images;
  pdpCurrent = 0;

  // Fill gallery
  pdpSlideshow.innerHTML = pdpImages.map((src, i) =>
    `<img src="${src}" class="pdp-slide${i === 0 ? ' active' : ''}" alt="${p.name}" />`
  ).join('');

  pdpDots.innerHTML = pdpImages.map((_, i) =>
    `<span class="pdp-dot${i === 0 ? ' active' : ''}" data-idx="${i}"></span>`
  ).join('');

  // Fill details
  document.getElementById('pdpTag').textContent      = p.tag;
  document.getElementById('pdpName').textContent     = p.name;
  document.getElementById('pdpSubtitle').textContent = p.subtitle;
  document.getElementById('pdpPrice').textContent    = '\u20B9' + p.price;
  document.getElementById('pdpStock').textContent    = p.stock;
  document.getElementById('pdpStock').className      = 'showcase-tag-pill' + (p.stock === 'Limited Stock' ? ' limited-pill' : '');
  document.getElementById('pdpDesc').textContent     = p.desc;

  // ATC + wishlist data
  const atcBtn = document.getElementById('pdpAtcBtn');
  atcBtn.dataset.id      = p.id;
  atcBtn.dataset.product = p.name;
  atcBtn.dataset.price   = p.price;
  atcBtn.dataset.image   = p.images[0];
  atcBtn.disabled        = !p.inStock;
  atcBtn.classList.toggle('out-of-stock', !p.inStock);
  atcBtn.textContent     = p.inStock ? 'Add to Cart' : 'Sold Out';

  const wishBtn = document.getElementById('pdpWishBtn');
  wishBtn.dataset.id      = p.id;
  wishBtn.dataset.product = p.name;
  wishBtn.dataset.price   = p.price;
  wishBtn.dataset.image   = p.images[0];
  const inWish = Wishlist.has(p.id);
  wishBtn.classList.toggle('wishlisted', inWish);
  wishBtn.innerHTML = inWish ? '&#9829;' : '&#9825;';

  // Features
  document.getElementById('pdpFeatures').innerHTML = p.features.map(f =>
    `<div class="feat-item"><span class="feat-check">\u2713</span><span>${f}</span></div>`
  ).join('');

  // Reset size selection
  const sizeOpts = document.getElementById('pdpSizes');
  sizeOpts.querySelectorAll('.size-btn').forEach(b => b.classList.remove('selected'));
  sizeOpts.querySelector('.size-btn:nth-child(2)').classList.add('selected'); // default M

  // Open
  pdpOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';

  // Start auto-rotate
  clearInterval(pdpAutoTimer);
  pdpAutoTimer = setInterval(() => goToPdpSlide(pdpCurrent + 1), 3500);
}

function closePDP() {
  pdpOverlay.classList.remove('open');
  document.body.style.overflow = '';
  clearInterval(pdpAutoTimer);
}

function goToPdpSlide(idx) {
  const slides = pdpSlideshow.querySelectorAll('.pdp-slide');
  const dots   = pdpDots.querySelectorAll('.pdp-dot');
  if (!slides.length) return;

  slides[pdpCurrent].classList.remove('active');
  dots[pdpCurrent]?.classList.remove('active');
  pdpCurrent = (idx + slides.length) % slides.length;
  slides[pdpCurrent].classList.add('active');
  dots[pdpCurrent]?.classList.add('active');
}

// Card clicks → open PDP
document.querySelectorAll('.product-card').forEach(card => {
  card.addEventListener('click', () => {
    openPDP(card.dataset.productId);
  });
});

// PDP close
document.getElementById('pdpClose')?.addEventListener('click', closePDP);
pdpOverlay?.addEventListener('click', e => {
  if (e.target === pdpOverlay) closePDP();
});

// PDP arrows
document.getElementById('pdpPrev')?.addEventListener('click', () => {
  goToPdpSlide(pdpCurrent - 1);
  clearInterval(pdpAutoTimer);
  pdpAutoTimer = setInterval(() => goToPdpSlide(pdpCurrent + 1), 3500);
});
document.getElementById('pdpNext')?.addEventListener('click', () => {
  goToPdpSlide(pdpCurrent + 1);
  clearInterval(pdpAutoTimer);
  pdpAutoTimer = setInterval(() => goToPdpSlide(pdpCurrent + 1), 3500);
});

// PDP dot clicks
pdpDots?.addEventListener('click', e => {
  const dot = e.target.closest('.pdp-dot');
  if (dot) {
    goToPdpSlide(parseInt(dot.dataset.idx, 10));
    clearInterval(pdpAutoTimer);
    pdpAutoTimer = setInterval(() => goToPdpSlide(pdpCurrent + 1), 3500);
  }
});

// PDP size selector
document.getElementById('pdpSizes')?.addEventListener('click', e => {
  const btn = e.target.closest('.size-btn');
  if (!btn) return;
  document.querySelectorAll('#pdpSizes .size-btn').forEach(b => b.classList.remove('selected'));
  btn.classList.add('selected');
});

// PDP Add to Cart
document.getElementById('pdpAtcBtn')?.addEventListener('click', function () {
  const product = PRODUCTS[this.dataset.id];
  if (!product?.inStock) {
    showToast('This item is sold out', 'error');
    return;
  }

  const selected = document.querySelector('#pdpSizes .size-btn.selected');
  if (!selected) {
    const block = this.closest('.pdp-details').querySelector('.size-block');
    block.classList.add('shake');
    setTimeout(() => block.classList.remove('shake'), 500);
    return;
  }

  Cart.add({
    id:    this.dataset.id,
    name:  this.dataset.product,
    price: parseInt(this.dataset.price, 10),
    size:  selected.textContent.trim(),
    image: this.dataset.image,
  });

  const orig = this.textContent;
  this.textContent = 'Added to Cart \u2713';
  this.classList.add('added');
  setTimeout(() => { this.textContent = orig; this.classList.remove('added'); }, 1800);
  showToast(`${this.dataset.product} added to cart`, 'success');
});

// PDP Wishlist
document.getElementById('pdpWishBtn')?.addEventListener('click', function () {
  const added = Wishlist.toggle({
    id:    this.dataset.id,
    name:  this.dataset.product,
    price: parseInt(this.dataset.price, 10),
    image: this.dataset.image,
  });
  this.classList.toggle('wishlisted', added);
  this.innerHTML = added ? '&#9829;' : '&#9825;';
  showToast(added ? 'Added to wishlist' : 'Removed from wishlist');
});

/* ── Size chart modal ── */
function openSizeChart() {
  document.getElementById('sizeModal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeSizeChart(e) {
  if (!e || e.target === document.getElementById('sizeModal') || e.currentTarget.classList.contains('size-modal-close')) {
    document.getElementById('sizeModal').classList.remove('open');
    document.body.style.overflow = '';
  }
}

/* ══════════════════════════════════════════
   CART MODULE (localStorage backed)
══════════════════════════════════════════ */
const Cart = (() => {
  const KEY = 'stitch_cart';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    renderBadge();
    renderDrawer();
  }

  function add(item) {
    const items = load();
    const existing = items.find(i => i.id === item.id && i.size === item.size);
    if (existing) { existing.qty += 1; }
    else { items.push({ ...item, qty: 1 }); }
    save(items);
  }

  function remove(id, size) {
    save(load().filter(i => !(i.id === id && i.size === size)));
  }

  function updateQty(id, size, delta) {
    const items = load();
    const item = items.find(i => i.id === id && i.size === size);
    if (!item) return;
    item.qty = Math.max(1, item.qty + delta);
    save(items);
  }

  function totalQty() { return load().reduce((s, i) => s + i.qty, 0); }
  function subtotal()  { return load().reduce((s, i) => s + i.price * i.qty, 0); }
  function clear()     { save([]); }

  function renderBadge() {
    const count  = totalQty();
    document.querySelectorAll('.cart-count').forEach(b => {
      b.textContent = count;
      b.hidden = count === 0;
    });
    const dc = document.getElementById('cartDrawerCount');
    if (dc) dc.textContent = count;
    const cb = document.getElementById('checkoutBtn');
    if (cb) cb.disabled = count === 0;
  }

  function renderDrawer() {
    const container = document.getElementById('cartItems');
    if (!container) return;
    const items = load();

    if (items.length === 0) {
      container.innerHTML = '<div class="drawer-empty">Your cart is empty. Go add something dope.</div>';
    } else {
      container.innerHTML = items.map(i => `
        <div class="drawer-item">
          <img src="${i.image}" alt="${i.name}" class="drawer-item-img" />
          <div class="drawer-item-info">
            <div class="drawer-item-name">${i.name}</div>
            <div class="drawer-item-meta">Size: ${i.size}</div>
            <div class="drawer-item-price">\u20B9${i.price}</div>
          </div>
          <div class="drawer-qty">
            <div class="qty-controls">
              <button class="qty-btn" data-action="dec" data-id="${i.id}" data-size="${i.size}">&minus;</button>
              <span class="qty-val">${i.qty}</span>
              <button class="qty-btn" data-action="inc" data-id="${i.id}" data-size="${i.size}">&plus;</button>
            </div>
            <button class="drawer-item-remove" data-id="${i.id}" data-size="${i.size}">Remove</button>
          </div>
        </div>
      `).join('');
    }

    const sub = document.getElementById('cartSubtotal');
    if (sub) sub.textContent = '\u20B9' + subtotal();
  }

  return { load, add, remove, updateQty, totalQty, subtotal, clear, renderBadge, renderDrawer };
})();

/* ══════════════════════════════════════════
   WISHLIST MODULE (localStorage backed)
══════════════════════════════════════════ */
const Wishlist = (() => {
  const KEY = 'stitch_wishlist';

  function load() {
    try { return JSON.parse(localStorage.getItem(KEY)) || []; }
    catch { return []; }
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    renderBadge();
    renderDrawer();
  }

  function toggle(item) {
    const items = load();
    const idx = items.findIndex(i => i.id === item.id);
    if (idx > -1) { items.splice(idx, 1); }
    else { items.push(item); }
    save(items);
    return idx === -1;
  }

  function has(id) { return load().some(i => i.id === id); }

  function remove(id) {
    save(load().filter(i => i.id !== id));
  }

  function renderBadge() {
    const count = load().length;
    document.querySelectorAll('.wishlist-count').forEach(b => {
      b.textContent = count;
      b.hidden = count === 0;
    });
    const dc = document.getElementById('wishlistDrawerCount');
    if (dc) dc.textContent = count;
  }

  function renderDrawer() {
    const container = document.getElementById('wishlistItems');
    if (!container) return;
    const items = load();

    if (items.length === 0) {
      container.innerHTML = '<div class="drawer-empty">No items hearted yet.</div>';
    } else {
      container.innerHTML = items.map(i => `
        <div class="drawer-item">
          <img src="${i.image}" alt="${i.name}" class="drawer-item-img" />
          <div class="drawer-item-info">
            <div class="drawer-item-name">${i.name}</div>
            <div class="drawer-item-price">\u20B9${i.price}</div>
          </div>
          <div class="drawer-qty">
            <button class="drawer-move-to-cart" data-id="${i.id}" data-name="${i.name}" data-price="${i.price}" data-image="${i.image}">Move to Cart</button>
            <button class="drawer-item-remove" data-wishlist-remove="${i.id}">Remove</button>
          </div>
        </div>
      `).join('');
    }
  }

  return { load, toggle, has, remove, renderBadge, renderDrawer };
})();

/* ══════════════════════════════════════════
   DRAWER OPEN / CLOSE
══════════════════════════════════════════ */
const backdrop = document.getElementById('drawerBackdrop');

function openDrawer(id) {
  closeAllDrawers();
  const drawer = document.getElementById(id);
  if (!drawer) return;
  drawer.classList.add('open');
  drawer.setAttribute('aria-hidden', 'false');
  backdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeAllDrawers() {
  document.querySelectorAll('.drawer.open').forEach(d => {
    d.classList.remove('open');
    d.setAttribute('aria-hidden', 'true');
  });
  backdrop.classList.remove('active');
  document.body.style.overflow = '';
}

document.querySelectorAll('[data-close-drawer]').forEach(btn => {
  btn.addEventListener('click', closeAllDrawers);
});
if (backdrop) backdrop.addEventListener('click', closeAllDrawers);

document.getElementById('cartBtn')?.addEventListener('click', () => {
  Cart.renderDrawer();
  openDrawer('cartDrawer');
});

document.getElementById('wishlistBtn')?.addEventListener('click', () => {
  Wishlist.renderDrawer();
  openDrawer('wishlistDrawer');
});

/* ── Cart drawer event delegation ── */
document.getElementById('cartItems')?.addEventListener('click', e => {
  const qtyBtn = e.target.closest('.qty-btn');
  if (qtyBtn) {
    const { id, size, action } = qtyBtn.dataset;
    Cart.updateQty(id, size, action === 'inc' ? 1 : -1);
    return;
  }
  const removeBtn = e.target.closest('.drawer-item-remove');
  if (removeBtn && removeBtn.dataset.id) {
    Cart.remove(removeBtn.dataset.id, removeBtn.dataset.size);
    showToast('Removed from cart');
  }
});

/* ══════════════════════════════════════════
   CHECKOUT FLOW
   - Order Now (cart) → checkout page
   - Proceed to Pay → simulated payment → confirmation
   - Razorpay hook is stubbed; wire RAZORPAY_KEY_ID + backend later
══════════════════════════════════════════ */
const Checkout = (() => {
  const overlay = document.getElementById('checkoutOverlay');
  const confirmOverlay = document.getElementById('confirmOverlay');
  const form = document.getElementById('checkoutForm');

  function open() {
    const items = Cart.load();
    if (items.length === 0) return;
    closeAllDrawers();
    // Reset any previously applied coupon so we never carry a stale discount.
    appliedCoupon = null;
    const couponInput = document.getElementById('couponInput');
    const couponFeedback = document.getElementById('couponFeedback');
    if (couponInput) couponInput.value = '';
    if (couponFeedback) { couponFeedback.textContent = ''; couponFeedback.className = 'coupon-feedback'; }
    renderSummary(items);
    overlay.classList.add('open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    overlay.classList.remove('open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  // Coupon state — re-validated against the server, never trusted on the client.
  let appliedCoupon = null;       // { code, discount, total, label }

  function cartPayload() {
    return Cart.load().map(i => ({ id: i.id, size: i.size, qty: i.qty }));
  }

  function renderSummary(items) {
    const subtotal = Cart.subtotal();
    document.getElementById('summaryItems').innerHTML = items.map(i => `
      <div class="summary-item">
        <img src="${i.image}" alt="${i.name}" />
        <div class="summary-item-info">
          <div class="summary-item-name">${i.name}</div>
          <div class="summary-item-meta">Size ${i.size} &middot; Qty ${i.qty}</div>
        </div>
        <div class="summary-item-price">₹${i.price * i.qty}</div>
      </div>
    `).join('');
    document.getElementById('summarySubtotal').textContent = '₹' + subtotal;

    const discountRow   = document.getElementById('summaryDiscountRow');
    const discountLabel = document.getElementById('summaryDiscountLabel');
    const discountEl    = document.getElementById('summaryDiscount');
    const total = appliedCoupon ? appliedCoupon.total : subtotal;

    if (appliedCoupon) {
      discountRow.hidden = false;
      discountLabel.textContent = appliedCoupon.label || `Coupon ${appliedCoupon.code}`;
      discountEl.textContent    = '-₹' + appliedCoupon.discount;
    } else {
      discountRow.hidden = true;
    }

    document.getElementById('summaryTotal').textContent = '₹' + total;
    const payAmt = document.getElementById('payBtnAmount');
    if (payAmt) payAmt.textContent = '· ₹' + total;
  }

  async function applyCoupon() {
    const input    = document.getElementById('couponInput');
    const btn      = document.getElementById('couponApplyBtn');
    const feedback = document.getElementById('couponFeedback');
    const code     = input.value.trim().toUpperCase();
    feedback.className = 'coupon-feedback';
    feedback.textContent = '';

    if (!code) {
      // empty input clears any applied coupon
      appliedCoupon = null;
      renderSummary(Cart.load());
      return;
    }

    btn.disabled = true;
    btn.textContent = '...';
    try {
      const res = await fetch('/api/coupon/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: cartPayload(), coupon: code }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        appliedCoupon = null;
        feedback.classList.add('error');
        feedback.textContent = data.error || 'Invalid coupon';
      } else {
        appliedCoupon = {
          code,
          discount: data.discount,
          total:    data.total,
          label:    data.coupon_label,
        };
        feedback.classList.add('ok');
        feedback.textContent = `${data.coupon_label} applied — you saved ₹${data.discount}`;
      }
    } catch (err) {
      appliedCoupon = null;
      feedback.classList.add('error');
      feedback.textContent = 'Could not apply coupon — try again';
    } finally {
      btn.disabled = false;
      btn.textContent = 'Apply';
      renderSummary(Cart.load());
    }
  }

  function collectFormData() {
    const fd = new FormData(form);
    return {
      fullName: fd.get('fullName').trim(),
      phone:    fd.get('phone').trim(),
      email:    fd.get('email').trim(),
      street:   fd.get('street').trim(),
      city:     fd.get('city').trim(),
      state:    fd.get('state').trim(),
      pincode:  fd.get('pincode').trim(),
    };
  }

  function resetPayBtn(btn) {
    btn.disabled = false;
    btn.textContent = 'Proceed to Pay ';
    const total = appliedCoupon ? appliedCoupon.total : Cart.subtotal();
    const amt = document.createElement('span');
    amt.id = 'payBtnAmount';
    amt.textContent = '· ₹' + total;
    btn.appendChild(amt);
  }

  async function payWithRazorpay({ customer, items, totalRupees, btn }) {
    if (typeof Razorpay === 'undefined') {
      throw new Error('Razorpay SDK failed to load. Check your connection.');
    }

    // Send only product references + (optional) coupon code — server alone
    // decides prices and discounts.
    const payload = items.map(i => ({ id: i.id, size: i.size, qty: i.qty }));

    const orderRes = await fetch('/api/razorpay/order', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        items:  payload,
        coupon: appliedCoupon ? appliedCoupon.code : null,
      }),
    });
    const orderData = await orderRes.json();
    if (!orderRes.ok || !orderData.success) {
      throw new Error(orderData.error || 'Could not create order');
    }

    // Trust the server's amount, not our local total.
    const amountPaise = orderData.amount;

    return new Promise((resolve, reject) => {
      const rzp = new Razorpay({
        key:      orderData.key_id,
        order_id: orderData.order_id,
        amount:   orderData.amount,
        currency: orderData.currency,
        name:     'STITCH',
        description: 'Wear the Culture',
        prefill: {
          name:    customer.fullName,
          email:   customer.email,
          contact: customer.phone,
        },
        notes: {
          address: `${customer.street}, ${customer.city}, ${customer.state} - ${customer.pincode}`,
        },
        theme: { color: '#c8f53f' },
        modal: {
          ondismiss: () => {
            resetPayBtn(btn);
            showToast('Payment cancelled', 'error');
            reject(new Error('dismissed'));
          },
        },
        handler: async (response) => {
          try {
            const verifyRes = await fetch('/api/razorpay/verify', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                razorpay_order_id:   response.razorpay_order_id,
                razorpay_payment_id: response.razorpay_payment_id,
                razorpay_signature:  response.razorpay_signature,
                customer,
                items,
                amount: amountPaise,
              }),
            });
            const verifyData = await verifyRes.json();
            if (!verifyRes.ok || !verifyData.success) {
              throw new Error(verifyData.error || 'Verification failed');
            }
            resolve({
              orderId: verifyData.order_id,
              paidAmount: amountPaise / 100,
              subtotal: orderData.subtotal,
              discount: orderData.discount,
              couponLabel: orderData.coupon_label,
            });
          } catch (err) {
            reject(err);
          }
        },
      });

      rzp.on('payment.failed', (resp) => {
        const reason = resp?.error?.description || 'Payment failed';
        showToast(reason, 'error');
        resetPayBtn(btn);
        reject(new Error(reason));
      });

      rzp.open();
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.reportValidity()) return;

    const customer = collectFormData();
    const items = Cart.load();
    const total = Cart.subtotal();
    const btn = document.getElementById('proceedPayBtn');
    btn.disabled = true;
    btn.textContent = 'Processing...';

    try {
      const result = await payWithRazorpay({ customer, items, totalRupees: total, btn });
      showConfirmation({
        ...customer,
        orderId:  result.orderId,
        total:    result.paidAmount,
        subtotal: result.subtotal,
        discount: result.discount,
        couponLabel: result.couponLabel,
        items,
      });
      Cart.clear();
      close();
      form.reset();
      resetPayBtn(btn);
    } catch (err) {
      // 'dismissed' and payment.failed already toast + reset; only handle other errors here.
      if (err.message !== 'dismissed') {
        showToast(err.message || 'Payment failed — please retry', 'error');
        resetPayBtn(btn);
      }
    }
  }

  function showConfirmation(order) {
    document.getElementById('confirmOrderId').textContent = order.orderId;
    document.getElementById('confirmName').textContent    = order.fullName;
    document.getElementById('confirmEmail').textContent   = order.email;
    document.getElementById('confirmPhone').textContent   = order.phone;
    document.getElementById('confirmAddress').textContent =
      `${order.street}, ${order.city}, ${order.state} - ${order.pincode}`;
    document.getElementById('confirmAmount').textContent  = '₹' + order.total;
    document.getElementById('confirmItems').innerHTML = order.items.map(i => `
      <div class="confirm-item">
        <img src="${i.image}" alt="${i.name}" />
        <div>
          <div class="confirm-item-name">${i.name}</div>
          <div class="confirm-item-meta">Size ${i.size} &middot; Qty ${i.qty}</div>
        </div>
        <div class="confirm-item-price">₹${i.price * i.qty}</div>
      </div>
    `).join('');

    confirmOverlay.classList.add('open');
    confirmOverlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeConfirmation() {
    confirmOverlay.classList.remove('open');
    confirmOverlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  document.getElementById('checkoutBtn')?.addEventListener('click', open);
  document.getElementById('checkoutBack')?.addEventListener('click', () => {
    close();
    Cart.renderDrawer();
    openDrawer('cartDrawer');
  });
  form?.addEventListener('submit', handleSubmit);
  document.getElementById('couponApplyBtn')?.addEventListener('click', applyCoupon);
  document.getElementById('couponInput')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); applyCoupon(); }
  });
  document.getElementById('confirmContinueBtn')?.addEventListener('click', closeConfirmation);

  return { open, close };
})();

/* ── Wishlist drawer event delegation ── */
document.getElementById('wishlistItems')?.addEventListener('click', e => {
  const moveBtn = e.target.closest('.drawer-move-to-cart');
  if (moveBtn) {
    Cart.add({
      id:    moveBtn.dataset.id,
      name:  moveBtn.dataset.name,
      price: parseInt(moveBtn.dataset.price, 10),
      size:  'M',
      image: moveBtn.dataset.image,
    });
    Wishlist.remove(moveBtn.dataset.id);
    showToast(`${moveBtn.dataset.name} moved to cart (size M)`, 'success');
    return;
  }
  const removeBtn = e.target.closest('[data-wishlist-remove]');
  if (removeBtn) {
    Wishlist.remove(removeBtn.dataset.wishlistRemove);
    showToast('Removed from wishlist');
  }
});

/* ══════════════════════════════════════════
   SEARCH OVERLAY
══════════════════════════════════════════ */
const SEARCH_INDEX = Object.values(PRODUCTS).map(p => ({
  id: p.id, name: p.name, tag: p.tag + ' \u00B7 ' + p.subtitle,
  price: p.price, image: p.images[0], keywords: p.keywords,
}));

const searchOverlay = document.getElementById('searchOverlay');
const searchInput   = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');

function openSearch() {
  searchOverlay.classList.add('open');
  searchOverlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  setTimeout(() => searchInput.focus(), 200);
}

function closeSearch() {
  searchOverlay.classList.remove('open');
  searchOverlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  searchInput.value = '';
  searchResults.innerHTML = '';
}

document.getElementById('searchBtn')?.addEventListener('click', openSearch);
document.getElementById('searchClose')?.addEventListener('click', closeSearch);

if (searchInput) {
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (q.length === 0) { searchResults.innerHTML = ''; return; }

    const matches = SEARCH_INDEX.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.keywords.toLowerCase().includes(q) ||
      p.tag.toLowerCase().includes(q)
    );

    if (matches.length === 0) {
      searchResults.innerHTML = '<div class="search-empty">No results found.</div>';
    } else {
      searchResults.innerHTML = matches.map(p => `
        <div class="search-result" data-product-id="${p.id}">
          <img src="${p.image}" alt="${p.name}" />
          <div class="search-result-info">
            <div class="name">${p.name}</div>
            <div class="tag">${p.tag} — \u20B9${p.price}</div>
          </div>
          <span class="arrow">\u2192</span>
        </div>
      `).join('');
    }
  });

  searchResults.addEventListener('click', e => {
    const result = e.target.closest('.search-result');
    if (result) {
      closeSearch();
      openPDP(result.dataset.productId);
    }
  });
}

/* ══════════════════════════════════════════
   MOBILE BOTTOM NAV ACTIONS
══════════════════════════════════════════ */
document.querySelectorAll('.mobile-nav-item').forEach(item => {
  item.addEventListener('click', function (e) {
    const action = this.dataset.action;
    if (action === 'search') { e.preventDefault(); openSearch(); }
    else if (action === 'wishlist') { e.preventDefault(); Wishlist.renderDrawer(); openDrawer('wishlistDrawer'); }
    else if (action === 'cart') { e.preventDefault(); Cart.renderDrawer(); openDrawer('cartDrawer'); }
    document.querySelectorAll('.mobile-nav-item').forEach(i => i.classList.remove('active'));
    this.classList.add('active');
  });
});

/* ══════════════════════════════════════════
   KEYBOARD SHORTCUTS
══════════════════════════════════════════ */
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeSizeChart();
    closeSearch();
    closeAllDrawers();
    closePDP();
  }
});

/* ══════════════════════════════════════════
   INIT
══════════════════════════════════════════ */
Cart.renderBadge();
Wishlist.renderBadge();
