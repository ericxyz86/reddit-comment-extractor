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

// Reddit OAuth credentials
const REDDIT_CLIENT_ID = process.env.REDDIT_CLIENT_ID;
const REDDIT_CLIENT_SECRET = process.env.REDDIT_CLIENT_SECRET;
const REDDIT_USERNAME = process.env.REDDIT_USERNAME;
const REDDIT_PASSWORD = process.env.REDDIT_PASSWORD;

// Token cache
let accessToken = null;
let tokenExpiry = null;

// Get Reddit OAuth access token
async function getAccessToken() {
  // Return cached token if still valid
  if (accessToken && tokenExpiry && Date.now() < tokenExpiry) {
    return accessToken;
  }

  try {
    const auth = Buffer.from(`${REDDIT_CLIENT_ID}:${REDDIT_CLIENT_SECRET}`).toString('base64');

    const response = await axios.post(
      'https://www.reddit.com/api/v1/access_token',
      new URLSearchParams({
        grant_type: 'password',
        username: REDDIT_USERNAME,
        password: REDDIT_PASSWORD,
      }),
      {
        headers: {
          'Authorization': `Basic ${auth}`,
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'RedditCommentExtractor/1.0',
        },
      }
    );

    accessToken = response.data.access_token;
    // Token expires in 1 hour, refresh 5 minutes early
    tokenExpiry = Date.now() + (response.data.expires_in - 300) * 1000;

    console.log('✓ Successfully authenticated with Reddit API');
    return accessToken;
  } catch (error) {
    console.error('Reddit OAuth error:', error.response?.data || error.message);
    throw new Error('Failed to authenticate with Reddit API');
  }
}

// Helper function to make authenticated Reddit API requests
async function redditRequest(url) {
  const token = await getAccessToken();

  const response = await axios.get(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'User-Agent': 'RedditCommentExtractor/1.0',
    },
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

    const searchUrl = `https://oauth.reddit.com/r/${subreddit}/search?q=${encodeURIComponent(
      query || '*'
    )}&restrict_sr=on&sort=new&limit=${limit}`;

    const data = await redditRequest(searchUrl);
    res.json(data);
  } catch (error) {
    console.error('Search error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data
    });
  }
});

// API endpoint to get comments from a post
app.get('/api/reddit/comments/:subreddit/:postId', async (req, res) => {
  try {
    const { subreddit, postId } = req.params;

    const commentsUrl = `https://oauth.reddit.com/r/${subreddit}/comments/${postId}`;
    const data = await redditRequest(commentsUrl);

    res.json(data);
  } catch (error) {
    console.error('Comments error:', error.response?.data || error.message);
    res.status(error.response?.status || 500).json({
      error: error.message,
      details: error.response?.data
    });
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Reddit API backend is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 Reddit API Backend Server`);
  console.log(`   Running on: http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health\n`);

  // Validate environment variables
  if (!REDDIT_CLIENT_ID || !REDDIT_CLIENT_SECRET || !REDDIT_USERNAME || !REDDIT_PASSWORD) {
    console.warn('⚠️  WARNING: Missing Reddit credentials in .env file');
    console.warn('   Please set: REDDIT_CLIENT_ID, REDDIT_CLIENT_SECRET, REDDIT_USERNAME, REDDIT_PASSWORD\n');
  }
});
