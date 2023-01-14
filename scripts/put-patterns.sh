#!/bin/bash

set -euf -o pipefail

source scripts/common.sh

check_command jq
check_command npx

if ! npm exec --no -- wrangler --version &> /dev/null
then
    # shellcheck disable=SC2016
    print_error "wrangler could not be found. Did you run \`npm install\` ?"
    print_error "Exiting."
    exit 1
fi

# shellcheck disable=SC2034
KV_ID=$(npx wrangler kv:namespace list | jq -r '.[] | select(.title == "bankman-KV") | .id')

npx wrangler kv:key --namespace-id $KV_ID put 'transaction-matchers' "$(cat .notify-patterns.json | jq -c .)"