from fastapi import APIRouter, Depends
from app.auth import verify_jwt, extract_center_id, extract_admin_id
from app.database import execute_read_only_query
from app.redis_cache import cache_get, cache_set

router = APIRouter(prefix="/api/ai", tags=["AI Dashboard"])

months_map = {
    "01": "Yan", "02": "Fev", "03": "Mar", "04": "Apr",
    "05": "May", "06": "Iyun", "07": "Iyul", "08": "Avg",
    "09": "Sen", "10": "Okt", "11": "Noy", "12": "Dek",
}


@router.get("/dashboard")
async def get_dashboard_stats(payload: dict = Depends(verify_jwt)):
    center_id = extract_center_id(payload)

    cached = await cache_get("dashboard", "stats", center_id)
    if cached:
        return {"data": cached}

    cf = f"AND center_id = {center_id}" if center_id else ""

    queries = {
        "today_students": f"""
            SELECT COUNT(*) as count FROM students WHERE 1=1 {cf}
        """,
        "today_payments": f"""
            SELECT COALESCE(SUM(amount), 0) as total, COUNT(*) as count
            FROM payments
            WHERE DATE(paid_at) = CURRENT_DATE AND status = 'paid' {cf}
        """,
        "today_attendance": f"""
            SELECT
                COUNT(*) as total,
                SUM(CASE WHEN is_present THEN 1 ELSE 0 END) as present,
                ROUND(SUM(CASE WHEN is_present THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as rate
            FROM attendances
            WHERE date = CURRENT_DATE
        """,
        "debtors_count": f"""
            SELECT COUNT(DISTINCT s.id) as count
            FROM students s
            JOIN payments p ON p.student_id = s.id
            WHERE p.status = 'unpaid'
            AND p.month = EXTRACT(MONTH FROM CURRENT_DATE)
            AND p.year = EXTRACT(YEAR FROM CURRENT_DATE)
            {cf}
        """,
        "new_leads": f"""
            SELECT COUNT(*) as count FROM leads
            WHERE DATE(created_at) = CURRENT_DATE {cf}
        """,
        "active_groups": f"""
            SELECT COUNT(*) as count FROM groups g
            WHERE g.id IN (SELECT DISTINCT group_id FROM group_students WHERE left_date IS NULL)
            {cf.replace("center_id", "g.center_id")}
        """,
        "teachers_working": f"""
            SELECT COUNT(DISTINCT a.group_id) as active_groups,
                   COUNT(DISTINCT g.teacher_id) + COUNT(DISTINCT g.support_teacher_id) as teachers
            FROM attendances a
            JOIN groups g ON g.id = a.group_id
            WHERE a.date = CURRENT_DATE {cf.replace("center_id", "g.center_id")}
        """,
        "total_students": f"""
            SELECT COUNT(*) as count FROM students WHERE 1=1 {cf}
        """,
        "total_teachers": f"""
            SELECT COUNT(*) as count FROM teachers WHERE 1=1 {cf}
        """,
        "total_groups": f"""
            SELECT COUNT(*) as count FROM groups WHERE 1=1 {cf}
        """,
        "monthly_revenue": f"""
            SELECT COALESCE(SUM(amount), 0) as total
            FROM payments
            WHERE status = 'paid'
            AND EXTRACT(MONTH FROM paid_at) = EXTRACT(MONTH FROM CURRENT_DATE)
            AND EXTRACT(YEAR FROM paid_at) = EXTRACT(YEAR FROM CURRENT_DATE)
            {cf}
        """,
    }

    results = {}
    for key, query in queries.items():
        try:
            data = await execute_read_only_query(query)
            results[key] = data[0] if data else {}
        except Exception:
            results[key] = {}

    stats = {
        "today_students": results["today_students"].get("count", 0),
        "today_payments_total": float(results["today_payments"].get("total", 0)),
        "today_payments_count": results["today_payments"].get("count", 0),
        "today_attendance_total": results["today_attendance"].get("total", 0),
        "today_attendance_present": results["today_attendance"].get("present", 0),
        "today_attendance_rate": results["today_attendance"].get("rate", 0),
        "debtors_count": results["debtors_count"].get("count", 0),
        "new_leads": results["new_leads"].get("count", 0),
        "active_groups": results["active_groups"].get("count", 0),
        "teachers_working": results["teachers_working"].get("teachers", 0),
        "total_students": results["total_students"].get("count", 0),
        "total_teachers": results["total_teachers"].get("count", 0),
        "total_groups": results["total_groups"].get("count", 0),
        "monthly_revenue": float(results["monthly_revenue"].get("total", 0)),
    }

    await cache_set("dashboard", "stats", [stats], center_id, ttl=60)
    return {"data": stats}


@router.get("/dashboard/revenue-trend")
async def get_revenue_trend(payload: dict = Depends(verify_jwt)):
    center_id = extract_center_id(payload)
    cf = f"AND center_id = {center_id}" if center_id else ""

    query = f"""
        SELECT
            DATE_TRUNC('month', paid_at) as month,
            SUM(amount) as revenue,
            COUNT(*) as transactions
        FROM payments
        WHERE status = 'paid' AND paid_at IS NOT NULL
        {cf}
        AND paid_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
        GROUP BY month
        ORDER BY month
    """
    results = await execute_read_only_query(query)
    return {
        "data": [
            {
                "month": r["month"].strftime("%Y-%m") if hasattr(r["month"], "strftime") else str(r["month"]),
                "revenue": float(r["revenue"]),
                "transactions": r["transactions"],
            }
            for r in results
        ]
    }


