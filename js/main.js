// Navbar scroll effect
const navbar = document.getElementById('navbar');
if (navbar) {
  window.addEventListener('scroll', () => {
    navbar.classList.toggle('scrolled', window.scrollY > 20);
  });
}

// Hamburger menu
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
if (hamburger && navLinks) {
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
}

// Wiki data – add entries here as the wiki grows
const wikiData = [
  // Example: { title: 'Dragon', category: 'Creatures', url: 'wiki/creatures/dragon.html', description: 'A fearsome dragon.' }
];

// Search
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
if (searchInput && searchResults) {
  searchInput.addEventListener('input', () => {
    const q = searchInput.value.trim().toLowerCase();
    if (q.length < 2) { searchResults.classList.remove('active'); return; }
    const results = wikiData.filter(e =>
      e.title.toLowerCase().includes(q) || e.description.toLowerCase().includes(q)
    );
    if (results.length === 0) {
      searchResults.innerHTML = '<div class="search-result-item"><span class="result-title">No results found.</span></div>';
    } else {
      searchResults.innerHTML = results.map(r =>
        `<a href="/${r.url}" class="search-result-item">
          <div class="result-tag">${r.category}</div>
          <div class="result-title">${r.title}</div>
        </a>`
      ).join('');
    }
    searchResults.classList.add('active');
  });
  document.addEventListener('click', (e) => {
    if (!searchInput.contains(e.target)) searchResults.classList.remove('active');
  });
}

// Animated counters for stats
function animateCounter(el, target, duration = 1500) {
  let start = 0;
  const step = target / (duration / 16);
  const timer = setInterval(() => {
    start += step;
    if (start >= target) { el.textContent = target; clearInterval(timer); return; }
    el.textContent = Math.floor(start);
  }, 16);
}

// Stats – update these numbers as articles are added
const stats = { statCreatures: 0, statBiomes: 0, statItems: 0, statGuides: 0 };
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      Object.entries(stats).forEach(([id, val]) => {
        const el = document.getElementById(id);
        if (el) animateCounter(el, val);
      });
      observer.disconnect();
    }
  });
}, { threshold: 0.5 });
const statsBar = document.querySelector('.stats-bar');
if (statsBar) observer.observe(statsBar);
