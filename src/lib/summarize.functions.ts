import { createServerFn } from "@tanstack/react-start";

export const summarizeAudio = createServerFn({ method: "POST" })
  .inputValidator((data: { audioBase64: string; mimeType: string }) => data)
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    // Map MIME to format string Gemini accepts via OpenAI-compat
    const fmt = data.mimeType.includes("wav")
      ? "wav"
      : data.mimeType.includes("mp4") || data.mimeType.includes("m4a")
        ? "mp4"
        : data.mimeType.includes("webm")
          ? "webm"
          : data.mimeType.includes("ogg")
            ? "ogg"
            : "mp3";

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are a meeting assistant. Given an audio recording of a meeting, produce a clean transcript and a structured summary. Always call the provided tool with the result.",
          },
          {
            role: "user",
            content: [
              {
                type: "text",
                text: "Transcribe this meeting and produce a structured summary. Identify speakers if possible (Speaker 1, Speaker 2, ...).",
              },
              {
                type: "input_audio",
                input_audio: { data: data.audioBase64, format: fmt },
              },
            ],
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_meeting_summary",
              description: "Return the meeting transcript and structured summary.",
              parameters: {
                type: "object",
                properties: {
                  transcript: {
                    type: "string",
                    description: "Full transcript of the meeting with speaker labels when possible.",
                  },
                  title: { type: "string", description: "Short descriptive title for the meeting." },
                  summary: { type: "string", description: "2-4 sentence overview of the meeting." },
                  key_points: {
                    type: "array",
                    items: { type: "string" },
                    description: "Bullet list of the most important discussion points.",
                  },
                  action_items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        task: { type: "string" },
                        owner: { type: "string" },
                      },
                      required: ["task"],
                      additionalProperties: false,
                    },
                  },
                  decisions: {
                    type: "array",
                    items: { type: "string" },
                    description: "Concrete decisions reached during the meeting.",
                  },
                },
                required: ["transcript", "title", "summary", "key_points", "action_items", "decisions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_meeting_summary" } },
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      if (response.status === 429) throw new Error("Rate limited. Please try again in a moment.");
      if (response.status === 402)
        throw new Error("AI credits exhausted. Add credits in Settings → Workspace → Usage.");
      throw new Error(`AI error ${response.status}: ${text}`);
    }

    const json = await response.json();
    const toolCall = json.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) throw new Error("No structured response from model");
    const args = JSON.parse(toolCall.function.arguments);
    return args as {
      transcript: string;
      title: string;
      summary: string;
      key_points: string[];
      action_items: { task: string; owner?: string }[];
      decisions: string[];
    };
  });
