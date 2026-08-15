# Дистрибуция MCP-сервера по каталогам (решение D1, research 2026-08-15)

> Цель: закрыть KI-016 (0 листингов при живом endpoint). Живой прецедент —
> rubenmarcus/portfolio (в официальном реестре). Форматы верифицированы из
> первоисточников: официальный гайд registry (remote-servers / github-actions) и
> smithery.yaml проекта guptaprakhariitr/sec-edgar-mcp.

## Статус

| Каталог | Механизм | Статус |
|---------|----------|--------|
| Официальный MCP Registry | `server.json` + `.github/workflows/publish-mcp.yml` (OIDC) | ✅ готово — публикация по тегу `v*` |
| Smithery | `smithery.yaml` в корне репо, автокравл | ✅ готово — пассивно подхватится |
| Glama | автокравл awesome-mcp-servers | ⏳ после PR (см. ниже) |
| punkpeye/awesome-mcp-servers | PR в README | ⏳ ручной шаг (entry ниже) |
| mcp.so / PulseMCP / MCPMarket | веб-формы / issue | ⏳ опционально (~5 мин каждый) |

## Публикация в официальный реестр

```sh
git tag v1.0.0
git push origin v1.0.0        # триггерит .github/workflows/publish-mcp.yml (OIDC)
```

Проверка:

```sh
curl "https://registry.modelcontextprotocol.io/v0.1/servers?search=io.github.Mansio/msp-portfolio"
```

Примечания:
- Name: `io.github.ManSio/msp-portfolio` (регистр = ТОЧНЫЙ кейс GitHub-логина `ManSio`).
  Проверка прав регистро-чувствительна: OIDC даёт `io.github.ManSio/*`, имя с другим
  регистром (напр. `Mansio`) → 403 "You do not have permission". Поймано на v1.0.1-v1.0.3,
  исправлено в v1.0.4.
- Схема: https://static.modelcontextprotocol.io/schemas/2025-12-11/server.schema.json
- Версия в `server.json` перезаписывается из тега workflow'ом (шаг Set version).
- **`description` — максимум 100 символов** (официальный registry, 422-ошибка валидации;
  поймано на v1.0.0, исправлено в v1.0.1). Длинное описание — только в smithery.yaml, там лимит больше.

## PR в punkpeye/awesome-mcp-servers (ручной шаг)

Вставить в соответствующий раздел README (лучше — в подраздел про portfolio/агентов):

```markdown
### MSPortfolio — MCP-Native Engineering Portfolio

Live MCP server for Mikhail (ManSio)'s engineering portfolio: projects with decision
logs, engineering principles, stack-fit analysis, architecture failure simulation and
the full lab (experiments, diary, known issues) — one source of truth. Streamable HTTP,
hosted on Cloudflare Workers, no auth.

- <https://github.com/ManSio/MSPortfolio>
- <https://msp-portfolio.mansio-dev.workers.dev/mcp>
```

После мержа Glama подхватит листинг автоматически (автокравл).

## mcp.so / PulseMCP (опционально)

- mcp.so: GitHub issue или веб-форма — указать URL endpoint + репо.
- PulseMCP: веб-форма.
- MCPMarket: веб-форма / OAuth.

## Критерий Done (D1)

Сервер виден в registry.modelcontextprotocol.io И в Smithery И в Glama
(после мержа awesome-mcp PR). Статус обновляется в `docs/research-mcp-portfolio-benchmarks-2026-08-15.md` §3 D1.
