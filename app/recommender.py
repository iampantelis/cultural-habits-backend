import random
import asyncio
from sqlmodel import Session, select
from .models import User, MediaItem, UserInteraction
from .services import search_tmdb_movies, search_spotify_music, search_google_books, get_similar_tmdb_movies, get_trending_tmdb_movies


# --- SMART FALLBACK FUNCTIONS (Η Δραστική Λύση) ---

async def smart_movie_to_book(title: str):
    """Ψάχνει το ακριβές βιβλίο. Αν δεν υπάρχει, επιστρέφει κορυφαία Λογοτεχνία/Sci-Fi."""
    # 1. Προσπάθεια εύρεσης ακριβούς μεταφοράς (π.χ. Dune, Harry Potter)
    exact_match = await search_google_books(f'intitle:"{title}" subject:fiction')
    if exact_match:
        return exact_match

    # 2. Αν η ταινία δεν βασίζεται σε βιβλίο, φέρνουμε βιβλία που ταιριάζουν στο vibe της ταινίας!
    vibes = ["subject:science fiction", "subject:thriller", "subject:fantasy", "subject:mystery"]
    return await search_google_books(random.choice(vibes))


async def smart_music_to_book(artist_or_title: str):
    """Ψάχνει βιογραφίες ή βιβλία για μουσική."""
    res = await search_google_books(f'intitle:"{artist_or_title}" subject:biography OR music')
    if res:
        return res
    return await search_google_books('subject:music biography')


# ---------------------------------------------------

async def generate_holistic_recommendations(current_user: User, session: Session):
    statement = select(MediaItem).join(UserInteraction).where(
        (UserInteraction.user_id == current_user.id) &
        (UserInteraction.rating >= 4.0)
    )
    all_favorite_items = session.exec(statement).all()

    if not all_favorite_items:
        return await generate_trending_recommendations()

    fav_movies = [item for item in all_favorite_items if item.media_type == "movie"]
    fav_books = [item for item in all_favorite_items if item.media_type == "book"]
    fav_music = [item for item in all_favorite_items if item.media_type == "music"]

    sample_movies = random.sample(fav_movies, min(5, len(fav_movies)))
    sample_books = random.sample(fav_books, min(5, len(fav_books)))
    sample_music = random.sample(fav_music, min(5, len(fav_music)))

    sample_items = sample_movies + sample_books + sample_music
    all_titles = [item.title for item in sample_items]

    tasks = []

    for item in sample_items:
        clean_title = item.title.split(":")[0].split("(")[0].strip()
        if not clean_title: continue

        if item.media_type == "movie":
            tasks.append(get_similar_tmdb_movies(item.external_id))
            tasks.append(smart_movie_to_book(clean_title))  # Χρήση του Smart Function!
            tasks.append(search_spotify_music(f"{clean_title} soundtrack"))

        elif item.media_type == "book":
            tasks.append(search_tmdb_movies(clean_title))
            tasks.append(search_google_books(f'subject:"fiction" {clean_title}'))
            tasks.append(search_spotify_music(f"{clean_title} score OR instrumental"))

        elif item.media_type == "music":
            tasks.append(search_tmdb_movies(clean_title))
            tasks.append(search_spotify_music(clean_title))
            tasks.append(smart_music_to_book(clean_title))  # Χρήση του Smart Function!

    recommendations = []
    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for res in results:
            if isinstance(res, Exception) or not res:
                continue
            recommendations.extend(res)

    user_items_stmt = select(MediaItem).join(UserInteraction).where(
        UserInteraction.user_id == current_user.id
    )
    user_items = session.exec(user_items_stmt).all()
    seen_ids = {item.external_id for item in user_items}

    unique_recommendations = []
    for rec in recommendations:
        if rec["external_id"] not in seen_ids:
            seen_ids.add(rec["external_id"])
            unique_recommendations.append(rec)

    if not unique_recommendations:
        return await generate_trending_recommendations()

    # Ισορροπημένο Τελικό Αποτέλεσμα (Έως 5 ταινίες, 5 βιβλία, 5 μουσικές)
    final_movies = [r for r in unique_recommendations if r["type"] == "movie"]
    final_books = [r for r in unique_recommendations if r["type"] == "book"]
    final_music = [r for r in unique_recommendations if r["type"] == "music"]

    balanced_recommendations = final_movies[:5] + final_books[:5] + final_music[:5]
    random.shuffle(balanced_recommendations)

    display_based_on = all_titles if len(all_titles) <= 5 else random.sample(all_titles, 5) + ["...και άλλα"]

    return {
        "based_on": display_based_on,
        "recommendations": balanced_recommendations
    }


