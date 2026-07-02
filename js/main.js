// Navbar scroll
const navbar = document.getElementById('navbar');
if (navbar) window.addEventListener('scroll', () => navbar.classList.toggle('scrolled', window.scrollY > 20));

// Hamburger
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger && navLinks) hamburger.addEventListener('click', () => navLinks.classList.toggle('open'));

// Wiki search data – add entries as articles are created
const wikiData = [
  // { title: 'Dragon', category: 'Creatures', url: 'wiki/creatures/dragon.html', description: 'A fearsome dragon.' }
];

// Search
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
if (searchInput && searchResults) {
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (q.length < 2) { searchResults.classList.remove('active'); return; }
    const results = wikiData.filter(e => e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q));
    searchResults.innerHTML = results.length === 0
      ? '<div class="search-result-item"><span class="result-title">No results found.</span></div>'
      : results.map(r => `<a href="/${r.url}" class="search-result-item"><div class="result-tag">${r.category}</div><div class="result-title">${r.title}</div></a>`).join('');
    searchResults.classList.add('active');
  });
  document.addEventListener('click', e => { if (!searchInput.contains(e.target)) searchResults.classList.remove('active'); });
}

// Animated counters
function animateCounter(el, target, duration = 1500) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { el.textContent = target; clearInterval(timer); return; }
    el.textContent = Math.floor(start);
  }, 16);
}
const stats = { statCreatures: 0, statBiomes: 0, statItems: 0, statGuides: 0 };
const statsBar = document.querySelector('.stats-bar');
if (statsBar) {
  new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        Object.entries(stats).forEach(([id, val]) => { const el = document.getElementById(id); if (el) animateCounter(el, val); });
      }
    });
  }, { threshold: 0.5 }).observe(statsBar);
}

// Dynamic hero background – add more image URLs to the array for slideshow
const heroBg = document.getElementById('heroBg');
const bgImages = [
  '/public/images/bg.jpg'
  // Add more: '/public/images/bg2.jpg', '/public/images/bg3.jpg'
];
if (heroBg && bgImages.length > 1) {
  let current = 0;
  setInterval(() => {
    current = (current + 1) % bgImages.length;
    heroBg.style.opacity = '0';
    setTimeout(() => {
      heroBg.style.backgroundImage = `url('${bgImages[current]}')`;
      heroBg.style.opacity = '1';
    }, 750);
  }, 7000);
}

// Contribute form
const contributeForm = document.getElementById('contributeForm');
if (contributeForm) {
  contributeForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = contributeForm.querySelector('.form-submit');
    btn.textContent = 'Sending...';
    btn.disabled = true;
    try {
      const res = await fetch(contributeForm.action, {
        method: 'POST',
        body: new FormData(contributeForm),
        headers: { 'Accept': 'application/json' }
      });
      if (res.ok) {
        contributeForm.style.display = 'none';
        document.getElementById('formSuccess').style.display = 'block';
      } else {
        btn.textContent = 'Error – try again';
        btn.disabled = false;
      }
    } catch { btn.textContent = 'Error – try again'; btn.disabled = false; }
  });
}
