// src/pages/Login.jsx
import React from 'react';

function Login() {
  return (
    <div className="flex h-full min-h-[80vh] flex-col items-center justify-center p-6">
      <div className="w-full max-w-md border-4 border-black bg-white p-8 shadow-brutal">
        <h1 className="mb-2 text-4xl font-bold uppercase tracking-tight">Login</h1>
        <p className="mb-8 text-lg font-medium">Ξεκλείδωσε την ψηφιακή σου ταυτότητα.</p>

        <div className="flex flex-col gap-4">
          <input
            type="text"
            placeholder="USERNAME"
            className="border-4 border-black p-3 font-bold outline-none focus:bg-yellow-100 transition-colors"
          />
          <input
            type="password"
            placeholder="PASSWORD"
            className="border-4 border-black p-3 font-bold outline-none focus:bg-yellow-100 transition-colors"
          />
          <button className="mt-4 border-4 border-black bg-brutal-primary px-6 py-4 text-xl font-bold uppercase text-white shadow-brutal transition-all hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-hover active:translate-x-[4px] active:translate-y-[4px] active:shadow-none">
            Enter the Vault
          </button>
        </div>
      </div>
    </div>
  );
}

export default Login;