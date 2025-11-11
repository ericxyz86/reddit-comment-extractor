export interface Filters {
  subreddits: string[];
  startDate: string;
  endDate: string;
  keywords: string;
}

export interface Comment {
  id: string;
  author: string;
  subreddit: string;
  comment: string;
  upvotes: number;
  timestamp: string;
}