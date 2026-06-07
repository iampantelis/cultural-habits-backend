import random
import asyncio
from sqlmodel import Session, select
from .models import User, MediaItem, UserInteraction
from .services import search_tmdb_movies, search_spotify_music, search_google_books


async def generate_cross_media_recommendations(current_user: User, session: Session):
    # 1. Βρίσκουμε τις κορυφαίες αξιολογήσεις (rating >= 4.0), παίρνουμε τις 15 καλύτερες
    statement = select(MediaItem).join(UserInteraction).where(
        (UserInteraction.user_id == current_user.id) &
        (UserInteraction.rating >= 4.0)
    ).order_by(UserInteraction.rating.desc()).limit(15)

    top_items = session.exec(statement).all()

    if not top_items:
        return await generate_trending_recommendations()  # Fallback αν διαγράφηκαν αξιολογήσεις

    # Επιλέγουμε 3 τυχαία από τα καλύτερα για να υπάρχει ποικιλία σε κάθε refresh!
    favorite_items = random.sample(top_items, min(3, len(top_items)))

    tasks = []
    for item in favorite_items:
        query = item.title

        # Προσθέτουμε λίγο 'context' στα queries για καλύτερα αποτελέσματα
        if item.media_type == "movie":
            tasks.append(search_tmdb_movies(query))
            tasks.append(search_google_books(query))
            tasks.append(search_spotify_music(f"{query} soundtrack OR {query} ost"))

        elif item.media_type == "book":
            tasks.append(search_tmdb_movies(query))
            tasks.append(search_google_books(f"{query} novel"))
            tasks.append(search_spotify_music(f"{query} audiobook OR {query} epic"))

        elif item.media_type == "music":
            tasks.append(search_tmdb_movies(query))
            tasks.append(search_spotify_music(query))
            tasks.append(search_google_books(f"{query} biography OR {query} music"))

    recommendations = []
    if tasks:
        results = await asyncio.gather(*tasks, return_exceptions=True)
        for res in results:
            if isinstance(res, Exception) or not res:
                continue
            recommendations.extend(res)

    # 2. Αφαίρεση ήδη αποθηκευμένων έργων του χρήστη (εξαιρετική δική σου προσθήκη!)
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

    # 3. Αν για κάποιο λόγο τα unique είναι άδεια (π.χ. τα έχει δει όλα), πάμε στα Trending
    if not unique_recommendations:
        return await generate_trending_recommendations()

    # 4. Ανακατεύουμε για να μην βλέπει μόνο ταινίες στις πρώτες θέσεις
    random.shuffle(unique_recommendations)

    return {
        "based_on": [item.title for item in favorite_items],
        "recommendations": unique_recommendations[:12]
    }


async def generate_trending_recommendations():
    movie_queries = ["Inception", "Dune", "Interstellar", "The Dark Knight", "Avengers", "Matrix"]
    music_queries = ["Top 50", "Global Hits", "Viral Pop", "Rock Classics", "Epic Soundtracks"]
    book_queries = ["subject:fiction", "Harry Potter", "1984", "Lord of the Rings", "Dune"]

    results = await asyncio.gather(
        search_tmdb_movies(random.choice(movie_queries)),
        search_spotify_music(random.choice(music_queries)),
        search_google_books(random.choice(book_queries)),
        return_exceptions=True  # Προσθήκη ασφάλειας και εδώ!
    )

    trending_items = []
    if not isinstance(results[0], Exception) and results[0]: trending_items.extend(results[0][:4])
    if not isinstance(results[1], Exception) and results[1]: trending_items.extend(results[1][:4])
    if not isinstance(results[2], Exception) and results[2]: trending_items.extend(results[2][:4])

    random.shuffle(trending_items)

    return {
        "message": "Καλώς ήρθατε! Επειδή δεν έχουμε ακόμα δεδομένα για το γούστο σας, ορίστε μερικές δημοφιλείς προτάσεις για να ξεκινήσετε:",
        "based_on": ["Trending Globally"],
        "recommendations": trending_items
    }


async def get_smart_recommendations(current_user: User, session: Session):
    statement = select(UserInteraction).where(
        (UserInteraction.user_id == current_user.id) &
        (UserInteraction.rating >= 4.0)
    ).limit(1)

    has_history = session.exec(statement).first()

    if has_history:
        return await generate_cross_media_recommendations(current_user, session)
    else:
        return await generate_trending_recommendations()