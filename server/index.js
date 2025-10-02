// server/index.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors()); // Allow cross-origin requests from frontend

app.get('/api/discover', async (req, res) => {
  const genres = req.query.genres || '';
  if (!genres) {
    return res.status(400).json({ error: 'Genres parameter is required' });
  }

  try {
    const tmdbRes = await axios.get('https://api.themoviedb.org/3/discover/movie', {
      params: {
        api_key: process.env.TMDB_API_KEY,
        with_genres: genres,
        sort_by: 'popularity.desc',
        language: 'en-US',
        page: 1,
      }
    });
    res.json(tmdbRes.data);
  } catch (err) {
    console.error('TMDB API error:', err.message);
    res.status(500).json({ error: 'Failed to fetch movies from TMDB' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
