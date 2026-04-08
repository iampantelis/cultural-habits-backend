import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Login from './pages/Login';
import Explore from './pages/Explore';
import Home from './pages/Home';
import Vault from './pages/Vault';
import Register from './pages/Register';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Έλεγχος αν ο χρήστης είναι συνδεδεμένος κατά το φόρτωμα
  useEffect(() => {
    const token = localStorage.getItem('access_token');
    setIsLoggedIn(!!token);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    setIsLoggedIn(false);
    window.location.href = '/login'; // Επαναφορά στο login
  };

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-brutal-bg font-brutal text-black flex flex-col">
        <nav className="border-b-4 border-black bg-white p-4 flex justify-between items-center shadow-brutal sticky top-0 z-50">
          <Link to="/" className="text-3xl font-black uppercase tracking-tighter hover:text-brutal-primary transition-colors">
            Cult/Vault
          </Link>
          <div className="flex gap-6 font-bold uppercase items-center">
            <Link to="/" className="hover:underline">Home</Link>
            <Link to="/explore" className="hover:underline">Explore</Link>
            <Link to="/vault" className="hover:underline">My Vault</Link>

            {/* Δυναμική εναλλαγή Login / Logout */}
            {isLoggedIn ? (
              <button
                onClick={handleLogout}
                className="bg-red-500 px-4 py-2 text-white border-4 border-black shadow-brutal-hover hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                Logout
              </button>
            ) : (
              <Link
                to="/login"
                className="bg-brutal-primary px-4 py-2 text-white border-4 border-black shadow-brutal-hover hover:translate-x-1 hover:translate-y-1 hover:shadow-none transition-all"
              >
                Login
              </Link>
            )}
          </div>
        </nav>

        <main className="flex-1">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/explore" element={<Explore />} />
            <Route path="/vault" element={<Vault />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;