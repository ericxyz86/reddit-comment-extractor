import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from server directory
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3002;

// Middleware
app.use(cors());
app.use(express.json());

// User-Agent for Reddit (required to avoid 429s)
const REDDIT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

// Helper function to make Reddit API requests (public JSON API)
async function redditRequest(url) {
  const response = await axios.get(url, {
    headers: {
      'User-Agent': REDDIT_USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.5',
    },
    timeout: 15000,
  });

  return response.data;
}

// Delay helper for rate limiting
const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// API endpoint to search posts in a subreddit
app.post('/api/reddit/search', async (req, res) => {
  try {
    const { subreddit, query, limit = 100 } = req.body;

    if (!subreddit) {
      return res.status(400).json({ error: 'Subreddit is required' });
    }

    // Use public JSON API instead of OAuth API
    // Search within a subreddit: https://www.reddit.com/r/SUBREDDIT/search.json
    // Or search all: https://www.reddit.com/search.json
    const searchUrl = query
      ? `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=new&limit=${limit}`
      : `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;

    const data = await redditRequest(searchUrl);

    // Transform to match the expected format for the frontend
    const posts = data.data.children.map(child => ({
      id: child.data.id,
      title: child.data.title,
      selftext: child.data.selftext,
      author: child.data.author,
      score: child.data.score,
      num_comments: child.data.num_comments,
      created_utc: child.data.created_utc,
      permalink: child.data.permalink,
      url: child.data.url,
      subreddit: child.data.subreddit,
    }));

    res.json({
      data: {
        children: posts.map(p => ({ data: p })),
        after: data.data.after,
        dist: posts.length,
      }
    });
  } catch (error) {
    console.error('Search error:', error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Reddit API request failed'
    });
  }
});

// API endpoint to get comments from a post
app.get('/api/reddit/comments/:subreddit/:postId', async (req, res) => {
  try {
    const { subreddit, postId } = req.params;

    // Use public JSON API
    const commentsUrl = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json`;
    const data = await redditRequest(commentsUrl);

    // The response is an array: [post, comments]
    res.json(data);
  } catch (error) {
    console.error('Comments error:', error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Reddit API request failed'
    });
  }
});

// NEW: Search across all of Reddit (not just one subreddit)
app.post('/api/reddit/search-all', async (req, res) => {
  try {
    const { query, limit = 100, time = 'week' } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${limit}&t=${time}`;

    const data = await redditRequest(searchUrl);

    const posts = data.data.children.map(child => ({
      id: child.data.id,
      title: child.data.title,
      selftext: child.data.selftext,
      author: child.data.author,
      score: child.data.score,
      num_comments: child.data.num_comments,
      created_utc: child.data.created_utc,
      permalink: child.data.permalink,
      url: child.data.url,
      subreddit: child.data.subreddit,
    }));

    res.json({
      data: {
        children: posts.map(p => ({ data: p })),
        after: data.data.after,
        dist: posts.length,
      }
    });
  } catch (error) {
    console.error('Search-all error:', error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Reddit API request failed'
    });
  }
});

// NEW: Get hot posts from a subreddit
app.get('/api/reddit/hot/:subreddit', async (req, res) => {
  try {
    const { subreddit } = req.params;
    const { limit = 25 } = req.query;

    const url = `https://www.reddit.com/r/${subreddit}/hot.json?limit=${limit}`;
    const data = await redditRequest(url);

    res.json(data);
  } catch (error) {
    console.error('Hot posts error:', error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Reddit API request failed'
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Reddit API backend is running (public JSON API mode)',
    mode: 'public-api',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Reddit API Backend Server`);
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Mode: Public JSON API (no OAuth required)\n`);
});
