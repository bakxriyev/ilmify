import re

FORBIDDEN_KEYWORDS = [
    r'\bINSERT\b', r'\bUPDATE\b', r'\bDELETE\b',
    r'\bDROP\b', r'\bALTER\b', r'\bTRUNCATE\b',
    r'\bCREATE\b', r'\bREPLACE\b', r'\bEXEC\b',
    r'\bEXECUTE\b', r'\bGRANT\b', r'\bREVOKE\b',
    r'\bCOPY\b', r'\bIMPORT\b',
]

DANGEROUS_PATTERNS = [
    r'pg_sleep', r'pg_read_file', r'pg_write_file',
    r'pg_ls_dir', r'current_setting', r'pg_read_binary_file',
    r'lo_import', r'lo_export', r'COPY\s+.*TO\s+',
]


def validate_sql(query: str) -> tuple[bool, str]:
    query_upper = query.strip().upper()

    for pattern in FORBIDDEN_KEYWORDS:
        if re.search(pattern, query_upper):
            keyword = pattern.strip("\\b")
            return False, f"Forbidden keyword detected: {keyword}"

    if not query_upper.startswith("SELECT"):
        if query_upper.startswith("WITH"):
            pass
        else:
            return False, "Query must start with SELECT"

    for pattern in DANGEROUS_PATTERNS:
        if re.search(pattern, query, re.IGNORECASE):
            func_name = pattern.strip("\\b")
            return False, f"Dangerous function detected: {func_name}"

    if ";" in query.rstrip(";").rstrip():
        parts = [p.strip() for p in query.split(";") if p.strip()]
        stmt_count = sum(1 for p in parts if p and not p.upper().startswith("SELECT") and not p.upper().startswith("WITH"))
        if stmt_count > 0:
            return False, "Multiple statements detected. Only SELECT queries are allowed."

    select_count = len(re.findall(r'\bSELECT\b', query_upper))
    if select_count > 1:
        for keyword in [r'\bUNION\b', r'\bINTERSECT\b', r'\bEXCEPT\b']:
            if not re.search(keyword, query_upper):
                pass

    return True, "Query is safe"
