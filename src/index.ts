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
	NOTIFY_PATTERN: string;
	DISCORD_URL: string;
	DB: D1Database;
}

type BankTransaction = {
	transactionId: string;
	bookingDate: string;
	valueDate: string;
	remittanceInformationUnstructured: string;
	transactionAmount: {
		amount: string;
		currency: string;
	}
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

	return await db.batch(statements);
}

async function checkNotifiedTransactions(
	db: D1Database,
	transactions: BankTransaction[],
): Promise<D1Result[]> {
	const statements = transactions.map(transaction => db.prepare(
		`
			SELECT id from transaction_notifications
			WHERE id = ?
		`
	).bind(transaction.transactionId));

	return await db.batch(statements);
}

async function storeNotifiedTransactions(
	db: D1Database,
	transactions: BankTransaction[],
): Promise<D1Result[]> {
	const statements = transactions.map(transaction => db.prepare(
		`
			INSERT INTO transaction_notifications
			(id, created_at)
			VALUES
			(?, ?)
			ON CONFLICT (id) DO NOTHING;
		`
	).bind(transaction.transactionId, new Date(Date.now()).toISOString()));

	return await db.batch(statements);
}

async function notifyTransaction(
	discordUrl: string,
	pattern: string,
	tx: BankTransaction,
) {
	const message = `
	Pattern '${pattern}' matched.
	ID: ${tx.transactionId}
	Booking Date: ${tx.bookingDate}
	Value Date: ${tx.valueDate}
	Description: ${tx.remittanceInformationUnstructured}
	Amount: ${tx.transactionAmount.amount} ${tx.transactionAmount.currency}
	`;

	await fetch(discordUrl, {
		method: "POST",
		headers: {
			"Content-Type": "application/json",
		},
		body: JSON.stringify({
			content: message,
		}),
	});
}

async function execute(env: Env) {
	try {
		await doExecute(env);
	} catch (e) {
		console.error("error", e);
	}
}

async function doExecute(env: Env) {
	const access = await fetchNordigenToken(env.NORDIGEN_SECRET_ID, env.NORDIGEN_SECRET_KEY);

	// one day in milliseconds
	const oneDay =  1000 * 60 * 60 * 24;

	const dateFrom = new Date(Date.now() - 2 * oneDay).toISOString().substring(0, 10); // X days ago
	const dateTo = new Date(Date.now()).toISOString().substring(0, 10); // today

	const results = await fetchNordigenTransactions(access, env.NORDIGEN_ACCOUNT_ID, dateFrom, dateTo);

	console.log("booked", results.transactions.booked);
	console.log("pending", results.transactions.pending);

	await storeBankTransactions(env.DB, results.transactions.booked);

	const re = RegExp(env.NOTIFY_PATTERN);

	// list transactions with matching pattern
	const matched = results.transactions.booked.filter(
		(transaction) => re.test(transaction.remittanceInformationUnstructured)
	);

	if (matched.length === 0) {
		return;
	}

	console.log("matched", matched);

	// list transactions which haven't yet been notified
	const checkNotifiedResults = await checkNotifiedTransactions(env.DB, matched);

	const toNotify = matched.filter((_, index) => {
		const results = checkNotifiedResults[index].results;
		return !results || results.length === 0
	});

	if (toNotify.length === 0) {
		return;
	}

	console.log("to notify", toNotify);

	// notify transactions
	matched.forEach(async tx => {
		await notifyTransaction(env.DISCORD_URL, env.NOTIFY_PATTERN, tx);
	});

	await storeNotifiedTransactions(env.DB, toNotify);
}

export default {
	async scheduled(
		controller: ScheduledController,
		env: Env,
		ctx: ExecutionContext
	): Promise<void> {
		await execute(env);
	},

	// Uncomment lines below to allow invoking with fetch.
	// async fetch(
	// 	request: RequestInit,
	// 	env: Env,
	// 	context: ExecutionContext,
	// ): Promise<Response> {
	// 	await execute(env);
	// 	return Response.json({status: "ok"})
	// }
};
