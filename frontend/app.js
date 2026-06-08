const BASE_URL = 'http://127.0.0.1:8000';
let currentSearchCache = [];
let activeItem = null;
let profileData = { movies: [], music: [], books: [] }; // <--- ΠΡΟΣΘΗΚΗ
let profileExpanded = { movies: false, music: false, books: false };

// --- 1. ROUTER (Πλοήγηση Σελίδων) ---
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

    // Κλήσεις συναρτήσεων όταν μπαίνουμε στη σελίδα:
    if (viewId === 'home') loadTrending();
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
            setTimeout(() => {
                navigateTo('login');
                msgDiv.className = 'hidden';
            }, 2000);
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
        status: "completed"
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
        alert("Δεν μπορέσαμε να συνδεθούμε με τον διακομιστή.");
    }
});

// --- 5. ΠΡΟΦΙΛ & ΣΤΑΤΙΣΤΙΚΑ ---
// --- 5. ΠΡΟΦΙΛ & ΣΤΑΤΙΣΤΙΚΑ ---
async function loadProfile() {
    const token = localStorage.getItem('token');

    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        document.getElementById('profileUsername').innerText = payload.sub ? payload.sub.toUpperCase() : 'MY PROFILE';
    } catch (e) {
        document.getElementById('profileUsername').innerText = 'MY PROFILE';
    }

    const res = await fetch(`${BASE_URL}/users/me/interactions`, {
        headers: { 'Authorization': `Bearer ${token}` }
    });

    if (res.ok) {
        let data = await res.json();

        // Αντιστροφή για να βλέπουμε πρώτα τις ΠΙΟ ΠΡΟΣΦΑΤΕΣ εγγραφές!
        data.reverse();

        profileData.movies = data.filter(i =>
            (i.media_type && i.media_type.toLowerCase().includes('movie')) ||
            (!i.media_type && i.source === 'tmdb')
        );

        profileData.music = data.filter(i =>
            (i.media_type && (i.media_type.toLowerCase().includes('music') || i.media_type.toLowerCase().includes('album'))) ||
            (!i.media_type && i.source === 'spotify')
        );

        profileData.books = data.filter(i =>
            (i.media_type && i.media_type.toLowerCase().includes('book')) ||
            (!i.media_type && i.source === 'google_books')
        );

        document.getElementById('statMovies').innerText = profileData.movies.length;
        document.getElementById('statMusic').innerText = profileData.music.length;
        document.getElementById('statBooks').innerText = profileData.books.length;

        // Κλείνουμε όλες τις κατηγορίες (να δείχνουν μόνο 5) σε κάθε φόρτωση
        profileExpanded = { movies: false, music: false, books: false };

        updateProfileCategory('movies');
        updateProfileCategory('music');
        updateProfileCategory('books');
    }
}

function updateProfileCategory(cat) {
    const gridMap = { movies: 'profileMoviesGrid', music: 'profileMusicGrid', books: 'profileBooksGrid' };
    const grid = document.getElementById(gridMap[cat]);
    const btn = document.getElementById(`btn-viewall-${cat}`);
    const items = profileData[cat];

    if (items.length === 0) {
        grid.innerHTML = '<p style="color:#666; font-style:italic;">Δεν υπάρχουν εγγραφές.</p>';
        btn.classList.add('hidden');
        return;
    }

    const isExpanded = profileExpanded[cat];
    // Αν είναι expanded δείχνουμε όλα (items), αλλιώς κόβουμε τα πρώτα 5
    const itemsToRender = isExpanded ? items : items.slice(0, 5);

    renderGrid(itemsToRender, grid, 'profile');

    // Αν έχει πάνω από 5 εγγραφές, εμφανίζουμε το κουμπάκι!
    if (items.length > 5) {
        btn.classList.remove('hidden');
        btn.innerText = isExpanded ? 'Δείτε Λιγότερα ⬆' : `Δείτε Όλα (${items.length}) ⬇`;
    } else {
        btn.classList.add('hidden');
    }
}

