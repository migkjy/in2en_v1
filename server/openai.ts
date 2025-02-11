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
Important: Do not correct any errors at this stage. Keep the text exactly as written.

Format rules:
1. Use '## Question' for textbook questions if present
2. Use '**Student Writing:**' for student's text
3. Preserve all original spelling mistakes, grammar errors, and line breaks
4. Do not make any corrections or suggestions
5. Use markdown formatting for structure only

Return JSON in this format:
{
  'text': string (original text with errors preserved),
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
          content: `You are an expert English teacher providing detailed feedback for ${ageGroup} students at ${englishLevel} level.

Format the feedback exactly like this:

# 교정된 학생 글 (Annotated Student Writing)

First, show the complete original text with inline corrections:
- For spelling/word errors: ~~incorrect~~ (<span style="color: red;">correct</span>)
- For grammar errors: ~~incorrect~~ (<span style="color: red;">correct</span>)
- For missing punctuation: Add [<span style="color: red;">,</span>] or other needed marks
- Keep original line breaks
- Show all corrections inline within the original text

Example format:
This is ~~intresting~~ (<span style="color: red;">interesting</span>) and ~~me like~~ (<span style="color: red;">I like</span>) it[<span style="color: red;">.</span>]

---

# Overall Comments and Review

- **Understanding:** Comment on comprehension and content
- **Grammar and Spelling:** Highlight main error patterns
- **Suggestions for Improvement:**
  - Specific areas to focus on
  - Clear action items for improvement
- **Positive Aspects:**
  - Note strong points
  - Highlight effective elements

Keep feedback constructive and encouraging.`,
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
