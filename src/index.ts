/**
 * Welcome to Cloudflare Workers! This is your first scheduled worker.
 *
 * - Run `wrangler dev --local` in your terminal to start a development server
 * - Run `curl "http://localhost:8787/cdn-cgi/mf/scheduled"` to trigger the scheduled event
 * - Go back to the console to see what your worker has logged
 * - Update the Cron trigger in wrangler.toml (see https://developers.cloudflare.com/workers/wrangler/configuration/#triggers)
 * - Run `wrangler publish --name my-worker` to publish your worker
 *
 * Learn more at https://developers.cloudflare.com/workers/runtime-apis/scheduled-event/
 */

export interface Env {
	NORDIGEN_SECRET_ID: string;
	NORDIGEN_SECRET_KEY: string;
	NORDIGEN_ACCOUNT_ID: string;
	// Example binding to KV. Learn more at https://developers.cloudflare.com/workers/runtime-apis/kv/
	// MY_KV_NAMESPACE: KVNamespace;
	//
	// Example binding to Durable Object. Learn more at https://developers.cloudflare.com/workers/runtime-apis/durable-objects/
	// MY_DURABLE_OBJECT: DurableObjectNamespace;
	//
	// Example binding to R2. Learn more at https://developers.cloudflare.com/workers/runtime-apis/r2/
	// MY_BUCKET: R2Bucket;
}

const nordigenHost = "https://ob.nordigen.com"

async function fetchNordigenToken(secretId: string, secretKey: string) {
	const resp = await fetch(nordigenHost + "/api/v2/token/new/", {
		method: "POST",
		headers: {
			"Accept": "application/json",
			"Content-Type": "application/json"
		},
		body: JSON.stringify({
			"secret_id": secretId,
			"secret_key": secretKey,
		}),
	});

	return resp.json().then((data: any) => data.access);
}

async function fetchNordigenTransactions(
	token: string,
	accountId: string,
	dateFrom: string,
	dateTo: string,
) {
	const params = new URLSearchParams({
		date_from: dateFrom,
		date_to: dateTo,
	}).toString();

	const url = nordigenHost + `/api/v2/accounts/${accountId}/transactions/?` + params;

	const resp = await fetch(url, {
		method: "GET",
		headers: {
			"Accept": "application/json",
			"Content-Type": "application/json",
			"Authorization": "Bearer " + token
		},
	});

	return resp.json().then((data: any) => data);
}

export default {
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		const access = await fetchNordigenToken(env.NORDIGEN_SECRET_ID, env.NORDIGEN_SECRET_KEY);

		const dateFrom = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString().substring(0, 10);	// 24 hours ago
		const dateTo = new Date(Date.now()).toISOString().substring(0, 10); // today

		const transactions = await fetchNordigenTransactions(access, env.NORDIGEN_ACCOUNT_ID, dateFrom, dateTo);

		console.log(transactions);
	},
};
