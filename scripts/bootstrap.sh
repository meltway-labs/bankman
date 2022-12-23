#!/bin/bash

set -euf -o pipefail

NO_D1_WARNING=true
export NO_D1_WARNING

export RED="\033[1;31m"
export GREEN="\033[1;32m"
export YELLOW="\033[1;33m"
export BLUE="\033[1;34m"
export PURPLE="\033[1;35m"
export CYAN="\033[1;36m"
export GREY="\033[0;37m"
export RESET="\033[m"

check_command() {
    if ! command -v "$1" &> /dev/null
    then
        echo "$1 could not be found."
        echo "Exiting."
        exit 1
    fi
}

print_error() {
    echo -e "${RED}$1${RESET}"
}

print_info() {
    echo -e "${CYAN}$1${RESET}"
}
print_success() {
    echo -e "${GREEN}$1${RESET}"
}

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
