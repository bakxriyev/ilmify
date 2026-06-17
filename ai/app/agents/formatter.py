from typing import Any
from langchain_core.messages import HumanMessage, SystemMessage
from app.agents.base import get_llm_creative


def format_response(
    user_query: str,
    sql: str,
    results: list[dict],
    analysis: str,
    center_id: int | None = None,
) -> dict[str, Any]:
    llm = get_llm_creative(temperature=0.3)

    has_chart_data = len(results) > 1 and any(
        isinstance(v, (int, float)) for r in results for v in r.values()
    )

    system_prompt = """You are Agent 5: Response Formatter. You create the final human-readable response.

Rules:
1. Always respond in Uzbek language (Latin script).
2. Start with a brief, direct answer to the question.
3. Use the analysis to provide context.
4. If data contains numbers, format them properly.
5. Keep responses concise and actionable.
6. Identify if chart data is available and note it.
7. Never mention SQL or technical details.
8. If no data found, say so politely.

Response format:
- First line: Direct answer (bold/emphasized)
- Next: Key numbers and facts
- Then: Insights and recommendations
- End: Offer to help with more questions"""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"""
User question: {user_query}
SQL: {sql}
Results: {str(results[:30])}
Analysis: {analysis}
Has chart data: {has_chart_data}
Center ID: {center_id}

Create a final response in Uzbek language (Latin script).
Also determine: should we show a table? Should we show statistics cards? Should we show a chart?
Respond with JSON:
{{
  "message": "human readable response in Uzbek",
  "type": "text|table|stats|chart",
  "data": <the data for rendering>,
  "columns": <if type=table, list of column names>,
  "chart_type": "bar|line|pie" if applicable
}}
"""),
    ]

    response = llm.invoke(messages)
    content = response.content.strip()

    if content.startswith("```json"):
        content = content[7:]
    elif content.startswith("```"):
        content = content[3:]
    if content.endswith("```"):
        content = content[:-3]

    import json
    try:
        parsed = json.loads(content)
    except json.JSONDecodeError:
        parsed = {
            "message": content,
            "type": "text",
            "data": results[:20],
        }

    return parsed
