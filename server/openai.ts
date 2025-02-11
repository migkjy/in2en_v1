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

First, display the complete student text with inline corrections:
1. Use markdown to format the text
2. Mark spelling errors with strikethrough and green correction:
   Example: ~~happyness~~ <span style="color: green">(happiness)</span>
3. Mark grammar errors with strikethrough and blue correction:
   Example: ~~I am go~~ <span style="color: blue">(I am going)</span>
4. Keep the original structure and formatting

Then, provide a comprehensive review in these sections:

## Spelling Corrections
- List all spelling corrections made
- Explain common patterns in spelling mistakes

## Grammar Corrections
- List all grammar corrections made
- Explain the grammar rules that were violated

## Overall Assessment
- Highlight strengths in the writing
- Identify areas needing improvement
- Provide specific examples from the text

## Learning Recommendations
- Suggest specific exercises or practice areas
- Provide encouragement and positive reinforcement
- Set clear goals for future improvement

Format all feedback using proper markdown for clear organization.`
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