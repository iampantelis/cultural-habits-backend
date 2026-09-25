import random
import asyncio
from sqlmodel import Session, select
from .models import User, MediaItem, UserInteraction
from .services import search_tmdb_movies, search_spotify_music, search_google_books, get_similar_tmdb_movies, \
    get_trending_tmdb_movies


async def generate_holistic_recommendations(current_user: User, session: Session):
    # οι θετικές αξιολογήσεις του χρήστη (>= 4)
    statement = select(MediaItem).join(UserInteraction).where(
        (UserInteraction.user_id == current_user.id) &
        (UserInteraction.rating >= 4.0)
    )
    favorites = session.exec(statement).all()

    if not favorites:
        return await generate_trending_recommendations()

    # τυχαία έως 8, για να μη βγαίνουν προτάσεις μόνο από τα τελευταία που είδε
    seed_items = random.sample(favorites, min(8, len(favorites)))
    based_on_titles = [item.title for item in seed_items]

    tasks = []

    # για κάθε seed, ερωτήματα και στα τρία APIs με βάση τα μεταδεδομένα του
    for item in seed_items:
        clean_title = item.title.split(":")[0].split("(")[0].strip()

        if item.media_type == "movie":
            # ταινία -> παρόμοιες ταινίες (recommendations του TMDB)
            tasks.append(get_similar_tmdb_movies(item.external_id))

            # ταινία -> μουσική: ψάχνουμε το soundtrack
            tasks.append(search_spotify_music(f"{clean_title} original score"))

            # ταινία -> βιβλία με τον ίδιο τίτλο (μόνο fiction)
            tasks.append(search_google_books(f'subject:fiction intitle:"{clean_title}"'))

        elif item.media_type == "book":
            # ο συγγραφέας είναι στο description σαν "Author: ..."
            author = clean_title
            if item.description and "Author: " in item.description:
                author = item.description.replace("Author: ", "").split(",")[0].strip()

            # βιβλίο -> άλλα βιβλία του ίδιου συγγραφέα
            tasks.append(search_google_books(f'inauthor:"{author}" subject:fiction'))

            # βιβλίο -> ταινίες (πιθανή μεταφορά)
            tasks.append(search_tmdb_movies(clean_title))

            # βιβλίο -> μουσική
            tasks.append(search_spotify_music(f"{clean_title} audiobook OR score"))

        elif item.media_type == "music":
            # ο καλλιτέχνης είναι στο description σαν "Artist: ... | Album: ..."
            artist = clean_title
            if item.description and "Artist: " in item.description:
                artist = item.description.replace("Artist: ", "").split("|")[0].strip()

            # μουσική -> άλλα κομμάτια του ίδιου καλλιτέχνη
            tasks.append(search_spotify_music(f'artist:"{artist}"'))

            # μουσική -> ταινίες/ντοκιμαντέρ με το όνομά του
            tasks.append(search_tmdb_movies(artist))

            # μουσική -> βιογραφίες
            tasks.append(search_google_books(f'subject:music OR subject:biography "{artist}"'))

    # τα τρέχουμε όλα παράλληλα, αν αποτύχει ένα API δεν πέφτουν τα υπόλοιπα
    results = await asyncio.gather(*tasks, return_exceptions=True)

    recommendations = []
    for res in results:
        if not isinstance(res, Exception) and res:
            recommendations.extend(res)

    # έξω τα διπλότυπα και ό,τι έχει ήδη καταγράψει
    user_items_stmt = select(MediaItem).join(UserInteraction).where(
        UserInteraction.user_id == current_user.id
    )
    seen_ids = {item.external_id for item in session.exec(user_items_stmt).all()}

    unique_recs = []
    for rec in recommendations:
        if rec["external_id"] not in seen_ids:
            seen_ids.add(rec["external_id"])
            unique_recs.append(rec)

    # χωρίζουμε ανά μέσο για να βγει ισορροπημένο
    movies = [r for r in unique_recs if r["type"] == "movie"]
    books = [r for r in unique_recs if r["type"] == "book"]
    music = [r for r in unique_recs if r["type"] == "music"]

    # έως 15 από το καθένα
    final_movies = random.sample(movies, min(15, len(movies)))
    final_books = random.sample(books, min(15, len(books)))
    final_music = random.sample(music, min(15, len(music)))

    balanced = final_movies + final_books + final_music
    random.shuffle(balanced)

    # με λίγο ιστορικό μπορεί να βγουν λίγα, οπότε συμπληρώνουμε με trending
    if len(balanced) < 10:
        fallback = await generate_trending_recommendations()
        balanced.extend(fallback["recommendations"])

    return {
        "based_on": based_on_titles,
        "recommendations": balanced
    }


async def generate_trending_recommendations():
    """Cold start: τραβάει τις τρέχουσες τάσεις από τα ίδια τα APIs, χωρίς σταθερή λίστα."""
    tasks = [
        get_trending_tmdb_movies(),  # τάσεις εβδομάδας
        search_spotify_music("year:2024 genre:pop"),  # pop της χρονιάς
        search_spotify_music("year:2024 genre:rock"),  # rock της χρονιάς
        search_spotify_music("year:2024 genre:soundtrack"),
        search_google_books("subject:fiction bestseller"),  # bestsellers
        search_google_books("subject:fantasy epic"),
        search_google_books("subject:thriller mystery")
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    trending_items = []
    for res in results:
        if not isinstance(res, Exception) and res:
            trending_items.extend(res)

    # καθαρισμός διπλοτύπων και ισορροπία ανά μέσο
    seen_ids = set()
    unique_recs = []
    for rec in trending_items:
        if rec["external_id"] not in seen_ids:
            seen_ids.add(rec["external_id"])
            unique_recs.append(rec)

    movies = [r for r in unique_recs if r["type"] == "movie"]
    books = [r for r in unique_recs if r["type"] == "book"]
    music = [r for r in unique_recs if r["type"] == "music"]

    final_movies = random.sample(movies, min(12, len(movies)))
    final_books = random.sample(books, min(12, len(books)))
    final_music = random.sample(music, min(12, len(music)))

    balanced = final_movies + final_books + final_music
    random.shuffle(balanced)

    return {
        "message": "Κορυφαίες κυκλοφορίες και παγκόσμια trends βασισμένα σε πραγματικά δεδομένα.",
        "based_on": ["Global API Trends"],
        "recommendations": balanced
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