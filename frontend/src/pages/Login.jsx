import React, { useState } from 'react';
import api from '../api';
import { useNavigate } from 'react-router-dom';

function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    try {
      // Το FastAPI περιμένει form-data για το login
      const formData = new FormData();
      formData.append('username', username);
      formData.append('password', password);

      const response = await api.post('/auth/login', formData);
      localStorage.setItem('access_token', response.data.access_token);
      alert('Επιτυχής σύνδεση!');
      navigate('/'); // Επιστροφή στην αρχική μετά το login
    } catch (error) {
      alert('Λάθος στοιχεία σύνδεσης.');
    }
  };

  return (
    <div className="flex h-full min-h-[80vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md border-4 border-black bg-white p-8 shadow-brutal text-black">
        <h1 className="mb-2 text-4xl font-bold uppercase tracking-tight">Login</h1>
        <p className="mb-8 text-lg font-medium italic">Ξεκλείδωσε την ψηφιακή σου ταυτότητα.</p>

        <div className="flex flex-col gap-4 text-black">
          <input
            type="text"
            placeholder="USERNAME"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="border-4 border-black p-3 font-bold outline-none focus:bg-yellow-100 transition-colors placeholder-black"
          />
          <input
            type="password"
            placeholder="PASSWORD"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="border-4 border-black p-3 font-bold outline-none focus:bg-yellow-100 transition-colors placeholder-black"
          />
          <button
            onClick={handleLogin}
            className="mt-4 border-4 border-black bg-brutal-primary px-6 py-4 text-xl font-bold uppercase text-white shadow-brutal transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-hover"
          >
            Enter the Vault
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;