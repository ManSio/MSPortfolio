#!/usr/bin/env bash
# Shared helpers for the smoke job in .github/workflows/deploy.yml.
#
# Why this file exists: run 36464841236 went red on a healthy deploy.
# `Check MCP articles freshness` failed with
#   curl: (35) Recv failure: Connection reset by peer
# while the deploy job succeeded, the site was published and the MCP
# endpoint answered ok:true. A guard that fails on a healthy system trains
# you to ignore the guard, so this retries the transport-level blips.
#
# Why NOT `curl --retry`:
#   Measured against a local server (curl 8.21), `--retry 3` does NOT retry
#   a connection reset at all — 1 request, exit 52. It only retries
#   HTTP-level transient statuses (5xx: 4 requests). So the flag alone is a
#   no-op for the exact failure we hit.
#   `--retry-all-errors` does recover (3 requests, exit 0) but also re-issues
#   a 403 four times before failing, which masks and delays the real
#   regression this job exists to catch (see the KI-006 guard).
#
# So: retry only on curl's transport exit codes, and never on an HTTP error.
# With `--fail`, an HTTP error is exit 22 and is passed straight through.

# Transport-level curl exit codes worth retrying:
#   7  couldn't connect      35 SSL connect error
#   28 operation timed out   52 got nothing from server
#   55 send error            56 receive error
# Everything else (notably 22 = HTTP error under -f) is returned as-is.
retry_transport() {
  local max=3 attempt=1 rc=0 tmp
  tmp="$(mktemp)"

  while :; do
    # `if` keeps errexit intact for the caller: a failing command inside an
    # `if` condition is exempt, so this helper cannot kill a step that
    # opted into `set -e`.
    if "$@" >"$tmp" 2>/dev/null; then
      # Emit only the successful attempt's output. Pipelining a bare curl
      # would concatenate the partial body of a failed attempt with the
      # good one and corrupt the JSON the callers parse.
      cat "$tmp"
      rm -f "$tmp"
      return 0
    else
      rc=$?
    fi

    case "$rc" in
      7 | 28 | 35 | 52 | 55 | 56)
        if [ "$attempt" -ge "$max" ]; then
          rm -f "$tmp"
          return "$rc"
        fi
        echo "::warning::transport failure (curl exit $rc) from $1 — retry $attempt/$((max - 1))" >&2
        sleep $((attempt * 2))
        attempt=$((attempt + 1))
        ;;
      *)
        # HTTP error or anything else: fail immediately, no retry.
        rm -f "$tmp"
        return "$rc"
        ;;
    esac
  done
}
