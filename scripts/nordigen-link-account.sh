#!/usr/bin/env bash

set -euf -o pipefail

usage() {
    echo -e -n "Usage:\n$0 <instituition-id> [reference]\n"
    echo ""
    echo "This script follows the quickstart at https://nordigen.com/en/account_information_documenation/integration/quickstart_guide/."
    echo "You can use the script at scripts/nordigen-list-institutions.sh to list the institutions available in your country."
    echo "Use the id returned by that script as argument for this one."
    echo ""
    echo "Notes:"
    echo "- No agreement is sent in the request (refer to quickstart link above for details)"
    echo "- We set reference field with \"124151\" unless provided by env var REFERENCE."
    echo "- User language is assumed to be EN"
    echo "- After successful authorization you'll be redirected to http://localhost:3000/ as this allows you to listen on that port if you need to."
    echo "- To change any of the fields mentioned above, our suggestion is to edit this very script."
    echo ""
    echo "Returns an object with a field 'link' that you must use to authorize your bank letting Nordigen access account transaction details."
}

if [ $# -lt 1 ]
then
    usage
    exit 1
fi

source ./scripts/common.sh

export $(xargs < .dev.vars)

TOKEN=$(get_nordigen_token $NORDIGEN_SECRET_ID $NORDIGEN_SECRET_KEY)

curl -X POST "https://bankaccountdata.gocardless.com/api/v2/requisitions/" \
  -H  "accept: application/json" -H  "Content-Type: application/json" \
  -H  "Authorization: Bearer ${TOKEN}" \
  -d "{\"redirect\": \"http://localhost:3000\",
       \"institution_id\": \"$1\",
       \"reference\": \"${REFERENCE:=124152}\",
       \"user_language\":\"EN\" }" | \
    jq .