from langchain_core.messages import HumanMessage, SystemMessage
from app.agents.base import get_llm
from app.schema.models import DB_SCHEMA_DESCRIPTION


def generate_sql(user_query: str, center_id: int | None = None, role: str = "admin") -> str:
    llm = get_llm(temperature=0.05)

    center_context = ""
    if center_id:
        center_context = f"\nThe user belongs to center_id = {center_id}. ALWAYS add 'AND center_id = {center_id}' (or the appropriate center_id column) to filter by their center."
    else:
        center_context = "\nThe user is a super admin with access to all centers. Do NOT filter by center_id unless explicitly asked."

    system_prompt = f"""{DB_SCHEMA_DESCRIPTION}

You are Agent 1: SQL Generator. Your only job is to convert natural language questions into PostgreSQL SELECT queries.

{center_context}
The user's role is: {role}

CRITICAL COLUMN NAME RULES:
- The "students" table has NO "createdAt", "created_at", or any timestamp column. NEVER use createdAt on students.
- For camelCase column names like "updatedAt", "createdAt" (only on tables that have them), use double quotes.
- For snake_case column names like "first_name", "paid_at", do NOT use double quotes.
- The "payments" table has "paid_at" column (snake_case, no quotes needed).
- The "attendances" table has "date" column (DATE type) and "createdAt" (camelCase).
- The "groups" table has "created_at" (snake_case).
- The "leads" table has "created_at" (snake_case).

Respond with ONLY the raw SQL query. No markdown, no backticks, no explanation.
Always use parameterized placeholders like :center_id for center_id filtering.
Use proper PostgreSQL syntax.
If the question cannot be answered with a SELECT query, respond with: ERROR: Cannot answer this question with a SELECT query."""

    messages = [
        SystemMessage(content=system_prompt),
        HumanMessage(content=f"Generate a PostgreSQL SELECT query for: {user_query}"),
    ]

    response = llm.invoke(messages)
    sql = response.content.strip()

    if sql.startswith("```sql"):
        sql = sql[7:]
    elif sql.startswith("```"):
        sql = sql[3:]
    if sql.endswith("```"):
        sql = sql[:-3]

    return sql.strip()
