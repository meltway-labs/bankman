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
	DB: D1Database;
}

type BankTransaction = {
	transactionId: string;
	bookingDate: string;
	valueDate: string;
	remittanceInformationUnstructured: string;
}

type NordigenTransactions = {
	transactions: {
		booked: BankTransaction[];
		pending: BankTransaction[];
	}
}

const nordigenHost = "https://ob.nordigen.com"

async function fetchNordigenToken(
	secretId: string,
	secretKey: string,
): Promise<string> {
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
): Promise<NordigenTransactions> {
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

async function storeBankTransactions(
	db: D1Database,
	transactions: BankTransaction[],
) {
	const statements = transactions.map(transaction => db.prepare(
		`
			INSERT INTO bank_transactions
			(id, booking_date, value_date, blob)
			VALUES
			(?, ?, ?, ?)
			ON CONFLICT (id) DO NOTHING;
		`
	).bind(transaction.transactionId, transaction.bookingDate, transaction.valueDate, JSON.stringify(transaction)));

	const result = await db.batch(statements);

	console.log(result);
}

export default {
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		const access = await fetchNordigenToken(env.NORDIGEN_SECRET_ID, env.NORDIGEN_SECRET_KEY);

		// one day in milliseconds
		const oneDay =  1000 * 60 * 60 * 24;

		const dateFrom = new Date(Date.now() - 20 * oneDay).toISOString().substring(0, 10); // X days ago
		const dateTo = new Date(Date.now()).toISOString().substring(0, 10); // today

		const results = await fetchNordigenTransactions(access, env.NORDIGEN_ACCOUNT_ID, dateFrom, dateTo);

		console.log(results);
		console.log("booked", results.transactions.booked);
		console.log("pending", results.transactions.pending);

		await storeBankTransactions(env.DB, results.transactions.booked);
	},
};
