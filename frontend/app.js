const BASE_URL = 'http://127.0.0.1:8000';
let currentSearchCache = [];
let activeItem = null;

// --- HELPERS για type label & badge ---
const TYPE_META = {
    movie:  { label: 'Ταινία',   icon: '🎬', color: '#e6a817' },
    music:  { label: 'Μουσική',  icon: '🎵', color: '#1db954' },
    book:   { label: 'Βιβλίο',   icon: '📖', color: '#4a90d9' },
};

function getTypeMeta(item) {
    // Τα items από search/recommender έχουν "type", τα profile items έχουν "media_type"
    const raw = (item.type || item.media_type || '').toLowerCase();
    if (raw.includes('movie')) return TYPE_META.movie;
    if (raw.includes('music') || raw.includes('album') || raw.includes('track')) return TYPE_META.music;
    if (raw.includes('book')) return TYPE_META.book;
    // Fallback βάσει source
    if (item.source === 'tmdb') return TYPE_META.movie;
    if (item.source === 'spotify') return TYPE_META.music;
    if (item.source === 'google_books') return TYPE_META.book;
    return { label: '', icon: '❓', color: '#888' };
}

// --- 1. ROUTER ---
function navigateTo(viewId) {
    document.querySelectorAll('.view').forEach(el => el.classList.add('hidden'));

    const token = localStorage.getItem('token');
    if (!token && viewId !== 'register') {
        viewId = 'login';
        document.getElementById('navbar').classList.add('hidden');
    } else if (token) {
        document.getElementById('navbar').classList.remove('hidden');
    }

    document.getElementById(`view-${viewId}`).classList.remove('hidden');

    if (viewId === 'profile') loadProfile();
    if (viewId === 'recommendations') loadRecommendations();
}

window.onload = () => navigateTo(localStorage.getItem('token') ? 'home' : 'login');

// --- 2. AUTHENTICATION ---
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const errorDiv = document.getElementById('loginError');
    errorDiv.className = 'hidden';

    const formData = new FormData();
    formData.append('username', document.getElementById('loginUsername').value);
    formData.append('password', document.getElementById('loginPassword').value);

    try {
        const res = await fetch(`${BASE_URL}/auth/login`, { method: 'POST', body: formData });
        if (res.ok) {
            const data = await res.json();
            localStorage.setItem('token', data.access_token);
            document.getElementById('loginForm').reset();
            navigateTo('home');
        } else {
            const err = await res.json();
            errorDiv.textContent = err.detail || "Λάθος όνομα χρήστη ή κωδικός πρόσβασης.";
            errorDiv.className = 'error';
        }
    } catch (err) {
        errorDiv.textContent = "Πρόβλημα σύνδεσης με τον διακομιστή.";
        errorDiv.className = 'error';
    }
});

document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const msgDiv = document.getElementById('registerMessage');
    msgDiv.className = 'hidden';

    const data = {
        username: document.getElementById('regUsername').value,
        email: document.getElementById('regEmail').value,
        password: document.getElementById('regPassword').value
    };

    try {
        const res = await fetch(`${BASE_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });

        if (res.ok) {
            msgDiv.textContent = "Η εγγραφή πέτυχε! Μεταφορά στη σελίδα σύνδεσης...";
            msgDiv.className = 'success';
            document.getElementById('registerForm').reset();
            setTimeout(() => { navigateTo('login'); msgDiv.className = 'hidden'; }, 2000);
        } else {
            const err = await res.json();
            let errorMsg = err.detail || "Αποτυχία εγγραφής.";
            if (typeof errorMsg === 'object') errorMsg = "Παρακαλώ ελέγξτε τα στοιχεία σας.";
            msgDiv.textContent = errorMsg;
            msgDiv.className = 'error';
        }
    } catch (err) {
        msgDiv.textContent = "Πρόβλημα σύνδεσης με τον διακομιστή.";
        msgDiv.className = 'error';
    }
});

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    navigateTo('login');
});

// --- 3. ΑΝΑΖΗΤΗΣΗ ---
document.getElementById('searchForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = document.getElementById('searchInput').value;
    const type = document.getElementById('searchType').value;

    navigateTo('search');
    const grid = document.getElementById('searchResultsGrid');
    grid.innerHTML = '<p>Αναζήτηση...</p>';

    const res = await fetch(`${BASE_URL}/search/${type}?query=${q}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });

    if (res.ok) {
        currentSearchCache = await res.json();
        renderGrid(currentSearchCache, grid, 'search');
    }
});

