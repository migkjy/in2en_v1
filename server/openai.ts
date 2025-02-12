import OpenAI from "openai";
import type { MessageContentText } from "openai/resources/beta/threads/messages/messages";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function compressBase64Image(base64: string): string {
  const base64Data = base64.split(";base64,").pop() || "";
  const maxLength = 85000;
  if (base64Data.length > maxLength) {
    console.log(
      `Compressing base64 image from ${base64Data.length} to ${maxLength} chars`,
    );
    return base64Data.substring(0, maxLength);
  }
  return base64Data;
}

interface TextExtractionResult {
  text: string;
  confidence: number;
}

export async function extractTextFromImage(base64Image: string): Promise<TextExtractionResult> {
  try {
    const compressedImage = compressBase64Image(base64Image);

    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    // the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
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
  "text": string (markdown formatted text, original text with errors preserved),
  "confidence": number (0-1)
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
                url: `data:image/jpeg;base64,${compressedImage}`,
              },
            },
          ],
        },
      ],
      response_format: { type: "json_object" },
    });

    const responseContent = visionResponse.choices[0].message.content;
    let result: TextExtractionResult = {
      text: "",
      confidence: 0
    };

    try {
      const parsedResult = JSON.parse(responseContent || "{}") as Partial<TextExtractionResult>;
      result = {
        text: parsedResult.text || "",
        confidence: Math.max(0, Math.min(1, parsedResult.confidence || 0))
      };
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Failed to parse response JSON from vision API");
    }

    return result;
  } catch (error) {
    if (error instanceof Error && error.message.includes("429")) {
      throw new Error("OpenAI API quota exceeded. Please try again later.");
    }
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
    if (!process.env.OPENAI_API_KEY) {
      throw new Error("OpenAI API key is not configured");
    }

    const thread = await openai.beta.threads.create();
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Please provide feedback on the following text:
Student Profile:
- English Level: ${englishLevel}
- Age Group: ${ageGroup}

Text to Review:
${text}
`
    });

    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: "asst_TaRTcp8WPBUiZCW4XqlbM4Ra"
    });

    const completedRun = await waitForRunCompletion(thread.id, run.id);
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(
      (msg) => msg.role === "assistant",
    );

    if (!assistantMessage || !assistantMessage.content[0]) {
      throw new Error("No feedback received from assistant");
    }

    const content = assistantMessage.content[0];
    if (content.type !== 'text') {
      throw new Error("Unexpected response format from assistant");
    }

    return content.text.value;
  } catch (error) {
    if (error instanceof Error && error.message.includes("429")) {
      throw new Error("OpenAI API quota exceeded. Please try again later.");
    }
    console.error("OpenAI API Error:", error);
    throw new Error(
      `Failed to generate feedback: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

async function waitForRunCompletion(
  threadId: string,
  runId: string,
  maxAttempts = 60,
) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const run = await openai.beta.threads.runs.retrieve(threadId, runId);

      if (run.status === "completed") {
        return run;
      }

      if (run.status === "failed" || run.status === "cancelled" || run.status === "expired") {
        throw new Error(`Run failed with status: ${run.status}`);
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));
    } catch (error) {
      if (error instanceof Error && error.message.includes("429")) {
        throw new Error("OpenAI API quota exceeded. Please try again later.");
      }
      throw error;
    }
  }

  throw new Error("Timeout waiting for run completion");
}