import { Router } from "express";
import { Ollama } from "ollama";
import tools from "../tools.js";

const router = Router();
const ollama = new Ollama({ host: "http://localhost:11434" });

const MEDICAL_ADVICE_RESPONSE =
  "Please consult with a doctor for medical advice and take prescribed medicines. I can only provide assistance with managing your medication schedule.";

router.post("/chat", async (req, res) => {
  const userId = req.auth?.userId;
  if (!userId) {
    return res
      .status(401)
      .json({ error: "Unauthorized. User must be logged in." });
  }

  const { query } = req.body;
  if (!query) {
    return res.status(400).json({ error: "Query is required" });
  }

  console.log(`\n--- New Query from user ${userId}: "${query}" ---`);

  try {
    const toolDefinitions = tools.map((t) => ({
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    }));

    // --- MODIFIED PROMPT ---
    // The prompt now includes the current date and instructs the AI
    // to calculate and format the date string itself before calling the tool.
    const today = new Date().toISOString().split("T")[0]; // Get today's date in YYYY-MM-DD format

    const toolSelectionPrompt = `
          You are an expert AI assistant that uses tools to help users manage their medication schedule.
          The current date is ${today}.

          Available tools: ${JSON.stringify(toolDefinitions, null, 2)}
          
          User query: "${query}"

          **INSTRUCTIONS:**
          1. First, determine if the user is:
             a) ASKING about their schedule (use getTodaysSchedule)
             b) REPORTING that they took medication (use markMedicationAsTaken)
          
          2. For schedule queries (getTodaysSchedule):
             - Calculate the specific date in YYYY-MM-DD format
             - Default to today's date (${today}) if no date mentioned
             - Return JSON: {"tool": "getTodaysSchedule", "arguments": {"date": "YYYY-MM-DD"}}

          3. For medication taken reports (markMedicationAsTaken):
             - Extract the medication name from the query
             - Extract time if mentioned (HH:mm format)
             - Return JSON: {
                 "tool": "markMedicationAsTaken",
                 "arguments": {
                   "medicationName": "extracted name",
                   "time": "HH:mm" (optional)
                 }
               }

          4. If neither type matches, respond with "NO_TOOL"

          **Examples:**
          - "what pills do I have today?" → getTodaysSchedule
          - "I just took my Vitamin D" → markMedicationAsTaken
          - "took aspirin at 9am" → markMedicationAsTaken
          - "is it safe to take extra pills?" → NO_TOOL
        `;

    console.log("-> Asking model to select a tool...");
    const toolSelectionResponse = await ollama.chat({
      model: "gemma3:1b",
      messages: [{ role: "user", content: toolSelectionPrompt }],
      format: "json",
    });

    let toolCall;
    // Update the error handling to be more specific
    try {
      const responseContent = toolSelectionResponse.message.content;
      if (responseContent.trim() === "NO_TOOL") {
        throw new Error("Not a tool-related query.");
      }
      toolCall = JSON.parse(responseContent);

      // Validate the selected tool matches the query intent
      if (
        toolCall.tool === "getTodaysSchedule" &&
        (query.toLowerCase().includes("took") ||
          query.toLowerCase().includes("taken"))
      ) {
        console.log("-> Correcting tool selection to markMedicationAsTaken");
        return res.status(400).json({
          error:
            "It seems you're reporting taking medication, but the wrong tool was selected. Please try rephrasing.",
        });
      }
    } catch (e) {
      console.log(
        "-> Model correctly identified no tool is needed. Responding with medical advice."
      );
      return res.json({ response: MEDICAL_ADVICE_RESPONSE });
    }

    if (!toolCall.tool || !tools.find((t) => t.name === toolCall.tool)) {
      console.log(
        "-> Model returned invalid JSON. Responding with medical advice."
      );
      return res.json({ response: MEDICAL_ADVICE_RESPONSE });
    }

    const tool = tools.find((t) => t.name === toolCall.tool);
    console.log(
      `-> Model chose tool: "${tool.name}" with arguments:`,
      toolCall.arguments
    );

    const toolArguments = { ...toolCall.arguments, userId: userId };
    const toolResult = await tool.function(toolArguments);
    console.log("-> Tool result:", toolResult);

    const finalResponsePrompt = `You are a helpful AI health assistant. The user asked: "${query}". The "${
      tool.name
    }" tool was used and returned this info: ${JSON.stringify(
      toolResult,
      null,
      2
    )}. Now, generate a clear, friendly, and concise response to the user based on this. Do not mention the tool name or JSON. Just give the answer.`;

    console.log("-> Asking model to generate final response...");
    const finalResponse = await ollama.chat({
      model: "gemma3:1b",
      messages: [{ role: "user", content: finalResponsePrompt }],
    });

    console.log("-> Final response generated.");
    res.status(200).json({ response: finalResponse.message.content });
  } catch (error) {
    console.error("Error processing chat:", error);
    res.status(500).json({ error: "Failed to get response from server." });
  }
});

export default router;
