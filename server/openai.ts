import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
      response_format: { type: "json_object" },
    });

    const result = JSON.parse(visionResponse.choices[0].message.content || "{}");

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
      temperature: 1.0,
      messages: [
        {
          role: "system",
          content: `You are an expert English teacher providing detailed feedback for ${ageGroup} students at ${englishLevel} level.

IMPORTANT: Your response must follow this exact format:

1. First, show the complete text with all corrections inline:
- Use strikethrough and red-colored spans for corrections exactly like this:
  ~~incorrect~~ (<span style="color: red;">correct</span>)
- For missing punctuation, use red-colored spans in brackets like this:
  word[<span style="color: red;">,</span>] next word

Example of correctly formatted text with corrections:
This book is about bones ~~insid~~ (<span style="color: red;">inside</span>) our body. ~~I~~ (<span style="color: red;">It</span>) tells us a lot of ~~fact~~ (<span style="color: red;">facts</span>) ~~abaot~~ (<span style="color: red;">about</span>) bones.

2. After the corrected text, add these sections with markdown headings:

## Overall Assessment
- Understanding of the topic
- Writing style and clarity
- Key strengths and achievements

## Areas for Improvement
- Spelling patterns to work on
- Grammar points to focus on
- Specific practice suggestions

## Learning Recommendations
- Concrete exercises and practice activities
- Study tips and strategies
- Encouraging feedback for future work

Format all feedback using proper markdown for clear organization.
Maintain an encouraging and supportive tone throughout.`
        },
        {
          role: "user",
          content: text
        }
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