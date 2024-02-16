#!/usr/bin/env bash

set -euf -o pipefail

usage() {
    echo -e -n "Usage:\n$0 <instituition-id>\n"
    echo ""
    echo "This script creates a new agreement with 90 days of expiration."
    echo "Requested scopes are balances, details and transactions."
}

if [ $# -ne 1 ]
then
    usage
    exit 1
fi

source ./scripts/common.sh

export $(xargs < .dev.vars)

TOKEN=$(get_nordigen_token $NORDIGEN_SECRET_ID $NORDIGEN_SECRET_KEY)

curl -X POST "https://bankaccountdata.gocardless.com/api/v2/agreements/enduser/" \
  -H  "accept: application/json" \
  -H  "Content-Type: application/json" \
  -H  "Authorization: Bearer ${TOKEN}" \
  -d "{\"institution_id\": \"$1\",
       \"max_historical_days\": \"90\",
       \"access_valid_for_days\": \"90\",
       \"access_scope\": [\"balances\", \"details\", \"transactions\"] }" | \
    jq .
