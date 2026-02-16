FROM node:22-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .

# Build frontend — point to relative /api so it hits the same origin
ENV VITE_BACKEND_URL=""
RUN npm run build

# Production stage
FROM node:22-alpine

WORKDIR /app

# Install production deps only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built frontend + server
COPY --from=builder /app/dist ./dist
COPY server/ ./server/

# Serve both frontend and backend from one process
COPY <<'EOF' server/production.js
import express from 'express';
import cors from 'cors';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Import the server app setup
const app = express();
const PORT = process.env.PORT || 3002;

app.use(cors());
app.use(express.json());

// --- Mount the API routes by importing server.js logic ---
// We'll inline the server here to avoid double-listen issues

import axios from 'axios';

const MONITOR_PROXY_URL = process.env.MONITOR_PROXY_URL;
const MONITOR_API_KEY = process.env.MONITOR_API_KEY;
const SOCIAVAULT_API_KEY = process.env.SOCIAVAULT_API_KEY;
const USE_MONITOR = !!(MONITOR_PROXY_URL && MONITOR_API_KEY);
const USE_SOCIAVAULT = USE_MONITOR || !!SOCIAVAULT_API_KEY;
const SOCIAVAULT_BASE = USE_MONITOR
  ? `${MONITOR_PROXY_URL}/proxy/v1/scrape/reddit`
  : 'https://api.sociavault.com/v1/scrape/reddit';

async function sociavaultRequest(endpoint, params = {}) {
  const url = `${SOCIAVAULT_BASE}${endpoint}`;
  const headers = USE_MONITOR
    ? { 'X-App-Name': 'reddit-extractor', 'X-Monitor-Key': MONITOR_API_KEY }
    : { 'X-API-Key': SOCIAVAULT_API_KEY };
  const response = await axios.get(url, { params, headers, timeout: 30000 });
  return response.data;
}

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

