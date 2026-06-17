import re

# In-memory conversation memory (admin_id -> {key: value})
_conversation_memory: dict[str, dict] = {}


def get_memory(admin_id: str | None = None) -> dict:
    if admin_id and admin_id in _conversation_memory:
        return _conversation_memory[admin_id]
    return {}


def set_memory(admin_id: str | None, key: str, value: str):
    if not admin_id:
        return
    if admin_id not in _conversation_memory:
        _conversation_memory[admin_id] = {}
    _conversation_memory[admin_id][key] = value


_GREETINGS = re.compile(
    r"^\s*(salom|assalomu alaykum|vaalaykum assalom|assalamu alaykum|"
    r"hayrli kun|hayrli tong|hayrli kech|good morning|hello|hi|hey)\s*",
    re.IGNORECASE,
)

_THANKS = re.compile(
    r"^\s*(rahmat|tashakkur|thanks|thank you|ok|yaxshi|mayli)\s*$",
    re.IGNORECASE,
)

_INTRODUCTION = re.compile(
    r"(meni\s+ismim\s+(\w+))|"
    r"(men\s+(\w+)\s*(man|m[ai]n)?)|"
    r"(mening\s+ismim\s+(\w+))|"
    r"(i am\s+(\w+))|"
    r"(my name is\s+(\w+))",
    re.IGNORECASE,
)

_ROLE = re.compile(
    r"(direktor|admin|super.admin|o.qituvchi|teacher|manager|"
    r"director|administrator|ra(h|xb)ar)",
    re.IGNORECASE,
)

_WHATS_YOUR_NAME = re.compile(
    r"(sening\s+isming\s+nima)|"
    r"(isming\s+nim(a|e))|"
    r"(qanday\s+isming\s+bor)|"
    r"(what.+your\s+name)|"
    r"(who\s+are\s+you)",
    re.IGNORECASE,
)

_WHO_AM_I = re.compile(
    r"(men\s+kimman)|"
    r"(meni\s+ismim\s+nima)|"
    r"(who am i)|"
    r"(what.+my\s+name)",
    re.IGNORECASE,
)

_CAN_YOU_DO = re.compile(
    r"(nima\s+qila\s+olas|nimaga\s+qodir|what can you|"
    r"qanday\s+savol|what questions|yordam.*ber|help)",
    re.IGNORECASE,
)

_GOODBYE = re.compile(
    r"(xayr|hayr|ko.rishguncha|bye|goodbye|sog. bo.ling)",
    re.IGNORECASE,
)


def is_conversational(query: str, admin_id: str | None = None) -> tuple[bool, dict]:
    q = query.strip()

    m = _GOODBYE.search(q)
    if m:
        return (True, {
            "message": "Xayr! Yana savollaringiz bo'lsa, murojaat qiling.",
            "type": "text",
            "data": [],
        })

    m = _WHATS_YOUR_NAME.search(q)
    if m:
        return (True, {
            "message": "Mening ismim Ilmify AI. Men sizning CRM yordamchingizman. "
                       "Ma'lumotlar bazasi bo'yicha savollaringizga javob beraman.",
            "type": "text",
            "data": [],
        })

    m = _WHO_AM_I.search(q)
    if m:
        mem = get_memory(admin_id)
        name = mem.get("user_name")
        role = mem.get("user_role")
        if name:
            msg = f"Siz {name}"
            if role:
                msg += f" ({role})"
            msg += ". Qanday yordam kerak?"
            return (True, {"message": msg, "type": "text", "data": []})
        return (True, {
            "message": "Kechirasiz, ismingizni eslay olmayapman. Iltimos, ayting: 'Meni ismim ...'",
            "type": "text",
            "data": [],
        })

    m = _INTRODUCTION.search(q)
    if m:
        name = m.group(2) or m.group(4) or m.group(6) or m.group(8) or m.group(10)
        if name:
            set_memory(admin_id, "user_name", name.capitalize())
        role_m = _ROLE.search(q)
        if role_m:
            set_memory(admin_id, "user_role", role_m.group(1).lower())
        mem = get_memory(admin_id)
        name = mem.get("user_name", "foydalanuvchi")
        role = mem.get("user_role", "")
        greeting = f"Tanishganimdan xursandman, {name}!"
        if role:
            greeting += f" Siz {role} sifatida tizimdasiz."
        greeting += " Qanday ma'lumot kerak?"
        return (True, {"message": greeting, "type": "text", "data": []})

    m = _GREETINGS.search(q)
    if m:
        mem = get_memory(admin_id)
        name = mem.get("user_name")
        if name:
            msg = f"Assalomu alaykum, {name}! Qanday yordam berishim mumkin?"
        else:
            msg = "Assalomu alaykum! Men Ilmify AI yordamchisiman. Savollaringizni bering."
        return (True, {"message": msg, "type": "text", "data": []})

    m = _THANKS.search(q)
    if m:
        return (True, {
            "message": "Marhamat! Yana savolingiz bo'lsa, so'rang.",
            "type": "text",
            "data": [],
        })

    m = _CAN_YOU_DO.search(q)
    if m:
        return (True, {
            "message": "Men quyidagilarga yordam bera olaman:\n"
                       "• O'quvchilar, o'qituvchilar, guruhlar haqida ma'lumot\n"
                       "• Davomat va to'lov tahlili\n"
                       "• Statistika va hisobotlar\n"
                       "• Qarzdorlar ro'yxati\n\n"
                       "Misol: 'Nechta o'quvchi bor?', 'Bu oy qancha daromad?', 'Davomat past guruhlar'",
            "type": "text",
            "data": [],
        })

    return (False, {})
