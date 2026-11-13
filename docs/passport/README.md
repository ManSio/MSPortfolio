# Quality passport — mscodebase-intelligence

Seven A4-landscape sheets that present the project the way a construction object
is handed over: what is in the set, claims with a measurement date, the work
done, the decisions that carry the structure, the conditions of use, a defect
registry and an acceptance act.

| Sheet | File (RU / EN) | What it shows |
|---|---|---|
| 1 | `passport-sheet1.ru.svg` / `.en.svg` | Cover and register: the object, the set of 7 sheets, who hands it over |
| 2 | `passport-sheet2.ru.svg` / `.en.svg` | Test protocols: 5 claims with value, method, date, validity and a stamp |
| 3 | `passport-sheet3.ru.svg` / `.en.svg` | Work log: 8 dated entries with a measured result and an artifact. No stamps |
| 4 | `passport-sheet4.ru.svg` / `.en.svg` | Concealed works: the 7 ADRs that hold the system up and are invisible in the output |
| 5 | `passport-sheet5.ru.svg` / `.en.svg` | Operating limits: the 7 conditions under which a number stops being true |
| 6 | `passport-sheet6.ru.svg` / `.en.svg` | Defect registry: open defects in red, fixed ones kept with their guard |
| 7 | `passport-sheet7.ru.svg` / `.en.svg` | Acceptance act: the verdict, 2 caveats, 3 things that were not checked |

## Stamps and colours

| Stamp | Colour | Meaning |
|---|---|---|
| ПРИНЯТО / ACCEPTED | green | measured inside its validity window |
| СНИМОК / SNAPSHOT | blue | true on the measurement date, not claimed for HEAD |
| ПРОСРОЧЕНО / OVERDUE | amber | claimed as current, window passed (not used on the current sheets) |
| ОТКЛОНЕНО / REJECTED | graphite | a decision was tested and consciously closed |
| ОТКРЫТ / OPEN | red | live defect — red appears only on sheet 6 |

## Validity rule

- Quality measurements: valid until the first commit that touches
  `src/core/search` or `src/core/indexing` after the measurement date, capped at
  90 days.
- Structural facts (tool counts, grammars): 30 days.

The rule is conservative on purpose: it says «the code changed», not «the
output changed». Sheet 2 prints the commands that re-check both the rule and the
file hash.

## Regenerating

```sh
python build_passport.py
```

`passport-sheet2.ru.svg` is the owner's hand-made original (sheet 1 of the old
four-sheet set) and is the source for the protocols sheet: the script patches
its sheet number, translates it into `passport-sheet2.en.svg` and never rewrites
the Russian one. Sheets 1 and 3-7 are generated from the data tables in the
script. The build fails if any cell would cross into the next column.

Every number on the sheets comes from
[`docs/FACTS.md`](https://github.com/ManSio/mscodebase-intelligence/blob/main/docs/FACTS.md)
(revision `1c4062d`), `EXPERIMENTS_LOG.md`, `docs/adr/`, `KNOWN_ISSUES.md` and
`README.md §Limitations`.