// Search posts in a subreddit
app.post('/api/reddit/search', async (req, res) => {
  try {
    const { subreddit, query, limit = 100 } = req.body;
    if (!subreddit) return res.status(400).json({ error: 'Subreddit is required' });

    if (USE_SOCIAVAULT) {
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
        data: { children: posts.map(p => ({ data: p })), after: null, dist: posts.length }
      });
    }

    const searchUrl = query
      ? `https://www.reddit.com/r/${subreddit}/search.json?q=${encodeURIComponent(query)}&restrict_sr=on&sort=new&limit=${limit}`
      : `https://www.reddit.com/r/${subreddit}/new.json?limit=${limit}`;
    const data = await redditRequest(searchUrl);
    const posts = data.data.children.map(c => ({
      id: c.data.id, title: c.data.title, selftext: c.data.selftext, author: c.data.author,
      score: c.data.score, num_comments: c.data.num_comments, created_utc: c.data.created_utc,
      permalink: c.data.permalink, url: c.data.url, subreddit: c.data.subreddit,
    }));
    res.json({ data: { children: posts.map(p => ({ data: p })), after: data.data.after, dist: posts.length } });
  } catch (error) {
    console.error('Search error:', error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Get comments from a post
app.get('/api/reddit/comments/:subreddit/:postId', async (req, res) => {
  try {
    const { subreddit, postId } = req.params;

    if (USE_SOCIAVAULT) {
      const postUrl = `https://www.reddit.com/r/${subreddit}/comments/${postId}/`;
      const data = await sociavaultRequest('/post/comments', { url: postUrl });
      const rawPost = data.data?.post || {};
      const rawComments = data.data?.comments || {};

      const postListing = {
        kind: 'Listing',
        data: { children: [{ kind: 't3', data: {
          id: postId, subreddit, title: rawPost.title || '', selftext: rawPost.selftext || '',
          author: rawPost.author || '', score: rawPost.score ?? rawPost.ups ?? 0,
          num_comments: rawPost.num_comments ?? 0, created_utc: rawPost.created_utc ?? rawPost.created ?? 0,
          permalink: rawPost.permalink || `/r/${subreddit}/comments/${postId}/`,
        }}]}
      };

      const commentChildren = Object.values(rawComments).map(c => ({
        kind: 't1',
        data: {
          id: c.id || c.name?.replace('t1_', '') || '', author: c.author || '',
          body: c.body || '', ups: c.ups ?? c.score ?? 0, downs: c.downs ?? 0,
          score: c.score ?? c.ups ?? 0, created_utc: c.created_utc ?? c.created ?? 0,
          controversiality: c.controversiality ?? 0, subreddit,
          replies: (c.replies && typeof c.replies === 'object' && c.replies.data) ? c.replies : '',
        }
      }));

      return res.json([postListing, { kind: 'Listing', data: { children: commentChildren } }]);
    }

    const commentsUrl = `https://www.reddit.com/r/${subreddit}/comments/${postId}.json`;
    const data = await redditRequest(commentsUrl);
    res.json(data);
  } catch (error) {
    console.error('Comments error:', error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Search all of Reddit
app.post('/api/reddit/search-all', async (req, res) => {
  try {
    const { query, limit = 100, time = 'week' } = req.body;
    if (!query) return res.status(400).json({ error: 'Query is required' });

    if (USE_SOCIAVAULT) {
      const data = await sociavaultRequest('/search', { query, sort: 'new', time });
      const rawPosts = data.data?.posts || {};
      const posts = Object.values(rawPosts).map(p => ({
        id: (p.id || p.post_id || '').replace('t3_', ''),
        title: p.title || '', selftext: p.selftext || '', author: p.author || '',
        score: p.score ?? p.votes ?? 0, num_comments: p.num_comments ?? 0,
        created_utc: p.created_utc ?? (p.created_at ? new Date(p.created_at).getTime() / 1000 : 0),
        permalink: p.permalink || '', url: p.url || '',
        subreddit: typeof p.subreddit === 'object' ? p.subreddit.name : (p.subreddit || ''),
      }));
      return res.json({ data: { children: posts.map(p => ({ data: p })), after: null, dist: posts.length } });
    }

    const searchUrl = `https://www.reddit.com/search.json?q=${encodeURIComponent(query)}&sort=new&limit=${limit}&t=${time}`;
    const data = await redditRequest(searchUrl);
    const posts = data.data.children.map(c => ({
      id: c.data.id, title: c.data.title, selftext: c.data.selftext, author: c.data.author,
      score: c.data.score, num_comments: c.data.num_comments, created_utc: c.data.created_utc,
      permalink: c.data.permalink, url: c.data.url, subreddit: c.data.subreddit,
    }));
    res.json({ data: { children: posts.map(p => ({ data: p })), after: data.data.after, dist: posts.length } });
  } catch (error) {
    console.error('Search-all error:', error.response?.status, error.response?.data || error.message);
    res.status(error.response?.status || 500).json({ error: error.message });
  }
});

// Credits check
app.get('/api/credits', async (req, res) => {
  if (!USE_SOCIAVAULT) return res.json({ mode: 'direct', message: 'No credits needed' });
  try {
    const response = await axios.get('https://api.sociavault.com/v1/credits', {
      headers: { 'X-API-Key': SOCIAVAULT_API_KEY }, timeout: 10000,
    });
    res.json(response.data);
  } catch (error) { res.status(500).json({ error: 'Failed to check credits' }); }
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    mode: USE_SOCIAVAULT ? 'sociavault' : 'direct-reddit',
    timestamp: new Date().toISOString(),
  });
});

// Serve frontend static files
const distPath = path.join(__dirname, '..', 'dist');
app.use(express.static(distPath));
app.get('*', (req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Reddit Comment Extractor`);
  console.log(`   http://0.0.0.0:${PORT}`);
  console.log(`   Mode: ${USE_SOCIAVAULT ? '🔑 SociaVault' : '🌐 Direct Reddit'}`);
});
EOF

EXPOSE 3002
ENV PORT=3002
CMD ["node", "server/production.js"]
