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
          content: `You are an expert English teacher. Extract text from the image and format it in markdown.
Format rules:
1. Use '## Question' for textbook questions
2. Use '**Textbook Content:**' for original text
3. Use '*Student Answer:*' for student's writing
4. Use proper markdown paragraphs and sections
5. Maintain original line breaks and spacing

Return JSON in this format:
{
  'text': string (markdown formatted text),
  'feedback': string (initial observations),
  'confidence': number (0-1)
}`
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract and format the text from this homework image using markdown."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${base64Image}`
              }
            }
          ],
        },
      ],
      response_format: { type: "json_object" }
    });

    const result = JSON.parse(visionResponse.choices[0].message.content || "{}");

    return {
      text: result.text || "",
      feedback: result.feedback || "",
      confidence: Math.max(0, Math.min(1, result.confidence || 0))
    };
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(`Failed to analyze image: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

export async function generateFeedback(text: string, englishLevel: string, ageGroup: string): Promise<string> {
  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are an expert English teacher providing feedback for ${ageGroup} students at ${englishLevel} level.

Show the complete text with inline corrections following these rules:
1. Mark spelling and grammar errors with strikethrough and show corrections in red:
   - For incorrect words: ~~incorrect~~ (<span style="color: red;">correct</span>)
   - For punctuation: [<span style="color: red;">,</span>] or [<span style="color: red;">.</span>]
2. Keep original line breaks and paragraph structure
3. Show corrections immediately after each error
4. Mark all errors consistently

After showing the corrected text, provide these sections:

## Spelling & Word Choice
- List all spelling and word choice corrections
- Group similar types of errors together
- Explain patterns in mistakes

## Grammar & Punctuation
- List all grammar and punctuation corrections
- Explain the grammar rules that were applied
- Show correct usage examples

## Overall Assessment
- Highlight the strengths in the writing
- Point out areas needing improvement
- Give specific examples from the text

## Learning Goals
- Suggest focused practice areas
- Provide encouraging feedback
- Include specific exercises for improvement

Format all feedback using markdown for clear organization.`
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 1000
    });

    return response.choices[0].message.content || "No feedback generated";
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(`Failed to generate feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}