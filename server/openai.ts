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

    const visionResponse = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: `You are a text extraction expert. Extract text from the image exactly as written, preserving all errors.
Respond in JSON format with the following structure:
{
  "text": "extracted text with original errors",
  "confidence": 0.95
}

Important rules:
1. Extract text exactly as written
2. Preserve all spelling mistakes and errors
3. Keep original line breaks
4. Do not make any corrections`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Extract text from this image and respond in JSON format with the text and confidence score."
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${compressedImage}`
              }
            }
          ]
        }
      ],
      response_format: { type: "json_object" }
    });

    console.log("Received response from OpenAI Vision");
    const result = JSON.parse(visionResponse.choices[0].message.content || "{}");
    console.log("Parsed result:", result);

    return {
      text: result.text || "",
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
(Provide encouraging feedback about strengths and areas for improvement)`
    });

    console.log("Creating run with assistant...");
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: "asst_TaRTcp8WPBUiZCW4XqlbM4Ra"
    });

    console.log("Waiting for run completion...");
    let completedRun = await waitForRunCompletion(thread.id, run.id);

    console.log("Getting assistant's response...");
    const messages = await openai.beta.threads.messages.list(thread.id);
    const assistantMessage = messages.data.find(msg => msg.role === "assistant");

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

async function waitForRunCompletion(threadId: string, runId: string, maxAttempts = 60) {
  for (let i = 0; i < maxAttempts; i++) {
    const run = await openai.beta.threads.runs.retrieve(threadId, runId);

    if (run.status === 'completed') {
      return run;
    }

    if (run.status === 'failed' || run.status === 'cancelled' || run.status === 'expired') {
      throw new Error(`Run failed with status: ${run.status}`);
    }

    // Wait for 1 second before checking again
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  throw new Error('Timeout waiting for run completion');
}