# Getting started

1. Create a `.env` file in the root of the repository with the Cloudflare API Token:
    ```
    CLOUDFLARE_API_TOKEN=<token>
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

4. Run the project locally:
    ```shell
    npm start
    ```

5. The project runs every minute, but if you want to manually trigger an event, run the following:
    ```shell
    curl "http://localhost:8787/cdn-cgi/mf/scheduled"
    ```
