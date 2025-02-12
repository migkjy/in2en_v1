import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Base64 이미지 크기 줄이기 함수
function compressBase64Image(base64: string): string {
  // 데이터 URL 형식에서 실제 base64 부분만 추출
  const base64Data = base64.split(";base64,").pop() || "";

  // base64 문자열이 너무 길면 잘라내기
  const maxLength = 85000; // 약 64KB 정도의 크기로 제한
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
  feedback: string;
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
          content: `You are an expert English teacher. Extract text from the image exactly as written, preserving all errors.
Important: Do not correct any errors at this stage. Keep the text exactly as written.

Format rules:
1. Use '## Question' for textbook questions if present
2. Use '**Student Writing:**' for student's text
3. Preserve all original spelling mistakes, grammar errors, and line breaks
4. Do not make any corrections or suggestions
5. Use markdown formatting for structure only

Response format:
{
  "text": "extracted text with original errors",
  "feedback": "brief note about text type",
  "confidence": 0.95
}`
        },
        {
          role: "user",
          content: [
            { 
              type: "text", 
              text: "Extract and format the text from this homework image exactly as written, preserving any errors."
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
    // Create a new thread
    const thread = await openai.beta.threads.create();

    // Add the student's text as a message to the thread
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

    // Create a run with the specific assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: "asst_TaRTcp8WPBUiZCW4XqlbM4Ra"
    });

    // Poll for completion
    let completedRun = await waitForRunCompletion(thread.id, run.id);

    // Get the assistant's response
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

// Helper function to wait for run completion
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