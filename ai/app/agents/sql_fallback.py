import re

FALLBACK_QUERIES = [
    {
        "keywords": ["nechta o.quvchi", "qancha o.quvchi", "jami o.quvchi", "student.*count", "students.*count", "how many student"],
        "sql": "SELECT COUNT(*) as count FROM students WHERE 1=1 {center_filter}",
        "label": "students_count"
    },
    {
        "keywords": ["bugun.*o.quvchi", "today.*student", "nechta.*qo.sildi", "yangi.*o.quvchi", "today.*new"],
        "sql": "SELECT COUNT(*) as count FROM students WHERE 1=1 {center_filter}",
        "label": "students_count"
    },
    {
        "keywords": ["davomat past", "past davomat", "low attendance", "eng past", "yomon davomat"],
        "sql": """SELECT g.name as group_name,
       COUNT(a.id) as total_dars,
       SUM(CASE WHEN a.is_present THEN 1 ELSE 0 END) as keldi,
       ROUND(SUM(CASE WHEN a.is_present THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as foiz
FROM attendances a
JOIN groups g ON g.id = a.group_id
WHERE g.center_id = :center_id
GROUP BY g.id, g.name
ORDER BY foiz ASC
LIMIT 10""",
        "label": "low_attendance_groups"
    },
    {
        "keywords": ["eng yaxshi davomat", "yaxshi davomat", "best attendance", "davomat.*eng"],
        "sql": """SELECT g.name as group_name,
       COUNT(a.id) as total_dars,
       SUM(CASE WHEN a.is_present THEN 1 ELSE 0 END) as keldi,
       ROUND(SUM(CASE WHEN a.is_present THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as foiz
FROM attendances a
JOIN groups g ON g.id = a.group_id
WHERE g.center_id = :center_id
GROUP BY g.id, g.name
ORDER BY foiz DESC
LIMIT 10""",
        "label": "best_attendance_groups"
    },
    {
        "keywords": ["qarzdor", "unpaid", "to.lamagan", "to.lov.*qilmagan", "debtor", "qarzi bor"],
        "sql": """SELECT s.id, s.first_name, s.last_name, s.phone_number,
       p.amount, p.month, p.year
FROM students s
JOIN payments p ON p.student_id = s.id
WHERE p.status = 'unpaid'
AND s.center_id = :center_id
ORDER BY p.month DESC, p.year DESC
LIMIT 20""",
        "label": "unpaid_students"
    },
    {
        "keywords": ["eng ko.p o.quvchi", "teacher.*most", "ko.p.*o.quvchi", "best teacher"],
        "sql": """SELECT t.id, t.first_name, t.last_name,
       COUNT(DISTINCT g.id) as guruhlar_soni,
       COUNT(DISTINCT gs.student_id) as oquvchilar_soni
FROM teachers t
JOIN groups g ON g.teacher_id = t.id OR g.support_teacher_id = t.id
LEFT JOIN group_students gs ON gs.group_id = g.id AND gs.left_date IS NULL
WHERE t.center_id = :center_id
GROUP BY t.id, t.first_name, t.last_name
ORDER BY oquvchilar_soni DESC
LIMIT 10""",
        "label": "top_teachers_by_students"
    },
    {
        "keywords": ["eng ko.p guruh", "teacher.*group", "ko.p.*guruh"],
        "sql": """SELECT t.id, t.first_name, t.last_name,
       COUNT(DISTINCT g.id) as guruhlar_soni
FROM teachers t
JOIN groups g ON g.teacher_id = t.id OR g.support_teacher_id = t.id
WHERE t.center_id = :center_id
GROUP BY t.id, t.first_name, t.last_name
ORDER BY guruhlar_soni DESC
LIMIT 10""",
        "label": "top_teachers_by_groups"
    },
    {
        "keywords": ["bugun.*davomat", "today.*attendance", "davomat.*bugun", "bugungi davomat"],
        "sql": """SELECT
       COUNT(*) as jami,
       SUM(CASE WHEN is_present THEN 1 ELSE 0 END) as keldi,
       ROUND(SUM(CASE WHEN is_present THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as foiz
FROM attendances
WHERE date = CURRENT_DATE""",
        "label": "today_attendance"
    },
    {
        "keywords": ["bu oy.*to.lov", "this month.*payment", "oylik.*to.lov", "bu oy.*tushum"],
        "sql": """SELECT COALESCE(SUM(amount), 0) as jami,
       COUNT(*) as soni
FROM payments
WHERE status = 'paid'
AND EXTRACT(MONTH FROM paid_at) = EXTRACT(MONTH FROM CURRENT_DATE)
AND EXTRACT(YEAR FROM paid_at) = EXTRACT(YEAR FROM CURRENT_DATE)
{center_filter}""",
        "label": "monthly_payments"
    },
    {
        "keywords": ["faol guruh", "active group", "aktiv guruh"],
        "sql": """SELECT COUNT(*) as soni
FROM groups g
WHERE g.id IN (SELECT DISTINCT group_id FROM group_students WHERE left_date IS NULL)
{center_filter}""",
        "label": "active_groups"
    },
    {
        "keywords": ["jami daromad", "total revenue", "umumiy daromad", "qancha daromad"],
        "sql": """SELECT COALESCE(SUM(amount), 0) as jami
FROM payments
WHERE status = 'paid'
{center_filter}""",
        "label": "total_revenue"
    },
    {
        "keywords": ["nechta guruh", "qancha guruh", "jami guruh", "groups.*count", "how many group"],
        "sql": "SELECT COUNT(*) as count FROM groups WHERE 1=1 {center_filter}",
        "label": "groups_count"
    },
    {
        "keywords": ["nechta o.qituvchi", "qancha o.qituvchi", "jami o.qituvchi", "teacher.*count", "how many teacher"],
        "sql": "SELECT COUNT(*) as count FROM teachers WHERE 1=1 {center_filter}",
        "label": "teachers_count"
    },
    {
        "keywords": ["nechta lead", "qancha lead", "lead.*count", "how many lead"],
        "sql": "SELECT COUNT(*) as count FROM leads WHERE 1=1 {center_filter}",
        "label": "leads_count"
    },
    {
        "keywords": ["eng yaxshi o.qituvchi.*davomat", "teacher.*attendance.*best"],
        "sql": """SELECT t.id, t.first_name, t.last_name,
       ROUND(SUM(CASE WHEN a.is_present THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1) as davomat_foizi
FROM teachers t
JOIN groups g ON g.teacher_id = t.id OR g.support_teacher_id = t.id
JOIN attendances a ON a.group_id = g.id
WHERE t.center_id = :center_id
GROUP BY t.id, t.first_name, t.last_name
HAVING COUNT(*) > 10
ORDER BY davomat_foizi DESC
LIMIT 5""",
        "label": "best_teacher_attendance"
    },
    {
        "keywords": ["necha.*yosh", "o.quvchi.*yosh", "student.*age"],
        "sql": """SELECT age, COUNT(*) as soni
FROM students
WHERE age IS NOT NULL {center_filter}
GROUP BY age
ORDER BY age""",
        "label": "students_by_age"
    },
    {
        "keywords": ["eng oxirgi", "oxirgi qo.shilgan", "last.*student", "so.nggi.*qo.shilgan", "eng so.nggi"],
        "sql": """SELECT id, first_name, last_name
FROM students
WHERE 1=1 {center_filter}
ORDER BY id DESC
LIMIT 1""",
        "label": "last_student"
    },
    {
        "keywords": ["eng.*yangi.*o.quvchi", "new.*student.*last", "so.nggi.*student"],
        "sql": """SELECT id, first_name, last_name
FROM students
WHERE 1=1 {center_filter}
ORDER BY id DESC
LIMIT 5""",
        "label": "recent_students"
    },
    {
        "keywords": ["necha.*to.lov", "qancha.*to.lov", "jami.*to.lov", "payment.*count"],
        "sql": """SELECT COUNT(*) as soni,
       COALESCE(SUM(amount), 0) as jami_summa
FROM payments
WHERE 1=1 {center_filter}""",
        "label": "payment_summary"
    },
    {
        "keywords": ["bu oy.*qancha", "this month.*stat", "oylik.*statistika"],
        "sql": """SELECT
  (SELECT COUNT(*) FROM students WHERE 1=1 {center_filter}) as yangi_oquvchilar,
  (SELECT COUNT(*) FROM payments WHERE status = 'paid' AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', CURRENT_DATE) {center_filter}) as tolangan_tolovlar,
  (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE status = 'paid' AND DATE_TRUNC('month', paid_at) = DATE_TRUNC('month', CURRENT_DATE) {center_filter}) as oylik_daromad""",
        "label": "monthly_stats"
    },
    {
        "keywords": ["eng.*ko.p.*to.lov", "top.*payment", "ko.p.*to.lagan"],
        "sql": """SELECT s.id, s.first_name, s.last_name,
       COUNT(p.id) as tolovlar_soni,
       COALESCE(SUM(p.amount), 0) as jami_summa
FROM students s
LEFT JOIN payments p ON p.student_id = s.id AND p.status = 'paid'
WHERE s.center_id = :center_id
GROUP BY s.id, s.first_name, s.last_name
ORDER BY jami_summa DESC
LIMIT 10""",
        "label": "top_paying_students"
    },
    {
        "keywords": ["qancha foyda", "nech.*foyda", "qancha daromad", "foyda ko.raman", "profit", "how much.*profit"],
        "sql": """SELECT
  COALESCE(SUM(p.amount), 0) as potentsial_daromad,
  COUNT(DISTINCT p.student_id) as qarzdorlar_soni
FROM payments p
WHERE p.status = 'unpaid'
{center_filter}""",
        "label": "potential_revenue"
    },
    {
        "keywords": ["qarzdor.*jami", "qarzdor.*umumiy", "qarzdor.*hammasi", "debtor.*total", "unpaid.*total"],
        "sql": """SELECT
  COALESCE(SUM(p.amount), 0) as jami_qarz,
  COUNT(DISTINCT p.student_id) as qarzdorlar_soni
FROM payments p
WHERE p.status = 'unpaid'
{center_filter}""",
        "label": "debtor_total"
    },
    {
        "keywords": ["qarzdor.*foyda", "qarzdor.*to.lov qilsa", "debtor.*pay", "unpaid.*collect", "qarzdor.*pul"],
        "sql": """SELECT
  COALESCE(SUM(p.amount), 0) as kutilayotgan_tushum,
  COUNT(DISTINCT p.student_id) as qarzdorlar_soni,
  COUNT(*) as qarzdorliklar_soni
FROM payments p
WHERE p.status = 'unpaid'
{center_filter}""",
        "label": "debtor_projection"
    },
    {
        "keywords": ["dars.*jadval", "bugun.*dars", "today.*lesson", "kungi dars"],
        "sql": """SELECT g.name as guruh_nomi,
       gl.time as vaqt,
       r.name as xona
FROM group_lessons gl
JOIN groups g ON g.id = gl.group_id
LEFT JOIN rooms r ON r.id = gl.room_id
WHERE gl.date = CURRENT_DATE
AND g.center_id = :center_id
ORDER BY gl.time""",
        "label": "today_lessons"
    },
]

_PARAM_PATTERN = re.compile(r"\{center_filter\}")


def try_fallback(query: str) -> tuple[str, str] | None:
    q_lower = query.lower().strip()

    for entry in FALLBACK_QUERIES:
        for kw in entry["keywords"]:
            if re.search(kw, q_lower):
                sql = entry["sql"]
                label = entry["label"]
                return (sql, label)

    return None
