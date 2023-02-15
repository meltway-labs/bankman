# Getting started

To run the project locally:
```shell
npm i
npm start
```

You also need to run the database migrations:
```shell
for file in ./migrations/*.sql; do
    npx wrangler d1 execute bankmandb --local --file="$file"
done
```

The project runs every hour by default, but if you want to manually trigger an event, run the following:
```shell
curl "http://localhost:8787/cdn-cgi/mf/scheduled"
```
