import random
import asyncio
from sqlmodel import Session, select
from .models import User, MediaItem, UserInteraction
from .services import search_tmdb_movies, search_spotify_music, search_google_books


async def generate_cross_media_recommendations(current_user: User, session: Session):
    """
    Αναλύει το ιστορικό του χρήστη και επιστρέφει διασταυρούμενες συστάσεις
    (π.χ. Βιβλία για αγαπημένες ταινίες, Soundtrack για ταινίες, κλπ.)
    """
    # 1. Βρίσκουμε τις 3 καλύτερες αξιολογήσεις του χρήστη (Βαθμολογία >= 4.0)
    statement = select(MediaItem).join(UserInteraction).where(
        (UserInteraction.user_id == current_user.id) &
        (UserInteraction.rating >= 4.0)
    ).order_by(UserInteraction.rating.desc()).limit(3)

    favorite_items = session.exec(statement).all()

    if not favorite_items:
        return {
            "message": "Δεν έχετε αρκετές υψηλές βαθμολογίες. Δοκιμάστε να βαθμολογήσετε μερικά έργα με 4 ή 5 αστέρια!",
            "recommendations": []
        }

    recommendations = []
    tasks = []

    # 2. Φτιάχνουμε τα ασύγχρονα αιτήματα (Tasks) για κάθε αγαπημένο έργο
    for item in favorite_items:
        query = item.title

        if item.media_type == "movie":
            # Αν του άρεσε ταινία -> Ψάχνουμε Βιβλίο και Soundtrack
            tasks.append(search_google_books(query))
            tasks.append(search_spotify_music(f"{query} soundtrack"))

        elif item.media_type == "book":
            # Αν του άρεσε βιβλίο -> Ψάχνουμε Ταινία ή Μουσική εμπνευσμένη από αυτό
            tasks.append(search_tmdb_movies(query))

        elif item.media_type == "music":
            # Αν του άρεσε μουσική/soundtrack -> Ψάχνουμε Ταινία
            tasks.append(search_tmdb_movies(query))

    # 3. Εκτελούμε όλα τα tasks ΤΑΥΤΟΧΡΟΝΑ για μέγιστη ταχύτητα
    if tasks:
        results = await asyncio.gather(*tasks)

        # Το results είναι μια λίστα από λίστες. Τις ενώνουμε σε μία.
        for res_list in results:
            recommendations.extend(res_list)

    # 4. Αφαίρεση διπλοτύπων βάσει του external_id και φιλτράρισμα
    seen_ids = set()
    unique_recommendations = []

    for rec in recommendations:
        if rec["external_id"] not in seen_ids:
            seen_ids.add(rec["external_id"])
            unique_recommendations.append(rec)

    return {
        "based_on": [item.title for item in favorite_items],
        "recommendations": unique_recommendations[:10]  # Επιστρέφουμε τα top 10 καλύτερα
    }


async def generate_trending_recommendations():
    """
    Cold Start: Φέρνει δημοφιλή αποτελέσματα για νέους χρήστες ανακυκλώνοντας
    τις υπάρχουσες συναρτήσεις αναζήτησης με "έξυπνα" keywords.
    """
    # Λίστες με δημοφιλή keywords για να υπάρχει ποικιλία σε κάθε ανανέωση
    movie_queries = ["Inception", "Dune", "Interstellar", "The Dark Knight", "Avengers", "Matrix"]
    music_queries = ["Top 50", "Global Hits", "Viral Pop", "Rock Classics", "Epic Soundtracks"]
    book_queries = ["subject:fiction", "Harry Potter", "1984", "Lord of the Rings", "Dune"]

    # Διαλέγουμε ένα τυχαίο keyword από κάθε κατηγορία
    movie_task = search_tmdb_movies(random.choice(movie_queries))
    music_task = search_spotify_music(random.choice(music_queries))
    book_task = search_google_books(random.choice(book_queries))

    # Τρέχουμε τα tasks παράλληλα
    results = await asyncio.gather(movie_task, music_task, book_task)

    trending_items = []
    # Παίρνουμε τα 3 κορυφαία από κάθε κατηγορία
    if results[0]: trending_items.extend(results[0][:3])  # Ταινίες
    if results[1]: trending_items.extend(results[1][:3])  # Μουσική
    if results[2]: trending_items.extend(results[2][:3])  # Βιβλία

    # Ανακατεύουμε τη λίστα για να φαίνεται σαν ένα φυσικό, οργανικό "Feed"
    random.shuffle(trending_items)

    return {
        "message": "Καλώς ήρθατε! Επειδή δεν έχουμε ακόμα δεδομένα για το γούστο σας, ορίστε μερικές δημοφιλείς προτάσεις για να ξεκινήσετε:",
        "based_on": ["Trending Globally"],
        "recommendations": trending_items
    }


async def get_smart_recommendations(current_user: User, session: Session):
    """
    Ελέγχει το ιστορικό του χρήστη και αποφασίζει ποιον αλγόριθμο θα τρέξει (Router)
    """
    # Ελέγχουμε αν ο χρήστης έχει τουλάχιστον 1 βαθμολογία >= 4.0
    statement = select(UserInteraction).where(
        (UserInteraction.user_id == current_user.id) &
        (UserInteraction.rating >= 4.0)
    ).limit(1)

    has_history = session.exec(statement).first()

    if has_history:
        # Αν έχει ιστορικό, του δίνουμε προσωποποιημένες συστάσεις (Cross-Media)!
        return await generate_cross_media_recommendations(current_user, session)
    else:
        # Αν είναι νέος (Cold Start), του δίνουμε τα Trending!
        return await generate_trending_recommendations()