async def generate_trending_recommendations():
    # Λίστες με "Σίγουρα Χαρτιά" (Μεγάλοι καλλιτέχνες & Best-Selling Συγγραφείς)
    all_music_artists = ["The Weeknd", "Coldplay", "Dua Lipa", "Hans Zimmer", "Arctic Monkeys", "Taylor Swift",
                         "Daft Punk", "Queen", "Ed Sheeran", "Billie Eilish"]
    all_book_authors = [
        'inauthor:"Stephen King" subject:fiction',
        'inauthor:"J.R.R. Tolkien" subject:fiction',
        'inauthor:"George R.R. Martin" subject:fiction',
        'inauthor:"Agatha Christie" subject:fiction',
        'inauthor:"Neil Gaiman" subject:fiction',
        'inauthor:"J.K. Rowling" subject:fiction',
        'inauthor:"Frank Herbert" subject:fiction',
        'inauthor:"Isaac Asimov" subject:fiction'
    ]

    # Διαλέγουμε 4 ΔΙΑΦΟΡΕΤΙΚΟΥΣ καλλιτέχνες και 4 ΔΙΑΦΟΡΕΤΙΚΟΥΣ συγγραφείς για ΑΥΤΗ την ανανέωση
    selected_artists = random.sample(all_music_artists, 4)
    selected_authors = random.sample(all_book_authors, 4)

    # Ετοιμάζουμε ταυτόχρονα αιτήματα για ΟΛΟΥΣ
    tasks = [get_trending_tmdb_movies()]
    for artist in selected_artists:
        tasks.append(search_spotify_music(artist))
    for author in selected_authors:
        tasks.append(search_google_books(author))

    # Εκτελούμε όλα τα αιτήματα παράλληλα!
    results = await asyncio.gather(*tasks, return_exceptions=True)

    trending_items = []

    # 1. Ταινίες (Είναι το 1ο task στη λίστα, index 0)
    movies_res = results[0]
    if not isinstance(movies_res, Exception) and movies_res:
        # Παίρνουμε 4 τυχαίες από τα σημερινά trends του TMDB
        trending_items.extend(random.sample(movies_res, min(4, len(movies_res))))

    # 2. Μουσική (Είναι τα tasks 1 έως 4)
    for i in range(1, 5):
        res = results[i]
        if not isinstance(res, Exception) and res and len(res) > 0:
            # Προσθέτουμε ΜΟΝΟ το Νο1 κομμάτι του κάθε καλλιτέχνη
            trending_items.append(res[0])

            # 3. Βιβλία (Είναι τα tasks 5 έως 8)
    for i in range(5, 9):
        res = results[i]
        if not isinstance(res, Exception) and res and len(res) > 0:
            # Προσθέτουμε ΜΟΝΟ το κορυφαίο βιβλίο του κάθε συγγραφέα
            trending_items.append(res[0])

            # Τα ανακατεύουμε για να εμφανιστούν όμορφα (ταινία, μουσική, βιβλίο, κλπ)
    random.shuffle(trending_items)

    return {
        "message": "Ανακαλύψτε τις πιο καυτές ταινίες της εβδομάδας, κορυφαίους καλλιτέχνες και διαχρονικά βιβλία.",
        "based_on": ["Trending & Classics"],
        "recommendations": trending_items
    }
async def get_smart_recommendations(current_user: User, session: Session):
    statement = select(UserInteraction).where(
        (UserInteraction.user_id == current_user.id) &
        (UserInteraction.rating >= 4.0)
    ).limit(1)

    has_history = session.exec(statement).first()

    if has_history:
        return await generate_holistic_recommendations(current_user, session)
    else:
        return await generate_trending_recommendations()