import React, { useState } from 'react';
import api from '../api';

function Explore() {
  const [query, setQuery] = useState('');
  const [mediaType, setMediaType] = useState('movies'); // movies, music, books
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleSearch = async () => {
    if (!query) return;
    setLoading(true);
    try {
      // Καλούμε τα endpoints αναζήτησης του main.py
      const response = await api.get(`/search/${mediaType}?query=${query}`);
      setResults(response.data);
    } catch (error) {
      alert("Σφάλμα κατά την αναζήτηση.");
    } finally {
      setLoading(false);
    }
  };

  const handleLogInteraction = async (item, rating) => {
    try {
      // Στέλνουμε το interaction στο /interactions/log του Backend
      await api.post('/interactions/log', {
        ...item,
        rating: parseFloat(rating)
      });
      alert(`Προστέθηκε στο Vault: ${item.title} με ${rating} αστέρια!`);
    } catch (error) {
      alert("Σφάλμα κατά την αποθήκευση.");
    }
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <h1 className="text-5xl font-black uppercase mb-8 tracking-tighter">Explore Culture</h1>

      {/* Search Section */}
      <div className="flex flex-col md:flex-row gap-4 mb-12">
        <input
          type="text"
          placeholder={`SEARCH FOR ${mediaType.toUpperCase()}...`}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="flex-1 border-4 border-black p-4 text-xl font-bold outline-none focus:bg-yellow-100 shadow-brutal"
        />

        <div className="flex gap-2">
          {['movies', 'music', 'books'].map((type) => (
            <button
              key={type}
              onClick={() => setMediaType(type)}
              className={`border-4 border-black px-4 py-2 font-black uppercase transition-all shadow-brutal-hover ${mediaType === type ? 'bg-brutal-secondary translate-x-[2px] translate-y-[2px] shadow-none' : 'bg-white hover:bg-gray-100'}`}
            >
              {type}
            </button>
          ))}
        </div>

        <button
          onClick={handleSearch}
          className="bg-brutal-primary border-4 border-black px-8 py-4 text-xl font-black uppercase text-white shadow-brutal hover:translate-x-[2px] hover:translate-y-[2px] hover:shadow-brutal-hover active:shadow-none"
        >
          {loading ? '...' : 'Search'}
        </button>
      </div>

      {/* Results Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {results.map((item, index) => (
          <div key={index} className="border-4 border-black bg-white p-6 shadow-brutal flex flex-col justify-between">
            <div>
              <h3 className="text-2xl font-black uppercase mb-2 leading-tight">{item.title}</h3>
              <span className="inline-block bg-black text-white px-2 py-1 text-xs font-bold uppercase mb-4">
                {item.media_type}
              </span>
            </div>

            <div className="mt-6 border-t-4 border-black pt-4">
              <p className="font-bold mb-2">RATE THIS:</p>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => handleLogInteraction(item, star)}
                    className="border-2 border-black w-10 h-10 font-black hover:bg-brutal-secondary transition-colors"
                  >
                    {star}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Explore;