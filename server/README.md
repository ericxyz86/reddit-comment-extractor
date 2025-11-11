# Reddit API Backend Server

This Express.js backend server provides authenticated access to Reddit's API, bypassing CORS restrictions and enabling proper OAuth authentication.

## Features

- **Reddit OAuth Authentication**: Secure authentication using Reddit's script app credentials
- **Token Caching**: Automatic token refresh with 1-hour expiration
- **Rate Limiting**: Built-in support for Reddit's 60 requests/minute limit
- **CORS Enabled**: Allows frontend to make cross-origin requests
- **Error Handling**: Comprehensive error handling with detailed logging

## Setup

### 1. Configure Reddit Credentials

Edit `server/.env` and add your Reddit account password:

```bash
REDDIT_CLIENT_ID=VGVMLzdQkEOdfvwnNEBTWA
REDDIT_CLIENT_SECRET=igAp9Pp1Qnlswd-Gig_5UZINAYeOVQ
REDDIT_USERNAME=menoob86
REDDIT_PASSWORD=your_reddit_password_here  # ⚠️ Add your password
PORT=3002
```

**⚠️ Security Warning**:
- Keep this file secure and never commit it to version control
- The `.env` file is already in `.gitignore`
- Script-type Reddit apps require your Reddit password for authentication

### 2. Install Dependencies

Dependencies are already installed in the main project. If needed, run:

```bash
npm install
```

### 3. Start the Server

Run the backend server:

```bash
# Production mode
npm run server

# Development mode (with auto-reload)
npm run server:dev
```

The server will start on **http://localhost:3002**

## API Endpoints

### Health Check
```
GET /health
```

Returns server status:
```json
{
  "status": "ok",
  "message": "Reddit API backend is running"
}
```

### Search Posts
```
POST /api/reddit/search
```

Search for posts in a subreddit.

**Request Body:**
```json
{
  "subreddit": "phcars",
  "query": "byd OR kia",
  "limit": 100
}
```

**Response:**
Reddit API response containing posts matching the search query.

### Get Comments
```
GET /api/reddit/comments/:subreddit/:postId
```

Fetch comments from a specific post.

**Example:**
```
GET /api/reddit/comments/phcars/abc123
```

**Response:**
Reddit API response containing post data and comment tree.

## How It Works

1. **OAuth Token Management**:
   - Server authenticates with Reddit using username/password flow
   - Access token is cached for 1 hour (minus 5-minute safety margin)
   - Token automatically refreshes when expired

2. **Request Proxying**:
   - Frontend calls backend API endpoints
   - Backend adds OAuth authentication headers
   - Backend forwards request to Reddit's OAuth API
   - Response is returned to frontend

3. **Rate Limiting**:
   - Reddit allows 60 requests per minute with OAuth
   - Much higher than the 10 req/min limit for unauthenticated requests
   - Frontend implements 1-second delay between requests

## Running the Full Application

To run both frontend and backend:

1. **Terminal 1 - Start Backend:**
   ```bash
   npm run server
   ```

2. **Terminal 2 - Start Frontend:**
   ```bash
   npm run dev
   ```

3. Open **http://localhost:3001** in your browser

## Troubleshooting

### "Missing Reddit credentials" Warning

**Problem**: Server shows warning about missing credentials

**Solution**: Edit `server/.env` and add your Reddit password

### "Failed to authenticate with Reddit API"

**Problem**: OAuth authentication failed

**Possible causes:**
- Incorrect username/password
- Incorrect client ID/secret
- Reddit account locked or suspended

**Solution**: Verify all credentials in `server/.env`

### "Connection refused" Error in Frontend

**Problem**: Frontend cannot connect to backend

**Solution**:
1. Make sure backend server is running (`npm run server`)
2. Verify backend is on port 3002
3. Check browser console for specific error

### Rate Limit Errors (HTTP 429)

**Problem**: Reddit API returns rate limit error

**Solution**:
- Backend supports 60 req/min with OAuth
- Frontend already implements 1-second delays
- If still hitting limits, increase delay in `services/redditApiService.ts`

## Security Best Practices

1. **Never commit `.env` file**: Already in `.gitignore`
2. **Use environment variables**: Credentials stored in `.env`, not hardcoded
3. **Keep credentials secure**: Don't share your Reddit password
4. **Monitor usage**: Check Reddit API usage at https://www.reddit.com/prefs/apps

## Reddit App Configuration

Your Reddit app details:
- **App Name**: menoob86
- **App Type**: Script (for personal use)
- **Client ID**: VGVMLzdQkEOdfvwnNEBTWA

Manage at: https://www.reddit.com/prefs/apps

## Support

For Reddit API documentation, visit:
- https://www.reddit.com/dev/api
- https://github.com/reddit-archive/reddit/wiki/OAuth2

For issues with this server, check the console output for detailed error messages.
