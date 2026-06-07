import httpx
import base64
import os
import asyncio
from dotenv import load_dotenv
from typing import List, Dict, Any, Optional

# TMDB
TMDB_API_KEY = os.getenv("TMDB_API_KEY")
TMDB_BASE_URL = "https://api.themoviedb.org/3"
IMAGE_BASE_URL = "https://image.tmdb.org/t/p/w500"

# Χάρτης TMDB genre_id -> όνομα
TMDB_GENRE_MAP = {
    28: "Action", 12: "Adventure", 16: "Animation", 35: "Comedy",
    80: "Crime", 99: "Documentary", 18: "Drama", 10751: "Family",
    14: "Fantasy", 36: "History", 27: "Horror", 10402: "Music",
    9648: "Mystery", 10749: "Romance", 878: "Science Fiction",
    53: "Thriller", 10752: "War", 37: "Western",
}

# Χάρτης TMDB genre -> Google Books subject query
TMDB_TO_BOOKS_GENRE = {
    "Science Fiction": "subject:science fiction",
    "Fantasy":         "subject:fantasy",
    "Thriller":        "subject:thriller",
    "Horror":          "subject:horror",
    "Romance":         "subject:romance",
    "Crime":           "subject:crime fiction",
    "Mystery":         "subject:mystery",
    "Adventure":       "subject:adventure",
    "Drama":           "subject:drama",
    "History":         "subject:history",
    "Documentary":     "subject:nonfiction",
    "Animation":       "subject:animation",
    "Comedy":          "subject:humor",
    "War":             "subject:war",
    "Western":         "subject:western",
}

# Χάρτης TMDB genre -> Spotify search query
TMDB_TO_MUSIC_GENRE = {
    "Science Fiction": "epic sci-fi soundtrack",
    "Fantasy":         "epic fantasy soundtrack",
    "Thriller":        "dark thriller soundtrack",
    "Horror":          "dark horror ambient",
    "Romance":         "romantic cinematic",
    "Crime":           "dark jazz noir",
    "Mystery":         "mystery suspense soundtrack",
    "Adventure":       "epic adventure orchestral",
    "Drama":           "emotional cinematic piano",
    "History":         "epic historical orchestral",
    "Animation":       "animated film soundtrack",
    "Comedy":          "upbeat fun pop",
    "War":             "epic war orchestral",
    "Western":         "western country soundtrack",
    "Action":          "action epic orchestral",
    "Music":           "popular music hits",
}

# Χάρτης Google Books genre -> TMDB search
BOOKS_TO_TMDB_GENRE = {
    "Fiction / Science Fiction": "Science Fiction",
    "Science Fiction":           "Science Fiction",
    "Fantasy":                   "Fantasy",
    "Thriller":                  "Thriller",
    "Mystery":                   "Mystery",
    "Horror":                    "Horror",
    "Romance":                   "Romance",
    "Crime":                     "Crime",
    "Adventure":                 "Adventure",
    "History":                   "History",
    "Humor":                     "Comedy",
    "Drama":                     "Drama",
}


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

        # Μετατρέπουμε genre_ids σε ονόματα
        genre_ids = item.get("genre_ids", [])
        genres = [TMDB_GENRE_MAP[gid] for gid in genre_ids if gid in TMDB_GENRE_MAP]

        clean_results.append({
            "external_id": str(item.get("id")),
            "title": item.get("title"),
            "description": item.get("overview", "Δεν υπάρχει περιγραφή."),
            "year": item.get("release_date", "")[:4],
            "rating": normalized_rating,
            "thumbnail": image_url,
            "source": "tmdb",
            "type": "movie",
            "genres": genres,  # ← ΝΕΟ
        })

    return clean_results


# SPOTIFY
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
            "type": "music",
            "genres": [],  # Spotify δεν δίνει genres ανά track
        })

    return clean_results


# GOOGLE BOOKS
GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"
GOOGLE_BOOKS_API_KEY = os.getenv("GOOGLE_BOOKS_API_KEY")

books_semaphore = asyncio.Semaphore(1)
BOOKS_CACHE = {}


async def search_google_books(query: str) -> List[Dict[str, Any]]:
    if query in BOOKS_CACHE:
        return BOOKS_CACHE[query]

    params = {"q": query, "maxResults": 5, "printType": "books"}
    if GOOGLE_BOOKS_API_KEY:
        params["key"] = GOOGLE_BOOKS_API_KEY

    async with books_semaphore:
        await asyncio.sleep(0.5)
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(GOOGLE_BOOKS_URL, params=params)
                if response.status_code == 429:
                    return []
                response.raise_for_status()
            except httpx.HTTPError:
                return []

    data = response.json()
    if "items" not in data:
        return []

    clean_results = []
    for item in data.get("items", []):
        info = item.get("volumeInfo", {})
        image_links = info.get("imageLinks", {})
        thumbnail = image_links.get("thumbnail") or image_links.get("smallThumbnail")
        authors = ", ".join(info.get("authors", ["Άγνωστος"]))
        avg_rating = info.get("averageRating", 0)

        # Google Books επιστρέφει categories π.χ. ["Fiction / Science Fiction"]
        raw_categories = info.get("categories", [])
        genres = []
        for cat in raw_categories:
            # Κανονικοποίηση: "Fiction / Science Fiction" -> "Science Fiction"
            normalized = cat.split(" / ")[-1].strip()
            genres.append(normalized)

        clean_results.append({
            "external_id": item.get("id"),
            "title": info.get("title", "Χωρίς τίτλο"),
            "description": f"Author: {authors}",
            "year": info.get("publishedDate", "")[:4],
            "rating": avg_rating,
            "thumbnail": thumbnail,
            "source": "google_books",
            "type": "book",
            "genres": genres,  # ← ΝΕΟ
        })

    BOOKS_CACHE[query] = clean_results
    return clean_results