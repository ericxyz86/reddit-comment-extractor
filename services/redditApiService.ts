import type { Filters, Comment } from "../types";

// Backend API URL - Use environment variable, or same-origin (empty string) for production, or Render fallback
const BACKEND_URL = import.meta.env.VITE_BACKEND_URL ?? "";

// Helper function to search posts via backend
async function searchPosts(subreddit: string, query: string, limit: number = 100): Promise<any> {
  const response = await fetch(`${BACKEND_URL}/api/reddit/search`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ subreddit, query, limit }),
  });

  if (!response.ok) {
    throw new Error(`Failed to search r/${subreddit}: ${response.status}`);
  }

  return response.json();
}

// Helper function to fetch comments via backend
async function fetchComments(subreddit: string, postId: string): Promise<any> {
  const response = await fetch(`${BACKEND_URL}/api/reddit/comments/${subreddit}/${postId}`);

  if (!response.ok) {
    throw new Error(`Failed to fetch comments for post ${postId}: ${response.status}`);
  }

  return response.json();
}

// Helper function to add delay between requests to respect rate limits
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// Parse boolean keyword expression
function matchesKeywords(text: string, keywords: string): boolean {
  if (!keywords || keywords.trim() === "") return true;

  const lowerText = text.toLowerCase();
  const lowerKeywords = keywords.toLowerCase();

  try {
    // Simple boolean parser - converts to JavaScript expression
    let expression = lowerKeywords
      .replace(/\bAND\b/gi, "&&")
      .replace(/\bOR\b/gi, "||")
      .replace(/\bNOT\b/gi, "!")
      // Handle comma as OR
      .split(",")
      .map((part) => part.trim())
      .join(" || ");

    // Replace keywords with boolean checks
    expression = expression.replace(/([a-zA-Z0-9_]+)/g, (match) => {
      // Skip operators
      if (["&&", "||", "!"].includes(match)) return match;
      return `lowerText.includes("${match.toLowerCase()}")`;
    });

    // Evaluate the expression
    return eval(expression);
  } catch (error) {
    // Fallback to simple OR matching if parsing fails
    const terms = keywords
      .toLowerCase()
      .split(/[,\s]+/)
      .filter((t) => t.length > 0);
    return terms.some((term) => lowerText.includes(term));
  }
}

// Extract all comments from a Reddit post's comment tree
function extractCommentsFromTree(
  commentData: any,
  postData: any,
  filters: Filters
): Comment[] {
  const comments: Comment[] = [];

  function traverse(item: any, subreddit: string) {
    if (!item || item.kind !== "t1") return; // t1 = comment

    const data = item.data;
    if (!data || !data.body) return;

    // Check if comment matches date range
    const commentDate = new Date(data.created_utc * 1000);
    const startDate = new Date(filters.startDate);
    const endDate = new Date(filters.endDate);
    endDate.setHours(23, 59, 59, 999); // Include end date

    if (commentDate >= startDate && commentDate <= endDate) {
      // Check if comment matches keywords
      if (matchesKeywords(data.body, filters.keywords)) {
        comments.push({
          id: data.id,
          author: data.author,
          subreddit: subreddit,
          comment: data.body,
          upvotes: data.ups || 0,
          timestamp: commentDate.toISOString().split("T")[0],
        });
      }
    }

    // Recursively process replies
    if (data.replies && data.replies.data && data.replies.data.children) {
      data.replies.data.children.forEach((reply: any) =>
        traverse(reply, subreddit)
      );
    }
  }

  // Process all top-level comments
  if (commentData && commentData.data && commentData.data.children) {
    const subreddit = postData.data.children[0]?.data.subreddit || "";
    commentData.data.children.forEach((item: any) =>
      traverse(item, subreddit)
    );
  }

  return comments;
}

export const extractComments = async (
  filters: Filters,
  onProgress: (comments: Comment[]) => void,
  abortSignal?: AbortSignal
): Promise<Comment[]> => {
  const allComments: Comment[] = [];
  const seenCommentIds = new Set<string>();
  const MAX_POSTS_PER_SUBREDDIT = 25; // Limit posts to fetch per subreddit

  try {
    for (const subreddit of filters.subreddits) {
      // Check for cancellation
      if (abortSignal?.aborted) {
        console.log("Extraction cancelled by user");
        throw new Error("Extraction cancelled");
      }

      console.log(`Searching r/${subreddit}...`);

      // Search for posts matching keywords
      const searchQuery = filters.keywords || "*";

      let searchData;
      try {
        searchData = await searchPosts(subreddit, searchQuery, 100);
      } catch (error) {
        console.error(`Failed to search r/${subreddit}:`, error);
        continue;
      }

      const posts = searchData.data?.children || [];

      console.log(`Found ${posts.length} posts in r/${subreddit}`);

      // Process up to MAX_POSTS_PER_SUBREDDIT posts
      let postsProcessed = 0;
      for (const post of posts) {
        // Check for cancellation
        if (abortSignal?.aborted) {
          console.log("Extraction cancelled by user");
          throw new Error("Extraction cancelled");
        }

        if (postsProcessed >= MAX_POSTS_PER_SUBREDDIT) break;

        const postData = post.data;
        if (!postData || !postData.id) continue;

        // Check if post is within date range
        const postDate = new Date(postData.created_utc * 1000);
        const startDate = new Date(filters.startDate);
        const endDate = new Date(filters.endDate);
        endDate.setHours(23, 59, 59, 999);

        if (postDate < startDate || postDate > endDate) continue;

        console.log(`Fetching comments from post: ${postData.title.substring(0, 50)}...`);

        await delay(1000); // Rate limiting: 1 request per second

        // Fetch comments for this post
        let postWithComments;
        try {
          postWithComments = await fetchComments(subreddit, postData.id);
        } catch (error) {
          console.error(
            `Failed to fetch comments for post ${postData.id}:`, error
          );
          continue;
        }

        // Extract comments from the response
        // Reddit returns [post_data, comments_data]
        if (Array.isArray(postWithComments) && postWithComments.length >= 2) {
          const comments = extractCommentsFromTree(
            postWithComments[1],
            postWithComments[0],
            filters
          );

          // Add unique comments
          let newCommentsAdded = 0;
          for (const comment of comments) {
            if (!seenCommentIds.has(comment.id)) {
              seenCommentIds.add(comment.id);
              allComments.push(comment);
              newCommentsAdded++;
            }
          }

          if (newCommentsAdded > 0) {
            console.log(`Added ${newCommentsAdded} new comments`);
            onProgress([...allComments]);
          }
        }

        postsProcessed++;
      }

      console.log(`Completed r/${subreddit}: ${allComments.length} total comments`);
    }

    return allComments;
  } catch (error) {
    console.error("Error extracting comments:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch comments from Reddit: ${error.message}`);
    }
    throw new Error("An unknown error occurred while extracting comments.");
  }
};
