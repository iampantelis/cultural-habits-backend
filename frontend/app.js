const BASE_URL = 'http://127.0.0.1:8000';

// Στοιχεία HTML
const loginSection = document.getElementById('loginSection');
const exploreSection = document.getElementById('exploreSection');
const detailsSection = document.getElementById('detailsSection');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const userStatus = document.getElementById('userStatus');
const searchBtn = document.getElementById('searchBtn');
const resultsGrid = document.getElementById('resultsGrid');
const backBtn = document.getElementById('backBtn');
const navSearchControls = document.getElementById('navSearchControls');
const userStatusBtn = document.getElementById('userStatusBtn');
const profileOverlay = document.getElementById('profileOverlay');
const closeProfileBtn = document.getElementById('closeProfileBtn');

// Στοιχεία Σελίδας Λεπτομερειών
const detailPosterContainer = document.getElementById('detailPosterContainer');
const detailTitle = document.getElementById('detailTitle');
const detailType = document.getElementById('detailType');
const detailYear = document.getElementById('detailYear');
const detailDescription = document.getElementById('detailDescription');
const ratingSlider = document.getElementById('ratingSlider');
const ratingDisplay = document.getElementById('ratingDisplay');
const reviewInput = document.getElementById('reviewInput');
const submitVoteBtn = document.getElementById('submitVoteBtn');


// Τοπική μνήμη για την αποθήκευση των τρεχόντων αποτελεσμάτων αναζήτησης
let searchCache = [];
let activeItem = null; // Το αντικείμενο που εξετάζεται στην डिटेल्स σελίδα

// 1. Έλεγχος Κατάστασης Σύνδεσης
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        loginSection.classList.add('hidden');
        exploreSection.classList.remove('hidden');
        detailsSection.classList.add('hidden');
        logoutBtn.classList.remove('hidden');
        userStatusBtn.classList.remove('hidden'); // Δείχνουμε το κουμπί προφίλ στο Navbar
        navSearchControls.classList.remove('hidden');
    } else {
        loginSection.classList.remove('hidden');
        exploreSection.classList.add('hidden');
        detailsSection.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        userStatusBtn.classList.add('hidden');
        navSearchControls.classList.add('hidden');
        profileOverlay.classList.add('hidden');
    }
}

// 2. Λειτουργία Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;
    const errorMsg = document.getElementById('loginError');

    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);

    try {
        const response = await fetch(`${BASE_URL}/auth/login`, {
            method: 'POST',
            body: formData
        });

        if (response.ok) {
            const data = await response.json();
            // noinspection JSUnresolvedReference
            localStorage.setItem('token', data.access_token);
            errorMsg.classList.add('hidden');
            checkAuth();
        } else {
            errorMsg.classList.remove('hidden');
        }
    } catch (error) {
        console.error("Σφάλμα σύνδεσης:", error);
    }
});

// 3. Λειτουργία Logout
logoutBtn.addEventListener('click', () => {
    localStorage.removeItem('token');
    resultsGrid.innerHTML = '';
    searchCache = [];
    checkAuth();
});

