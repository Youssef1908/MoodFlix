import React, { useEffect, useRef, useState } from "react";
import "./Chatbot.css";

/**
 * Bottom-right floating chatbot for free-form movie requests.
 * Props:
 *  - apiKey: TMDB API key (string)
 *  - onResults: (resultsArray, originalQuery) => void
 */
export default function Chatbot({ apiKey, onResults }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([
    { sender: "bot", text: "Hi! Tell me what you feel like watching 😊" },
  ]);
  const [input, setInput] = useState("");
  const [searching, setSearching] = useState(false);
  const scrollRef = useRef(null);

  // always scroll to newest message
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open]);

  const push = (sender, text) =>
    setMessages((prev) => [...prev, { sender, text }]);

  // --- tiny “NLP”: pull signals from text
  const intentFromPrompt = (raw) => {
    const p = raw.toLowerCase();

    // rough year / recency signals
    let yearGte = null, yearLte = null, minVote = 50, sortBy = "popularity.desc";
    if (/\b(recent|new|latest|this year|last year|newer)\b/.test(p)) {
      const now = new Date().getFullYear();
      yearGte = String(now - 5) + "-01-01";
      sortBy = "vote_count.desc";
    }
    if (/\bclassic|old(er)?\b/.test(p)) {
      yearLte = "2005-12-31";
    }
    if (/\bunderrated|hidden gem|obscure\b/.test(p)) {
      minVote = 10;
      sortBy = "vote_average.desc";
    }

    // phrases we’ll try to convert to TMDB keywords
    const phraseBank = [
      "wrongfully convicted", "unjustly imprisoned", "prison",
      "meaning of life", "existential", "road trip", "coming of age",
      "detective", "investigation", "murder", "serial killer", "revenge",
      "heist", "courtroom", "based on a true story", "biopic", "time travel",
      "space", "aliens", "apocalypse", "post apocalyptic", "zombie",
      "sports", "boxing", "mafia", "gangster", "spy", "espionage"
    ];
    const phrases = phraseBank.filter(ph =>
      new RegExp(`\\b${ph.replace(/\s+/g, "\\s+")}\\b`).test(p)
    );

    // map obvious genres
    const genreMap = {
      action: 28, adventure: 12, animation: 16, comedy: 35, crime: 80,
      documentary: 99, drama: 18, family: 10751, fantasy: 14, history: 36,
      horror: 27, music: 10402, mystery: 9648, romance: 10749,
      "science fiction": 878, thriller: 53, war: 10752, western: 37
    };
    const foundGenres = Object.entries(genreMap)
      .filter(([name]) => p.includes(name))
      .map(([, id]) => id);

    // some synonyms -> genres
    if (/\bscifi|sci-fi|sci fi\b/.test(p)) foundGenres.push(878);
    if (/\bteen|coming of age\b/.test(p)) foundGenres.push(18);
    if (/\bslasher|ghost|haunted|scary|creepy\b/.test(p)) foundGenres.push(27);
    if (/\bdetective|mystery|whodunit\b/.test(p)) foundGenres.push(9648);
    if (/\bromance|love story|heartbreak\b/.test(p)) foundGenres.push(10749);

    return { phrases, genres: Array.from(new Set(foundGenres)), yearGte, yearLte, minVote, sortBy };
  };

  // fetch keyword IDs for phrases
  const fetchKeywordIds = async (phrases) => {
    const ids = new Set();
    await Promise.all(
      phrases.map(async (q) => {
        try {
          const res = await fetch(
            `https://api.themoviedb.org/3/search/keyword?api_key=${apiKey}&query=${encodeURIComponent(q)}`
          );
          const json = await res.json();
          (json.results || []).slice(0, 2).forEach(k => ids.add(k.id));
        } catch {}
      })
    );
    return Array.from(ids);
  };

  // the main search pipeline
  const searchByPrompt = async (prompt) => {
    const { phrases, genres, yearGte, yearLte, minVote, sortBy } = intentFromPrompt(prompt);
    const keywordIds = await fetchKeywordIds(phrases);

    // try discover w/ keywords & genres first
    const params = new URLSearchParams({
      api_key: apiKey,
      include_adult: "false",
      page: "1",
      sort_by: sortBy,
      "vote_count.gte": String(minVote)
    });
    if (keywordIds.length) params.set("with_keywords", keywordIds.join(","));
    if (genres.length) params.set("with_genres", Array.from(new Set(genres)).join(","));
    if (yearGte) params.set("primary_release_date.gte", yearGte);
    if (yearLte) params.set("primary_release_date.lte", yearLte);

    try {
      const discover = await fetch(`https://api.themoviedb.org/3/discover/movie?${params.toString()}`);
      const dJson = await discover.json();
      const dResults = dJson.results || [];
      if (dResults.length) return dResults;
    } catch {}

    // fallback: plain text search
    try {
      const search = await fetch(
        `https://api.themoviedb.org/3/search/movie?api_key=${apiKey}&query=${encodeURIComponent(prompt)}&include_adult=false&page=1`
      );
      const sJson = await search.json();
      return sJson.results || [];
    } catch {
      return [];
    }
  };

  const send = async () => {
    const q = input.trim();
    if (!q || searching) return;
    setInput("");
    push("user", q);
    push("bot", "Searching… 🔎");
    setSearching(true);

    const results = await searchByPrompt(q);
    setSearching(false);

    if (results.length) {
      // update grid in the main app
      onResults(results, q);

      // build a short reply summary (top 3)
      const top = results.slice(0, 3).map(r => {
        const year = r.release_date ? ` (${new Date(r.release_date).getFullYear()})` : "";
        return `${r.title}${year}`;
      });
      setMessages(prev => {
        const copy = [...prev];
        const idx = copy.map(m => m.text).lastIndexOf("Searching… 🔎");
        if (idx !== -1) copy[idx] = { sender: "bot", text: `Here are some picks:\n• ${top.join("\n• ")}\nI’ve updated the grid below. Want more like these?` };
        return copy;
      });
    } else {
      setMessages(prev => {
        const copy = [...prev];
        const idx = copy.map(m => m.text).lastIndexOf("Searching… 🔎");
        if (idx !== -1) copy[idx] = { sender: "bot", text: "Hmm, I couldn't find a good match. Try rephrasing or adding details!" };
        return copy;
      });
    }
  };

  return (
    <>
      {!open && (
        <button
          className="chatbot-toggle"
          aria-label="Open chat"
          onClick={() => setOpen(true)}
          title="Ask MoodFlix"
        >
          💬
        </button>
      )}

      {open && (
        <div className="chatbot-window">
          <div className="chatbot-header">
            <span className="chatbot-title">🎬 MoodFlix Chatbot</span>
            <button
              className="chatbot-close"
              aria-label="Close"
              onClick={() => setOpen(false)}
            >
              ×
            </button>
          </div>

          <div className="chatbot-messages" ref={scrollRef}>
            {messages.map((m, i) => (
              <div key={i} className={`chat-msg ${m.sender}`}>
                {m.text.split("\n").map((line, j) => (
                  <span key={j}>{line}<br/></span>
                ))}
              </div>
            ))}
          </div>

          <div className="chatbot-input">
            <input
              type="text"
              placeholder="Describe a movie vibe…"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && send()}
              disabled={searching}
            />
            <button onClick={send} disabled={searching}>
              {searching ? "…" : "Send"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}
