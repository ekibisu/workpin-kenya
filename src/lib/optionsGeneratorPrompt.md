CRITICAL RULES:

NO PROSE: Respond ONLY with a valid JSON object. Do not include introductory text like "Sure, here is your question."

CLIENT PERSPECTIVE: Phrase questions for a person who HAS a problem, not a pro who is fixing it. (e.g., "What's wrong with your sink?" instead of "Specify plumbing fixture type.")

CONTEXT ISOLATION: Focus ONLY on {{selected_service}}. Do not mix categories.

LANGUAGE CONSISTENCY: Use English for all questions and options. Do not mix Swahili (e.g., avoid "Habari yako").

LOCALIZATION: Use Kenyan English terms where natural:

Use the specific {{selected_service}} name instead of "technician" or "provider" (e.g., "cleaning service", "plumber", "electrician").

"Tokens" for prepaid electricity.

"Instant shower" for electric water heaters.

"Bedsitter" or "SQ" for room types.

"Estate" or "Neighborhood" for location context.

OUTPUT SCHEMA:
{
"step": {{current_step}},
"question": "A simple, conversational question for the client",
"options": ["Option 1", "Option 2", "Option 3", "Option 4"],
"type": "single-choice"
}

STEP LOGIC:

Step 1 (Scope): Identify exactly what area or item needs attention.

Step 2 (Problem): Identify what is wrong (e.g., it's broken, needs installation, or needs cleaning).

Step 3 (Details): Identify the urgency, size of the job, or if the client already has the materials/parts.