/**
 * Generate a session title from user message
 * Uses a simple heuristic: take first 50 chars or first sentence
 */
export function generateSessionTitle(userMessage: string): string {
  // Remove extra whitespace
  const cleaned = userMessage.trim().replace(/\s+/g, ' ');

  // If message is short enough, use it as is
  if (cleaned.length <= 50) {
    return cleaned;
  }

  // Try to find first sentence (ending with . ! ?)
  const sentenceMatch = cleaned.match(/^[^.!?]+[.!?]/);
  if (sentenceMatch && sentenceMatch[0].length <= 60) {
    return sentenceMatch[0].trim();
  }

  // Otherwise, truncate at 50 chars and add ellipsis
  return cleaned.substring(0, 50).trim() + '...';
}

/**
 * Generate a session title using AI
 * This is a more sophisticated approach that uses the LLM to generate a concise title
 */
export async function generateSessionTitleWithAI(userMessage: string, model: any): Promise<string> {
  try {
    const prompt = `Generate a very short, concise title (max 6 words) for a conversation that starts with this message:

"${userMessage}"

Reply with ONLY the title, nothing else. No quotes, no punctuation at the end.`;

    const { text } = await model.doGenerate({
      inputFormat: 'messages',
      mode: { type: 'regular' },
      prompt: [
        {
          role: 'user',
          content: [{ type: 'text', text: prompt }],
        },
      ],
    });

    // Clean up the response
    const title = text
      .trim()
      .replace(/^["']|["']$/g, '')
      .substring(0, 60);

    // If AI response is empty or too short, fall back to simple generation
    if (!title || title.length < 3) {
      return generateSessionTitle(userMessage);
    }

    return title;
  } catch (error) {
    // If AI generation fails, fall back to simple generation
    console.error('Failed to generate title with AI:', error);
    return generateSessionTitle(userMessage);
  }
}
