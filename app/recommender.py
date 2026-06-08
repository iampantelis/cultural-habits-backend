import random
import asyncio
from sqlmodel import Session, select
from .models import User, MediaItem, UserInteraction
from .services import search_tmdb_movies, search_spotify_music, search_google_books, get_similar_tmdb_movies, \
    get_trending_tmdb_movies


async def generate_holistic_recommendations(current_user: User, session: Session):
    # 1. Παίρνουμε όλες τις θετικές αξιολογήσεις του χρήστη
    statement = select(MediaItem).join(UserInteraction).where(
        (UserInteraction.user_id == current_user.id) &
        (UserInteraction.rating >= 4.0)
    )
    favorites = session.exec(statement).all()

    if not favorites:
        return await generate_trending_recommendations()

    # Διαλέγουμε μέχρι 8 αντικείμενα (για να έχουμε μεγάλη παραγωγή δεδομένων)
    seed_items = random.sample(favorites, min(8, len(favorites)))
    based_on_titles = [item.title for item in seed_items]

    tasks = []

    # 2. PURE DATA-DRIVEN QUERIES (Εξαγωγή Μεταδεδομένων από τη Βάση)
    for item in seed_items:
        clean_title = item.title.split(":")[0].split("(")[0].strip()

        if item.media_type == "movie":
            # ΤΑΙΝΙΕΣ -> Παρόμοιες Ταινίες
            tasks.append(get_similar_tmdb_movies(item.external_id))

            # ΤΑΙΝΙΕΣ -> Στοχευμένη Μουσική (Μόνο το επίσημο Soundtrack)
            tasks.append(search_spotify_music(f"{clean_title} original score"))

            # ΤΑΙΝΙΕΣ -> Βιβλία (Αυστηρά λογοτεχνία που περιέχει τον τίτλο)
            tasks.append(search_google_books(f'subject:fiction intitle:"{clean_title}"'))

        elif item.media_type == "book":
            # ΕΞΑΓΩΓΗ ΣΥΓΓΡΑΦΕΑ: Διαβάζουμε το description ("Author: Τάδε")
            author = clean_title
            if item.description and "Author: " in item.description:
                author = item.description.replace("Author: ", "").split(",")[0].strip()

            # ΒΙΒΛΙΑ -> Βιβλία (Ψάχνουμε άλλα βιβλία του ΙΔΙΟΥ συγγραφέα!)
            tasks.append(search_google_books(f'inauthor:"{author}" subject:fiction'))

            # ΒΙΒΛΙΑ -> Ταινίες (Κινηματογραφικές μεταφορές)
            tasks.append(search_tmdb_movies(clean_title))

            # ΒΙΒΛΙΑ -> Μουσική
            tasks.append(search_spotify_music(f"{clean_title} audiobook OR score"))

        elif item.media_type == "music":
            # ΕΞΑΓΩΓΗ ΚΑΛΛΙΤΕΧΝΗ: Διαβάζουμε το description ("Artist: Τάδε | Album: ...")
            artist = clean_title
            if item.description and "Artist: " in item.description:
                artist = item.description.replace("Artist: ", "").split("|")[0].strip()

            # ΜΟΥΣΙΚΗ -> Μουσική (Άλλα κομμάτια του ίδιου καλλιτέχνη)
            tasks.append(search_spotify_music(f'artist:"{artist}"'))

            # ΜΟΥΣΙΚΗ -> Ταινίες (Ταινίες/Ντοκιμαντέρ με το όνομά του)
            tasks.append(search_tmdb_movies(artist))

            # ΜΟΥΣΙΚΗ -> Βιβλία (Βιογραφίες αυτού του καλλιτέχνη)
            tasks.append(search_google_books(f'subject:music OR subject:biography "{artist}"'))

    # Εκτέλεση όλων των στοχευμένων ερωτημάτων
    results = await asyncio.gather(*tasks, return_exceptions=True)

    recommendations = []
    for res in results:
        if not isinstance(res, Exception) and res:
            recommendations.extend(res)

    # 3. Αφαίρεση Διπλοτύπων & Εγγραφών που έχει ήδη
    user_items_stmt = select(MediaItem).join(UserInteraction).where(
        UserInteraction.user_id == current_user.id
    )
    seen_ids = {item.external_id for item in session.exec(user_items_stmt).all()}

    unique_recs = []
    for rec in recommendations:
        if rec["external_id"] not in seen_ids:
            seen_ids.add(rec["external_id"])
            unique_recs.append(rec)

    # 4. Ισορροπία Κατηγοριών (Μαζεύουμε όσα περισσότερα niche/σχετικά βρήκε)
    movies = [r for r in unique_recs if r["type"] == "movie"]
    books = [r for r in unique_recs if r["type"] == "book"]
    music = [r for r in unique_recs if r["type"] == "music"]

    # Παίρνουμε μέχρι 15 από το καθένα για τεράστιο carousel
    final_movies = random.sample(movies, min(15, len(movies)))
    final_books = random.sample(books, min(15, len(books)))
    final_music = random.sample(music, min(15, len(music)))

    balanced = final_movies + final_books + final_music
    random.shuffle(balanced)

    # Αν η βάση δεδομένων του χρήστη είναι πολύ μικρή και δεν έφερε αρκετά:
    if len(balanced) < 10:
        fallback = await generate_trending_recommendations()
        balanced.extend(fallback["recommendations"])

    return {
        "based_on": based_on_titles,
        "recommendations": balanced
    }


async def generate_trending_recommendations():
    """
    Το Cold Start τώρα ψάχνει Δυναμικά τις τρέχουσες τάσεις των APIs,
    χωρίς ΚΑΜΙΑ hardcoded λίστα.
    """
    tasks = [
        get_trending_tmdb_movies(),  # Tι βλέπει ο κόσμος ΣΗΜΕΡΑ
        search_spotify_music("year:2024 genre:pop"),  # Top Pop του έτους
        search_spotify_music("year:2024 genre:rock"),  # Top Rock του έτους
        search_spotify_music("year:2024 genre:soundtrack"),
        search_google_books("subject:fiction bestseller"),  # Βιβλία Best Sellers
        search_google_books("subject:fantasy epic"),
        search_google_books("subject:thriller mystery")
    ]

    results = await asyncio.gather(*tasks, return_exceptions=True)

    trending_items = []
    for res in results:
        if not isinstance(res, Exception) and res:
            trending_items.extend(res)

    # Καθαρισμός και Ισορροπία
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