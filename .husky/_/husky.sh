#!/usr/bin/env sh
if [ -z "$husky_skip_init" ]; then
  husky_skip_init=1
  export husky_skip_init

  command_exists () {
    command -v "$1" >/dev/null 2>&1
  }

  hook_name="$(basename "$0")"
  if [ "$HUSKY" = "0" ]; then
    exit 0
  fi

  if [ -n "$HUSKY_GIT_PARAMS" ]; then
    export GIT_PARAMS="$HUSKY_GIT_PARAMS"
  fi

  if command_exists node; then
    node "$(dirname -- "$0")/../..//node_modules/husky/bin.js" "$hook_name" "$@"
  else
    echo "husky - Node.js is required to run hooks"
    exit 127
  fi
fi
