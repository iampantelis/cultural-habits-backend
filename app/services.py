import httpx
import base64
import os
import asyncio
from dotenv import load_dotenv
from typing import List, Dict, Any

load_dotenv()

# --- TMDB (ΤΑΙΝΙΕΣ) ---
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
            response.raise_for_status()
        except httpx.HTTPError:
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
            "year": item.get("release_date", "")[:4] if item.get("release_date") else "",
            "rating": normalized_rating,
            "thumbnail": image_url,
            "source": "tmdb",
            "type": "movie"
        })

    return clean_results


async def get_similar_tmdb_movies(tmdb_id: str) -> List[Dict[str, Any]]:
    """Φέρνει παρόμοιες ταινίες χρησιμοποιώντας το Recommendation API του TMDB"""
    url = f"{TMDB_BASE_URL}/movie/{tmdb_id}/recommendations"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "el-GR",
        "page": 1
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
        except httpx.HTTPError:
            return []

    data = response.json()
    clean_results = []

    for item in data.get("results", []):
        poster_path = item.get("poster_path")
        image_url = f"{IMAGE_BASE_URL}{poster_path}" if poster_path else None

        clean_results.append({
            "external_id": str(item.get("id")),
            "title": item.get("title"),
            "description": item.get("overview", "Δεν υπάρχει περιγραφή."),
            "year": item.get("release_date", "")[:4] if item.get("release_date") else "",
            "rating": round(item.get("vote_average", 0) / 2, 1),
            "thumbnail": image_url,
            "source": "tmdb",
            "type": "movie"
        })

    return clean_results


async def get_trending_tmdb_movies() -> List[Dict[str, Any]]:
    """Φέρνει τις πραγματικά δημοφιλείς ταινίες της εβδομάδας από το επίσημο API του TMDB"""
    url = f"{TMDB_BASE_URL}/trending/movie/week"
    params = {
        "api_key": TMDB_API_KEY,
        "language": "el-GR"
    }

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(url, params=params)
            response.raise_for_status()
        except httpx.HTTPError:
            return []

    data = response.json()
    clean_results = []

    # Παίρνουμε τις 15 πιο δημοφιλείς ταινίες της εβδομάδας
    for item in data.get("results", [])[:15]:
        poster_path = item.get("poster_path")
        image_url = f"{IMAGE_BASE_URL}{poster_path}" if poster_path else None

        clean_results.append({
            "external_id": str(item.get("id")),
            "title": item.get("title"),
            "description": item.get("overview", "Δεν υπάρχει περιγραφή."),
            "year": item.get("release_date", "")[:4] if item.get("release_date") else "",
            "rating": round(item.get("vote_average", 0) / 2, 1),
            "thumbnail": image_url,
            "source": "tmdb",
            "type": "movie"
        })

    return clean_results

# --- SPOTIFY (ΜΟΥΣΙΚΗ) ---
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

        try:
            response = await client.post(SPOTIFY_TOKEN_URL, headers=headers, data=data)
            response.raise_for_status()
            return response.json().get("access_token")
        except Exception as e:
            print("Σφάλμα σύνδεσης στο Spotify:", e)
            return None


async def search_spotify_music(query: str) -> List[Dict[str, Any]]:
    token = await get_spotify_token()
    if not token:
        return []

    headers = {"Authorization": f"Bearer {token}"}
    params = {"q": query, "type": "track", "limit": 5}

    async with httpx.AsyncClient() as client:
        try:
            response = await client.get(SPOTIFY_SEARCH_URL, headers=headers, params=params)
            response.raise_for_status()
        except Exception:
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
            "year": item.get("album", {}).get("release_date", "")[:4] if item.get("album", {}).get(
                "release_date") else "",
            "rating": normalized_rating,
            "thumbnail": image_url,
            "source": "spotify",
            "type": "music"
        })

    return clean_results


# --- GOOGLE BOOKS (ΒΙΒΛΙΑ) ---
# --- GOOGLE BOOKS (ΒΙΒΛΙΑ) ---
GOOGLE_BOOKS_URL = "https://www.googleapis.com/books/v1/volumes"
GOOGLE_BOOKS_API_KEY = os.getenv("GOOGLE_BOOKS_API_KEY")

books_semaphore = asyncio.Semaphore(1)
BOOKS_CACHE = {}


async def search_google_books(query: str) -> List[Dict[str, Any]]:
    if query in BOOKS_CACHE:
        return BOOKS_CACHE[query]

    params = {
        "q": query,
        "maxResults": 20,  # Ζητάμε 20 για να έχουμε περιθώριο να "κόψουμε" τα άσχετα
        "printType": "books",
        "langRestrict": "en"  # Προαιρετικά, βοηθάει να φέρνει πιο γνωστά εξώφυλλα
    }
    if GOOGLE_BOOKS_API_KEY:
        params["key"] = GOOGLE_BOOKS_API_KEY

    async with books_semaphore:
        await asyncio.sleep(0.5)
        async with httpx.AsyncClient() as client:
            try:
                response = await client.get(GOOGLE_BOOKS_URL, params=params)
                if response.status_code == 429: return []
                response.raise_for_status()
            except httpx.HTTPError:
                return []

        data = response.json()
        clean_results = []

        # Λέξεις που "φωνάζουν" ότι το βιβλίο είναι εγχειρίδιο/άσχετο
        bad_words = ["mathematics", "science", "computers", "technology", "education", "business", "medical", "law",
                     "study", "textbook", "manual"]

        for item in data.get("items", []):
            info = item.get("volumeInfo", {})
            categories = [c.lower() for c in info.get("categories", [])]
            cat_str = " ".join(categories)

            # 1. ΑΥΣΤΗΡΟ ΦΙΛΤΡΟ: Αν έχει άσχετη κατηγορία, το πετάμε!
            if any(bad in cat_str for bad in bad_words):
                continue

            # 2. ΦΙΛΤΡΟ ΠΟΙΟΤΗΤΑΣ: Αν δεν έχει εξώφυλλο, το πετάμε (για να είναι ωραίο το UI)
            image_links = info.get("imageLinks", {})
            thumbnail = image_links.get("thumbnail") or image_links.get("smallThumbnail")
            if not thumbnail:
                continue

            authors = ", ".join(info.get("authors", ["Άγνωστος"]))

            clean_results.append({
                "external_id": item.get("id"),
                "title": info.get("title", "Χωρίς τίτλο"),
                "description": f"Author: {authors}",
                "year": info.get("publishedDate", "")[:4] if info.get("publishedDate") else "",
                "rating": info.get("averageRating", 0),
                "thumbnail": thumbnail.replace("http:", "https:"),  # Ασφάλεια για το frontend
                "source": "google_books",
                "type": "book"
            })

            # Σταματάμε όταν μαζέψουμε 10 ΚΑΛΑ βιβλία από αυτό το συγκεκριμένο query
            if len(clean_results) >= 10:
                break

        BOOKS_CACHE[query] = clean_results
        return clean_results