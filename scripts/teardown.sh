#!/bin/bash

set -euf -o pipefail

source ./scripts/common.sh

check_command jq
check_command npx
check_command envsubst
check_command sed
check_command tr
check_command grep
check_command awk

check_wrangler

KV_ID=$(npx wrangler kv:namespace list | jq -r '.[] | select(.title == "bankman-KV") | .id')

if [ -z "$KV_ID" ]; then
    print_info "> Skipping KV namespace deletion, no bankman-KV found"
else
    npx wrangler kv:namespace delete --namespace-id "$KV_ID"
    print_success "> Deleted KB namespace bankman-KV ($KV_ID)"
fi

if ! npx wrangler d1 list | grep -q bankmandb ; then
    print_info "> Skipping D1 database deletion, no bankmandb database found"
else
    npx wrangler d1 delete bankmandb
    print_success "> Deleted D1 database bankmandb"
fi

npx wrangler delete bankman
