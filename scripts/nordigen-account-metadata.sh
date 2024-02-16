#!/usr/bin/env bash

set -euf -o pipefail

usage() {
    echo -e -n "Usage:\n$0\n"
    echo ""
    echo "This script returns the nordigen account metadata."
    echo "Refer to https://nordigen.com/en/docs/account-information/integration/parameters-and-responses/#/accounts/retrieve%20account%20metadata for more details."
}

if [ $# -ne 0 ]
then
    usage
    exit 1
fi

source ./scripts/common.sh

export $(xargs < .dev.vars)

TOKEN=$(get_nordigen_token $NORDIGEN_SECRET_ID $NORDIGEN_SECRET_KEY)

curl -v -L -X GET "https://bankaccountdata.gocardless.com/api/v2/accounts/$NORDIGEN_ACCOUNT_ID/" \
  -H  "accept: application/json" \
  -H  "Authorization: Bearer ${TOKEN}" | \
  jq .