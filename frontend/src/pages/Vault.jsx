import React, { useEffect, useState } from 'react';
import api from '../api';

function Vault() {
  const [interactions, setInteractions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchVault = async () => {
      try {
        const response = await api.get('/users/me/interactions');
        setInteractions(response.data);
      } catch (err) {
        console.error("Error fetching vault", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVault();
  }, []);

  if (loading) return <div className="p-10 font-black text-3xl uppercase italic">Opening your vault...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto text-black">
      <div className="bg-white border-4 border-black p-6 mb-12 shadow-brutal inline-block">
        <h1 className="text-5xl font-black uppercase tracking-tighter">My Cultural Identity</h1>
        <p className="font-bold uppercase mt-2">You have {interactions.length} items in your vault.</p>
      </div>

      {interactions.length === 0 ? (
        <p className="text-xl font-bold uppercase">Your vault is empty. Go explore!</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {interactions.map((item, idx) => (
            <div key={idx} className="border-4 border-black bg-white shadow-brutal-hover overflow-hidden">
              {item.poster && (
                <img src={item.poster} alt={item.title} className="w-full h-48 object-cover border-b-4 border-black" />
              )}
              <div className="p-4">
                <h3 className="font-black uppercase text-lg leading-tight line-clamp-1">{item.title}</h3>
                <div className="mt-4 flex justify-between items-center">
                  <span className="bg-brutal-secondary border-2 border-black px-2 py-1 text-xs font-black">
                    {item.rating} / 5
                  </span>
                  <span className="text-[10px] font-bold uppercase opacity-50">{item.status}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default Vault;