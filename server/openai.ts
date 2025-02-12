import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export async function extractTextFromImage(base64Image: string): Promise<{
  text: string;
  confidence: number;
}> {
  try {
    const userContent = `Extract and format the text from this homework image using markdown.
Image: data:image/jpeg;base64,${base64Image}`;

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
  "text": string (markdown formatted text),
  "confidence": number (0-1)
}`,
        },
        {
          role: "user",
          content: userContent,
        },
      ],
      response_format: { type: "json_object" },
    });

    const responseContent = visionResponse.choices[0].message.content;
    let result = {};
    try {
      result = JSON.parse(responseContent || "{}");
    } catch (parseError) {
      console.error("JSON parse error:", parseError);
      throw new Error("Failed to parse response JSON from vision API");
    }

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
    // Create a thread
    const thread = await openai.beta.threads.create();

    // Add the initial message with clear formatting instructions
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: `As an English teacher reviewing student work, please provide feedback on the following text.

Student Profile:
- English Level: ${englishLevel}
- Age Group: ${ageGroup}

Text to Review:
${text}

Provide feedback in this exact format:

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
(Provide encouraging feedback about strengths and areas for improvement)

Remember:
- Always use ~~text~~ for marking errors
- Always use **correction/improvement/suggestion**: [text] format
- Be encouraging and constructive
- Consider the student's level and age
- Keep corrections appropriate to their level`
    });

    // Run the assistant with timeout and better error handling
    console.log("Running assistant with ID:", process.env.OPENAI_ASSISTANT_ID);
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: process.env.OPENAI_ASSISTANT_ID!
    });

    // Wait for the run to complete with timeout
    const maxAttempts = 30; // 30 seconds timeout
    let attempts = 0;
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);

    while (runStatus.status !== "completed" && attempts < maxAttempts) {
      if (runStatus.status === "failed" || runStatus.status === "cancelled") {
        console.error("Assistant run failed:", runStatus.last_error);
        throw new Error(`Assistant run ${runStatus.status}: ${runStatus.last_error?.message || 'Unknown error'}`);
      }
      await new Promise(resolve => setTimeout(resolve, 1000));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      attempts++;
      console.log("Assistant run status:", runStatus.status, "attempt:", attempts);
    }

    if (attempts >= maxAttempts) {
      throw new Error("Assistant run timed out after 30 seconds");
    }

    // Get the assistant's response
    const messages = await openai.beta.threads.messages.list(thread.id);
    const lastMessage = messages.data[0]; // Get the most recent message

    if (!lastMessage || !lastMessage.content[0]) {
      throw new Error("No response from assistant");
    }

    // Check the type of content and extract the text appropriately
    if (lastMessage.content[0].type === 'text') {
      console.log("Assistant response:", lastMessage.content[0].text.value);
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