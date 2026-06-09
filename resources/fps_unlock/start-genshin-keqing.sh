#!/usr/bin/env bash
set -euo pipefail

BASE_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
STATE_DIR="${SOLACE_GENSHIN_FPS_STATE_DIR:-/tmp/solace-genshin-fps-unlock}"
LOG_FILE="$STATE_DIR/keqing_unlock.log"
PID_FILE="$STATE_DIR/keqing_unlock.pid"
UNLOCKER="${SOLACE_GENSHIN_FPS_UNLOCKER:-$BASE_DIR/keqing_unlock.exe}"
WINEPREFIX_DIR="${SOLACE_GENSHIN_FPS_WINEPREFIX:-${WINEPREFIX:-}}"
WINE_BIN="${SOLACE_GENSHIN_FPS_WINE_BIN:-wine64}"
GAME_ID="hk4e_global"
TARGET_FPS="${1:-200}"
REFRESH_DELAY="${REFRESH_DELAY:-1000}"
INIT_DELAY="${INIT_DELAY:-1000}"
GAME_PATH="${SOLACE_GENSHIN_FPS_GAME_PATH:-}"
ATTACH_ONLY="${SOLACE_GENSHIN_FPS_ATTACH_ONLY:-${NEKOMIMI_GENSHIN_FPS_ATTACH_ONLY:-0}}"
WAIT_TIMEOUT_MS="${SOLACE_GENSHIN_FPS_WAIT_TIMEOUT_MS:-${NEKOMIMI_GENSHIN_FPS_WAIT_TIMEOUT_MS:-30000}}"
WAIT_INTERVAL_MS="${SOLACE_GENSHIN_FPS_WAIT_INTERVAL_MS:-${NEKOMIMI_GENSHIN_FPS_WAIT_INTERVAL_MS:-250}}"

is_running() {
  local pid="$1"
  if [[ -z "$pid" ]] || ! kill -0 "$pid" 2>/dev/null; then
    return 1
  fi

  local cmdline
  cmdline="$(tr '\0' ' ' </proc/"$pid"/cmdline 2>/dev/null || true)"
  [[ "$cmdline" == *"keqing_unlock.exe"* && "$cmdline" == *"$GAME_ID"* ]]
}

game_is_running() {
  ps -eo comm=,args= | rg -q '^GenshinImpact[^[:space:]]*[[:space:]].*GenshinImpact\.exe' || return 1
}

mkdir -p "$STATE_DIR"

if [[ ! -f "$UNLOCKER" ]]; then
  echo "[solace] Missing Genshin FPS unlocker binary: $UNLOCKER" >>"$LOG_FILE"
  exit 1
fi

if [[ -z "$WINEPREFIX_DIR" ]]; then
  echo "[solace] Missing Genshin FPS unlocker WINEPREFIX" >>"$LOG_FILE"
  exit 1
fi

if [[ -z "$GAME_PATH" ]]; then
  echo "[solace] Missing Genshin executable path for FPS unlocker" >>"$LOG_FILE"
  exit 1
fi

if [[ -f "$PID_FILE" ]]; then
  existing_pid="$(cat "$PID_FILE" 2>/dev/null || true)"
  if is_running "$existing_pid"; then
    exit 0
  fi
fi

if [[ "$ATTACH_ONLY" == "1" ]]; then
  elapsed_ms=0
  while (( elapsed_ms < WAIT_TIMEOUT_MS )); do
    if game_is_running; then
      break
    fi

    sleep "$(awk "BEGIN { printf \"%.3f\", ${WAIT_INTERVAL_MS}/1000 }")"
    ((elapsed_ms += WAIT_INTERVAL_MS))
  done

  if ! game_is_running; then
    echo "[solace] Skipping keqing_unlock attach-only launch because GenshinImpact.exe did not appear within ${WAIT_TIMEOUT_MS}ms" >>"$LOG_FILE"
    exit 0
  fi
fi

nohup env WINEPREFIX="$WINEPREFIX_DIR" "$WINE_BIN" "$UNLOCKER" run "$GAME_ID" "$TARGET_FPS" "$REFRESH_DELAY" "$INIT_DELAY" "$GAME_PATH" >/dev/null 2>>"$LOG_FILE" &
echo "$!" >"$PID_FILE"
exit 0
