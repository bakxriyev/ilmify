import asyncio
import concurrent.futures
from typing import Any
from dataclasses import dataclass, field
from app.agents.sql_generator import generate_sql
from app.agents.sql_fallback import try_fallback
from app.agents.sql_validator import validate_sql
from app.agents.db_executor import execute_sql
from app.agents.analytics import interpret_results
from app.agents.formatter import format_response
from app.agents.conversation import is_conversational


@dataclass
class AIState:
    user_query: str = ""
    center_id: int | None = None
    role: str = "admin"
    sql: str = ""
    sql_valid: bool = False
    validation_error: str = ""
    results: list[dict] = field(default_factory=list)
    analysis: str = ""
    response: dict[str, Any] = field(default_factory=dict)
    error: str = ""
    used_fallback: bool = False
    fallback_label: str = ""


def _generate_sql_sync(query: str, center_id: int | None, role: str) -> str:
    return generate_sql(query, center_id, role)


async def run_ai_workflow(user_query: str, center_id: int | None = None, role: str = "admin", admin_id: str | None = None) -> dict[str, Any]:
    state = AIState(user_query=user_query, center_id=center_id, role=role)

    # Step 0: Check if this is conversational (greeting, intro, thanks, etc.)
    is_chat, chat_response = is_conversational(user_query, admin_id)
    if is_chat:
        return chat_response

    # Step 1: Try fallback SQL first (fast, no LLM needed)
    try:
        fallback = try_fallback(user_query)
        if fallback:
            state.sql = fallback[0]
            state.fallback_label = fallback[1]
            state.used_fallback = True
        else:
            with concurrent.futures.ThreadPoolExecutor() as pool:
                state.sql = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(pool, _generate_sql_sync, user_query, center_id, role),
                    timeout=25.0,
                )
    except asyncio.TimeoutError:
        state.error = "timeout_llm"
        return {
            "message": "Kechirasiz, hozir AI modeli mavjud emas. Savolingizni aniqroq yozib bering.",
            "type": "text",
            "data": [],
        }
    except Exception as e:
        state.error = "timeout_llm"
        return {
            "message": "Kechirasiz, hozir AI modeli mavjud emas. Savolingizni aniqroq yozib bering.",
            "type": "text",
            "data": [],
        }

    # Step 2: Validate SQL
    if not state.sql.strip() or state.sql.strip().upper().startswith("ERROR:"):
        return {
            "message": "Kechirasiz, bu savolga ma'lumotlar bazasi orqali javob bera olmayman. "
                       "Quyidagilarni so'rashingiz mumkin:\n\n"
                       "• O'quvchilar, o'qituvchilar, guruhlar soni\n"
                       "• Davomat va to'lov tahlili\n"
                       "• Qarzdorlar ro'yxati\n"
                       "• Statistik ma'lumotlar",
            "type": "text",
            "data": [],
        }

    is_valid, error_msg = validate_sql(state.sql)
    if not is_valid:
        state.sql_valid = False
        state.validation_error = error_msg
        return {
            "message": "Kechirasiz, bu savolga ma'lumotlar bazasi orqali javob bera olmayman. "
                       "Iltimos, o'quvchilar, to'lovlar, davomat yoki guruhlar haqida so'rang.",
            "type": "text",
            "data": [],
        }

    state.sql_valid = True

    # Step 3: Execute SQL
    try:
        state.results = await execute_sql(state.sql, center_id)
    except Exception as e:
        state.error = f"Ma'lumotlar bazasidan ma'lumot olishda xatolik: {str(e)}"
        return _error_response(state.error)

    # Step 4: Analytics (optional, uses LLM)
    try:
        if state.used_fallback:
            state.analysis = _simple_analysis(state.user_query, state.results)
        else:
            with concurrent.futures.ThreadPoolExecutor() as pool:
                state.analysis = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(pool, interpret_results, user_query, state.sql, state.results),
                    timeout=20.0,
                )
    except asyncio.TimeoutError:
        state.analysis = _simple_analysis(state.user_query, state.results)
    except Exception:
        state.analysis = _simple_analysis(state.user_query, state.results)

    # Step 5: Format response
    try:
        if state.used_fallback:
            state.response = _format_fallback_response(state.results, state.fallback_label)
        else:
            with concurrent.futures.ThreadPoolExecutor() as pool:
                state.response = await asyncio.wait_for(
                    asyncio.get_event_loop().run_in_executor(pool, format_response, user_query, state.sql, state.results, state.analysis, center_id),
                    timeout=15.0,
                )
    except Exception:
        state.response = _format_fallback_response(state.results, state.fallback_label)

    return state.response


