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
6. never use bold formatting (**text**). Instead, use heading levels (#, ##, ###, ####, #####) to structure and emphasize text as needed.

Return JSON in this format:
{
  'text': string (markdown formatted text),
  'feedback': string (initial observations),
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

    // Remove bold markdown symbols
    const cleanText = (result.text || "").replace(/\*\*/g, "");
    const cleanFeedback = (result.feedback || "").replace(/\*\*/g, "");

    return {
      text: cleanText,
      feedback: cleanFeedback,
      confidence: Math.max(0, Math.min(1, result.confidence || 0)),
    };
  } catch (error) {
    console.error("OpenAI API Error:", error);
    throw new Error(
      `Failed to analyze image: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}

interface FeedbackResponse {
  correctedText: string;
  overallAssessment: string;
}

export async function generateFeedback(
  text: string,
  englishLevel: string,
  ageGroup: string,
  studentName: string,
): Promise<FeedbackResponse> {
  try {
    console.log("Creating thread for feedback generation...");
    const thread = await openai.beta.threads.create();

    console.log("Adding message to thread...");
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `Please provide feedback on the following text:
Student Profile:
- Name: ${studentName}
- English Level: ${englishLevel}
- Age Group: ${ageGroup}

Text to Review:
${text}

Respond with JSON in this format:
{
  "correctedText": "The corrected version of the text with corrections marked using markdown",
  "overallAssessment": "A detailed assessment of the writing in markdown format"
}`,
    });

    console.log("Creating run with assistant...");
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: "asst_9N8UIiXaRZ9KngTTwg2rxAE7",
      response_format: { type: "json_object" },
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

    const contentText = assistantMessage.content[0].text.value;
    const response = JSON.parse(contentText) as FeedbackResponse;

    return {
      correctedText: response.correctedText || "",
      overallAssessment: response.overallAssessment || "",
    };
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
  const startTime = Date.now();
  const TIMEOUT = 60000; // 1 minute timeout

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

    // Check for timeout
    if (Date.now() - startTime > TIMEOUT) {
      throw new Error("Processing timeout");
    }

    // Wait for 1 second before checking again
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  throw new Error("Timeout waiting for run completion");
}
