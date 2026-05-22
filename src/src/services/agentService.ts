import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || "" });

/**
 * AgentService: Frontend autonomous logic layer.
 * Analyzes shipment proof and recommends settlement release.
 */
export const agentService = {
  async verifySettlement(context: string): Promise<{ verified: boolean; reasoning: string }> {
    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: `
          You are the ArcVantage Agent Controller. 
          Analyze the following context for a B2B shipment or milestone completion.
          Context: ${context}
          
          Determine if the settlement should be released based on the provided proof of fulfillment.
          Respond with ONLY a JSON object: { "verified": boolean, "reasoning": string }
        `,
        config: {
          responseMimeType: "application/json",
        }
      });

      const text = response.text || "{}";
      const parsed = JSON.parse(text);
      return {
        verified: !!parsed.verified,
        reasoning: parsed.reasoning || "No reasoning provided by agent."
      };
    } catch (error) {
      console.error("Agent verification failed:", error);
      return { verified: false, reasoning: "Error during autonomous verification." };
    }
  }
};
