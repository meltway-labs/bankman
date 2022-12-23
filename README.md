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
    NOTIFY_PATTERN=<pattern>
    DISCORD_URL=<discord-webhook-url>
    ```

3. Install the dependencies:
    ```shell
    npm i
    ```

4. Run the bootstrap script to create all the resources and deploy:
    ```shell
    npm run bootstrap
    ```
