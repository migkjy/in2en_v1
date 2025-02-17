import OpenAI from "openai";

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

export async function extractTextFromImage(base64Image: string): Promise<{
  text: string;
  confidence: number;
}> {
  try {
    const compressedImage = compressBase64Image(base64Image);
    console.log("Making API call to OpenAI Vision...");

    // Create thread
    const thread = await openai.beta.threads.create();

    // Add message with image to thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: [
        {
          type: "text",
          text: "Extract and format the text from this homework image using markdown"
        },
        {
          type: "image_url",
          image_url: {
            url: `data:image/jpeg;base64,${compressedImage}`
          }
        }
      ]
    });

    // Run assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: "asst_RNQYzDhnSFJ8r25f6zcUSrER"
    });

    // Wait for completion
    let completedRun = await waitForRunCompletion(thread.id, run.id);

    // Get response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(msg => msg.role === "assistant");

    if (!assistantMessage || !assistantMessage.content[0]) {
      throw new Error("No response received from assistant");
    }

    const text = assistantMessage.content[0].text.value;
    console.log("Extracted text:", { text });

    return {
      text: text || "",
      confidence: 0.95 // Assistant API doesn't provide confidence score
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
    console.log("Creating thread for feedback generation...");
    const thread = await openai.beta.threads.create();

    console.log("Adding message to thread...");
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Please provide feedback on the following text:
Student Profile:
- English Level: ${englishLevel}
- Age Group: ${ageGroup}

Text to Review:
${text}

Please provide feedback in this exact format:

1. Grammar and Spelling Corrections:
- ~~incorrect text~~ **correction**: [suggested correction]
(List all grammar and spelling errors with corrections)

2. Sentence Structure Improvements:
- ~~original sentence~~ **improvement**: [improved version]
(List sentences that need structural improvement)

3. Vocabulary Suggestions:
- ~~basic word choice~~ **suggestion**: [more appropriate word]
(List words that could be improved)

4. Overall Feedback:
(Provide encouraging feedback about strengths and areas for improvement)`,
    });

    console.log("Creating run with assistant...");
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: "asst_TaRTcp8WPBUiZCW4XqlbM4Ra",
    });

    console.log("Waiting for run completion...");
    let completedRun = await waitForRunCompletion(thread.id, run.id);

    console.log("Getting assistant's response...");
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(
      (msg) => msg.role === "assistant",
    );

    if (!assistantMessage || !assistantMessage.content[0]) {
      throw new Error("No feedback received from assistant");
    }

    return assistantMessage.content[0].text.value;
  } catch (error) {
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
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);

    if (run.status === "completed") {
      return run;
    }

    if (
      run.status === "failed" ||
      run.status === "cancelled" ||
      run.status === "expired"
    ) {
      throw new Error(`Run failed with status: ${run.status}`);
    }

    // Wait for 1 second before checking again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timeout waiting for run completion");
}
