import axios from 'axios';

// Δημιουργούμε ένα κεντρικό "κανάλι" επικοινωνίας με το Backend μας
const api = axios.create({
  baseURL: 'http://127.0.0.1:8000', // Η διεύθυνση του FastAPI σου
});

// Εδώ είναι η μαγεία (Interceptor):
// Πριν φύγει ΟΠΟΙΟΔΗΠΟΤΕ αίτημα για το Backend, τρέχει αυτός ο κώδικας
api.interceptors.request.use((config) => {
  // Ψάχνουμε στο "χρηματοκιβώτιο" του browser (localStorage) για το JWT token
  const token = localStorage.getItem('access_token');

  if (token) {
    // Αν υπάρχει, το κολλάμε αυτόματα στο Header!
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export default api;