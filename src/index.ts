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

const nordigenNewToken = "/api/v2/token/new/"

async function fetchNordigenToken(secretId: string, secretKey: string) {
	const resp = await fetch(nordigenHost + nordigenNewToken, {
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

export default {
	async scheduled(
		controller: ScheduledController,
		env: Env & { NORDIGEN_SECRET_ID: string, NORDIGEN_SECRET_KEY: string },
		ctx: ExecutionContext
	): Promise<void> {
		const token = await fetchNordigenToken(env.NORDIGEN_SECRET_ID, env.NORDIGEN_SECRET_KEY);

		console.log(`Token`, token);
	},
};