@router.get("/dashboard/student-growth")
async def get_student_growth(payload: dict = Depends(verify_jwt)):
    center_id = extract_center_id(payload)
    cf = f"AND g.center_id = {center_id}" if center_id else ""

    query = f"""
        SELECT
            DATE_TRUNC('month', gs.joined_date) as month,
            COUNT(DISTINCT gs.student_id) as count
        FROM group_students gs
        JOIN groups g ON g.id = gs.group_id
        WHERE gs.joined_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
        {cf}
        GROUP BY month
        ORDER BY month
    """
    results = await execute_read_only_query(query)

    return {
        "data": [
            {
                "month": months_map.get(r["month"].strftime("%m"), r["month"].strftime("%m")) if hasattr(r["month"], "strftime") else str(r["month"]),
                "count": r["count"],
            }
            for r in results
        ]
    }


@router.get("/dashboard/attendance-trend")
async def get_attendance_trend(payload: dict = Depends(verify_jwt)):
    center_id = extract_center_id(payload)
    cf = f"AND g.center_id = {center_id}" if center_id else ""

    query = f"""
        SELECT
            DATE_TRUNC('month', a.date) as month,
            COUNT(*) as total,
            SUM(CASE WHEN a.is_present THEN 1 ELSE 0 END) as present,
            ROUND(SUM(CASE WHEN a.is_present THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as rate
        FROM attendances a
        JOIN groups g ON g.id = a.group_id
        WHERE a.date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '11 months')
        {cf}
        GROUP BY month
        ORDER BY month
    """
    results = await execute_read_only_query(query)

    return {
        "data": [
            {
                "month": months_map.get(r["month"].strftime("%m"), r["month"].strftime("%m")) if hasattr(r["month"], "strftime") else str(r["month"]),
                "rate": r["rate"],
                "total": r["total"],
                "present": r["present"],
            }
            for r in results
        ]
    }


@router.get("/dashboard/lead-conversion")
async def get_lead_conversion(payload: dict = Depends(verify_jwt)):
    center_id = extract_center_id(payload)
    cf = f"AND center_id = {center_id}" if center_id else ""

    query = f"""
        SELECT status, COUNT(*) as count
        FROM leads
        WHERE 1=1 {cf}
        GROUP BY status
        ORDER BY count DESC
    """
    results = await execute_read_only_query(query)
    return {"data": results}


@router.get("/dashboard/monthly-comparison")
async def get_monthly_comparison(payload: dict = Depends(verify_jwt)):
    center_id = extract_center_id(payload)
    cf = f"AND center_id = {center_id}" if center_id else ""
    cg = f"AND g.center_id = {center_id}" if center_id else ""

    queries = {
        "students": f"""
            SELECT
                DATE_TRUNC('month', gs.joined_date) as month,
                COUNT(DISTINCT gs.student_id) as count
            FROM group_students gs
            JOIN groups g ON g.id = gs.group_id
            WHERE gs.joined_date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')
            AND gs.joined_date < DATE_TRUNC('month', CURRENT_DATE + INTERVAL '1 month')
            {cg}
            GROUP BY month
            ORDER BY month
        """,
        "revenue": f"""
            SELECT
                DATE_TRUNC('month', paid_at) as month,
                SUM(amount) as total
            FROM payments
            WHERE status = 'paid' AND paid_at IS NOT NULL
            AND paid_at >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')
            {cf}
            GROUP BY month
            ORDER BY month
        """,
        "attendance": f"""
            SELECT
                DATE_TRUNC('month', a.date) as month,
                ROUND(SUM(CASE WHEN a.is_present THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as rate
            FROM attendances a
            JOIN groups g ON g.id = a.group_id
            WHERE a.date >= DATE_TRUNC('month', CURRENT_DATE - INTERVAL '2 months')
            {cg}
            GROUP BY month
            ORDER BY month
        """,
    }

    results = {}
    for key, query in queries.items():
        try:
            data = await execute_read_only_query(query)
            results[key] = data
        except Exception:
            results[key] = []

    def extract_months(data, key):
        result = {}
        for r in data:
            m = r["month"].strftime("%Y-%m") if hasattr(r["month"], "strftime") else str(r["month"])
            result[m] = float(r[key]) if isinstance(r[key], float | int) else r[key]
        return result

    import datetime
    now = datetime.datetime.now()
    current_month = now.strftime("%Y-%m")
    last_month = (now.replace(day=1) - datetime.timedelta(days=1)).strftime("%Y-%m")

    students_data = extract_months(results.get("students", []), "count")
    revenue_data = extract_months(results.get("revenue", []), "total")
    attendance_data = extract_months(results.get("attendance", []), "rate")

    return {
        "current_month": current_month,
        "last_month": last_month,
        "students": {
            "current": students_data.get(current_month, 0),
            "previous": students_data.get(last_month, 0),
            "change": students_data.get(current_month, 0) - students_data.get(last_month, 0),
        },
        "revenue": {
            "current": revenue_data.get(current_month, 0),
            "previous": revenue_data.get(last_month, 0),
            "change": revenue_data.get(current_month, 0) - revenue_data.get(last_month, 0),
        },
        "attendance": {
            "current": attendance_data.get(current_month, 0),
            "previous": attendance_data.get(last_month, 0),
            "change": attendance_data.get(current_month, 0) - attendance_data.get(last_month, 0),
        },
    }
