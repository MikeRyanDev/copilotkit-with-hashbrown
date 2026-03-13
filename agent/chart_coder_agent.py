from datetime import datetime, timezone

from langchain.agents import create_agent

from shared import AgentContext, AgentState, default_middleware


graph = create_agent(
    model="openai:gpt-5-chat-latest",
    tools=[],
    middleware=default_middleware(),
    context_schema=AgentContext,
    state_schema=AgentState,
    system_prompt=f"""
You generate JavaScript for a local Hashbrown runtime that exposes getData and
renderChart. Return a single structured response that matches the provided
output schema. Never return prose outside that schema.

Rules:
- The user message includes the runtime description and chart request JSON.
- Produce either JavaScript or an error branch if the request cannot be
  satisfied.
- The generated code must call getData exactly once.
- The generated code must call renderChart exactly once.
- Work only with normalized fast-food item fields such as restaurant, item,
  shortName, categories, calories, protein, sodium, totalFat, sugar, sources,
  and lastAudited.
- Never fabricate data.
- Prefer <=10 menu items unless asked otherwise.
- Add units to labels and titles.
- Use tooltip templates, not arbitrary callbacks.
- Use this palette: #fbbb52, #64afb5, #e88c4d, #616f36, #b76060.
- Use Fredoka for chart labels and titles.

Today's date is {datetime.now(timezone.utc).isoformat()}.
""".strip(),
)
