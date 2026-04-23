/* ----------------------------------------------------------
   CAKE GALLERY — fetches data from /api/cakes
---------------------------------------------------------- */
const API = 'https://goshen-bakery.onrender.com';
const grid = document.getElementById('cakeGrid');
let allCakes = []; // cached from API

/* ── Skeleton loader ─────────────────────────────────── */
function showSkeletons(n = 8) {
  grid.innerHTML = '';
  for (let i = 0; i < n; i++) {
    const sk = document.createElement('div');
    sk.className = 'cake-card skeleton-card';
    sk.setAttribute('aria-hidden', 'true');
    sk.innerHTML = `
      <div class="skeleton skeleton-img"></div>
      <div class="cake-info">
        <div class="skeleton skeleton-title"></div>
        <div class="skeleton skeleton-text"></div>
        <div class="skeleton skeleton-btn"></div>
      </div>
    `;
    grid.appendChild(sk);
  }
}

/* ── Fetch all cakes from API ────────────────────────── */
async function fetchCakes() {
  showSkeletons();
  try {
    const res  = await fetch(API + '/api/cakes');
    if (!res.ok) throw new Error('Server responded ' + res.status);
    allCakes = await res.json();
    renderCakes('all');
  } catch (err) {
    grid.innerHTML = `
      <div class="gallery-error" role="alert">
        <p>😔 Couldn't load cakes right now.</p>
        <button onclick="fetchCakes()" class="filter-btn active" style="margin-top:12px">Try again</button>
      </div>
    `;
    console.error('[Cakes] Fetch error:', err.message);
  }
}

/* ── Render cake cards ───────────────────────────────── */
function renderCakes(filter) {
  const filtered = filter === 'all'
    ? allCakes
    : allCakes.filter(c => c.category === filter);

  grid.innerHTML = '';

  if (filtered.length === 0) {
    grid.innerHTML = '<p class="gallery-empty">No cakes in this category yet — check back soon!</p>';
    return;
  }

  filtered.forEach((cake, i) => {
    const card = document.createElement('article');
    card.className = 'cake-card reveal';
    card.style.transitionDelay = (i * 0.07) + 's';
    card.setAttribute('role', 'listitem');

    // Pricing mapping
    const pricing = {
      '1/4 kg': 500,
      '1/2 kg': 1000,
      '1 kg': 2000,
      '1.5 kg': 3000,
      '2 kg': 4000,
      '2.5 kg': 5000,
      '3 kg': 6000,
      '4 kg': 8000
    };

    card.innerHTML =
      '<div class="cake-img-wrap">' +
        '<img src="' + cake.image_url + '" alt="' + (cake.alt_text || cake.name || '') + '" loading="lazy" width="600" height="450" />' +
        '<div class="qty-selector-overlay" style="display:none">' +
          '<div class="qty-header">' +
            '<p class="qty-title">Select Quantity</p>' +
            '<button class="qty-close-btn">&times;</button>' +
          '</div>' +
          '<div class="qty-options-scroll">' +
            Object.keys(pricing).map(qty => 
              '<button class="qty-opt" data-qty="' + qty + '" data-price="' + pricing[qty] + '">' +
                '<span>' + qty + '</span>' +
                '<strong>KES ' + pricing[qty].toLocaleString() + '</strong>' +
              '</button>'
            ).join('') +
          '</div>' +
        '</div>' +
      '</div>' +
      (cake.name ? 
        '<div class="cake-info">' +
          '<h3 class="cake-name">' + cake.name + '</h3>' +
          '<p class="cake-desc">' + (cake.description || '') + '</p>' +
          '<button class="show-qty-btn">Order Now</button>' +
        '</div>' : 
        '<div class="cake-card-btn-wrap" style="padding:10px;text-align:center"><button class="show-qty-btn">Order Now</button></div>'
      );

    const showBtn = card.querySelector('.show-qty-btn');
    const qtyOverlay = card.querySelector('.qty-selector-overlay');
    const closeBtn = card.querySelector('.qty-close-btn');

    // Show quantity selector
    showBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      qtyOverlay.style.display = 'flex';
    });

    // Close quantity selector
    closeBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      qtyOverlay.style.display = 'none';
    });

    // Quantity selection -> WhatsApp
    card.querySelectorAll('.qty-opt').forEach(opt => {
      opt.addEventListener('click', (e) => {
        e.stopPropagation();
        const qty = opt.dataset.qty;
        const price = opt.dataset.price;
        const message = encodeURIComponent(
          'Hello, I would like to order ' + cake.name + '\n' +
          'Quantity: ' + qty + '\n' +
          'Price: KES ' + Number(price).toLocaleString()
        );
        window.open('https://wa.me/2547XXXXXXXX?text=' + message, '_blank');
        qtyOverlay.style.display = 'none';
      });
    });

    grid.appendChild(card);
  });
  observeReveal();
}

