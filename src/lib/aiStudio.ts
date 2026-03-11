// Simple AI Studio API client for Workpin

export async function aiStudioChat(messages: { role: string; content: string }[], systemPrompt?: string) {
  const res = await fetch("/api/ai-studio/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ messages, systemPrompt }),
  });
  if (!res.ok) throw new Error("AI Studio API error");
  const data = await res.json();
  return data;
}
