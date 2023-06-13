#!/usr/bin/env bash

set -euf -o pipefail

usage() {
    echo -e -n "Usage:\n$0\n"
    echo ""
    echo "This script returns the nordigen account agreements."
}

if [ $# -ne 0 ]
then
    usage
    exit 1
fi

source ./scripts/common.sh

export $(xargs < .dev.vars)

TOKEN=$(get_nordigen_token $NORDIGEN_SECRET_ID $NORDIGEN_SECRET_KEY)

get_agreements $TOKEN
