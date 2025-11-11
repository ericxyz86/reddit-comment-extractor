# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Reddit Comment Extractor is a React-based web application that extracts **real Reddit comments** from Reddit's official API. The app uses an Express.js backend server for Reddit OAuth authentication and provides features like subreddit filtering, date range selection, boolean keyword searches, real-time progress updates, and Excel export.

## Development Commands

```bash
# Install dependencies
npm install

# Run backend server (localhost:3002)
npm run server

# Run backend in dev mode with auto-reload
npm run server:dev

# Run frontend (localhost:3001)
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Configuration

### Backend Configuration

The backend server requires Reddit API credentials set in `server/.env`:

```
REDDIT_CLIENT_ID=VGVMLzdQkEOdfvwnNEBTWA
REDDIT_CLIENT_SECRET=igAp9Pp1Qnlswd-Gig_5UZINAYeOVQ
REDDIT_USERNAME=menoob86
REDDIT_PASSWORD=your_reddit_password_here
PORT=3002
```

**Important**: The Reddit app is a "script" type which requires the user's Reddit password for OAuth authentication.

### Frontend Configuration

The frontend no longer requires API keys. It connects to the backend server at `http://localhost:3002`.

## Architecture

### System Overview

The application consists of two parts:
- **Frontend (React + TypeScript)**: Runs on port 3001, provides UI and orchestrates data flow
- **Backend (Express.js)**: Runs on port 3002, handles Reddit OAuth and proxies API requests

### Core Data Flow

1. User configures filters in `FilterForm` component (subreddits, date range, boolean keywords)
2. `App.tsx:23-50` handles extraction by calling `extractComments()` from `services/redditApiService.ts`
3. Reddit service makes requests to backend server at `http://localhost:3002`
4. Backend authenticates with Reddit OAuth and fetches real data from Reddit's API
5. Frontend processes comments (boolean keyword matching, date filtering, deduplication)
6. Each batch is progressively updated in the UI via callback
7. Comments can be downloaded as Excel using XLSX library loaded from CDN

### Backend Server Architecture (`server/server.js`)

The Express.js backend server handles Reddit authentication and API requests:

- **Reddit OAuth**: Authenticates using script app credentials (username/password flow)
- **Token Caching**: Caches access token for 1 hour with automatic refresh
- **Rate Limiting**: Supports 60 requests/minute (Reddit's OAuth rate limit)
- **CORS Enabled**: Allows frontend to make cross-origin requests
- **API Endpoints**:
  - `POST /api/reddit/search` - Search posts in a subreddit
  - `GET /api/reddit/comments/:subreddit/:postId` - Fetch comments from a post
  - `GET /health` - Health check endpoint

### Reddit API Service Architecture (`services/redditApiService.ts`)

The frontend service orchestrates the comment extraction process:

- **Post Search**: Searches posts in each subreddit matching keywords
- **Comment Extraction**: Fetches comment trees from up to 25 posts per subreddit
- **Recursive Traversal**: Extracts all comments and nested replies from comment trees
- **Boolean Keyword Matching**: Client-side filtering using eval() for AND, OR, NOT operators
- **Date Filtering**: Filters comments by date range
- **Deduplication**: Tracks extracted comment IDs to prevent duplicates
- **Progressive UI Updates**: Calls `onProgress` callback after processing each post
- **Rate Limiting**: 1-second delay between requests to respect Reddit's limits

### Component Structure

- `App.tsx` - Main application component, manages state and orchestrates data flow
- `FilterForm.tsx` - Multi-tag input for subreddits with Enter/comma separation, date pickers, boolean keyword input
- `CommentTable.tsx` - Displays extracted comments in table format
- `LoadingSpinner.tsx` - Loading indicator during extraction
- `ErrorMessage.tsx` - Error display component

### Type System

All shared types are defined in `types.ts`:
- `Filters` - User filter criteria (subreddits array, date range, keywords string)
- `Comment` - Extracted comment structure (id, author, subreddit, comment, upvotes, timestamp)

### External Dependencies

**Frontend:**
- **XLSX**: Loaded via CDN script tag in HTML, declared as global in `App.tsx:10`
- **Tailwind CSS**: Loaded via CDN for styling
- **React** + **React DOM**: UI framework

**Backend:**
- **Express**: Web server framework
- **Axios**: HTTP client for Reddit API requests
- **CORS**: Middleware for cross-origin requests
- **dotenv**: Environment variable management

## Important Implementation Details

### Reddit OAuth Authentication
The backend uses Reddit's password grant OAuth flow for script-type apps. The access token is cached with a 1-hour expiration and automatically refreshed. Script apps require the user's Reddit password, which must be securely stored in `server/.env`.

### Boolean Search
Keywords support boolean operators (AND, OR, NOT) and comma-separated terms (treated as OR). The matching logic is in `redditApiService.ts:21-55` and uses JavaScript's `eval()` to evaluate the boolean expression.

**Security Note**: The use of `eval()` is safe here because the expression is sanitized and only matches keywords against text, but should be used cautiously.

### Comment ID Deduplication
The service maintains a `Set<string>` of extracted comment IDs (`redditApiService.ts:115`) to prevent duplicates across posts and subreddits.

### Rate Limiting
- **Reddit OAuth API**: 60 requests per minute
- **Implementation**: 1-second delay between post fetches (`redditApiService.ts:161`)
- **Limit per subreddit**: Maximum 25 posts processed per subreddit

### Date Filtering
Comments are filtered by `created_utc` timestamp. The end date includes the full day (23:59:59) to match user expectations (`redditApiService.ts:72-75`).

### Comment Tree Traversal
Reddit returns comments as nested tree structures. The `extractCommentsFromTree()` function (`redditApiService.ts:58-108`) recursively traverses replies to extract all comments at any depth level.

### Excel Export
Uses the SheetJS (XLSX) library loaded from CDN. The export logic is in `App.tsx:52-60` and creates a workbook with a single "Reddit Comments" sheet.

### Error Handling
Both frontend and backend implement try-catch error handling. The backend logs errors to console with detailed information, while the frontend displays user-friendly error messages.
