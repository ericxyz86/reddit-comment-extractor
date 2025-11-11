import OpenAI from "openai";
import type { Filters, Comment } from "../types";

const openai = new OpenAI({
  apiKey: process.env.API_KEY,
  dangerouslyAllowBrowser: true, // Required for client-side usage
});

// OpenAI JSON Schema (standard format, not Gemini's Type enum)
const responseSchema = {
  type: "object",
  properties: {
    comments: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "A unique ID for the comment, typically from Reddit.",
          },
          author: {
            type: "string",
            description: "The username of the comment author.",
          },
          subreddit: {
            type: "string",
            description: "The subreddit where the comment was posted.",
          },
          comment: {
            type: "string",
            description: "The full text content of the comment.",
          },
          upvotes: {
            type: "integer",
            description: "A simulated or actual number of upvotes for the comment.",
          },
          timestamp: {
            type: "string",
            description: "The date the comment was posted, in YYYY-MM-DD format.",
          },
        },
        required: ["id", "author", "subreddit", "comment", "upvotes", "timestamp"],
        additionalProperties: false,
      },
    },
  },
  required: ["comments"],
  additionalProperties: false,
};

// Retry logic with exponential backoff
async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;

      // Check if it's a rate limit error (429) or server error (5xx)
      const isRetryable =
        error?.status === 429 ||
        error?.status === 503 ||
        error?.status === 500 ||
        error?.code === "ECONNRESET";

      if (!isRetryable || attempt === maxRetries - 1) {
        throw error;
      }

      // Exponential backoff: 1s, 2s, 4s, etc.
      const delay = initialDelay * Math.pow(2, attempt);
      console.log(`Retry attempt ${attempt + 1}/${maxRetries} after ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError || new Error("Max retries exceeded");
}

// Request batching cache to reduce redundant API calls
interface CacheEntry {
  comments: Comment[];
  timestamp: number;
}

const requestCache = new Map<string, CacheEntry>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

function getCacheKey(filters: Filters, iteration: number): string {
  return JSON.stringify({ filters, iteration });
}

function getFromCache(key: string): Comment[] | null {
  const entry = requestCache.get(key);
  if (!entry) return null;

  const now = Date.now();
  if (now - entry.timestamp > CACHE_TTL) {
    requestCache.delete(key);
    return null;
  }

  return entry.comments;
}

function setCache(key: string, comments: Comment[]): void {
  requestCache.set(key, { comments, timestamp: Date.now() });
}

export const extractComments = async (
  filters: Filters,
  onProgress: (comments: Comment[]) => void
): Promise<Comment[]> => {
  const allComments: Comment[] = [];
  const extractedCommentIds = new Set<string>();
  const MAX_ITERATIONS = 25;

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      // Check cache first
      const cacheKey = getCacheKey(filters, i);
      const cachedComments = getFromCache(cacheKey);

      let newComments: Comment[];

      if (cachedComments) {
        console.log(`Using cached results for iteration ${i + 1}`);
        newComments = cachedComments;
      } else {
        const prompt = `
You are an expert Reddit data analyst. Your primary goal is to find and extract ALL Reddit comments that match the criteria below.
This is request #${i + 1} in a series. In each step, provide a NEW, UNIQUE batch of comments that you have not provided before.

Extraction Criteria:
- Subreddits: ${filters.subreddits.length > 0 ? filters.subreddits.join(", ") : "any"}
- Boolean Keyword Search in comments: ${filters.keywords || "any"}. You must interpret this as a boolean expression. Support standard operators like AND, OR, NOT, and parentheses for grouping. If the user provides a simple comma-separated list of words (e.g., "react, redux"), treat it as an OR search (e.g., "react OR redux").
- Date Range: From ${filters.startDate} to ${filters.endDate}

${
  extractedCommentIds.size > 0
    ? `\n- CRITICAL: You have already provided comments with the following IDs. You MUST exclude them from this response to avoid duplicates: ${Array.from(extractedCommentIds).join(", ")}`
    : ""
}

Your response MUST be a valid JSON object with a "comments" array. When no more new comments can be found that match the criteria, you MUST return {"comments": []}. This is the signal to stop the process.
`;

        // API call with retry logic
        const response = await retryWithBackoff(async () => {
          return await openai.chat.completions.create({
            model: "gpt-4o-mini",
            messages: [
              {
                role: "system",
                content:
                  "You are a Reddit data extraction assistant. Always respond with valid JSON matching the provided schema.",
              },
              {
                role: "user",
                content: prompt,
              },
            ],
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "reddit_comments_response",
                strict: true,
                schema: responseSchema,
              },
            },
            temperature: 0.7,
            max_tokens: 4096,
          });
        });

        const content = response.choices[0]?.message?.content;
        if (!content) {
          break; // Stop if the response is empty
        }

        const parsedResponse = JSON.parse(content) as { comments: Comment[] };
        newComments = parsedResponse.comments || [];

        // Cache the result
        setCache(cacheKey, newComments);
      }

      if (newComments.length === 0) {
        break; // Stop if the model returns an empty array, indicating no more results
      }

      let uniqueCommentsAdded = 0;
      for (const comment of newComments) {
        // Ensure comment and comment.id exist before processing
        if (comment && comment.id && !extractedCommentIds.has(comment.id)) {
          extractedCommentIds.add(comment.id);
          allComments.push(comment);
          uniqueCommentsAdded++;
        }
      }

      // Update the UI with the latest batch of comments
      onProgress([...allComments]);

      if (uniqueCommentsAdded === 0) {
        break; // Stop if no new unique comments were found in this batch
      }
    }
    return allComments;
  } catch (error) {
    console.error("Error extracting comments:", error);
    if (error instanceof Error) {
      throw new Error(`Failed to fetch or parse comments from AI: ${JSON.stringify(error)}`);
    }
    throw new Error("An unknown error occurred while extracting comments.");
  }
};
