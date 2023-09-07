# $ bankman

A cron job running serverless on Cloudflare Workers.

This project uses Nordigen to connect to a bank account and searches for a specific transaction regex, alerting on Discord when this happens.

## Pre-Requisites
#### 1. Cloudflare Account
This project runs on Cloudflare Workers. You need a Cloudflare API token.

Use the `Edit Cloudflare Workers` template and add a new rule:
```
Account | D1 | Edit
```

#### 2. Nordigen Account
Nordigen connects to your Open Banking-compatible bank account.

Sign up and follow the quickstart guide: https://nordigen.com/en/account_information_documenation/integration/quickstart_guide/

Save the account ID from step 5, you will need it later.

#### 3. Discord Webhook
In order to send notifications, we currently only support Discord Webhooks.

## Getting started

1. Create a `.env` file in the root of the repository with the Cloudflare API Token and Account ID:
    ```
    CLOUDFLARE_API_TOKEN=<token>
    CLOUDFLARE_ACCOUNT_ID=<account_id>
    ```

2. Create a `.dev.vars` file in the root of the repository with the following content:
    ```
    NORDIGEN_SECRET_ID=<secret>
    NORDIGEN_SECRET_KEY=<secret>
    NORDIGEN_ACCOUNT_ID=<account_id>
    DISCORD_URL=<discord-webhook-url>
    ```

3. Create a `.notify-patterns.json` file with the transaction patterns to notify:
    ```json
    [
        {
            "name": "salary",
            "pattern": "Weyland-Yutani"
        },
        {
            "name": "mortgage",
            "pattern": "Goliath National Bank"
        }
    ]
    ```
    Patterns are tested against the transaction description.
    If you need to update them later, edit the file above and run `./scripts/put-patterns.sh`.

4. Install the dependencies:
    ```shell
    npm i
    ```

5. Run the bootstrap script to create all the resources and deploy:
    ```shell
    npm run bootstrap
    ```

## Renewing end user agreement

By default, every 90 days the end user agreement must be renewed.

7 days before end user agreement expires, bankman sends a notification to Discord which looks like this:

> End user agreement expires in 7 days.

Until renewal, a similar notification is sent every day.

Bankman comes with a few simple scripts to ease the renewal process.
Make sure you've followed the instructions in [Pre-requisites](pre-requisites) and [Getting Started](getting-started).

1. Pick the institution ID you want to use for the agreement, you can list them with (use your country code):
    ```shell
    ./scripts/nordigen-list-institutions.sh <country-code>
    ```

2. Create a new user agreement with the institution ID:
    ```shell
    ./scripts/nordigen-create-agreement.sh <institution-id>
    ```

3. Use the `id` field in the result of the script above as the `<agreement-id>` that follows:
    ```shell
    REFERENCE=$(date +%Y%m%d) ./scripts/nordigen-link-agreement.sh <agreement-id>
    ```

The `REFERENCE` can be any value as long as it is different from the one used for last time you've linked an agreement.

If by any chance you're missing the `<agreement-id>`, you can list your account's agreements with:

```shell
./scripts/nordigen-list-agreements.sh
```

4. Click the link returned in the response object under the field `link` and follow the instructions to approve the new agreement for your bank account.

If by any chance you lose the response object with the link, you can list your account's requisitions with:

```shell
./scripts/nordigen-list-requisitions.sh
```