def _simple_analysis(query: str, results: list[dict]) -> str:
    if not results:
        return "Hech qanday ma'lumot topilmadi."
    if len(results) == 1:
        items = list(results[0].items())
        if len(items) == 1:
            val = items[0][1]
            if isinstance(val, (int, float)):
                return f"Natija: {val:,.0f}"
            return f"Natija: {val}"
        parts = []
        for k, v in items[:5]:
            if isinstance(v, (int, float)):
                parts.append(f"{k}: {v:,.0f}")
            else:
                parts.append(f"{k}: {v}")
        return "Ma'lumotlar: " + ", ".join(parts)
    return f"{len(results)} ta qator topildi."


def _format_fallback_response(results: list[dict], label: str) -> dict[str, Any]:
    if not results:
        return {
            "message": "Ma'lumot topilmadi.",
            "type": "text",
            "data": [],
        }

    r = results[0]

    if label == "students_count":
        count = r.get("count", 0)
        return {
            "message": f"Jami {count} nafar o'quvchi bor.",
            "type": "stats",
            "data": [{"label": "Jami o'quvchilar", "value": count}],
        }

    if label in ("potential_revenue", "debtor_total", "debtor_projection"):
        if label == "debtor_projection":
            total = float(r.get("kutilayotgan_tushum", 0))
            debtor_count = r.get("qarzdorlar_soni", 0)
            items_count = r.get("qarzdorliklar_soni", 0)
            return {
                "message": f"Agar {debtor_count} nafar qarzdor o'quvchining barcha qarzi ({items_count} ta to'lov) to'lansa, jami {total:,.0f} so'm tushum olasiz.",
                "type": "stats",
                "data": [
                    {"label": "Kutilayotgan tushum", "value": f"{total:,.0f} so'm"},
                    {"label": "Qarzdorlar soni", "value": debtor_count},
                ],
            }
        total = float(r.get("potentsial_daromad", 0) or r.get("jami_qarz", 0))
        count = r.get("qarzdorlar_soni", r.get("qarzdorlar_soni", 0))
        return {
            "message": f"Jami {count} nafar qarzdordan {total:,.0f} so'm undirish mumkin.",
            "type": "stats",
            "data": [
                {"label": "Jami qarz", "value": f"{total:,.0f} so'm"},
                {"label": "Qarzdorlar soni", "value": count},
            ],
        }

    if label == "today_attendance":
        total = r.get("jami", 0)
        present = r.get("keldi", 0)
        rate = r.get("foiz", 0)
        return {
            "message": f"Bugungi davomat: {rate}% ({present}/{total} nafar keldi).",
            "type": "stats",
            "data": [
                {"label": "Davomat foizi", "value": f"{rate}%"},
                {"label": "Kelganlar", "value": present},
                {"label": "Jami", "value": total},
            ],
        }

    if label in ("monthly_payments", "monthly_stats"):
        count = r.get("soni", r.get("tolangan_tolovlar", 0))
        total = float(r.get("jami", 0) or r.get("oylik_daromad", 0) or r.get("jami_summa", 0))
        return {
            "message": f"Bu oy {count} ta to'lov qilingan, jami {total:,.0f} so'm.",
            "type": "stats",
            "data": [
                {"label": "To'lovlar soni", "value": count},
                {"label": "Jami tushum", "value": f"{total:,.0f} so'm"},
            ],
        }

    if label == "active_groups":
        count = r.get("soni", r.get("count", 0))
        return {
            "message": f"{count} ta faol guruh mavjud.",
            "type": "stats",
            "data": [{"label": "Faol guruhlar", "value": count}],
        }

    if label == "total_revenue":
        total = float(r.get("jami", 0))
        return {
            "message": f"Jami daromad: {total:,.0f} so'm.",
            "type": "stats",
            "data": [{"label": "Jami daromad", "value": f"{total:,.0f} so'm"}],
        }

    if label in ("groups_count",):
        count = r.get("count", 0)
        return {
            "message": f"Jami {count} ta guruh bor.",
            "type": "stats",
            "data": [{"label": "Jami guruhlar", "value": count}],
        }

    if label == "teachers_count":
        count = r.get("count", 0)
        return {
            "message": f"Jami {count} nafar o'qituvchi bor.",
            "type": "stats",
            "data": [{"label": "Jami o'qituvchilar", "value": count}],
        }

    if label == "leads_count":
        count = r.get("count", 0)
        return {
            "message": f"Jami {count} ta lead (potensial mijoz) bor.",
            "type": "stats",
            "data": [{"label": "Jami leadlar", "value": count}],
        }

    if label == "last_student":
        name = f"{r.get('first_name', '')} {r.get('last_name', '')}".strip()
        return {
            "message": f"Eng oxirgi qo'shilgan o'quvchi: {name} (ID: {r.get('id', '')})",
            "type": "text",
            "data": [r],
        }

    if label == "recent_students":
        names = []
        for s in results[:5]:
            name = f"{s.get('first_name', '')} {s.get('last_name', '')}".strip()
            names.append(name)
        msg = "Eng so'nggi qo'shilgan o'quvchilar:\n" + "\n".join(f"• {n}" for n in names)
        return {
            "message": msg,
            "type": "text",
            "data": results[:5],
        }

    if label == "students_by_age":
        rows = [f"{r.get('age', 'Noma-lum')} yosh: {r.get('soni', 0)} nafar" for r in results]
        return {
            "message": "O'quvchilarning yosh bo'yicha taqsimoti:\n" + "\n".join(rows),
            "type": "text",
            "data": results,
        }

    if label == "payment_summary":
        count = r.get("soni", 0)
        total = float(r.get("jami_summa", 0))
        return {
            "message": f"Jami {count} ta to'lov, umumiy summa: {total:,.0f} so'm.",
            "type": "stats",
            "data": [
                {"label": "To'lovlar soni", "value": count},
                {"label": "Umumiy summa", "value": f"{total:,.0f} so'm"},
            ],
        }

    if label == "top_paying_students":
        rows = []
        for s in results[:10]:
            name = f"{s.get('first_name', '')} {s.get('last_name', '')}".strip()
            total = float(s.get("jami_summa", 0))
            count = s.get("tolovlar_soni", 0)
            rows.append(f"• {name}: {count} ta to'lov, {total:,.0f} so'm")
        return {
            "message": "Eng ko'p to'lov qilgan o'quvchilar:\n" + "\n".join(rows),
            "type": "text",
            "data": results[:10],
        }

    if label == "today_lessons":
        if not results:
            return {"message": "Bugun darslar yo'q.", "type": "text", "data": []}
        rows = []
        for l in results:
            group = l.get("guruh_nomi", "")
            time = l.get("vaqt", "")
            room = l.get("xona", "")
            rows.append(f"• {time} - {group} ({room})" if room else f"• {time} - {group}")
        return {
            "message": "Bugungi dars jadvali:\n" + "\n".join(rows),
            "type": "text",
            "data": results,
        }

    if label == "unpaid_students":
        total_qarz = sum(float(s.get("amount", 0)) for s in results)
        return {
            "message": f"{len(results)} nafar qarzdor o'quvchi topildi. Jami qarz: {total_qarz:,.0f} so'm.",
            "type": "table",
            "data": results[:20],
        }

    if "foiz" in r or "davomat_foizi" in r:
        rows = []
        for r2 in results:
            name = r2.get("group_name") or f"{r2.get('first_name', '')} {r2.get('last_name', '')}".strip()
            pct = r2.get("foiz") or r2.get("davomat_foizi") or 0
            rows.append({"name": name, "foiz": f"{pct}%"})
        return {
            "message": "\n".join(f"{x['name']} - {x['foiz']}" for x in rows[:10]),
            "type": "text",
            "data": rows[:10],
        }

    if "status" in r or "amount" in r:
        return {
            "message": f"{len(results)} ta natija topildi.",
            "type": "table",
            "data": results[:20],
        }

    return {
        "message": f"{len(results)} ta ma'lumot topildi.",
        "type": "table",
        "data": results[:20],
    }


def _error_response(error_message: str) -> dict[str, Any]:
    return {
        "message": f"Kechirasiz, so'rovingizni bajarishda xatolik yuz berdi: {error_message}",
        "type": "text",
        "data": [],
        "error": error_message,
    }
