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
    // Create a thread
    const thread = await openai.beta.threads.create();

    // Add a system message to set the context and format
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `As an English teacher, please review the following text written by a student.

Student Information:
- English Level: ${englishLevel}
- Age Group: ${ageGroup}

Text to Review:
${text}

Please provide feedback following these strict rules:
1. Use '~~incorrect~~' for marking errors
2. Follow each error with a correction in bold like this: **correction**: [suggested text]
3. Organize feedback in this order:
   - Grammar and spelling corrections
   - Sentence structure improvements
   - Vocabulary suggestions
   - Overall feedback

Format Example:
~~I am go~~ **correction**: I am going
~~to school~~ **correction**: to school by bus.

Conclude with a brief, encouraging summary of the student's strengths and areas for improvement.`
    });

    // Run the assistant with the specific ID
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID!
    });

    // Wait for the run to complete with timeout
    const maxAttempts = 30; // 30 seconds timeout
    let attempts = 0;
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

    while (runStatus.status !== "completed" && attempts < maxAttempts) {
      if (runStatus.status === "failed" || runStatus.status === "cancelled") {
        throw new Error(`Assistant run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
    }

    if (attempts >= maxAttempts) {
      throw new Error("Assistant run timed out after 30 seconds");
    }

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[messages.data.length -1];

    if (!lastMessage || !lastMessage.content[0]) {
      throw new Error("No response from assistant");
    }

    // Check the type of content and extract the text appropriately
    if (lastMessage.content[0].type === 'text') {
      return lastMessage.content[0].text.value;
    } else {
      throw new Error("Unexpected response format from assistant");
    }

  } catch (error) {
    console.error("OpenAI Assistant API Error:", error);
    throw new Error(
      `Failed to generate feedback: ${error instanceof Error ? error.message : "Unknown error"}`,
    );
  }
}