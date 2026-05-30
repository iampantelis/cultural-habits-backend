const BASE_URL = 'http://localhost:8000';

// Λήψη Στοιχείων HTML
const loginSection = document.getElementById('loginSection');
const exploreSection = document.getElementById('exploreSection');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const userStatus = document.getElementById('userStatus');
const searchBtn = document.getElementById('searchBtn');
const resultsGrid = document.getElementById('resultsGrid');

// 1. Έλεγχος Κατάστασης Σύνδεσης
function checkAuth() {
    const token = localStorage.getItem('token');
    if (token) {
        loginSection.classList.add('hidden');
        exploreSection.classList.remove('hidden');
        logoutBtn.classList.remove('hidden');
        userStatus.classList.remove('hidden');
    } else {
        loginSection.classList.remove('hidden');
        exploreSection.classList.add('hidden');
        logoutBtn.classList.add('hidden');
        userStatus.classList.add('hidden');
    }
}

// 2. Λειτουργία Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Αποτρέπει την ανανέωση της σελίδας

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
            localStorage.setItem('token', data.access_token);
            errorMsg.classList.add('hidden');
            checkAuth(); // Αλλαγή σελίδας
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
    resultsGrid.innerHTML = ''; // Καθαρισμός αποτελεσμάτων
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
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const results = await response.json();
            displayResults(results);
        } else {
            resultsGrid.innerHTML = '<p class="error">Σφάλμα αναζήτησης.</p>';
        }
    } catch (error) {
        console.error("Σφάλμα:", error);
    }
});

// 5. Εμφάνιση Αποτελεσμάτων στο DOM
function displayResults(results) {
    resultsGrid.innerHTML = '';

    if (results.length === 0) {
        resultsGrid.innerHTML = '<p>Δεν βρέθηκαν αποτελέσματα.</p>';
        return;
    }

    results.forEach(item => {
        const card = document.createElement('div');
        card.className = 'result-card';

        // Έλεγχος αν υπάρχει εικόνα
        const imgHtml = item.thumbnail
            ? `<img src="${item.thumbnail}" alt="${item.title}">`
            : `<div style="height:300px; background:#eee; display:flex; align-items:center; justify-content:center;">Χωρίς Εικόνα</div>`;

        card.innerHTML = `
            ${imgHtml}
            <div class="result-card-content">
                <h3>${item.title}</h3>
                <p style="color: gray; font-size: 0.9rem; margin: 10px 0;">${item.year || ''}</p>
                <button onclick="logInteraction('${item.external_id}', '${item.type}', '${item.title}')">Προσθήκη (5 Αστέρια)</button>
            </div>
        `;
        resultsGrid.appendChild(card);
    });
}

// Αρχική εκτέλεση
checkAuth();