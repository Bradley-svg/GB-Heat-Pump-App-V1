#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  husky_skip_init=1
  export husky_skip_init

  command_exists () {
    command -v "$1" >/dev/null 2>&1
  }

  resolve_repo_root () {
    if command_exists git; then
      git rev-parse --show-toplevel 2>/dev/null && return
    fi
    # Fall back to path relative to the hook helper script.
    (cd -- "$(dirname -- "$0")/../.." >/dev/null 2>&1 && pwd)
  }

  hook_name="$(basename "$0")"
  if [ "$HUSKY" = "0" ]; then
    exit 0
  fi

  if [ -n "$HUSKY_GIT_PARAMS" ]; then
    export GIT_PARAMS="$HUSKY_GIT_PARAMS"
  fi

  if command_exists node; then
    husky_root="$(resolve_repo_root)"
    if [ -z "$husky_root" ]; then
      husky_root="$(cd -- "$(dirname -- "$0")/../.." >/dev/null 2>&1 && pwd)"
    fi
    husky_bin="$husky_root/node_modules/husky/bin.js"
    if [ ! -f "$husky_bin" ]; then
      echo "husky - unable to locate $husky_bin" >&2
      exit 127
    fi
    node "$husky_bin" "$hook_name" "$@"
  else
    echo "husky - Node.js is required to run hooks"
    exit 127
  fi
fi
