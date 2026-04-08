import React, { useEffect, useState } from 'react';
import api from '../api';

function Home() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const response = await api.get('/recommendations/me');
        setData(response.data);
      } catch (err) {
        console.error("Error fetching recommendations", err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, []);

  if (loading) return <div className="p-10 font-black uppercase text-3xl animate-pulse">Scanning the Vault...</div>;

  return (
    <div className="p-8 max-w-6xl mx-auto text-black">
      <div className="bg-brutal-secondary border-4 border-black p-6 mb-12 shadow-brutal">
        <h1 className="text-4xl font-black uppercase mb-2 tracking-tighter">Your Identity Feed</h1>
        <p className="font-bold uppercase text-sm italic">{data?.message || "Custom picks for you"}</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {data?.recommendations?.map((item, idx) => (
          <div key={idx} className="border-4 border-black bg-white shadow-brutal flex flex-col overflow-hidden transition-all hover:translate-x-1 hover:translate-y-1 hover:shadow-none">
            {item.thumbnail && (
  <img src={item.thumbnail} alt={item.title} className="w-full h-64 object-cover border-b-4 border-black" />
)}
            <div className="p-4 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-xs font-black bg-black text-white px-2 py-1 uppercase">{item.media_type}</span>
                <h3 className="text-xl font-black uppercase mt-2 leading-tight">{item.title}</h3>
                <p className="text-sm mt-2 font-medium line-clamp-3">{item.description}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Home;