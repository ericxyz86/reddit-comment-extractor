<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Reddit Comment Extractor

A React-based web application that extracts and filters **real Reddit comments** from Reddit's official API. Features include subreddit filtering, date range selection, and boolean keyword searches (AND, OR, NOT operators).

## Features

- **Real Reddit Data**: Fetches actual comments from Reddit's official API (60 req/min)
- **Boolean Search**: Advanced keyword filtering with AND, OR, NOT operators
- **Multiple Subreddits**: Search across multiple subreddits simultaneously
- **Date Filtering**: Filter comments by date range
- **Progress Tracking**: Real-time updates as comments are extracted
- **Excel Export**: Download results as Excel spreadsheet
- **OAuth Authentication**: Secure backend server handles Reddit authentication

## Run Locally

**Prerequisites:**
- Node.js (v16+)
- Reddit account and API credentials ([Get API credentials](https://www.reddit.com/prefs/apps))

### Setup

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure Reddit API credentials:**

   Edit `server/.env` and add your Reddit password:
   ```bash
   REDDIT_CLIENT_ID=VGVMLzdQkEOdfvwnNEBTWA
   REDDIT_CLIENT_SECRET=igAp9Pp1Qnlswd-Gig_5UZINAYeOVQ
   REDDIT_USERNAME=menoob86
   REDDIT_PASSWORD=your_reddit_password_here  # ⚠️ Add your password
   ```

3. **Start the backend server:**
   ```bash
   npm run server
   ```
   Server will run on **http://localhost:3002**

4. **Start the frontend (in a new terminal):**
   ```bash
   npm run dev
   ```
   App will open on **http://localhost:3001**

## Architecture

- **Frontend**: React + TypeScript + Vite (port 3001)
- **Backend**: Express.js + Reddit OAuth (port 3002)
- **API**: Reddit's official API with 60 requests/minute limit

See [server/README.md](server/README.md) for detailed backend documentation.
