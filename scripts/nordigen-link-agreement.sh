#!/usr/bin/env bash

set -euf -o pipefail

usage() {
    echo -e -n "Usage:\n$0 <agreement-id>\n"
    echo ""
    echo "This script links an agreement with the current account."
    echo "Institution ID is taken from agreement object."
    echo ""
    echo "Notes:"
    echo "- We set reference field with \"124151\" unless provided by env var REFERENCE."
    echo "- User language is assumed to be EN"
    echo "- After successful authorization you'll be redirected to http://localhost:3000/ as this allows you to listen on that port if you need to."
    echo "- To change any of the fields mentioned above, our suggestion is to edit this very script."
    echo ""
    echo "Returns an object with a field 'link' that you must use to authorize the agreement on your bank."
}

if [ $# -lt 1 ]
then
    usage
    exit 1
fi

source ./scripts/common.sh

export $(xargs < .dev.vars)

TOKEN=$(get_nordigen_token $NORDIGEN_SECRET_ID $NORDIGEN_SECRET_KEY)

INSTITUTION_ID=$(get_agreements $TOKEN | jq '.results[] | select(.id == "'$1'") | .institution_id' -r)

curl -X POST "https://bankaccountdata.gocardless.com/api/v2/requisitions/" \
  -H  "accept: application/json" -H  "Content-Type: application/json" \
  -H  "Authorization: Bearer ${TOKEN}" \
  -d "{\"redirect\": \"http://localhost:3000\",
       \"institution_id\": \"$INSTITUTION_ID\",
       \"reference\": \"${REFERENCE:=124152}\",
       \"user_language\":\"EN\" }" | \
    jq .