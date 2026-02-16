import express from 'express';
import cors from 'cors';
import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env from project root, then server directory
dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '.env') });

const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// --- Data source selection ---
// If SOCIAVAULT_API_KEY is set, use SociaVault (works from any IP / datacenter)
// Otherwise, fall back to direct Reddit public JSON API (requires residential IP)
const SOCIAVAULT_API_KEY = process.env.SOCIAVAULT_API_KEY;
const USE_SOCIAVAULT = !!SOCIAVAULT_API_KEY;
const SOCIAVAULT_BASE = 'https://api.sociavault.com/v1/scrape/reddit';

// --- SociaVault helpers ---
async function sociavaultRequest(endpoint, params = {}) {
  const url = `${SOCIAVAULT_BASE}${endpoint}`;
  const response = await axios.get(url, {
    params,
    headers: { 'X-API-Key': SOCIAVAULT_API_KEY },
    timeout: 30000,
  });
  return response.data;
}

// --- Direct Reddit helpers (fallback) ---
const REDDIT_USER_AGENT = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36';

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

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// ============================================================
// SEARCH POSTS IN A SUBREDDIT
// ============================================================
app.post('/api/reddit/search', async (req, res) => {
  try {
    const { subreddit, query, limit = 100 } = req.body;
    if (!subreddit) return res.status(400).json({ error: 'Subreddit is required' });

    if (USE_SOCIAVAULT) {
      // --- SociaVault path ---
      const data = query
        ? await sociavaultRequest('/subreddit/search', { subreddit, query, sort: 'new' })
        : await sociavaultRequest('/subreddit', { subreddit, sort: 'new' });

      const rawPosts = data.data?.posts || {};
      const posts = Object.values(rawPosts).map(p => ({
        id: (p.id || p.post_id || '').replace('t3_', ''),
        title: p.title || '',
        selftext: p.selftext || '',
        author: p.author || p.author_fullname || '',
        score: p.score ?? p.votes ?? 0,
        num_comments: p.num_comments ?? 0,
        created_utc: p.created_utc ?? (p.created_at ? new Date(p.created_at).getTime() / 1000 : 0),
        permalink: p.permalink || '',
        url: p.url || '',
        subreddit: typeof p.subreddit === 'object' ? p.subreddit.name : (p.subreddit || subreddit),
      }));

      return res.json({
        data: {
          children: posts.map(p => ({ data: p })),
          after: null,
          dist: posts.length,
        }
      });
    }

    // --- Direct Reddit path ---
    const searchUrl = query
      ? `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=new&limit=${limit}`
      : `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;

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
    console.error('Search error:', error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Reddit API request failed'
    });
  }
});

// ============================================================
// GET COMMENTS FROM A POST
// ============================================================
app.get('/api/reddit/comments/:subreddit/:postId', async (req, res) => {
  try {
    const { subreddit, postId } = req.params;

    if (USE_SOCIAVAULT) {
      // --- SociaVault path ---
      const postUrl = `https://www.reddit.com/r/${subreddit}/comments/${postId}/`;
      const data = await sociavaultRequest('/post/comments', { url: postUrl });

      // SociaVault returns { success, data: { post, comments } }
      // We need to transform to Reddit's native format: [postListing, commentListing]
      const rawPost = data.data?.post || {};
      const rawComments = data.data?.comments || {};

      // Build Reddit-compatible post listing
      const postListing = {
        kind: 'Listing',
        data: {
          children: [{
            kind: 't3',
            data: {
              id: postId,
              subreddit: subreddit,
              title: rawPost.title || '',
              selftext: rawPost.selftext || '',
              author: rawPost.author || '',
              score: rawPost.score ?? rawPost.ups ?? 0,
              num_comments: rawPost.num_comments ?? 0,
              created_utc: rawPost.created_utc ?? rawPost.created ?? 0,
              permalink: rawPost.permalink || `/r/${subreddit}/comments/${postId}/`,
            }
          }]
        }
      };

      // Build Reddit-compatible comment listing
      // SociaVault returns comments as an object with numeric keys
      const commentChildren = Object.values(rawComments).map(c => ({
        kind: 't1',
        data: {
          id: c.id || c.name?.replace('t1_', '') || '',
          author: c.author || '',
          body: c.body || '',
          ups: c.ups ?? c.score ?? 0,
          downs: c.downs ?? 0,
          score: c.score ?? c.ups ?? 0,
          created_utc: c.created_utc ?? c.created ?? 0,
          controversiality: c.controversiality ?? 0,
          subreddit: subreddit,
          replies: c.replies && typeof c.replies === 'object' && c.replies.data
            ? c.replies  // Already in Reddit format
            : '',        // No replies or not in expected format
        }
      }));

      const commentListing = {
        kind: 'Listing',
        data: {
          children: commentChildren,
        }
      };

      return res.json([postListing, commentListing]);
    }

    // --- Direct Reddit path ---
    const commentsUrl = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json`;
    const data = await redditRequest(commentsUrl);
    res.json(data);
  } catch (error) {
    console.error('Comments error:', error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data || 'Reddit API request failed'
    });
  }
});

// ============================================================
// SEARCH ALL OF REDDIT
// ============================================================
app.post('/api/reddit/search-all', async (req, res) => {
  try {
    const { query, limit = 100, time = 'week' } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    if (USE_SOCIAVAULT) {
      const data = await sociavaultRequest('/search', { query, sort: 'new', time });
      const rawPosts = data.data?.posts || {};
      const posts = Object.values(rawPosts).map(p => ({
        id: (p.id || p.post_id || '').replace('t3_', ''),
        title: p.title || '',
        selftext: p.selftext || '',
        author: p.author || '',
        score: p.score ?? p.votes ?? 0,
        num_comments: p.num_comments ?? 0,
        created_utc: p.created_utc ?? (p.created_at ? new Date(p.created_at).getTime() / 1000 : 0),
        permalink: p.permalink || '',
        url: p.url || '',
        subreddit: typeof p.subreddit === 'object' ? p.subreddit.name : (p.subreddit || ''),
      }));

      return res.json({
        data: {
          children: posts.map(p => ({ data: p })),
          after: null,
          dist: posts.length,
        }
      });
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

// ============================================================
// HOT POSTS FROM A SUBREDDIT
// ============================================================
app.get('/api/reddit/hot/:subreddit', async (req, res) => {
  try {
    const { subreddit } = req.params;
    const { limit = 25 } = req.query;

    if (USE_SOCIAVAULT) {
      const data = await sociavaultRequest('/subreddit', { subreddit, sort: 'hot' });
      return res.json(data);
    }

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

// ============================================================
// CREDITS CHECK (SociaVault only)
// ============================================================
app.get('/api/credits', async (req, res) => {
  if (!USE_SOCIAVAULT) {
    return res.json({ mode: 'direct', message: 'Using direct Reddit API (no credits needed)' });
  }
  try {
    const response = await axios.get('https://api.sociavault.com/v1/credits', {
      headers: { 'X-API-Key': SOCIAVAULT_API_KEY },
      timeout: 10000,
    });
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to check credits' });
  }
});

// ============================================================
// HEALTH CHECK
// ============================================================
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: USE_SOCIAVAULT ? 'sociavault' : 'direct-reddit',
    message: USE_SOCIAVAULT
      ? 'Reddit API backend (SociaVault proxy — works from any IP)'
      : 'Reddit API backend (direct public JSON API — requires residential IP)',
    timestamp: new Date().toISOString(),
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Reddit API Backend Server`);
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Mode: ${USE_SOCIAVAULT ? '🔑 SociaVault (works from any IP)' : '🌐 Direct Reddit (residential IP only)'}`);
  if (USE_SOCIAVAULT) console.log(`   Credits: http://localhost:${PORT}/api/credits`);
  console.log('');
});
