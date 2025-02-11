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
Provide detailed feedback in the following markdown format:

## Spelling and Word Choice
- Mark incorrect words with strikethrough and show corrections in green
  Example: ~~happyness~~ <span style="color: green">(happiness)</span>

## Grammar and Structure
- Mark incorrect grammar with strikethrough and show corrections in blue
  Example: ~~He are~~ <span style="color: blue">(He is)</span>

## Overall Review
- Summarize the strengths and areas for improvement
- Provide specific examples from the text
- Give encouragement and suggestions for practice

Return the feedback in markdown format with proper sections and formatting.`
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