// --- 4. DETAILS & RATING ---
function openDetails(id) {
    activeItem = currentSearchCache.find(i => i.external_id === id);
    if (!activeItem) return;

    navigateTo('details');
    document.getElementById('detailTitle').innerText = activeItem.title;
    document.getElementById('detailMeta').innerText = `${activeItem.year || ''} • ${activeItem.type}`;
    document.getElementById('detailDesc').innerText = activeItem.description || 'Χωρίς περιγραφή.';
    document.getElementById('detailPoster').innerHTML = `<img src="${activeItem.thumbnail || ''}" alt="poster">`;
    document.getElementById('ratingSlider').value = 5.0;
    document.getElementById('ratingDisplay').innerText = "5.0";
    document.getElementById('reviewInput').value = "";
}

document.getElementById('ratingSlider').addEventListener('input', (e) => {
    document.getElementById('ratingDisplay').innerText = parseFloat(e.target.value).toFixed(1);
});

document.getElementById('saveInteractionBtn').addEventListener('click', async () => {
    const payload = {
        external_id: activeItem.external_id,
        title: activeItem.title,
        year: activeItem.year || "N/A",
        media_type: activeItem.type,
        source: activeItem.source || "tmdb",
        poster_url: activeItem.thumbnail || "",
        description: activeItem.description || "Χωρίς περιγραφή",
        rating: parseFloat(document.getElementById('ratingSlider').value),
        review: document.getElementById('reviewInput').value || null,
        status: "completed",
        genres: activeItem.genres || [],   // ← ΝΕΟ — στέλνουμε τα genres στο backend
    };

    try {
        const res = await fetch(`${BASE_URL}/interactions/log`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        if (res.ok) {
            alert("Αποθηκεύτηκε!");
            navigateTo('profile');
        } else {
            const err = await res.json();
            alert("Σφάλμα αποθήκευσης:\n" + JSON.stringify(err.detail || err));
        }
    } catch (e) {
        console.error("Σφάλμα:", e);
        alert("Δεν μπορέσαμε να συνδεθούμε με τον διακομιστή.");
    }
});

// --- 5. ΠΡΟΦΙΛ ---
async function loadProfile() {
    const token = localStorage.getItem('token');

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        document.getElementById('profileUsername').innerText = payload.sub || 'Το Προφίλ μου';
    } catch (e) {
        document.getElementById('profileUsername').innerText = 'Το Προφίλ μου';
    }

    const res = await fetch(`${BASE_URL}/users/me/interactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        const data = await res.json();

        const movies = data.filter(i =>
            (i.media_type && i.media_type.toLowerCase().includes('movie')) ||
            (!i.media_type && i.source === 'tmdb')
        );
        const music = data.filter(i =>
            (i.media_type && (i.media_type.toLowerCase().includes('music') || i.media_type.toLowerCase().includes('album'))) ||
            (!i.media_type && i.source === 'spotify')
        );
        const books = data.filter(i =>
            (i.media_type && i.media_type.toLowerCase().includes('book')) ||
            (!i.media_type && i.source === 'google_books')
        );

        document.getElementById('statMovies').innerText = movies.length;
        document.getElementById('statMusic').innerText = music.length;
        document.getElementById('statBooks').innerText = books.length;

        renderProfileSection(movies, 'profileMoviesGrid', 'profileMoviesBtn');
        renderProfileSection(music,  'profileMusicGrid',  'profileMusicBtn');
        renderProfileSection(books,  'profileBooksGrid',  'profileBooksBtn');
    }
}

// Εμφανίζει τις τελευταίες 5 και προαιρετικά κουμπί "Δες όλες"
function renderProfileSection(items, gridId, btnId) {
    const grid = document.getElementById(gridId);
    const btn  = document.getElementById(btnId);

    // Οι τελευταίες εγγραφές πρώτα (reverse)
    const sorted = [...items].reverse();
    const preview = sorted.slice(0, 5);
    const hasMore = sorted.length > 5;

    renderGrid(preview, grid, 'profile');

    if (hasMore) {
        btn.classList.remove('hidden');
        btn.textContent = `Δες όλες (${sorted.length})`;
        // Αφαίρεσε παλιό listener πριν βάλεις νέο
        const newBtn = btn.cloneNode(true);
        btn.parentNode.replaceChild(newBtn, btn);
        let expanded = false;
        newBtn.addEventListener('click', () => {
            expanded = !expanded;
            renderGrid(expanded ? sorted : preview, grid, 'profile');
            newBtn.textContent = expanded ? 'Λιγότερα ▲' : `Δες όλες (${sorted.length})`;
        });
    } else {
        btn.classList.add('hidden');
    }
}

function openLoggedItem(item) {
    navigateTo('logged-item');
    document.getElementById('loggedTitle').innerText = item.title;
    document.getElementById('loggedMeta').innerText = `${item.media_type || ''}`;
    const imgUrl = item.thumbnail || item.poster || '';
    document.getElementById('loggedPoster').innerHTML = `<img src="${imgUrl}" alt="poster">`;
    document.getElementById('loggedRating').innerText = item.rating ? item.rating.toFixed(1) : '-';
    document.getElementById('loggedReview').innerText = item.review ? `"${item.review}"` : 'Δεν άφησες κάποια κριτική για αυτό το έργο.';
}

// --- 6. ΠΡΟΤΑΣΕΙΣ ---
async function loadRecommendations() {
    const grid = document.getElementById('recommendationsGrid');
    grid.innerHTML = '<p class="loading-msg">Αναζητούμε περιεχόμενο που ταιριάζει σε σένα... ⏳</p>';

    try {
        const res = await fetch(`${BASE_URL}/recommendations/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!res.ok) {
            grid.innerHTML = '<p class="error">Σφάλμα κατά τη φόρτωση προτάσεων.</p>';
            return;
        }

        const data = await res.json();
        const items = data.recommendations || [];

        grid.innerHTML = '';

        // Αν υπάρχει μήνυμα (cold start ή based_on), εμφάνισέ το
        if (data.message) {
            const msgEl = document.createElement('p');
            msgEl.className = 'rec-message';
            msgEl.textContent = data.message;
            grid.appendChild(msgEl);
        } else if (data.based_on && data.based_on.length > 0) {
            const msgEl = document.createElement('p');
            msgEl.className = 'rec-message';
            msgEl.textContent = `Βασισμένο στα αγαπημένα σου: ${data.based_on.join(', ')}`;
            grid.appendChild(msgEl);
        }

        if (items.length === 0) {
            const empty = document.createElement('p');
            empty.style.cssText = 'color:#666; font-style:italic; margin-top:10px;';
            empty.textContent = 'Δεν βρέθηκαν προτάσεις αυτή τη στιγμή.';
            grid.appendChild(empty);
            return;
        }

        // Ομαδοποίηση ανά τύπο για καλύτερη οπτική οργάνωση
        const grouped = { movie: [], music: [], book: [] };
        items.forEach(item => {
            const meta = getTypeMeta(item);
            const key = meta === TYPE_META.movie ? 'movie'
                      : meta === TYPE_META.music ? 'music' : 'book';
            grouped[key].push(item);
        });

        const sectionTitles = { movie: '🎬 Ταινίες', music: '🎵 Μουσική', book: '📖 Βιβλία' };

        for (const [key, sectionItems] of Object.entries(grouped)) {
            if (sectionItems.length === 0) continue;
            const title = document.createElement('h3');
            title.className = 'category-title';
            title.textContent = sectionTitles[key];
            grid.appendChild(title);

            const sectionGrid = document.createElement('div');
            sectionGrid.className = 'media-grid';
            grid.appendChild(sectionGrid);
            renderGrid(sectionItems, sectionGrid, 'search');
        }

    } catch (err) {
        console.error(err);
        grid.innerHTML = '<p class="error">Πρόβλημα σύνδεσης με τον διακομιστή.</p>';
    }
}

// --- 7. RENDER GRID (κοινή) ---
function renderGrid(items, container, mode) {
    container.innerHTML = '';
    if (!items || items.length === 0) {
        container.innerHTML = '<p style="color:#666; font-style:italic;">Δεν υπάρχουν εγγραφές ακόμα.</p>';
        return;
    }
    items.forEach(item => {
        const meta = getTypeMeta(item);
        const card = document.createElement('div');
        card.className = 'media-card';
        const imgUrl = item.thumbnail || item.poster || '';
        const ratingHtml = item.rating
            ? `<p style="color:var(--accent); font-weight:bold; font-size:0.85rem;">${item.rating}/5</p>`
            : '';

        card.innerHTML = `
            <div class="media-type-badge" style="background:${meta.color}">${meta.icon} ${meta.label}</div>
            <img src="${imgUrl}" alt="Poster" onerror="this.style.display='none'">
            <div class="media-card-info">
                <h3>${item.title}</h3>
                ${ratingHtml}
            </div>
        `;

        if (mode === 'search') {
            card.onclick = () => openDetails(item.external_id);
        } else if (mode === 'profile') {
            card.onclick = () => openLoggedItem(item);
        }

        container.appendChild(card);
    });
}