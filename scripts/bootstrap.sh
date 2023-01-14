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

if ! npm exec --no -- wrangler --version &> /dev/null
then
    # shellcheck disable=SC2016
    print_error "wrangler could not be found. Did you run \`npm install\` ?"
    print_error "Exiting."
    exit 1
fi

cp wrangler.toml.template wrangler.toml
print_info "> Creating KV namespace"
npx wrangler kv:namespace create "KV"
# shellcheck disable=SC2034
KV_ID=$(npx wrangler kv:namespace list | jq -r '.[] | select(.title == "bankman-KV") | .id')
export KV_ID

print_info "> Storing notify patterns in KV"
npx wrangler kv:key --namespace-id $KV_ID put 'transaction-matchers' "$(cat .notify-patterns.json | jq -c .)"

print_info "> Creating D1 database"
npx wrangler d1 create bankmandb
# shellcheck disable=SC2034
DATABASE_ID=$(npx wrangler d1 list | grep bankman | awk '{print $2}')
export DATABASE_ID

print_info "> Creating wrangler.toml"
envsubst < wrangler.toml.template > wrangler.toml

print_info "> Waiting for DB to be ready"
sleep 10

print_info "> Applying DB migrations"
# Remove hacky way of disabling prompt after wrangler has a -y, --skip-confirmation flag
CF_PAGES=1 npx wrangler d1 migrations apply bankmandb 2> /dev/null

print_info "> Publishing Cloudflare Worker"
wrangler publish --name bankman

print_info "> Updating secrets"
sed 's/"//g' .dev.vars | sed "s/^/\"/g" | sed "s/=/\":\"/g" | sed "s/$/\",/g" | tr -d '\n' | sed "s/^/{/" | tr -s ',' | sed "s/,$/}/" > tmp
wrangler secret:bulk tmp
rm -f tmp

print_success "> Bankman deployed"
