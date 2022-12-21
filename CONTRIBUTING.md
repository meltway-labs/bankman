# Getting started

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
    ```

3. Install the dependencies:
    ```shell
    npm i
    ```

4. Create a `wrangler.toml` from the template:
    ```shell
    cp wrangler.toml.template wrangler.toml
    ```

5. Create a D1 for bankman:
    ```shell
    wrangler d1 create bankmandb
    ```

6. Copy the database ID from previous command to your wrangler.toml:
    ```shell
    sed -i wrangler.toml "s/DATABASE_ID/$(wrangler d1 list | grep bankman | awk '{print $2}')/"
    ```

7. Run database migrations:
    ```shell
    wrangler d1 migrations apply bankman
    ```

8. Push secrets for this worker:
    ```shell
    wrangler secret:bulk <(cat .dev.vars | sed "s/^/\"/g" | sed "s/=/\":\"/g" | sed "s/$/\",/g" | tr -d '\n' | sed "s/^/{/" | tr -s ',' | sed "s/,$/}/")
    ```

9. Run the project locally:
    ```shell
    npm start
    ```

10. The project runs every minute, but if you want to manually trigger an event, run the following:
    ```shell
    curl "http://localhost:8787/cdn-cgi/mf/scheduled"
    ```