function toggleProfileCategory(cat) {
    profileExpanded[cat] = !profileExpanded[cat]; // Αλλάζουμε την κατάσταση
    updateProfileCategory(cat); // Ξαναζωγραφίζουμε το grid
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
// --- 6. TRENDING (ΑΡΧΙΚΗ ΣΕΛΙΔΑ) ---
async function loadTrending() {
    const container = document.getElementById('trendingContainer');
    if (!container) return;

    container.innerHTML = '<p class="loading-msg">Φόρτωση δημοφιλών επιλογών... 🔥</p>';

    try {
        const res = await fetch(`${BASE_URL}/trending`);
        if (!res.ok) throw new Error('Σφάλμα API');

        const data = await res.json();
        const items = data.recommendations || [];
        container.innerHTML = '';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'rec-header';
        headerDiv.innerHTML = `
            <h2>🔥 Δημοφιλή αυτή τη στιγμή</h2>
            <p style="color: var(--text-main);">${data.message || 'Ανακαλύψτε τι συζητάει ο κόσμος.'}</p>
        `;
        container.appendChild(headerDiv);

        if (items.length === 0) return;

        // Ομαδοποίηση και εμφάνιση σε Carousel
        const grouped = { movie: [], music: [], book: [] };
        items.forEach(item => {
            const key = item.type === 'movie' ? 'movie' : item.type === 'music' ? 'music' : 'book';
            grouped[key].push(item);
        });

        const sectionTitles = { movie: '🎬 Ταινίες', music: '🎵 Μουσική', book: '📖 Βιβλία' };

        for (const [key, sectionItems] of Object.entries(grouped)) {
            if (sectionItems.length === 0) continue;

            const title = document.createElement('h3');
            title.className = 'category-title';
            title.textContent = sectionTitles[key];
            container.appendChild(title);

            // ΔΗΜΙΟΥΡΓΙΑ ΤΟΥ CAROUSEL DIV
            const sectionCarousel = document.createElement('div');
            sectionCarousel.className = 'rec-carousel';
            container.appendChild(sectionCarousel);

            // Τοποθέτηση των καρτών ΜΕΣΑ στο Carousel
            renderGrid(sectionItems, sectionCarousel, 'search');
        }
    } catch (err) {
        container.innerHTML = '';
    }
}

// --- 7. ΠΡΟΤΑΣΕΙΣ (RECOMMENDATIONS) ---
async function loadRecommendations() {
    const container = document.getElementById('recommendationsContainer');
    container.innerHTML = '<p class="loading-msg">Αναλύουμε το γούστο σου... ⏳</p>';

    try {
        const res = await fetch(`${BASE_URL}/recommendations/me`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
        });

        if (!res.ok) {
            container.innerHTML = '<p class="error">Σφάλμα κατά τη φόρτωση προτάσεων.</p>';
            return;
        }

        const data = await res.json();
        const items = data.recommendations || [];
        container.innerHTML = '';

        const headerDiv = document.createElement('div');
        headerDiv.className = 'rec-header';
        const h2 = document.createElement('h2');
        h2.textContent = 'Επιλεγμένα για εσένα';
        headerDiv.appendChild(h2);

        if (data.message) {
            const p = document.createElement('p');
            p.textContent = data.message;
            p.style.color = 'var(--text-main)';
            headerDiv.appendChild(p);
        } else if (data.based_on && data.based_on.length > 0) {
            const basedOnDiv = document.createElement('div');
            basedOnDiv.className = 'rec-based-on';
            basedOnDiv.innerHTML = `<span class="tag-label">ΕΠΕΙΔΗ ΣΟΥ ΑΡΕΣΑΝ:</span>` +
                data.based_on.map(t => `<span class="rec-tag">${t}</span>`).join('');
            headerDiv.appendChild(basedOnDiv);
        }
        container.appendChild(headerDiv);

        if (items.length === 0) {
            container.innerHTML += '<p style="color:#666; font-style:italic;">Δεν βρέθηκαν προτάσεις.</p>';
            return;
        }

        // Ομαδοποίηση και εμφάνιση σε Carousel
        const grouped = { movie: [], music: [], book: [] };
        items.forEach(item => {
            const key = item.type === 'movie' ? 'movie' : item.type === 'music' ? 'music' : 'book';
            grouped[key].push(item);
        });

        const sectionTitles = { movie: '🎬 Ταινίες', music: '🎵 Μουσική', book: '📖 Βιβλία' };

        for (const [key, sectionItems] of Object.entries(grouped)) {
            if (sectionItems.length === 0) continue;

            const title = document.createElement('h3');
            title.className = 'category-title';
            title.textContent = sectionTitles[key];
            container.appendChild(title);

            // ΔΗΜΙΟΥΡΓΙΑ ΤΟΥ CAROUSEL DIV
            const sectionCarousel = document.createElement('div');
            sectionCarousel.className = 'rec-carousel';
            container.appendChild(sectionCarousel);

            // Τοποθέτηση των καρτών ΜΕΣΑ στο Carousel
            renderGrid(sectionItems, sectionCarousel, 'search');
        }

    } catch (err) {
        container.innerHTML = '<p class="error">Πρόβλημα σύνδεσης.</p>';
    }
}

// --- 8. ΒΟΗΘΗΤΙΚΗ ΣΥΝΑΡΤΗΣΗ RENDER (Κατασκευή Καρτών) ---
function renderGrid(items, container, mode) {
    container.innerHTML = '';
    if (items.length === 0) {
        container.innerHTML = '<p style="color:#666; font-style:italic;">Δεν υπάρχουν εγγραφές.</p>';
        return;
    }
    items.forEach(item => {
        const card = document.createElement('div');
        card.className = 'media-card';
        const imgUrl = item.thumbnail || item.poster || '';

        let ratingHtml = item.rating ? `<p style="color:var(--accent); font-weight:bold;">${item.rating}/5</p>` : '';

        card.innerHTML = `
            <img src="${imgUrl}" alt="Poster">
            <div class="media-card-info">
                <h3>${item.title}</h3>
                ${ratingHtml}
            </div>
        `;

        if (mode === 'search') {
            card.onclick = () => {
                currentSearchCache = items; // Βεβαιωνόμαστε ότι το cache έχει το σωστό αντικείμενο
                openDetails(item.external_id);
            };
        } else if (mode === 'profile') {
            card.onclick = () => openLoggedItem(item);
        }

        container.appendChild(card);
    });
}