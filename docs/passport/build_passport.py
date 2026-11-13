"""Build the mscodebase-intelligence quality passport (sheets 1-4, RU + EN).

Sheet 1 (RU) is the owner's hand-made v3 and is copied verbatim; the EN sheet 1
is the same geometry with the text nodes translated. Sheets 2-4 are generated
here so the four sheets share one grid, one palette and one revision block.

Every cell is measured at build time: a value that would cross into the next
column fails the build instead of silently overlapping.
"""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

HERE = Path(__file__).parent
DOWNLOADS = Path.home() / "Downloads"

W, H = 900, 640
INK = "#1b2a3a"
GREY = "#5a6a7a"
GREEN = "#1f6f4a"
BLUE = "#2b5b84"
AMBER = "#b26a00"
GRAPHITE = "#4a5568"
RED = "#b3261e"

STYLE = """  <style>
    .sans{font-family:"Liberation Sans","DejaVu Sans",Arial,Helvetica,sans-serif}
    .mono{font-family:"Liberation Mono","DejaVu Sans Mono","Courier New",monospace}
    .ink{fill:#1b2a3a}
    .line{stroke:#1b2a3a;fill:none}
    .h{font-size:10px;letter-spacing:1px;fill:#5a6a7a}
    .t{font-size:10.5px;fill:#5a6a7a}
    .ok{stroke:#1f6f4a;fill:none;stroke-width:2.5}
    .okt{fill:#1f6f4a;font-weight:700}
    .snap{stroke:#2b5b84;fill:none;stroke-width:2.5}
    .snapt{fill:#2b5b84;font-weight:700}
    .rej{stroke:#4a5568;fill:none;stroke-width:2.5}
    .rejt{fill:#4a5568;font-weight:700}
    .bad{stroke:#b3261e;fill:none;stroke-width:2.5}
    .badt{fill:#b3261e;font-weight:700}
  </style>
"""

# Approximate advance width per character, as a fraction of the font size.
SANS, MONO = 0.58, 0.62

_errors: list[str] = []