/* ── Filter tabs ─────────────────────────────────────── */
document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b => {
      b.classList.remove('active');
      b.setAttribute('aria-pressed', 'false');
    });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed', 'true');
    renderCakes(btn.dataset.filter);
  });
});

/* ── Download handler ────────────────────────────────── */
grid.addEventListener('click', async e => {
  const btn = e.target.closest('.download-btn');
  if (!btn) return;
  const url  = btn.dataset.url;
  const name = btn.dataset.name;
  btn.textContent = '⏳ Saving…';
  btn.disabled = true;
  try {
    const res  = await fetch(url.startsWith('http') ? url : API + url);
    const blob = await res.blob();
    const a    = document.createElement('a');
    a.href     = URL.createObjectURL(blob);
    a.download = name + '.jpg';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(a.href);
    btn.textContent = '✓ Saved!';
    setTimeout(() => {
      btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download';
      btn.disabled = false;
    }, 2000);
  } catch {
    btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg> Download';
    btn.disabled = false;
  }
});

/* ----------------------------------------------------------
   CONTACT FORM — real POST to /api/contact
---------------------------------------------------------- */
document.getElementById('orderForm').addEventListener('submit', async e => {
  e.preventDefault();
  const form  = e.target;
  const btn   = form.querySelector('.form-submit');
  const msgEl = document.getElementById('formMessage');

  const body = {
    fname:    form.fname.value.trim(),
    lname:    form.lname.value.trim(),
    email:    form.email.value.trim(),
    phone:    form.phone.value.trim(),
    occasion: form.occasion.value.trim()
  };

  btn.textContent = '⏳ Sending…';
  btn.disabled    = true;
  msgEl.className = 'form-message';
  msgEl.textContent = '';

  try {
    const res  = await fetch(API + '/api/contact', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Something went wrong.');

    msgEl.className = 'form-message success';
    const waBtn = data.whatsappLink
      ? '<a href="' + data.whatsappLink + '" target="_blank" rel="noopener" class="whatsapp-cta">' +
          '<svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>' +
          ' Chat on WhatsApp</a>'
      : '';
    msgEl.innerHTML = '<span>✓ Request sent! We\'ll call you within the hour.</span>' + waBtn;
    form.reset();
    btn.textContent = 'Send My Order Request ✦';
    btn.disabled    = false;
  } catch (err) {
    msgEl.className   = 'form-message error';
    msgEl.textContent = '✗ ' + err.message;
    btn.textContent   = 'Send My Order Request ✦';
    btn.disabled      = false;
  }
});

/* ----------------------------------------------------------
   SCROLL-REVEAL (IntersectionObserver)
---------------------------------------------------------- */
function observeReveal() {
  const io = new IntersectionObserver(entries => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add('visible');
        io.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll('.reveal:not(.visible)').forEach(el => io.observe(el));
}

/* ----------------------------------------------------------
   NAVBAR SCROLL STATE
---------------------------------------------------------- */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 40);
}, { passive: true });

/* ----------------------------------------------------------
   HAMBURGER / MOBILE MENU
---------------------------------------------------------- */
const hamburger  = document.getElementById('hamburger');
const mobileMenu = document.getElementById('mobileMenu');

function toggleMenu(open) {
  hamburger.classList.toggle('open', open);
  mobileMenu.classList.toggle('open', open);
  hamburger.setAttribute('aria-expanded', open);
  document.body.style.overflow = open ? 'hidden' : '';
}

hamburger.addEventListener('click', () => {
  toggleMenu(!mobileMenu.classList.contains('open'));
});

document.querySelectorAll('.mobile-link').forEach(a => {
  a.addEventListener('click', () => toggleMenu(false));
});

/* ----------------------------------------------------------
   HERO PARALLAX (rAF-throttled)
---------------------------------------------------------- */
const heroBg = document.getElementById('heroBg');
let ticking = false;
window.addEventListener('scroll', () => {
  if (!ticking) {
    requestAnimationFrame(() => {
      heroBg.style.transform = 'translateY(' + (window.scrollY * 0.3) + 'px)';
      ticking = false;
    });
    ticking = true;
  }
}, { passive: true });

/* ----------------------------------------------------------
   INIT
---------------------------------------------------------- */
fetchCakes();
observeReveal();

window.addEventListener('load', () => {
  document.getElementById('hero').classList.add('loaded');
});
