import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function extractTextFromImage(base64Image: string): Promise<{
  text: string;
  feedback: string;
  confidence: number;
}> {
  try {
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "system",
          content: "You are an expert English teacher. Extract the text from the image and provide constructive feedback. Return JSON in this format: { 'text': string, 'feedback': string, 'confidence': number }"
        },
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract the text from this homework image and provide feedback."
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
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content: `You are an expert English teacher providing feedback for ${ageGroup} students at ${englishLevel} level. Provide constructive and encouraging feedback.`
        },
        {
          role: "user",
          content: text
        }
      ],
      max_tokens: 500
    });

    return response.choices[0].message.content || "No feedback generated";
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(`Failed to generate feedback: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}