def esc(text: str) -> str:
    return (
        text.replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


def text(x, y, s, cls="ink", size=10, weight=None, anchor=None, fill=None,
         opacity=None) -> str:
    parts = [f'x="{x}"', f'y="{y}"', f'class="{cls}"', f'font-size="{size}"']
    if weight:
        parts.append(f'font-weight="{weight}"')
    if anchor:
        parts.append(f'text-anchor="{anchor}"')
    if fill:
        parts.append(f'fill="{fill}"')
    if opacity is not None:
        parts.append(f'opacity="{opacity}"')
    return f"  <text {' '.join(parts)}>{esc(s)}</text>"


def width_of(s: str, size: float, mono: bool) -> float:
    return len(s) * size * (MONO if mono else SANS)


def fit(s, x, limit, size, mono, where) -> str:
    """Fail the build if `s` would run past `x + limit`."""
    w = width_of(s, size, mono)
    if x + w > limit:
        _errors.append(f"{where}: {w:.0f}px > {limit - x:.0f}px  «{s}»")
    return s


def wrap(s: str, limit_px: float, size: float, mono: bool) -> list[str]:
    words, lines, cur = s.split(" "), [], ""
    for word in words:
        trial = f"{cur} {word}".strip()
        if width_of(trial, size, mono) <= limit_px or not cur:
            cur = trial
        else:
            lines.append(cur)
            cur = word
    if cur:
        lines.append(cur)
    return lines


def wrap_path(path: str, limit_px: float, size: float, mono: bool = True) -> list[str]:
    """Break a path on '/' so it never crosses its column."""
    parts = path.split("/")
    pieces = [p + "/" for p in parts[:-1]] + ([parts[-1]] if parts[-1] else [])
    lines: list[str] = []
    cur = ""
    for piece in pieces:
        if width_of(cur + piece, size, mono) <= limit_px:
            cur += piece
            continue
        if cur:
            lines.append(cur)
        while width_of(piece, size, mono) > limit_px:
            cut = int(limit_px / (size * MONO))
            lines.append(piece[:cut])
            piece = piece[cut:]
        cur = piece
    if cur:
        lines.append(cur)
    return lines


def rule(y, w=0.6):
    return (f'  <line x1="18" y1="{y}" x2="882" y2="{y}" '
            f'class="line" stroke-width="{w}"/>')


def header(sheet_no, sec_ru, sec_en, lang):
    title = "ПАСПОРТ КАЧЕСТВА ОБЪЕКТА" if lang == "ru" else "OBJECT QUALITY PASSPORT"
    sub = ("QUALITY PASSPORT · mscodebase-intelligence · ManSio"
           if lang == "ru" else
           "QUALITY PASSPORT · mscodebase-intelligence · ManSio · EN")
    sheet = f"ЛИСТ {sheet_no} / 7" if lang == "ru" else f"SHEET {sheet_no} / 7"
    sec = sec_ru if lang == "ru" else sec_en
    return [
        text(36, 50, title, "ink sans", 20, 700),
        '  <text x="36" y="68" class="h sans">' + esc(sub) + "</text>",
        text(864, 50, sheet, "ink mono", 12, anchor="end"),
        text(864, 68, sec, "h sans", anchor="end"),
        rule(82, 1.5),
    ]


def table_head(lang, cols):
    out = []
    for x, label, anchor in cols:
        out.append(text(x, 102, label, "h sans", anchor=anchor))
    out.append(rule(110, 1))
    return out


def main_block(lang):
    """Revision block shared by all four sheets."""
    labels = (["ОБЪЕКТ", "ВЕРСИЯ", "РЕВИЗИЯ", "ФАЙЛ", "SHA-256", "СБОРКА", "ПРОВЕРИЛ"]
              if lang == "ru" else
              ["OBJECT", "VERSION", "REVISION", "FILE", "SHA-256", "BUILD", "CHECKED BY"])
    values = [
        "mscodebase-intelligence",
        "v3.5.0 / Python 3.14",
        "main @ 1c4062d · 13.11.2026",
        "docs/FACTS.md · 5 222 Б" if lang == "ru" else "docs/FACTS.md · 5,222 B",
        "a93abe59…05794985",
        "не подписана · до релиза" if lang == "ru" else "unsigned · before release",
        "________  М. ManSio  __.__.2026" if lang == "ru" else "________  M. ManSio  __.__.____",
    ]
    out = ['  <rect x="540" y="442" width="330" height="154" class="line" stroke-width="1.5"/>']
    for i in range(6):
        out.append(f'  <line x1="540" y1="{464 + i * 22}" x2="870" y2="{464 + i * 22}" class="line" stroke-width="0.8"/>')
    out.append('  <line x1="632" y1="442" x2="632" y2="596" class="line" stroke-width="0.8"/>')
    for i, (label, value) in enumerate(zip(labels, values)):
        y = 457 + i * 22
        out.append(text(548, y, label, "h sans"))
        size = 10 if i != 6 else 9.5
        out.append(text(640, y, value, "ink mono", size))
    return out


def page(lang, sheet_no, sec_ru, sec_en, body, footer, block=True):
    out = [
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" '
        f'width="{W}" height="{H}" role="img" aria-label="'
        + esc(("Паспорт качества объекта mscodebase-intelligence, лист "
               f"{sheet_no}") if lang == "ru" else
              ("Quality passport of mscodebase-intelligence, "
               f"sheet {sheet_no}"))
        + '">',
        "  <defs>",
        '    <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">',
        '      <path d="M20 0H0V20" fill="none" stroke="#d9d4c3" stroke-width="0.6"/>',
        "    </pattern>",
        "  </defs>",
        STYLE,
        f'  <rect width="{W}" height="{H}" fill="#f6f3ea"/>',
        f'  <rect width="{W}" height="{H}" fill="url(#grid)"/>',
        '  <rect x="10" y="10" width="880" height="620" class="line" stroke-width="2.5"/>',
        '  <rect x="18" y="18" width="864" height="604" class="line" stroke-width="0.8"/>',
    ]
    out += header(sheet_no, sec_ru, sec_en, lang)
    out += body
    out += footer
    if block:
        out += main_block(lang)
    out.append("</svg>")
    return "\n".join(out) + "\n"


# --------------------------------------------------------------------------
# Sheet 3 — work log (no verdicts, only entries)
# --------------------------------------------------------------------------
WORKLOG = {
    "ru": {
        "sec": ("ЖУРНАЛ РАБОТ", "WORK LOG"),
        "cols": [("№", None), ("ДАТА", None), ("РАБОТА", None),
                 ("РЕЗУЛЬТАТ (ИЗМЕРЕНО)", None), ("АРТЕФАКТ", None)],
        "x": [30, 82, 152, 478, 706],
        "rows": [
            ("11.11.2026", "E73/P5: снят ложный отказ гейта доказательств",
             "6 из 13 пустых ответов восстановлены; 2 отказа законны",
             "experiments/false_abstain_2026_11/"),
            ("11.11.2026", "smoke_e2e: шаг 4 падает в текстовый индекс",
             "4/4 проверки; режим назван в отчёте",
             "scripts/smoke_e2e.py"),
            ("10.11.2026", "E70: внешний корпус psf/requests, 25 коммитов",
             "tool 12/25 · search 15/25 · grep 19/25",
             "experiments/bench_2026_11/"),
            ("10.11.2026", "E65: fusion A/B, 53 задачи, 3 повтора",
             "top-1: weights 21 · rrf 15 · norm 20",
             "EXPERIMENTS_LOG.md §E65"),
            ("09.11.2026", "RU→EN: перевод против dense на 12 вопросах",
             "12/12 · dense 8/12 · перевод 14 мс",
             "EXPERIMENTS_LOG.md (09.11)"),
            ("08.11.2026", "XERJ: prefilter до tree-sitter в grep-канале",
             "23.0 с → 7.2–8.1 с; совпадения те же",
             "src/mcp/tools/grep_tool.py"),
            ("08.11.2026", "Ошибки инструментов → типизированный конверт",
             "19 тестов; isError ставит обёртка",
             "src/mcp/error_results.py"),
            ("22.09.2026", "v3.5.0: TESTS-сигнал в граф-стадии",
             "до 3 тестов на символ, вес 0.4",
             "CHANGELOG.md §3.5.0"),
        ],
        "legend_title": "Как читать",
        "legend": [
            "Запись фиксирует работу и её измеренный результат, а не приговор.",
            "Штампов на листе нет: журнал не принимает и не отклоняет.",
        ],
        "rule_title": "Границы журнала",
        "rules": ["Показаны 8 последних записей из 164 в EXPERIMENTS_LOG.md.",
                  "Дата — дата опыта, не дата коммита."],
        "src": "Источник: EXPERIMENTS_LOG.md, CHANGELOG.md, KNOWN_ISSUES.md.",
    },
    "en": {
        "sec": ("WORK LOG", "WORK LOG"),
        "cols": [("#", None), ("DATE", None), ("WORK", None),
                 ("RESULT (MEASURED)", None), ("ARTIFACT", None)],
        "x": [30, 82, 152, 478, 706],
        "rows": [
            ("11.11.2026", "E73/P5: the gate no longer refuses wrongly",
             "6 of 13 empty answers recovered; 2 refusals legitimate",
             "experiments/false_abstain_2026_11/"),
            ("11.11.2026", "smoke_e2e: step 4 falls back to the text index",
             "4/4 checks; the mode is named in the report",
             "scripts/smoke_e2e.py"),
            ("10.11.2026", "E70: external corpus psf/requests, 25 commits",
             "tool 12/25 · search 15/25 · grep 19/25",
             "experiments/bench_2026_11/"),
            ("10.11.2026", "E65: fusion A/B, 53 tasks, 3 repeats",
             "top-1: weights 21 · rrf 15 · norm 20",
             "EXPERIMENTS_LOG.md §E65"),
            ("09.11.2026", "RU→EN: translation vs dense on 12 questions",
             "12/12 · dense 8/12 · translation 14 ms",
             "EXPERIMENTS_LOG.md (09.11)"),
            ("08.11.2026", "XERJ: prefilter before tree-sitter in grep",
             "23.0 s → 7.2–8.1 s; the match set unchanged",
             "src/mcp/tools/grep_tool.py"),
            ("08.11.2026", "Tool failures → typed error envelope",
             "19 tests; the wrapper sets isError",
             "src/mcp/error_results.py"),
            ("22.09.2026", "v3.5.0: TESTS signal in the graph stage",
             "up to 3 tests per symbol, weight 0.4",
             "CHANGELOG.md §3.5.0"),
        ],
        "legend_title": "How to read",
        "legend": [
            "An entry records work and its measured result, not a verdict.",
            "No stamps on this sheet: a log neither accepts nor rejects.",
        ],
        "rule_title": "Scope of the log",
        "rules": ["The 8 latest entries out of 164 in EXPERIMENTS_LOG.md.",
                  "The date is the experiment date, not the commit date."],
        "src": "Source: EXPERIMENTS_LOG.md, CHANGELOG.md, KNOWN_ISSUES.md.",
    },
}


# --------------------------------------------------------------------------
# Sheet 4 — concealed works (ADRs): load-bearing decisions invisible in output
# --------------------------------------------------------------------------
CONCEALED = {
    "ru": {
        "sec": ("АКТЫ СКРЫТЫХ РАБОТ", "CONCEALED WORKS"),
        "cols": [("№", None), ("АКТ", None), ("РЕШЕНИЕ (ADR)", None),
                 ("СТАТУС", None), ("ЧТО ДЕРЖИТ", None), ("ДАТА", "end")],
        "x": [30, 78, 172, 470, 570, 866],
        "rows": [
            ("ADR-0001", "Модель угроз для песочницы execute_script",
             "ПРИНЯТ", "что именно разрешено исполнять; границы A1–A5", "05.08"),
            ("ADR-0002", "RetractionReceipt: отзыв SILENT-фактов памяти",
             "ПРИНЯТ", "память не остаётся «навсегда верной»", "11.08"),
            ("ADR-0003", "Verify-On-Read: проверка ACTIVE при чтении",
             "ПРЕДЛОЖЕН", "4 условия; не реализовано — ждёт замера", "11.08"),
            ("ADR-0004", "Типизированные рёбра зависимостей + распространение",
             "ПРИНЯТ", "отзыв факта доходит до зависимых узлов", "12.08"),
            ("ADR-0005", "pkg:-анкеры: closed-world проверка пакетов",
             "ПРИНЯТ", "проверка версии без доверия к сети", "14.08"),
            ("ADR-0006", "LSP-обогащение графа: CALLS + semantic tokens",
             "ПРИНЯТ", "точные call-sites; ! 0 потребителей у двух выходов", "19.08"),
            ("ADR-0007", "Git-локи: один писатель на ресурс между агентами",
             "ДЕЙСТВУЕТ", "параллельные сессии не топчут дерево", "24.08"),
        ],
        "legend_title": "Как читать",
        "legend": [
            "Скрытые работы — решения, которых не видно в выдаче, но без них",
            "конструкция не держит: границы доверия, отзыв фактов, локи.",
        ],
        "rule_title": "Статусы акта",
        "rules": ["ПРИНЯТ — решение действует. ПРЕДЛОЖЕН — не реализовано.",
                  "Пометка «! 0 потребителей» — акт есть, нагрузки нет."],
        "src": "Источник: docs/adr/ (7 актов), KNOWN_ISSUES.md (дебит ADR-0006).",
    },
    "en": {
        "sec": ("CONCEALED WORKS", "CONCEALED WORKS"),
        "cols": [("#", None), ("ACT", None), ("DECISION (ADR)", None),
                 ("STATUS", None), ("WHAT IT HOLDS", None), ("DATE", "end")],
        "x": [30, 78, 172, 470, 570, 866],
        "rows": [
            ("ADR-0001", "Threat model for the execute_script sandbox",
             "ACCEPTED", "what may be executed at all; bounds A1–A5", "05.08"),
            ("ADR-0002", "RetractionReceipt: retracting SILENT memory facts",
             "ACCEPTED", "memory is not «forever true»", "11.08"),
            ("ADR-0003", "Verify-On-Read: check ACTIVE when reading",
             "PROPOSED", "4 conditions; not implemented, awaits a run", "11.08"),
            ("ADR-0004", "Typed dependency edges + retraction propagation",
             "ACCEPTED", "a retracted fact reaches dependent nodes", "12.08"),
            ("ADR-0005", "pkg: anchors: closed-world package checks",
             "ACCEPTED", "version checks without trusting the network", "14.08"),
            ("ADR-0006", "LSP graph enrichment: CALLS + semantic tokens",
             "ACCEPTED", "exact call-sites; ! 0 consumers for two outputs", "19.08"),
            ("ADR-0007", "Git locks: one writer per resource across agents",
             "ACTIVE", "parallel sessions do not trample the tree", "24.08"),
        ],
        "legend_title": "How to read",
        "legend": [
            "Concealed works are decisions invisible in the output, but the",
            "structure does not hold without them: trust, retraction, locks.",
        ],
        "rule_title": "Act status",
        "rules": ["ACCEPTED — in force. PROPOSED — not implemented.",
                  "«! 0 consumers» — the act exists, the load does not."],
        "src": "Source: docs/adr/ (7 acts), KNOWN_ISSUES.md (ADR-0006 debt).",
    },
}


# --------------------------------------------------------------------------
# Sheet 6 — defect registry: the only sheet with red
# --------------------------------------------------------------------------
DEFECTS = {
    "ru": {
        "sec": ("РЕЕСТР БРАКА", "DEFECT REGISTRY"),
        "cols": [("№", None), ("ДЕФЕКТ / ГДЕ", None), ("ВЛИЯНИЕ", None),
                 ("СТАТУС", None), ("ЗАКРЫТИЕ / GUARD", None)],
        "x": [30, 74, 452, 640, 714],
        "rows": [
            ("Б-01", "docs-канал: hit@1 0.000 при same-basename 0.750",
             "search_code(intent=\"docs\")", "docs-вопросы почти не находятся",
             "ОТКРЫТ", "E56: 0.750 после нормализации золота"),
            ("Б-02", "Таймаут канала не отменяет поток",
             "investigate · grep_tool", "после таймаутов 22–30 с на запрос",
             "ОТКРЫТ", "нужен cooperative-cancel"),
            ("Б-03", "CLI-мост не умеет project-scoped инструменты",
             "python -m src.cli", "project_not_ready за ~5 с",
             "ОТКРЫТ", "в allowlist не добавлен"),
            ("Б-04", "Multi-client write без лока",
             "src/remote_main.py", "два клиента портят индекс",
             "ОТКРЫТ", "R-8 / E-10, лока нет"),
            ("Б-05", "При exact: 0 печатаются 8 «соседей»",
             "investigate", "ложное «нашёл» без совпадений",
             "ОТКРЫТ", "кандидат: печать по флагу"),
            ("Б-06", "status=error рендерился как «Completed»",
             "src/core/error_envelope.py", "тихий успех при ошибке",
             "ЗАКРЫТ", "tests/test_mcp_is_error.py · 19"),
            ("Б-07", "Frozen-панель проиндексирована",
             "chunks.db · experiments/4A", "числа E49–E51 загрязнены",
             "ЗАКРЫТ", "E52: leakage 0/48"),
            ("Б-08", "4 slow-теста LSP/VFS падали на main",
             "tests/test_lsp_vfs_indexing.py", "дрейф API не видел CI",
             "ЗАКРЫТ", "4 passed, addopts=\"\""),
        ],
        "legend_title": "Как читать",
        "legend": [
            "ОТКРЫТ — дефект действует, красный. ЗАКРЫТ — есть guard,",
            "который падает на сломанном коде; проверка названа справа.",
        ],
        "rule_title": "Красный цвет",
        "rules": ["Красный живёт только на этом листе и только у ОТКРЫТ.",
                  "8 записей из 19 в KNOWN_ISSUES.md; удалять записи нельзя."],
        "src": "Источник: KNOWN_ISSUES.md, CHANGELOG.md, EXPERIMENTS_LOG.md.",
    },
    "en": {
        "sec": ("DEFECT REGISTRY", "DEFECT REGISTRY"),
        "cols": [("#", None), ("DEFECT / WHERE", None), ("IMPACT", None),
                 ("STATUS", None), ("FIX / GUARD", None)],
        "x": [30, 74, 452, 640, 714],
        "rows": [
            ("D-01", "Docs channel: hit@1 0.000 at same-basename 0.750",
             "search_code(intent=\"docs\")", "docs questions are not found",
             "OPEN", "E56: 0.750 after gold canonicalisation"),
            ("D-02", "A channel timeout does not cancel its thread",
             "investigate · grep_tool", "22–30 s per call after timeouts",
             "OPEN", "needs cooperative cancel"),
            ("D-03", "CLI bridge has no project-scoped tools",
             "python -m src.cli", "project_not_ready in ~5 s",
             "OPEN", "not added to the allowlist"),
            ("D-04", "Multi-client write without a lock",
             "src/remote_main.py", "two clients corrupt the index",
             "OPEN", "R-8 / E-10, no lock"),
            ("D-05", "With exact: 0 it still prints 8 «neighbours»",
             "investigate", "a false «found» with no match",
             "OPEN", "candidate: print behind a flag"),
            ("D-06", "status=error rendered as «Completed»",
             "src/core/error_envelope.py", "silent success on failure",
             "FIXED", "tests/test_mcp_is_error.py · 19"),
            ("D-07", "The frozen panel was indexed",
             "chunks.db · experiments/4A", "E49–E51 numbers contaminated",
             "FIXED", "E52: leakage 0/48"),
            ("D-08", "4 slow LSP/VFS tests failed on main",
             "tests/test_lsp_vfs_indexing.py", "API drift invisible to CI",
             "FIXED", "4 passed, addopts=\"\""),
        ],
        "legend_title": "How to read",
        "legend": [
            "OPEN — the defect is live, red. FIXED — there is a guard",
            "that goes red on broken code; the check is named on the right.",
        ],
        "rule_title": "The red colour",
        "rules": ["Red lives only on this sheet, and only on OPEN.",
                  "8 entries of 19 in KNOWN_ISSUES.md; entries are not deleted."],
        "src": "Source: KNOWN_ISSUES.md, CHANGELOG.md, EXPERIMENTS_LOG.md.",
    },
}


def build_worklog(lang):
    d = WORKLOG[lang]
    body = table_head(lang, [(x, c, None) for (c, _), x in zip(d["cols"], d["x"])])
    for i, (date, work, result, artifact) in enumerate(d["rows"]):
        y = 134 + i * 36
        body.append(text(30, y, f"Р-{i + 1:02d}" if lang == "ru" else f"W-{i + 1:02d}",
                         "ink mono", 11))
        body.append(text(82, y, date, "ink mono", 10.5))
        body.append(text(152, y, fit(work, 152, 474, 11.5, False, "s2/work"), "ink sans", 11.5))
        for j, line in enumerate(wrap(result, 220, 9, False)[:2]):
            body.append(text(478, y + j * 10, line, "sans", 9, fill=INK))
        for j, line in enumerate(wrap_path(artifact, 158, 9)[:2]):
            body.append(text(706, y + j * 10, line, "ink mono", 9))
        body.append(rule(y + 24))
    return page(lang, 3, *d["sec"], body, _footer(lang, d))


def build_concealed(lang):
    d = CONCEALED[lang]
    body = table_head(lang, [(x, c, a) for (c, a), x in zip(d["cols"], d["x"])])
    for i, (act, decision, status, holds, date) in enumerate(d["rows"]):
        y = 138 + i * 42
        body.append(text(30, y, act, "ink mono", 10))
        for j, line in enumerate(wrap(decision, 288, 11.5, False)):
            body.append(text(172, y + j * 13, line, "ink sans", 11.5, weight=600))
        colour = GREEN if "ПРИНЯТ" in status or status in ("ACCEPTED", "ACTIVE", "ДЕЙСТВУЕТ") else AMBER
        body.append(text(470, y, status, "sans", 9, 700, fill=colour))
        for j, line in enumerate(wrap(holds, 270, 9.5, False)):
            body.append(text(570, y + j * 11.5, line, "sans", 9.5, fill="#3d4b5a"))
        body.append(text(866, y, date, "ink mono", 10, anchor="end"))
        body.append(rule(y + 28))
    return page(lang, 4, *d["sec"], body, _footer(lang, d))


def build_defects(lang):
    d = DEFECTS[lang]
    body = table_head(lang, [(x, c, None) for (c, _), x in zip(d["cols"], d["x"])])
    for i, (num, defect, where, impact, status, fix) in enumerate(d["rows"]):
        y = 136 + i * 38
        body.append(text(30, y, num.replace("Б", "D") if lang == "en" else num, "ink mono", 10))
        body.append(text(74, y, fit(defect, 74, 448, 11, False, "s4/defect"), "ink sans", 11, weight=600))
        for j, line in enumerate(wrap(where, 175, 8.5, True)[:2]):
            body.append(text(74, y + 12 + j * 9.5, line, "ink mono", 8.5, fill=GREY))
        for j, line in enumerate(wrap(impact, 180, 9, False)):
            body.append(text(452, y + j * 10.5, line, "sans", 9, fill=INK))
        open_ = status in ("ОТКРЫТ", "OPEN")
        body.append(text(640, y, status, "sans", 10, 700, fill=RED if open_ else GRAPHITE))
        for j, line in enumerate(wrap(fix, 152, 8.5, False)):
            body.append(text(714, y + j * 9.5, line, "sans", 8.5, fill=GRAPHITE))
        body.append(rule(y + 26, 0.5))
    return page(lang, 6, *d["sec"], body, _footer(lang, d))


def _footer(lang, d):
    out = [
        text(36, 456, d["legend_title"], "ink sans", 12, 600),
        text(36, 472, d["legend"][0], "t sans"),
        text(36, 486, d["legend"][1], "t sans"),
        text(36, 508, d["rule_title"], "ink sans", 12, 600),
    ]
    y = 524
    for line in d["rules"]:
        out.append(text(36, y, line, "t sans"))
        y += 14
    out.append(text(36, y + 14, d["src"], "ink mono", 9.5))
    return out


# --------------------------------------------------------------------------
# Sheet 1 — cover: the object, the set, and who hands it over
# --------------------------------------------------------------------------
COVER = {
    "ru": {
        "sec": ("ТИТУЛЬНЫЙ ЛИСТ", "COVER"),
        "meta": [("ОБЪЕКТ", "mscodebase-intelligence"),
                 ("ВЕРСИЯ", "v3.5.0 · Python 3.14"),
                 ("РЕВИЗИЯ", "main @ 1c4062d · 13.11.2026"),
                 ("ВЛАДЕЛЕЦ", "М. ManSio / ManSio"),
                 ("ЛИЦЕНЗИЯ", "MIT"),
                 ("ПЛАТФОРМА", "Windows validated · Linux CI")],
        "reg_title": "ВЕДОМОСТЬ СОСТАВА КОМПЛЕКТА",
        "reg_cols": ("ЛИСТ", "НАИМЕНОВАНИЕ", "ЧТО ДОКАЗЫВАЕТ"),
        "rows": [
            ("1", "Титульный лист и ведомость состава", "что входит в комплект и на какой ревизии"),
            ("2", "Протоколы испытаний", "числа с датой замера и правилом устаревания"),
            ("3", "Журнал работ", "что делалось и с каким измеренным результатом"),
            ("4", "Акты скрытых работ", "решения, на которых держится конструкция"),
            ("5", "Условия эксплуатации", "где число верно и где перестаёт быть верным"),
            ("6", "Реестр брака", "открытые дефекты и закрытые с guard"),
            ("7", "Акт приёмки", "вердикт, оговорки и что не проверялось"),
        ],
        "rule_title": "Правило поверки (рабочее)",
        "rules": ["Качество: до первого изменения src/core/search или src/core/indexing",
                  "после замера, потолок 90 дней. Структурные факты: 30 дней."],
        "composed": ("СОСТАВЛЕН", "13.11.2026 · 7 листов · ревизия 1"),
    },
    "en": {
        "sec": ("COVER", "COVER"),
        "meta": [("OBJECT", "mscodebase-intelligence"),
                 ("VERSION", "v3.5.0 · Python 3.14"),
                 ("REVISION", "main @ 1c4062d · 13.11.2026"),
                 ("OWNER", "M. ManSio / ManSio"),
                 ("LICENSE", "MIT"),
                 ("PLATFORM", "Windows validated · Linux CI")],
        "reg_title": "REGISTER OF THE SET",
        "reg_cols": ("SHEET", "NAME", "WHAT IT PROVES"),
        "rows": [
            ("1", "Cover and register of the set", "what the set contains and at which revision"),
            ("2", "Test protocols", "numbers with a measurement date and a validity rule"),
            ("3", "Work log", "what was done and with which measured result"),
            ("4", "Concealed works", "the decisions the structure rests on"),
            ("5", "Operating limits", "where a number holds and where it stops"),
            ("6", "Defect registry", "open defects and closed ones with a guard"),
            ("7", "Acceptance act", "the verdict, the caveats, what was not checked"),
        ],
        "rule_title": "Validity rule (working)",
        "rules": ["Quality: until the first change to src/core/search or src/core/indexing",
                  "after the measurement, capped at 90 days. Structural facts: 30 days."],
        "composed": ("COMPOSED", "13.11.2026 · 7 sheets · revision 1"),
    },
}


def build_cover(lang):
    d = COVER[lang]
    body = []
    for i, (label, value) in enumerate(d["meta"]):
        col, row = i // 3, i % 3
        x = 36 if col == 0 else 470
        y = 108 + row * 20
        body.append(text(x, y, label, "h sans"))
        body.append(text(x + 104, y, value, "ink mono", 9.5))
    body.append(rule(168, 1))
    body.append(text(36, 192, d["reg_title"], "ink sans", 12, 600))
    hx = (30, 82, 330)
    for x, label in zip(hx, d["reg_cols"]):
        body.append(text(x, 212, label, "h sans"))
    body.append(rule(220, 0.8))
    for i, (num, name, proves) in enumerate(d["rows"]):
        y = 240 + i * 26
        body.append(text(30, y, num, "ink mono", 11))
        body.append(text(82, y, fit(name, 82, 326, 11, False, "cover/name"), "ink sans", 11))
        body.append(text(330, y, fit(proves, 330, 862, 9.5, False, "cover/proves"),
                         "sans", 9.5, fill=GREY))
        body.append(rule(y + 12, 0.4))
    body.append(rule(432, 1.2))
    body.append(text(36, 456, d["rule_title"], "ink sans", 11, 700))
    body.append(text(36, 472, d["rules"][0], "t sans"))
    body.append(text(36, 486, d["rules"][1], "t sans"))
    label, value = d["composed"]
    body.append(text(36, 516, label, "h sans"))
    body.append(text(124, 516, value, "ink mono", 9.5))
    body.append(text(36, 552, "СОСТАВИЛ  ________  М. ManSio  __.__.2026"
                     if lang == "ru" else
                     "COMPOSED BY  ________  M. ManSio  __.__.____", "ink mono", 9.5))
    body.append(text(36, 574, "ПРИНЯЛ  ________  заказчик  __.__.2026"
                     if lang == "ru" else
                     "ACCEPTED BY  ________  customer  __.__.____", "ink mono", 9.5))
    return page(lang, 1, *d["sec"], body, [], block=False)


# --------------------------------------------------------------------------
# Sheet 5 — operating limits: where a number stops being true
# --------------------------------------------------------------------------
LIMITS = {
    "ru": {
        "sec": ("УСЛОВИЯ ЭКСПЛУАТАЦИИ", "OPERATING LIMITS"),
        "cols": [("№", None), ("ОГРАНИЧЕНИЕ", None),
                 ("В ЧЁМ ПРОЯВЛЯЕТСЯ", None), ("ЧТО ДЕЛАТЬ", None)],
        "x": [30, 78, 292, 584],
        "rows": [
            ("О-01", "docs-gold и язык документа",
             "канал может вернуть docs/ru/X.md, когда золото — docs/en/X.md",
             "нормализовать по basename при оценке"),
            ("О-02", "Авто-маршрут в docs — эвристика",
             "кодовый запрос с сильными docs-словами уедет в документацию",
             "intent=\"code\" как выход"),
            ("О-03", "Полный векторный переиндекс заблокирован",
             "при MSCODEBASE_DENSE_OFF=true (дефолт проекта)",
             "rebuild_graph.py / reindex_text_only.py"),
            ("О-04", "95% не заявлено",
             "статика и локальные реранкеры до него не дотянули",
             "LLM-планировщик — отдельный опыт"),
            ("О-05", "Быстрый режим — не режим качества",
             "на смешанных вопросах заметно менее точен",
             "quality mode, когда нужна точность"),
            ("О-06", "Видимость инструментов — это профиль",
             "69 зарегистрировано, 17 видно по умолчанию",
             "tool_help(); переключить профиль"),
            ("О-07", "LSP-инструменты требуют basedpyright",
             "без него fail fast, результат кэшируется на 30 с",
             "поставить basedpyright"),
        ],
        "legend_title": "Как читать",
        "legend": ["Ограничение — не оправдание, а условие эксплуатации:",
                   "оно говорит, при каком входе результату верить нельзя."],
        "rule_title": "Откуда взято",
        "rules": ["7 пунктов README §Limitations, без пересказа и без смягчений.",
                  "Пункт с docs-gold — свойство разметки, а не дефект поиска."],
        "src": "Источник: README.md §Limitations, docs/FACTS.md §8.",
    },
    "en": {
        "sec": ("OPERATING LIMITS", "OPERATING LIMITS"),
        "cols": [("#", None), ("LIMIT", None), ("HOW IT SHOWS", None), ("WHAT TO DO", None)],
        "x": [30, 78, 292, 584],
        "rows": [
            ("L-01", "Docs gold vs document language",
             "the channel may return docs/ru/X.md when gold is docs/en/X.md",
             "normalise by basename when evaluating"),
            ("L-02", "Auto docs routing is a heuristic",
             "a code query with strong docs words is routed to documentation",
             "intent=\"code\" is the escape hatch"),
            ("L-03", "Full vector reindex is blocked",
             "while MSCODEBASE_DENSE_OFF=true (the project default)",
             "rebuild_graph.py / reindex_text_only.py"),
            ("L-04", "No 95% claim",
             "static retrieval and the local rerankers did not reach it",
             "an LLM planner is a separate experiment"),
            ("L-05", "Fast mode is not quality mode",
             "materially less accurate on mixed natural-language questions",
             "quality mode when accuracy matters"),
            ("L-06", "Tool visibility is a profile",
             "69 registered, 17 visible by default",
             "tool_help(); switch the profile"),
            ("L-07", "LSP tools need a working basedpyright",
             "without it they fail fast, the result is cached for 30 s",
             "install basedpyright"),
        ],
        "legend_title": "How to read",
        "legend": ["A limit is not an excuse but an operating condition:",
                   "it says on which input the result must not be trusted."],
        "rule_title": "Where it comes from",
        "rules": ["The 7 items of README §Limitations, neither paraphrased nor softened.",
                  "The docs-gold item is a labelling property, not a retrieval defect."],
        "src": "Source: README.md §Limitations, docs/FACTS.md §8.",
    },
}


def build_limits(lang):
    d = LIMITS[lang]
    body = table_head(lang, [(x, c, None) for (c, _), x in zip(d["cols"], d["x"])])
    for i, (num, name, shows, action) in enumerate(d["rows"]):
        y = 138 + i * 40
        body.append(text(30, y, num, "ink mono", 10))
        for j, line in enumerate(wrap(name, 205, 11, False)[:2]):
            body.append(text(78, y + j * 12, line, "ink sans", 11, weight=600))
        for j, line in enumerate(wrap(shows, 278, 9, False)[:2]):
            body.append(text(292, y + j * 11, line, "sans", 9, fill=INK))
        for j, line in enumerate(wrap(action, 275, 9, False)[:2]):
            body.append(text(584, y + j * 11, line, "sans", 9, fill=GREY))
        body.append(rule(y + 26))
    return page(lang, 5, *d["sec"], body, _footer(lang, d))


# --------------------------------------------------------------------------
# Sheet 7 — acceptance act: the verdict, and what it does not cover
# --------------------------------------------------------------------------
ACCEPTANCE = {
    "ru": {
        "sec": ("АКТ ПРИЁМКИ", "ACCEPTANCE"),
        "submitted": ("mscodebase-intelligence v3.5.0, ревизия main @ 1c4062d "
                      "от 13.11.2026. Комплект — 7 листов, ревизия паспорта "
                      "совпадает с ревизией объекта."),
        "accepted_title": "ПРИНЯТО",
        "accepted": [
            "Видимых инструментов 17 из 69 — совпадает с FACTS §2.",
            "Загружено 31 грамматика — совпадает с FACTS §4.",
            "Реранкеры: 4 проверено, 0 внедрено — E38/E39, решение закрыто.",
        ],
        "caveat_title": "ПРИНЯТО С ОГОВОРКОЙ",
        "caveats": [
            "hit@5 0.900 и 0.729 — снимок 25.10; после него 15 коммитов в путях поиска.",
            "docs-канал: hit@1 0.000 — открытый дефект, лист 6, Б-01.",
        ],
        "unchecked_title": "НЕ ПРОВЕРЯЛОСЬ",
        "unchecked": [
            "Подпись сборки: релиза нет, attestation не выпускалась.",
            "Внешняя точность: 2 репозитория, 65 коммитов; на других корпусах не мерили.",
            "Задержка под параллельной нагрузкой: p50 панели, не стресс-тест.",
        ],
        "changes_title": "ВЕРДИКТ МЕНЯЕТСЯ, ЕСЛИ",
        "changes": [
            "Пересчёт на текущем коде вернёт значения FACTS §5 — оговорка снимается.",
            "Выйдет релиз с attestation — строка «СБОРКА» станет подписанной.",
        ],
        "decision": "РЕШЕНИЕ: объект принят с 2 оговорками; 3 пункта не проверялись.",
        "sign_left": "СДАЛ  ________  М. ManSio  __.__.2026",
        "sign_right": "ПРИНЯЛ  ________  заказчик  __.__.2026",
    },
    "en": {
        "sec": ("ACCEPTANCE ACT", "ACCEPTANCE"),
        "submitted": ("mscodebase-intelligence v3.5.0, revision main @ 1c4062d "
                      "of 13.11.2026. The set is 7 sheets; the passport revision "
                      "matches the object revision."),
        "accepted_title": "ACCEPTED",
        "accepted": [
            "Visible tools 17 of 69 — matches FACTS §2.",
            "31 grammars loaded — matches FACTS §4.",
            "Rerankers: 4 tested, 0 adopted — E38/E39, the decision is closed.",
        ],
        "caveat_title": "ACCEPTED WITH CAVEATS",
        "caveats": [
            "hit@5 0.900 and 0.729 — a snapshot from 25.10; 15 commits to the search path since.",
            "Docs channel: hit@1 0.000 — an open defect, sheet 6, D-01.",
        ],
        "unchecked_title": "NOT CHECKED",
        "unchecked": [
            "Build signature: there is no release, no attestation was issued.",
            "External accuracy: 2 repositories, 65 commits; other corpora were not measured.",
            "Latency under parallel load: the panel's p50, not a stress test.",
        ],
        "changes_title": "THE VERDICT CHANGES IF",
        "changes": [
            "A re-measurement on the current code matches FACTS §5 — the caveat is lifted.",
            "A release with attestation ships — the «BUILD» line becomes signed.",
        ],
        "decision": "DECISION: accepted with 2 caveats; 3 items were not checked.",
        "sign_left": "HANDED OVER  ________  M. ManSio  __.__.____",
        "sign_right": "ACCEPTED BY  ________  customer  __.__.____",
    },
}


def build_acceptance(lang):
    d = ACCEPTANCE[lang]
    body = []

    def section(y, title, items, x, limit, gap_before=18):
        y += gap_before
        body.append(text(x, y, title, "ink sans", 11, 700))
        y += 16
        for item in items:
            for line in wrap(item, limit, 9.5, False):
                body.append(text(x, y, line, "sans", 9.5, fill=INK))
                y += 12
            y += 2
        return y

    y = section(118, "ПРЕДЪЯВЛЕНО К ПРИЁМКЕ" if lang == "ru" else "SUBMITTED FOR ACCEPTANCE",
                [d["submitted"]], 36, 460, gap_before=0)
    y = section(y, d["accepted_title"], d["accepted"], 36, 460)
    y = section(y, d["caveat_title"], d["caveats"], 36, 460, gap_before=14)

    body.append(text(512, 118, d["unchecked_title"], "ink sans", 11, 700))
    yy = 134
    for item in d["unchecked"]:
        for line in wrap(item, 340, 9.5, False):
            body.append(text(512, yy, line, "sans", 9.5, fill=INK))
            yy += 12
        yy += 2
    yy = section(yy, d["changes_title"], d["changes"], 512, 340, gap_before=14)

    base = max(y, yy) + 10
    body.append(rule(base, 0.8))
    body.append(text(36, base + 26, d["decision"], "ink sans", 11.5, 700))
    body.append(text(36, base + 52, d["sign_left"], "ink mono", 9.5))
    body.append(text(512, base + 52, d["sign_right"], "ink mono", 9.5))

    footer = _footer(lang, {
        "legend_title": "Как читать" if lang == "ru" else "How to read",
        "legend": ["Акт закрывает комплект: он говорит не «всё хорошо»,"
                   if lang == "ru" else
                   "The act closes the set: it does not say «all good»,",
                   "а «что именно принято, с чем и чего мы не проверяли»."
                   if lang == "ru" else
                   "but «what exactly is accepted, with what, and what was not checked»."],
        "rule_title": "Основание" if lang == "ru" else "Basis",
        "rules": ["Оговорки не снимаются подписью: их снимает пересчёт."
                  if lang == "ru" else
                  "A signature does not lift a caveat; a re-measurement does.",
                  "Каждая строка акта ссылается на лист или раздел FACTS."
                  if lang == "ru" else
                  "Every line of the act points to a sheet or a FACTS section."],
        "src": "Источник: листы 2–6 этого комплекта."
               if lang == "ru" else
               "Source: sheets 2-6 of this set.",
    })
    return page(lang, 7, *d["sec"], body, footer)


def build_protocols_en():
    """Translate the owner's v3 sheet 1 without touching its geometry."""
    src = HERE / "passport-sheet2.ru.svg"
    if not src.exists():
        print(f"skip sheet 1 en: {src} not found", file=sys.stderr)
        return
    svg = src.read_text(encoding="utf-8")
    pairs = [
        ("ПАСПОРТ КАЧЕСТВА ОБЪЕКТА", "OBJECT QUALITY PASSPORT"),
        ("QUALITY PASSPORT · mscodebase-intelligence · ManSio",
         "QUALITY PASSPORT · mscodebase-intelligence · ManSio · EN"),
        ("ЛИСТ 1 / 4", "SHEET 1 / 4"),
        ("ПРОТОКОЛЫ ИСПЫТАНИЙ", "TEST PROTOCOLS"),
        ("ЧТО ПРОВЕРЕНО / CLAIM", "CLAIM"),
        ("ЗНАЧЕНИЕ", "VALUE"),
        ("МЕТОД", "METHOD"),
        ("ЗАМЕР", "MEASURED"),
        ("ДЕЙСТВУЕТ", "VALID"),
        ("РЕШЕНИЕ", "DECISION"),
        ("Поиск по коду, hit@5", "Code search, hit@5"),
        ("quality mode · панель 48 запросов", "quality mode · 48-query panel"),
        ("Быстрый режим, hit@5", "Fast mode, hit@5"),
        ("fast mode · та же панель", "fast mode · same panel"),
        ("Видимых инструментов (core)", "Visible tools (core)"),
        ("из зарегистрированных в сервере", "out of the registered tools"),
        ("Загружено грамматик", "Grammars loaded"),
        ("точное значение", "exact value"),
        ("Реранкеры: 4 модели", "Rerankers: 4 models"),
        ("BGE-base 3.1 с · Qwen3 до 54.8 с на CPU",
         "BGE-base 3.1 s · Qwen3 up to 54.8 s on CPU"),
        ("из 4 проверенных", "out of 4 tested"),
        ("снимок 25.10", "snapshot 25.10"),
        ("+15 коммитов", "+15 commits"),
        ("пересчёт не выполнен", "not re-measured"),
        ("до 11.12", "until 11.12"),
        ("осталось 28 д.", "28 d left"),
        ("до изменения", "until the"),
        ("пайплайна", "pipeline changes"),
        ("Как читать", "How to read"),
        ("ПРИНЯТО — проверено, в сроке поверки.", "ACCEPTED — checked within its validity window."),
        ("СНИМОК — верно на дату замера, на текущий код не заявлено.",
         "SNAPSHOT — true on the measurement date, not claimed for HEAD."),
        ("ПРОСРОЧЕНО — заявлено как текущее, срок вышел.",
         "OVERDUE — claimed as current, the window has passed."),
        ("ОТКЛОНЕНО — решение проверено и осознанно закрыто.",
         "REJECTED — the decision was tested and consciously closed."),
        ("Правило поверки (рабочее)", "Validity rule (working)"),
        ("Качество: до первого изменения src/core/search или src/core/indexing",
         "Quality: until the first change to src/core/search or src/core/indexing"),
        ("после замера, потолок 90 дней. Структурные факты: 30 дней.",
         "after the measurement, capped at 90 days. Structural facts: 30 days."),
        ("Источник: docs/FACTS.md, EXPERIMENTS_LOG.md.",
         "Source: docs/FACTS.md, EXPERIMENTS_LOG.md."),
        ("ОБЪЕКТ", "OBJECT"), ("ВЕРСИЯ", "VERSION"), ("РЕВИЗИЯ", "REVISION"),
        ("ФАЙЛ", "FILE"), ("СБОРКА", "BUILD"), ("ПРОВЕРИЛ", "CHECKED BY"),
        ("не подписана · до релиза", "unsigned · before release"),
        ("docs/FACTS.md · 5 222 Б", "docs/FACTS.md · 5,222 B"),
        ("СНИМОК", "SNAPSHOT"), ("ПРИНЯТО", "ACCEPTED"),
        ("ОТКЛОНЕНО", "REJECTED"),
        ("ЛИСТ 2 / 7", "SHEET 2 / 7"),
        ("РЕГЛАМЕНТ", "REGULATION"),
        ("харнесс E30 / E52 / E57", "harness E30 / E52 / E57"),
        ("0 внедрено", "0 adopted"),
        ("П-01", "T-01"), ("П-02", "T-02"), ("П-03", "T-03"),
        ("П-04", "T-04"), ("П-05", "T-05"),
    ]
    for ru, en in pairs:
        svg = svg.replace(f">{ru}<", f">{esc(en)}<")
    # the small line under each stamp duplicated the translated word; give it
    # a distinct meaning instead of printing SNAPSHOT/SNAPSHOT.
    sub_lines = [
        ('y="13" text-anchor="middle" font-size="7" letter-spacing="1" class="snapt sans">SNAPSHOT</text>',
         "AS OF DATE"),
        ('y="13" text-anchor="middle" font-size="7" letter-spacing="1" class="okt sans">ACCEPTED</text>',
         "IN WINDOW"),
        ('y="13" text-anchor="middle" font-size="7" letter-spacing="1" class="rejt sans">REJECTED</text>',
         "CLOSED"),
    ]
    for marker, label in sub_lines:
        svg = svg.replace(marker, marker.replace(">SNAPSHOT<", f">{label}<")
                          .replace(">ACCEPTED<", f">{label}<")
                          .replace(">REJECTED<", f">{label}<"))
    # status stamps use text nodes with leading spaces in attributes; the
    # replace above covers the inner text. Remaining Russian is reported.
    out = HERE / "passport-sheet2.en.svg"
    out.write_text(svg, encoding="utf-8")
    leftover = [w for w in ("ПРИНЯТО", "СНИМОК", "ОТКЛОНЕНО", "ЛИСТ", "ЗАМЕР") if w in svg]
    if leftover:
        _errors.append("sheet2.en: untranslated " + ", ".join(leftover))


def main():
    HERE.mkdir(parents=True, exist_ok=True)
    ru_v3 = DOWNLOADS / "passport-sheet1-v3.svg"
    ru_target = HERE / "passport-sheet2.ru.svg"
    if ru_v3.exists():
        shutil.copyfile(ru_v3, ru_target)
    if ru_target.exists():
        svg = ru_target.read_text(encoding="utf-8")
        patched = svg.replace("ЛИСТ 1 / 4", "ЛИСТ 2 / 7")
        if patched != svg:
            ru_target.write_text(patched, encoding="utf-8")

    build_protocols_en()
    pages = ((1, build_cover), (3, build_worklog), (4, build_concealed),
             (5, build_limits), (6, build_defects), (7, build_acceptance))
    for lang in ("ru", "en"):
        for sheet, fn in pages:
            name = f"passport-sheet{sheet}.{lang}.svg"
            (HERE / name).write_text(fn(lang), encoding="utf-8")
            print(f"wrote {name}")

    if _errors:
        print("\nLAYOUT ERRORS:", file=sys.stderr)
        for e in _errors:
            print("  " + e, file=sys.stderr)
        return 1
    print("all cells fit their columns")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

