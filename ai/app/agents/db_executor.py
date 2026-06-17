from app.database import execute_read_only_query
from app.redis_cache import cache_get, cache_set


async def execute_sql(query: str, center_id: int | None = None) -> list[dict]:
    sql = query
    params = {}

    # Handle {center_filter} templates - embed directly (safe, comes from JWT)
    if "{center_filter}" in sql:
        if center_id is not None:
            sql = sql.replace("{center_filter}", f"AND center_id = {center_id}")
        else:
            sql = sql.replace("{center_filter}", "")

    # Handle :center_id named parameter
    if ":center_id" in sql:
        if center_id is not None:
            params["center_id"] = center_id
        else:
            sql = sql.replace("AND center_id = :center_id", "")
            sql = sql.replace("AND g.center_id = :center_id", "")
            sql = sql.replace("AND s.center_id = :center_id", "")
            sql = sql.replace("AND t.center_id = :center_id", "")
            sql = sql.replace("AND p.center_id = :center_id", "")
            sql = sql.replace("WHERE center_id = :center_id", "WHERE 1=1")
            sql = sql.replace("WHERE g.center_id = :center_id", "WHERE 1=1")
            sql = sql.replace("WHERE s.center_id = :center_id", "WHERE 1=1")
            sql = sql.replace("WHERE t.center_id = :center_id", "WHERE 1=1")
            sql = sql.replace("WHERE p.center_id = :center_id", "WHERE 1=1")

    cached = await cache_get("sql", sql, center_id)
    if cached is not None:
        return cached

    results = await execute_read_only_query(sql, params)

    await cache_set("sql", sql, results, center_id)

    return results
