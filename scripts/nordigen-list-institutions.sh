#!/usr/bin/env bash

set -euf -o pipefail

usage() {
    echo -e -n "Usage:\n$0 <country-code>\n"
    echo ""
    echo "This script list banks available in Nordigen given a coutry ISO Code."
    echo "Only id and name fields are printed."
    echo "Refer to https://nordigen.com/en/account_information_documenation/
    integration/quickstart_guide/ for more details."
}

if [ $# -ne 1 ]
then
    usage
    exit 1
fi

source ./scripts/common.sh

export $(xargs < .dev.vars)

TOKEN=$(get_nordigen_token $NORDIGEN_SECRET_ID $NORDIGEN_SECRET_KEY)

curl -X GET "https://ob.nordigen.com/api/v2/institutions/?country=$1" \
  -H  "accept: application/json" \
  -H  "Authorization: Bearer ${TOKEN}" | \
  jq '.[] | {id:.id,name:.name}'