// 4. Λειτουργία Αναζήτησης
searchBtn.addEventListener('click', async () => {
    const mediaType = document.getElementById('mediaType').value;
    const query = document.getElementById('searchQuery').value;
    const token = localStorage.getItem('token');

    if (!query) return;

    resultsGrid.innerHTML = '<p>Φόρτωση...</p>';

    try {
        const response = await fetch(`${BASE_URL}/search/${mediaType}?query=${query}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const results = await response.json();
            searchCache = results; // Αποθήκευση στη μνήμη cache
            displayResults(results);
        } else {
            resultsGrid.innerHTML = '<p class="error">Σφάλμα αναζήτησης.</p>';
        }
    } catch (error) {
        console.error("Σφάλμα:", error);
    }
});

// 5. Εμφάνιση Αποτελεσμάτων στο Πλέγμα
function displayResults(results) {
    resultsGrid.innerHTML = '';

    if (results.length === 0) {
        resultsGrid.innerHTML = '<p>Δεν βρέθηκαν αποτελέσματα.</p>';
        return;
    }

    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'result-card';

        // noinspection JSUnresolvedReference
        const imgHtml = item.thumbnail
            ? `<img src="${item.thumbnail}" alt="${item.title}">`
            : `<div style="height:300px; background:#eee; display:flex; align-items:center; justify-content:center;">Χωρίς Εικόνα</div>`;

        card.innerHTML = `
            ${imgHtml}
            <div class="result-card-content">
                <h3>${item.title}</h3>
                <p style="color: gray; font-size: 0.9rem; margin: 5px 0;">${item.year || 'N/A'}</p>
            </div>
        `;

        // Όταν πατάει οπουδήποτε στην κάρτα, ανοίγει η σελίδα λεπτομερειών!
        card.addEventListener('click', () => {
            // noinspection JSUnresolvedReference
            openDetailsPage(item.external_id);
        });

        resultsGrid.appendChild(card);
    });
}

// 5.1 Άνοιγμα της Νέας Σελίδας Λεπτομερειών
function openDetailsPage(externalId) {
    // Εύρεση του στοιχείου από την cache με βάση το external_id
    // noinspection JSUnresolvedReference
    activeItem = searchCache.find(i => i.external_id === externalId);

    if (!activeItem) return;

    // Καθαρισμός προηγούμενων εισαγωγών βαθμολογίας
    ratingSlider.value = 5.0;
    ratingDisplay.innerText = "5.0";
    reviewInput.value = "";

    // Γέμισμα των στοιχείων της σελίδας με ΟΤΙ τραβάει το API
    // noinspection JSUnresolvedReference
    detailTitle.innerText = activeItem.title;
    // noinspection JSUnresolvedReference
    detailType.innerText = activeItem.type;
    // noinspection JSUnresolvedReference
    detailYear.innerText = activeItem.year || "Άγνωστο Έτος";

    // noinspection JSUnresolvedReference
    detailDescription.innerText = activeItem.description || "Δεν υπάρχει διαθέσιμη περιγραφή για το συγκεκριμένο στοιχείο από το API.";

    // noinspection JSUnresolvedReference
    if (activeItem.thumbnail) {
        // noinspection JSUnresolvedReference
        detailPosterContainer.innerHTML = `<img src="${activeItem.thumbnail}" alt="Poster">`;
    } else {
        detailPosterContainer.innerHTML = `<div style="height:450px; background:#eee; display:flex; align-items:center; justify-content:center; border-radius:8px;">Χωρίς Εικόνα</div>`;
    }

    // Εναλλαγή Σελίδων (Κρύβουμε το Search, δείχνουμε το Details)
    exploreSection.classList.add('hidden');
    detailsSection.classList.remove('hidden');
}

// 5.2 Ζωντανή ενημέρωση της έξυπνης βαθμολογίας (Μισά Αστέρια)
ratingSlider.addEventListener('input', (e) => {
    ratingDisplay.innerText = parseFloat(e.target.value).toFixed(1);
});

// 5.3 Επιστροφή από τη σελίδα λεπτομερειών
backBtn.addEventListener('click', () => {
    detailsSection.classList.add('hidden');
    exploreSection.classList.remove('hidden');
    activeItem = null;
});

// 6. Υποβολή και Αποθήκευση της Αλληλεπίδρασης
submitVoteBtn.addEventListener('click', async () => {
    if (!activeItem) return;

    const token = localStorage.getItem('token');
    const score = parseFloat(ratingSlider.value);
    const review = reviewInput.value.trim() || null;

    // noinspection JSUnresolvedReference
    const interactionData = {
        external_id: activeItem.external_id,
        title: activeItem.title,
        year: activeItem.year || "N/A",
        media_type: activeItem.type,
        source: activeItem.source || "tmdb",
        // noinspection JSUnresolvedReference
        poster_url: activeItem.thumbnail || null,
        // noinspection JSUnresolvedReference
        description: activeItem.description || "No description",
        rating: score, // Η έξυπνη βαθμολογία (π.χ. 4.5)
        review: review, // Η κριτική
        status: "completed"
    };

    try {
        const response = await fetch(`${BASE_URL}/interactions/log`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(interactionData)
        });

        if (response.ok) {
            alert(`Το "${activeItem.title}" αποθηκεύτηκε επιτυχώς με ${score} ⭐ στο Vault σου!`);
            // Επιστροφή στην κεντρική σελίδα
            backBtn.click();
        } else {
            const err = await response.json();
            alert("Σφάλμα συστήματος κατά την αποθήκευση:\n" + JSON.stringify(err.detail, null, 2));
        }
    } catch (error) {
        console.error("Σφάλμα:", error);
    }
});
userStatusBtn.addEventListener('click', async () => {
    profileOverlay.classList.remove('hidden'); // Εμφάνιση του Overlay
    document.body.style.overflow = 'hidden'; // Μπλοκάρουμε το scroll στη σελίδα από πίσω

    const token = localStorage.getItem('token');
    myVaultGrid.innerHTML = '<p>Φόρτωση Vault...</p>';
    recommendationsGrid.innerHTML = '<p>Το AI αναλύει... ⏳</p>';

    // Άντληση Vault
    try {
        const vaultRes = await fetch(`${BASE_URL}/users/me/interactions`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (vaultRes.ok) {
            const vaultData = await vaultRes.json();
            displayVault(vaultData);
        }
    } catch (e) {
        console.error("Σφάλμα Vault:", e);
    }

    // Άντληση Συστάσεων
    try {
        const recRes = await fetch(`${BASE_URL}/recommendations/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (recRes.ok) {
            const recData = await recRes.json();
            displayRecommendations(recData);
        }
    } catch (e) {
        console.error("Σφάλμα Συστάσεων:", e);
    }
});

// 2. Κλείσιμο Προφίλ
closeProfileBtn.addEventListener('click', () => {
    profileOverlay.classList.add('hidden');
    document.body.style.overflow = 'auto'; // Επαναφορά του scroll
});

// Κλείσιμο Προφίλ αν ο χρήστης κάνει κλικ στο σκοτεινό φόντο έξω από το sidebar
profileOverlay.addEventListener('click', (e) => {
    if (e.target === profileOverlay) {
        profileOverlay.classList.add('hidden');
        document.body.style.overflow = 'auto';
    }
// Αρχική Εκτέλεση
checkAuth();