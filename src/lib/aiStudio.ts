// src/lib/aiStudio.ts

/**
 * Helper to wait for a specific amount of time
 */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export const aiStudioChat = async (prompt: string, retries = 3): Promise<string> => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  // Using gemini-2.5-flash-lite for higher RPM limits on free tier
  const model = "gemini-2.5-flash-lite"; 
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  if (!apiKey) {
    throw new Error("Missing VITE_GEMINI_API_KEY in .env file");
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }]
      }),
    });

    // Handle Rate Limiting (429) specifically
    if (response.status === 429 && retries > 0) {
      console.warn(`Rate limit hit. Retrying in 2s... (${retries} attempts left)`);
      await sleep(2000); // Wait 2 seconds
      return aiStudioChat(prompt, retries - 1);
    }

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Gemini API Error:", errorData);
      throw new Error(errorData.error?.message || "AI Studio API error");
    }

    const data = await response.json();
    
    // Extract text from the candidate structure
    const resultText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!resultText) {
      throw new Error("No response text found from AI");
    }
    
    return resultText;
  } catch (error) {
    console.error("Fetch Error in aiStudioChat:", error);
    throw error;
  }
};