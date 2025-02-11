import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractTextFromImage(base64Image: string): Promise<{
  text: string;
  feedback: string;
  confidence: number;
}> {
  try {
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert English teacher. Extract text from the image exactly as written, preserving all errors.
Format rules:
1. Use '## Question' for textbook questions if present
2. Use '**Student Writing:**' for student's text
3. Preserve all original spelling mistakes, grammar errors, and line breaks
4. Do not make any corrections at this stage
5. Use markdown formatting for structure only

Return JSON in this format:
{
  'text': string (markdown formatted text, with original errors preserved),
  'feedback': string (brief note about text type),
  'confidence': number (0-1)
}`,
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract and format the text from this homework image using markdown.",
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(
      visionResponse.choices[0].message.content || "{}",
    );

    return {
      text: result.text || "",
      feedback: result.feedback || "",
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
    };
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(
      `Failed to analyze image: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

export async function generateFeedback(
  text: string,
  englishLevel: string,
  ageGroup: string,
): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert English teacher providing feedback for ${ageGroup} students at ${englishLevel} level.

1. First, show the complete original text with inline corrections:
   - Mark spelling errors with red strikethrough and green correction in parentheses
   Example: ~~intresting~~ (interesting)
   - Mark grammar errors with red strikethrough and blue correction in parentheses
   Example: ~~I going to~~ (I am going to)
   - Keep the original formatting and line breaks

2. Then provide feedback sections:

## Spelling Corrections
- List each spelling error and its correction
- Explain any spelling patterns or rules

## Grammar Points
- List each grammar error and its correction
- Explain the relevant grammar rules

## Overall Review
- Positive points about the writing
- Areas for improvement
- Specific suggestions for practice

Use clear markdown formatting and maintain a supportive, encouraging tone throughout the feedback.`,
        },
        {
          role: "user",
          content: text,
        },
      ],
      max_tokens: 2000,
    });

    return response.choices[0].message.content || "No feedback generated";
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(
      `Failed to generate feedback: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}
