from langchain_core.messages import HumanMessage, SystemMessage
from app.agents.base import get_llm_creative


def interpret_results(user_query: str, sql: str, results: list[dict]) -> str:
    llm = get_llm_creative(temperature=0.2)

    results_str = str(results[:50]) if results else "No results found"
    total_count = len(results)

    system_prompt = """You are Agent 4: Analytics Generator. You analyze SQL query results and extract insights.

Your job:
1. Analyze the data and identify key patterns, trends, and anomalies.
2. Compare with expected norms (e.g., compare months, calculate percentages).
3. Provide business insights and actionable recommendations.
4. Always use Uzbek language (Latin script) for responses.
5. Be concise but informative.
6. If data shows a problem, suggest the root cause.
7. Format numbers properly with thousands separators.
8. If comparing periods, show the difference and percentage change.

For attendance analysis:
- Calculate percentage rates
- Identify low-performing groups
- Suggest improvement areas

For payment analysis:
- Calculate total revenue
- Identify unpaid students
- Show collection rate

For student analysis:
- Show growth/decline trends
- Identify patterns in enrollment
- Compare periods

For teacher analysis:
- Rank by performance metrics
- Identify top/bottom performers

Always structure your response clearly."""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"""
User question: {user_query}
SQL query executed: {sql}
Total results: {total_count}
Results data: {results_str}

Provide analysis and insights in Uzbek language (Latin script).
"""),
    ]

    response = llm.invoke(messages)
    return response.content.strip()
