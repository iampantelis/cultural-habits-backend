import httpx
import base64
import os
from dotenv import load_dotenv
from typing import List, Dict, Any

#TMDB
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

async def search_tmdb_movies(query: str) -> List[Dict[str, Any]]:
    url = f"{TMDB_BASE_URL}/search/movie"
    params = {
        "api_key": TMDB_API_KEY,
        "query": query,
        "language": "el-GR",
        "page": 1,
        "include_adult": "false"
    }
    
    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
        except httpx.HTTPError:
            return []
    
    if response.status_code != 200:
        return []

    data = response.json()
    clean_results = []
    
    for item in data.get("results", []):
        poster_path = item.get("poster_path")
        image_url = f"{IMAGE_BASE_URL}{poster_path}" if poster_path else None
        tmdb_rating = item.get("vote_average", 0)
        normalized_rating = round(tmdb_rating / 2, 1)

        clean_results.append({
            "external_id": str(item.get("id")),
            "title": item.get("title"),
            "description": item.get("overview", "Δεν υπάρχει περιγραφή."),
            "year": item.get("release_date", "")[:4],
            "rating": normalized_rating,
            "thumbnail": image_url,
            "source": "tmdb",
            "type": "movie"
        })
        
    return clean_results

#SPOTIFY
SPOTIFY_CLIENT_ID = os.getenv("SPOTIFY_CLIENT_ID")
SPOTIFY_CLIENT_SECRET = os.getenv("SPOTIFY_CLIENT_SECRET")
SPOTIFY_TOKEN_URL = "https://accounts.spotify.com/api/token"
SPOTIFY_SEARCH_URL = "https://api.spotify.com/v1/search"

async def get_spotify_token():
    async with httpx.AsyncClient() as client:
        auth_str = f"{SPOTIFY_CLIENT_ID}:{SPOTIFY_CLIENT_SECRET}"
        b64_auth = base64.b64encode(auth_str.encode()).decode()
        
        headers = {"Authorization": f"Basic {b64_auth}"}
        data = {"grant_type": "client_credentials"}
        
        response = await client.post(SPOTIFY_TOKEN_URL, headers=headers, data=data)
        if response.status_code != 200:
            print("Σφάλμα σύνδεσης στο Spotify:", response.text)
            return None
        return response.json().get("access_token")

async def search_spotify_music(query: str) -> List[Dict[str, Any]]:
    token = await get_spotify_token()
    if not token:
        return []
        
    headers = {"Authorization": f"Bearer {token}"}
    params = {"q": query, "type": "track", "limit": 5}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(SPOTIFY_SEARCH_URL, headers=headers, params=params)
        
    if response.status_code != 200:
        return []
        
    items = response.json().get("tracks", {}).get("items", [])
    clean_results = []
    
    for item in items:
        images = item.get("album", {}).get("images", [])
        image_url = images[0]["url"] if images else None
        artists = ", ".join([artist["name"] for artist in item.get("artists", [])])
        
        popularity = item.get("popularity", 0)
        normalized_rating = round(popularity / 20, 1)

        clean_results.append({
            "external_id": item.get("id"),
            "title": item.get("name"),
            "description": f"Artist: {artists} | Album: {item.get('album', {}).get('name')}",
            "year": item.get("album", {}).get("release_date", "")[:4],
            "rating": normalized_rating,
            "thumbnail": image_url,
            "source": "spotify",
            "type": "music"
        })
        
    return clean_results

#BOOKS
GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"

async def search_google_books(query: str) -> List[Dict[str, Any]]:
    """Αναζήτηση βιβλίων στο Google Books"""
    params = {"q": query, "maxResults": 5}
    
    async with httpx.AsyncClient() as client:
        response = await client.get(GOOGLE_BOOKS_URL, params=params)
        
    if response.status_code != 200:
        return []
    
    clean_results = []
    for item in response.json().get("items", []):
        info = item.get("volumeInfo", {})
        image_links = info.get("imageLinks", {})
        thumbnail = image_links.get("thumbnail") or image_links.get("smallThumbnail")
        authors = ", ".join(info.get("authors", ["Unknown"]))
        avg_rating = info.get("averageRating", 0)
        
        clean_results.append({
            "external_id": item.get("id"),
            "title": info.get("title"),
            "description": f"Author: {authors}",
            "year": info.get("publishedDate", "")[:4],
            "rating": avg_rating, 
            "thumbnail": thumbnail,
            "source": "google_books",
            "type": "book"
        })
        
    return clean_results