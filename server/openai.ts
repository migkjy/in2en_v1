import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export async function extractTextFromImage(base64Image: string): Promise<{
  text: string;
  feedback: string;
}> {
  try {
    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: "Extract and format the text from this homework image. Return the result as a JSON object with a 'text' field containing the extracted text, maintaining original line breaks and spacing."
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
      feedback: "" // Remove initial feedback as we'll use Assistant API
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
    // Create a thread
    const thread = await openai.beta.threads.create();

    // Add the message to the thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Student level: ${englishLevel}
Age group: ${ageGroup}

Text to review:
${text}`
    });

    // Run the assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: "asst_TaRTcp8WPBUiZCW4XqlbM4Ra"
    });

    // Wait for the run to complete
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    let retryCount = 0;
    const maxRetries = 30; // 30 seconds timeout
    while (runStatus.status !== "completed" && retryCount < maxRetries) {
      if (runStatus.status === "failed") {
        throw new Error("Assistant run failed");
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      retryCount++;
    }

    if (retryCount >= maxRetries) {
      throw new Error("Assistant run timed out");
    }

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0];

    if (!lastMessage || !lastMessage.content[0]) {
      throw new Error("No response from assistant");
    }

    // Get text content from the message
    const content = lastMessage.content[0];
    if (content.type !== 'text') {
      throw new Error("Unexpected response format from assistant");
    }

    // Return the feedback text
    return content.value;
  } catch (error) {
    console.error("OpenAI Assistant API Error:", error);
    throw new Error(
      `Failed to generate feedback: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}