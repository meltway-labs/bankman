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

check_wrangler() {
    if ! npm exec --no -- wrangler --version &> /dev/null
    then
        # shellcheck disable=SC2016
        print_error "wrangler could not be found. Did you run \`npm install\` ?"
        print_error "Exiting."
        exit 1
    fi
}

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

get_nordigen_token() {
    curl -X POST "https://bankaccountdata.gocardless.com/api/v2/token/new/" \
  -H "accept: application/json" \
  -H  "Content-Type: application/json" \
  -d "{\"secret_id\":\"$1\", \"secret_key\":\"$2\"}" | \
  jq .access -r
}

get_agreements() {
    curl -X GET "https://bankaccountdata.gocardless.com/api/v2/agreements/enduser/" \
  -H "accept: application/json" \
  -H "Content-Type: application/json" \
  -H  "Authorization: Bearer $1" | \
  jq .
}