const BASE_URL = 'http://127.0.0.1:8000';
let searchCache = [];
let activeItem = null;

// Στοιχεία DOM
const loginSection = document.getElementById('loginSection');
const exploreSection = document.getElementById('exploreSection');
const detailsSection = document.getElementById('detailsSection');
const profileOverlay = document.getElementById('profileOverlay');
const userStatusBtn = document.getElementById('userStatusBtn');
const navSearchControls = document.getElementById('navSearchControls');
const resultsGrid = document.getElementById('resultsGrid');

// --- LOGIN ---
document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const res = await fetch(`${BASE_URL}/auth/login`, { method: 'POST', body: formData });
    if (res.ok) {
        const data = await res.json();
        localStorage.setItem('token', data.access_token);
        checkAuth();
    } else {
        document.getElementById('loginError').classList.remove('hidden');
    }
});

// --- ΑΝΑΖΗΤΗΣΗ ---
document.getElementById('searchBtn').addEventListener('click', async () => {
    const q = document.getElementById('searchQuery').value;
    const type = document.getElementById('mediaType').value;
    const res = await fetch(`${BASE_URL}/search/${type}?query=${q}`, {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
    });
    if (res.ok) {
        searchCache = await res.json();
        exploreSection.classList.remove('hidden');
        detailsSection.classList.add('hidden');
        profileOverlay.classList.add('hidden');
        displayResults(searchCache);
    }
});

function displayResults(results) {
    resultsGrid.innerHTML = '';
    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'result-card';
        card.innerHTML = `<img src="${item.thumbnail || ''}"><h3>${item.title}</h3>`;
        card.onclick = () => openDetails(item.external_id);
        resultsGrid.appendChild(card);
    });
}

function openDetails(id) {
    activeItem = searchCache.find(i => i.external_id === id);
    document.getElementById('detailTitle').innerText = activeItem.title;
    document.getElementById('detailDescription').innerText = activeItem.description || "Χωρίς περιγραφή";
    document.getElementById('detailPosterContainer').innerHTML = `<img src="${activeItem.thumbnail}">`;
    exploreSection.classList.add('hidden');
    detailsSection.classList.remove('hidden');
}

// --- ΒΑΘΜΟΛΟΓΙΑ ---
document.getElementById('ratingSlider').oninput = (e) => document.getElementById('ratingDisplay').innerText = e.target.value;

document.getElementById('submitVoteBtn').onclick = async () => {
    const data = {
        external_id: activeItem.external_id, title: activeItem.title, year: activeItem.year || "N/A",
        media_type: activeItem.type, source: activeItem.source || "tmdb",
        rating: parseFloat(document.getElementById('ratingSlider').value),
        review: document.getElementById('reviewInput').value, status: "completed"
    };
    await fetch(`${BASE_URL}/interactions/log`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    alert("Αποθηκεύτηκε!");
    detailsSection.classList.add('hidden');
    exploreSection.classList.remove('hidden');
};

function checkAuth() {
    const token = localStorage.getItem('token');
    const isAuth = !!token;
    loginSection.classList.toggle('hidden', isAuth);
    exploreSection.classList.toggle('hidden', !isAuth);
    userStatusBtn.classList.toggle('hidden', !isAuth);
    document.getElementById('logoutBtn').classList.toggle('hidden', !isAuth);
    navSearchControls.classList.toggle('hidden', !isAuth);
}

document.getElementById('logoutBtn').addEventListener('click', () => {
    localStorage.removeItem('token');
    checkAuth();
});

document.getElementById('userStatusBtn').onclick = async () => {
    profileOverlay.classList.remove('hidden');

    const headers = { 'Authorization': `Bearer ${localStorage.getItem('token')}` };

    // Φόρτωση αξιολογήσεων
    const vaultGrid = document.getElementById('myVaultGrid');
    vaultGrid.innerHTML = '<p>Φόρτωση...</p>';
    const intRes = await fetch(`${BASE_URL}/users/me/interactions`, { headers });
    if (intRes.ok) {
        const items = await intRes.json();
        if (items.length === 0) {
            vaultGrid.innerHTML = '<p>Δεν έχεις αξιολογήσει τίποτα ακόμα.</p>';
        } else {
            vaultGrid.innerHTML = items.map(item => `
                <div class="result-card" style="display:flex;align-items:center;gap:10px;padding:10px;">
                    <img src="${item.poster || ''}" style="width:60px;height:90px;object-fit:cover;border-radius:4px;">
                    <div>
                        <strong>${item.title}</strong>
                        <div class="vault-rating">${'⭐'.repeat(Math.round(item.rating))} (${item.rating})</div>
                        ${item.review ? `<p class="vault-review">${item.review}</p>` : ''}
                    </div>
                </div>
            `).join('');
        }
    } else {
        vaultGrid.innerHTML = '<p>Σφάλμα φόρτωσης.</p>';
    }

    // Φόρτωση προτάσεων
    const recGrid = document.getElementById('recommendationsGrid');
    recGrid.innerHTML = '<p>Φόρτωση...</p>';
    const recRes = await fetch(`${BASE_URL}/recommendations/me`, { headers });
    if (recRes.ok) {
        const data = await recRes.json();
        const recs = data.recommendations || [];
        if (recs.length === 0) {
            recGrid.innerHTML = '<p>Δεν υπάρχουν προτάσεις ακόμα.</p>';
        } else {
            recGrid.innerHTML = recs.map(item => `
                <div class="result-card" style="display:flex;align-items:center;gap:10px;padding:10px;">
                    <img src="${item.thumbnail || ''}" style="width:60px;height:90px;object-fit:cover;border-radius:4px;">
                    <div>
                        <strong>${item.title}</strong>
                        <p style="font-size:0.85rem;color:#666;">${item.type} · ${item.year || ''}</p>
                    </div>
                </div>
            `).join('');
        }
    } else {
        recGrid.innerHTML = '<p>Σφάλμα φόρτωσης προτάσεων.</p>';
    }
};
document.getElementById('closeProfileBtn').onclick = () => profileOverlay.classList.add('hidden');
document.getElementById('backBtn').onclick = () => { detailsSection.classList.add('hidden'); exploreSection.classList.remove('hidden'); };
