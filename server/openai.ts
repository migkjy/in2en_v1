import OpenAI from "openai";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Retry configuration
const MAX_RETRIES = 3;
const INITIAL_RETRY_DELAY = 1000;

async function retryOperation<T>(
  operation: () => Promise<T>,
  retries = MAX_RETRIES,
  delay = INITIAL_RETRY_DELAY
): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (retries === 0 || !(error instanceof Error)) {
      throw error;
    }

    console.log(`Operation failed, retrying... (${retries} attempts remaining)`);
    await new Promise(resolve => setTimeout(resolve, delay));
    return retryOperation(operation, retries - 1, delay * 2);
  }
}

export async function extractTextFromImage(base64Image: string): Promise<{
  text: string;
  confidence: number;
}> {
  return retryOperation(async () => {
    try {
      console.log("Starting text extraction process...");

      // Ensure the base64 string is properly formatted
      const base64Data = base64Image.startsWith("data:image") 
        ? base64Image 
        : `data:image/jpeg;base64,${base64Image}`;

      console.log("Creating chat completion with image...");
      const response = await openai.chat.completions.create({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "system",
            content: `You are a text extraction expert. Your task is to extract ALL text from the image completely and accurately.
Important rules:
1. Extract every single word and character visible in the image
2. Maintain exact formatting and line breaks
3. Preserve all original errors and typos
4. Do not summarize or skip any text
5. Include section headers, labels, and any visible text markers`
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract ALL text from this image exactly as written, preserving every detail including formatting, line breaks, and any errors. Do not skip any text. Respond in this JSON format: { 'text': 'extracted_text', 'confidence': confidence_score }"
              },
              {
                type: "image_url",
                image_url: {
                  url: base64Data
                }
              }
            ]
          }
        ],
        max_tokens: 4000,  // Increased from 1000 to 4000
        response_format: { type: "json_object" },
        temperature: 0,    // Set to 0 for maximum accuracy
        timeout: 60000    // Increased timeout to 60 seconds
      });

      console.log("Parsing response...");
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response content received");
      }

      const result = JSON.parse(content);
      console.log("Extracted text length:", result.text?.length || 0);

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
  });
}

export async function generateFeedback(
  text: string,
  englishLevel: string,
  ageGroup: string
): Promise<string> {
  return retryOperation(async () => {
    try {
      console.log("Generating feedback for text...");
      const response = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert English teacher providing detailed feedback on student writing."
          },
          {
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
          }
        ],
        temperature: 0.7,
        max_tokens: 1000,
        timeout: 30000 // 30 seconds timeout
      });

      const feedback = response.choices[0]?.message?.content;
      if (!feedback) {
        throw new Error("No feedback received");
      }

      return feedback;
    } catch (error) {
      console.error("OpenAI API Error:", error);
      throw new Error(
        `Failed to generate feedback: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    }
  });
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