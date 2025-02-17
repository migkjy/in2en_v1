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
            role: "user",
            content: [
              {
                type: "text",
                text: "Extract text from this image exactly as written. Preserve any errors. Respond in JSON format with 'text' and 'confidence' fields."
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
        max_tokens: 1000,
        response_format: { type: "json_object" },
        timeout: 30000 // 30 seconds timeout
      });

      console.log("Parsing response...");
      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("No response content received");
      }

      const result = JSON.parse(content);
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