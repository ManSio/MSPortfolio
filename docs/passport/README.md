# Quality passport — mscodebase-intelligence

Four A4-landscape sheets that present the project the way a construction object
is handed over: claims with a measurement date, a validity rule, the decisions
that carry the structure, and a defect registry that keeps closed entries.

| Sheet | File (RU / EN) | What it shows |
|---|---|---|
| 1 | `passport-sheet1.ru.svg` / `.en.svg` | Test protocols: 5 claims with value, method, measurement date, validity and a stamp |
| 2 | `passport-sheet2.ru.svg` / `.en.svg` | Work log: 8 dated entries, measured result, artifact. No stamps — a log does not judge |
| 3 | `passport-sheet3.ru.svg` / `.en.svg` | Concealed works: the 7 ADRs that hold the system up and are invisible in the output |
| 4 | `passport-sheet4.ru.svg` / `.en.svg` | Defect registry: open defects in red, fixed ones kept with their guard |

## Stamps and colours

| Stamp | Colour | Meaning |
|---|---|---|
| ПРИНЯТО / ACCEPTED | green | measured inside its validity window |
| СНИМОК / SNAPSHOT | blue | true on the measurement date, not claimed for HEAD |
| ПРОСРОЧЕНО / OVERDUE | amber | claimed as current, window passed (not used on the current sheets) |
| ОТКЛОНЕНО / REJECTED | graphite | a decision was tested and consciously closed |
| ОТКРЫТ / OPEN | red | live defect — red appears only on sheet 4 |

## Validity rule

- Quality measurements: valid until the first commit that touches
  `src/core/search` or `src/core/indexing` after the measurement date, capped at
  90 days.
- Structural facts (tool counts, grammars): 30 days.

The rule is conservative on purpose: it says «the code changed», not «the
output changed». Sheet 1 prints the commands that re-check both the rule and the
file hash.

## Regenerating

```sh
python build_passport.py
```

`passport-sheet1.ru.svg` is the owner's hand-made original and is the source for
sheet 1: the script translates it into `passport-sheet1.en.svg` and never
rewrites the Russian one. Sheets 2–4 are generated from the data tables in the
script. The build fails if any cell would cross into the next column.

Every number on the sheets comes from
[`docs/FACTS.md`](https://github.com/ManSio/mscodebase-intelligence/blob/main/docs/FACTS.md)
(revision `1c4062d`), `EXPERIMENTS_LOG.md`, `docs/adr/` and `KNOWN_ISSUES.md`.
