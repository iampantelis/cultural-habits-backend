import React, { useState } from 'react';
import api from '../api';
import { useNavigate, Link } from 'react-router-dom';

function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleRegister = async () => {
    try {
      await api.post('/auth/register', { username, email, password });
      alert('Η εγγραφή ολοκληρώθηκε!');
      navigate('/login');
    } catch (error) {
      alert('Σφάλμα κατά την εγγραφή.');
    }
  };

  return (
    <div className="flex h-full min-h-[80vh] flex-col items-center justify-center p-6 text-black">
      <div className="w-full max-w-md border-4 border-black bg-white p-8 shadow-brutal">
        <h1 className="mb-2 text-4xl font-bold uppercase tracking-tight">Register</h1>
        <div className="flex flex-col gap-4 mt-6">
          <input type="text" placeholder="USERNAME" onChange={(e) => setUsername(e.target.value)} className="border-4 border-black p-3 font-bold outline-none" />
          <input type="email" placeholder="EMAIL" onChange={(e) => setEmail(e.target.value)} className="border-4 border-black p-3 font-bold outline-none" />
          <input type="password" placeholder="PASSWORD" onChange={(e) => setPassword(e.target.value)} className="border-4 border-black p-3 font-bold outline-none" />
          <button onClick={handleRegister} className="bg-brutal-secondary border-4 border-black py-4 font-black uppercase shadow-brutal hover:shadow-none transition-all">Create Account</button>
          <Link to="/login" className="text-center underline font-bold">Επιστροφή στο Login</Link>
        </div>
      </div>
    </div>
  );
}

export default Register;