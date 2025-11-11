import { GoogleGenAI, Type } from "@google/genai";
import type { Filters, Comment } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const responseSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      id: {
        type: Type.STRING,
        description: 'A unique ID for the comment, typically from Reddit.',
      },
      author: {
        type: Type.STRING,
        description: 'The username of the comment author.',
      },
      subreddit: {
        type: Type.STRING,
        description: 'The subreddit where the comment was posted.',
      },
      comment: {
        type: Type.STRING,
        description: 'The full text content of the comment.',
      },
      upvotes: {
        type: Type.INTEGER,
        description: 'A simulated or actual number of upvotes for the comment.',
      },
      timestamp: {
        type: Type.STRING,
        description: 'The date the comment was posted, in YYYY-MM-DD format.',
      },
    },
    required: ['id', 'author', 'subreddit', 'comment', 'upvotes', 'timestamp'],
  },
};

export const extractComments = async (
  filters: Filters,
  onProgress: (comments: Comment[]) => void
): Promise<Comment[]> => {
  const allComments: Comment[] = [];
  const extractedCommentIds = new Set<string>();
  // Increased the iteration limit significantly to allow for more comprehensive extraction.
  // This acts as a safeguard against runaway API calls in edge cases.
  const MAX_ITERATIONS = 25;

  try {
    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const prompt = `
        You are an expert Reddit data analyst. Your primary goal is to find and extract ALL Reddit comments that match the criteria below.
        This is request #${i + 1} in a series. In each step, provide a NEW, UNIQUE batch of comments that you have not provided before.

        Extraction Criteria:
        - Subreddits: ${filters.subreddits.length > 0 ? filters.subreddits.join(', ') : 'any'}
        - Boolean Keyword Search in comments: ${filters.keywords || 'any'}. You must interpret this as a boolean expression. Support standard operators like AND, OR, NOT, and parentheses for grouping. If the user provides a simple comma-separated list of words (e.g., "react, redux"), treat it as an OR search (e.g., "react OR redux").
        - Date Range: From ${filters.startDate} to ${filters.endDate}
        
        ${extractedCommentIds.size > 0 ? `\n- CRITICAL: You have already provided comments with the following IDs. You MUST exclude them from this response to avoid duplicates: ${Array.from(extractedCommentIds).join(', ')}` : ''}

        Your response MUST be a valid JSON array of comment objects. Do not include any other text, explanations, or markdown formatting.
        When no more new comments can be found that match the criteria, you MUST return an empty JSON array []. This is the signal to stop the process.
      `;
      
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: responseSchema,
        },
      });

      const jsonText = response.text.trim();
      if (!jsonText) {
        break; // Stop if the response is empty
      }
      
      const newComments = JSON.parse(jsonText) as Comment[];
      
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
        throw new Error(`Failed to fetch or parse comments from AI: ${error.message}`);
    }
    throw new Error("An unknown error occurred while extracting comments.");
  }
};