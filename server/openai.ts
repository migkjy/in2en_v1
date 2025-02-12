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

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
export async function extractTextFromImage(base64Image: string): Promise<{
  text: string;
  confidence: number;
}> {
  try {
    // 이미지 크기 압축
    const compressedImage = compressBase64Image(base64Image);
    const userContent = `Extract and format the text from this homework image using markdown.
Image: data:image/jpeg;base64,${compressedImage}`;

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
`,
    });

    // Create a run with the specific assistant
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: "asst_TaRTcp8WPBUiZCW4XqlbM4Ra",
    });

    // Poll for completion
    let completedRun = await waitForRunCompletion(thread.id, run.id);

    // Get the assistant's response
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

// Helper function to wait for run completion
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
