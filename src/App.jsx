// src/App.jsx
import { useState, useRef, useEffect } from "react";
import { moodMap } from "./moodMap";
import "./App.css";
import "./Chatbot.css";
import Chatbot from "./Chatbot";

function App() {
  const [movies, setMovies] = useState([]);
  const [selectedMood, setSelectedMood] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [movieDetails, setMovieDetails] = useState(null);
  const [watchProviders, setWatchProviders] = useState(null);

  // 🔽 FILTER STATES
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [yearFrom, setYearFrom] = useState("");
  const [yearTo, setYearTo] = useState("");
  const [sortBy, setSortBy] = useState("popularity.desc");
  const [language, setLanguage] = useState("");
  const [ratingMin, setRatingMin] = useState("");
  const [runtimeMin, setRuntimeMin] = useState("");
  const [runtimeMax, setRuntimeMax] = useState("");
  const [castQuery, setCastQuery] = useState("");

  const movieCatalogRef = useRef(null);
  const API_KEY = "769e1fcb627e971867c6abe2e84bc17a";

  // Prevent background scroll while modal is open
  useEffect(() => {
    document.body.style.overflow = selectedMovie ? "hidden" : "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [selectedMovie]);

  // Generate year options
  const yearOptions = () => {
    const currentYear = new Date().getFullYear();
    return Array.from({ length: 60 }, (_, i) => currentYear - i);
  };

  // Fetch movies with filters
  const fetchMovies = async (pageNum = 1, overwrite = true) => {
    if (!selectedMood && !castQuery) return;

    setIsLoading(true);
    if (overwrite) setMovies([]);

    try {
      let url = "";
      const params = new URLSearchParams({
        api_key: API_KEY,
        sort_by: sortBy,
        page: pageNum,
      });

      if (language) params.append("with_original_language", language);
      if (ratingMin) params.append("vote_average.gte", ratingMin);
      if (runtimeMin) params.append("with_runtime.gte", runtimeMin);
      if (runtimeMax) params.append("with_runtime.lte", runtimeMax);
      if (yearFrom) params.append("primary_release_date.gte", `${yearFrom}-01-01`);
      if (yearTo) params.append("primary_release_date.lte", `${yearTo}-12-31`);

      if (selectedMood) {
        params.append("with_genres", moodMap[selectedMood].genres.join(","));
        url = `https://api.themoviedb.org/3/discover/movie?${params.toString()}`;
      } else if (castQuery) {
        const actorRes = await fetch(
          `https://api.themoviedb.org/3/search/person?api_key=${API_KEY}&query=${encodeURIComponent(
            castQuery
          )}`
        );
        const actorJson = await actorRes.json();
        const actor = actorJson.results?.[0];
        if (!actor) {
          alert("No actor found with that name.");
          setIsLoading(false);
          return;
        }
        params.append("with_cast", actor.id);
        url = `https://api.themoviedb.org/3/discover/movie?${params.toString()}`;
      }

      const res = await fetch(url);
      const data = await res.json();
      setMovies((prev) => (overwrite ? data.results : [...prev, ...data.results]));
      setPage(pageNum);

      setTimeout(() => {
        movieCatalogRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
    } catch (err) {
      console.error("Error fetching movies:", err);
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch movie details for modal
  useEffect(() => {
    if (!selectedMovie) return;
    const fetchDetails = async () => {
      try {
        setMovieDetails(null);
        setWatchProviders(null);

        const [detailsRes, providersRes] = await Promise.all([
          fetch(
            `https://api.themoviedb.org/3/movie/${selectedMovie.id}?api_key=${API_KEY}&append_to_response=external_ids`
          ),
          fetch(
            `https://api.themoviedb.org/3/movie/${selectedMovie.id}/watch/providers?api_key=${API_KEY}`
          ),
        ]);

        const detailsJson = await detailsRes.json();
        const providersJson = await providersRes.json();

        setMovieDetails(detailsJson);
        setWatchProviders(providersJson.results?.US || null);
      } catch (error) {
        console.error("Details error:", error);
      }
    };
    fetchDetails();
  }, [selectedMovie]);

  // Close modal
  const closeModal = () => {
    setSelectedMovie(null);
    setMovieDetails(null);
    setWatchProviders(null);
  };

  // Filters actions
  const applyFilters = () => {
    fetchMovies(1, true);
  };
  const clearFilters = () => {
    setYearFrom("");
    setYearTo("");
    setSortBy("popularity.desc");
    setLanguage("");
    setRatingMin("");
    setRuntimeMin("");
    setRuntimeMax("");
    setCastQuery("");
    fetchMovies(1, true);
  };

  // Chatbot -> App
  const handleChatbotResults = (results) => {
    setSelectedMood(null);
    setMovies(results);
    setPage(1);
    setTimeout(() => {
      movieCatalogRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  return (
    <div className="app-container">
      <Chatbot apiKey={API_KEY} onResults={handleChatbotResults} />
      <h1>
        <span className="title-emoji">🎬</span>
        MoodFlix
      </h1>
      <p className="subtitle">What's your cinematic vibe today?</p>

      {/* Mood buttons */}
      <div className="mood-buttons">
        {Object.entries(moodMap).map(([moodKey, moodData]) => {
          const emoji = moodData.label.split(" ")[0];
          return (
            <button
              key={moodKey}
              className={`mood-button ${selectedMood === moodKey ? "active" : ""}`}
              onClick={() => {
                if (selectedMood !== moodKey) {
                  setSelectedMood(moodKey);
                  setSelectedMovie(null);
                  fetchMovies(1, true);
                }
              }}
              disabled={isLoading && selectedMood === moodKey}
            >
              <span className="emoji-3d" data-emoji={moodKey}>
                {emoji}
              </span>
              <span className="mood-label">
                {moodData.label.split(" ").slice(1).join(" ")}
              </span>
            </button>
          );
        })}
      </div>

      {/* Filters (only show after mood/movies chosen) */}
      {(selectedMood || movies.length > 0) && (
        <div className="filters-panel">
          <button
            className="filters-toggle"
            onClick={() => setFiltersOpen((v) => !v)}
            aria-expanded={filtersOpen}
          >
            {filtersOpen ? "Hide Filters" : "Show Filters"} ⚙️
          </button>

          {filtersOpen && (
            <div className="filters-grid">
              <div className="filter-item">
                <label>Year From</label>
                <select value={yearFrom} onChange={(e) => setYearFrom(e.target.value)}>
                  <option value="">Any</option>
                  {yearOptions().map((y) => (
                    <option key={`from-${y}`} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <label>Year To</label>
                <select value={yearTo} onChange={(e) => setYearTo(e.target.value)}>
                  <option value="">Any</option>
                  {yearOptions().map((y) => (
                    <option key={`to-${y}`} value={y}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <label>Sort By</label>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
                  <option value="popularity.desc">Popularity ↓</option>
                  <option value="vote_average.desc">Rating ↓</option>
                  <option value="release_date.desc">Release date ↓</option>
                  <option value="revenue.desc">Revenue ↓</option>
                </select>
              </div>

              <div className="filter-item">
                <label>Language</label>
                <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                  <option value="">Any</option>
                  <option value="en">English</option>
                  <option value="es">Spanish</option>
                  <option value="fr">French</option>
                  <option value="de">German</option>
                  <option value="it">Italian</option>
                  <option value="hi">Hindi</option>
                  <option value="ja">Japanese</option>
                  <option value="ko">Korean</option>
                  <option value="zh">Chinese</option>
                </select>
              </div>

              <div className="filter-item">
                <label>Min Rating</label>
                <select value={ratingMin} onChange={(e) => setRatingMin(e.target.value)}>
                  <option value="">Any</option>
                  {[9, 8.5, 8, 7.5, 7, 6.5, 6, 5.5, 5].map((r) => (
                    <option key={r} value={r}>
                      {r}+
                    </option>
                  ))}
                </select>
              </div>

              <div className="filter-item">
                <label>Runtime ≥ (min)</label>
                <select
                  value={runtimeMin}
                  onChange={(e) => setRuntimeMin(e.target.value)}
                >
                  <option value="">Any</option>
                  <option value="80">80</option>
                  <option value="90">90</option>
                  <option value="100">100</option>
                  <option value="120">120</option>
                  <option value="140">140</option>
                </select>
              </div>

              <div className="filter-item">
                <label>Runtime ≤ (min)</label>
                <select
                  value={runtimeMax}
                  onChange={(e) => setRuntimeMax(e.target.value)}
                >
                  <option value="">Any</option>
                  <option value="90">90</option>
                  <option value="100">100</option>
                  <option value="120">120</option>
                  <option value="140">140</option>
                  <option value="180">180</option>
                </select>
              </div>

              <div className="filter-item wide">
                <label>Cast (actor name)</label>
                <input
                  type="text"
                  value={castQuery}
                  onChange={(e) => setCastQuery(e.target.value)}
                  placeholder="e.g., Leonardo DiCaprio"
                />
              </div>

              <div className="filters-actions">
                <button className="apply-btn" onClick={applyFilters} disabled={isLoading}>
                  Apply Filters
                </button>
                <button className="clear-btn" onClick={clearFilters} disabled={isLoading}>
                  Clear
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Movie list */}
      {isLoading && movies.length === 0 ? (
        <div className="loader">
          <span className="popcorn-emoji">🍿</span> Loading movies...
        </div>
      ) : (
        (selectedMood || movies.length > 0) && (
          <>
            <div className="movie-list" ref={movieCatalogRef}>
              {movies.map((movie) => (
                <div
                  key={`${movie.id}-${page}`}
                  className="movie-card"
                  onClick={() => setSelectedMovie(movie)}
                >
                  {movie.poster_path ? (
                    <img
                      src={`https://image.tmdb.org/t/p/w300${movie.poster_path}`}
                      alt={movie.title}
                      loading="lazy"
                    />
                  ) : (
                    <div className="no-poster">🎬</div>
                  )}
                  <h3>{movie.title}</h3>
                </div>
              ))}
            </div>

            {movies.length > 0 && (
              <div className="load-more-container">
                <button
                  className="load-more-button"
                  onClick={() => fetchMovies(page + 1, false)}
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <>
                      <span className="loading-spinner"></span>
                      Loading...
                    </>
                  ) : (
                    "Load More"
                  )}
                </button>
              </div>
            )}
          </>
        )
      )}

      {/* Movie details modal */}
      {selectedMovie && (
        <div className="movie-overlay" onClick={closeModal}>
          <div className="movie-modal" onClick={(e) => e.stopPropagation()}>
            <button className="close-btn" onClick={closeModal}>
              ×
            </button>
            {movieDetails && (
              <div className="modal-content">
                <div className="poster-side">
                  <img
                    src={
                      movieDetails.poster_path
                        ? `https://image.tmdb.org/t/p/w500${movieDetails.poster_path}`
                        : "/placeholder-movie.png"
                    }
                    alt={movieDetails.title}
                  />
                </div>
                <div className="info-side">
                  <h2>
                    {movieDetails.title}
                    <span>
                      (
                      {movieDetails.release_date
                        ? new Date(movieDetails.release_date).getFullYear()
                        : ""}
                      )
                    </span>
                  </h2>
                  <div className="ratings">
                    <div className="rating">
                      <span>⭐</span>
                      <span>{movieDetails.vote_average?.toFixed(1)}/10</span>
                      <small>TMDB</small>
                    </div>
                    {movieDetails.external_ids?.imdb_id && (
                      <a
                        href={`https://www.imdb.com/title/${movieDetails.external_ids.imdb_id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="rating"
                      >
                        <span>🌟</span>
                        <span>IMDb</span>
                      </a>
                    )}
                  </div>
                  <p className="overview">
                    {movieDetails.overview || "No overview available."}
                  </p>
                  {watchProviders?.flatrate && (
                    <div className="providers">
                      <h3>Where to Watch:</h3>
                      <div className="provider-list">
                        {watchProviders.flatrate.map((provider) => (
                          <div key={provider.provider_id} className="provider">
                            <img
                              src={`https://image.tmdb.org/t/p/w200${provider.logo_path}`}
                              alt={provider.provider_name}
                            />
                            <span>{provider.provider_name}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
