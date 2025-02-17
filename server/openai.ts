import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

function compressBase64Image(base64: string): string {
  // If the input already starts with "data:image", return it as is
  if (base64.startsWith("data:image")) {
    return base64;
  }

  // Otherwise, construct a proper data URL
  return `data:image/jpeg;base64,${base64}`;
}

export async function extractTextFromImage(base64Image: string): Promise<{
  text: string;
  confidence: number;
}> {
  try {
    console.log("Creating thread for image text extraction...");
    const thread = await openai.beta.threads.create();

    console.log("Adding user message with image to thread...");
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: [
        {
          type: "text",
          text: "Extract text from this image exactly as written, preserving any errors."
        },
        {
          type: "image_url",
          image_url: {
            url: compressBase64Image(base64Image)
          }
        }
      ]
    });

    console.log("Creating run with assistant...");
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: "asst_RNQYzDhnSFJ8r25f6zcUSrER"
    });

    console.log("Waiting for run completion...");
    await waitForRunCompletion(thread.id, run.id);

    console.log("Getting assistant's response...");
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(msg => msg.role === "assistant");

    if (!assistantMessage || !assistantMessage.content[0]) {
      throw new Error("No text extraction received from assistant");
    }

    const result = JSON.parse(assistantMessage.content[0].text.value || "{}");
    console.log("Parsed result:", result);

    return {
      text: result.text || "",
      confidence: Math.max(0, Math.min(1, result.confidence || 0))
    };
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(
      `Failed to extract text from image: ${
        error instanceof Error ? error.message : "Unknown error"
      }`
    );
  }
}

export async function generateFeedback(
  text: string,
  englishLevel: string,
  ageGroup: string,
): Promise<string> {
  try {
    console.log("Creating thread for feedback generation...");
    const thread = await openai.beta.threads.create();

    console.log("Adding message to thread...");
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Analyze the following text and provide detailed feedback:
Student Profile:
- English Level: ${englishLevel}
- Age Group: ${ageGroup}

Text to Review:
${text}

Please provide feedback in this format:

1. Grammar and Spelling Corrections:
- List all errors with corrections

2. Sentence Structure Improvements:
- Suggest better sentence structures

3. Vocabulary Suggestions:
- Recommend more appropriate words

4. Overall Feedback:
- Provide encouraging feedback about strengths and areas for improvement`
    });

    console.log("Creating run with assistant...");
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: "asst_TaRTcp8WPBUiZCW4XqlbM4Ra"
    });

    console.log("Waiting for run completion...");
    await waitForRunCompletion(thread.id, run.id);

    console.log("Getting assistant's response...");
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(msg => msg.role === "assistant");

    if (!assistantMessage || !assistantMessage.content[0]) {
      throw new Error("No feedback received from assistant");
    }

    return assistantMessage.content[0].text.value;
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(`Failed to generate feedback: ${error instanceof Error ? error.message : "Unknown error"}`);
  }
}

async function waitForRunCompletion(threadId: string, runId: string, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);

    if (run.status === 'completed') {
      return run;
    }

    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
      throw new Error(`Run failed with status: ${run.status}`);
    }

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Timeout waiting for run completion');
}