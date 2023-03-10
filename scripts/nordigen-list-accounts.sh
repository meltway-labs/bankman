#!/usr/bin/env bash

set -xeuf -o pipefail

usage() {
    echo -e -n "Usage:\n$0 <requisition-id>\n"
    echo ""
    echo "This script lists accounts you've linked with Nordigen."
    echo "The requisition id is obtained from the link account procedure. More details in scripts/nordigen-link-account.sh."
    echo "Refer to https://nordigen.com/en/account_information_documenation/
    integration/quickstart_guide/ for more details."
}

if [ $# -lt 1 ]
then
    usage
    exit 1
fi

source ./scripts/common.sh

export $(xargs < .dev.vars)

TOKEN=$(get_nordigen_token $NORDIGEN_SECRET_ID $NORDIGEN_SECRET_KEY)

curl -v -L -X GET "https://ob.nordigen.com/api/v2/requisitions/$1" \
  -H  "accept: application/json" \
  -H  "Authorization: Bearer ${TOKEN}" | \
  jq .