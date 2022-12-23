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
	NORDIGEN_AGREEMENT_ID: string;
	NOTIFY_PATTERN: string;
	DISCORD_URL: string;
	KV: KVNamespace;
	DB: D1Database;
}

// one day in milliseconds
const ONE_DAY_MS = 1000 * 60 * 60 * 24;
// days before today to fetch transactions from
const DAYS_TO_FETCH = 2;
// notify expiration once a day under X days
const NOTIFY_EXPIRATION_DAYS = 7;
// key in KV to store date when we last notified agreement expiration
const NOTIFY_EXPIRATION_KEY = "agreement-expiration-notified";
// Nordigen API host
const NORDIGEN_HOST = "https://ob.nordigen.com"

// checks in KV if we notified agreement expiration today
async function checkNotifiedToday(kv: KVNamespace): Promise<boolean> {
	const today = new Date().toISOString().split("T")[0];
	const notifiedToday = await kv.get(NOTIFY_EXPIRATION_KEY);
	return notifiedToday === today;
}

// mark that we have notified agreement expiration today
async function markNotifiedToday(kv: KVNamespace): Promise<void> {
	const today = new Date().toISOString().split("T")[0];
	await kv.put(NOTIFY_EXPIRATION_KEY, today);
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

async function fetchNordigenToken(
	secretId: string,
	secretKey: string,
): Promise<string> {
	const resp = await fetch(NORDIGEN_HOST + "/api/v2/token/new/", {
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

	const url = NORDIGEN_HOST + `/api/v2/accounts/${accountId}/transactions/?` + params;

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

// returns number of days until expiration
async function fetchNordigenAgreementExpiration(
	token: string,
	id?: string,
): Promise<number> {
	const byId = id && id !== "";

	const url = byId ?
		NORDIGEN_HOST + `/api/v2/agreements/enduser/${id}/` :
		NORDIGEN_HOST + `/api/v2/agreements/enduser/?limit=1`;

	const resp = await fetch(url, {
		headers: {
			"Accept": "application/json",
			"Content-Type": "application/json",
			"Authorization": "Bearer " + token
		}
	});

	type Agreement = {
		accepted: string;
		access_valid_for_days: number;
	};

	let agreement: Agreement;

	if (byId) {
		agreement = await resp.json<Agreement>();
	} else {
		agreement = await resp.json<{ results: Agreement[] }>().then(
			data => data.results[0]
		);
	}

	const expiryDate = (new Date(agreement.accepted)).getTime() + ONE_DAY_MS * agreement.access_valid_for_days;

	return (expiryDate - Date.now()) / ONE_DAY_MS
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

function generateTransactionNotification(
	pattern: string,
	tx: BankTransaction,
): string {
	return `
	Pattern '${pattern}' matched.
	ID: ${tx.transactionId}
	Booking Date: ${tx.bookingDate}
	Value Date: ${tx.valueDate}
	Description: ${tx.remittanceInformationUnstructured}
	Amount: ${tx.transactionAmount.amount} ${tx.transactionAmount.currency}
	`;
}

async function notifyDiscord(
	discordUrl: string,
	message: string,
) {
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
	const token = await fetchNordigenToken(env.NORDIGEN_SECRET_ID, env.NORDIGEN_SECRET_KEY);

	// check agreement expiration and notify if needed
	const expirationDays = await fetchNordigenAgreementExpiration(token, env.NORDIGEN_AGREEMENT_ID);
	if (expirationDays <= NOTIFY_EXPIRATION_DAYS) {
		const hasNotifiedToday = await checkNotifiedToday(env.KV);
		if (!hasNotifiedToday) {
			const message = `End user agreement expires in ${expirationDays} days.`;
			await notifyDiscord(env.DISCORD_URL, message);
			await markNotifiedToday(env.KV);
		}
	}

	// prepare to get transactions
	const dateFrom = new Date(Date.now() - DAYS_TO_FETCH * ONE_DAY_MS).toISOString().split("T")[0]; // X days ago
	const dateTo = new Date(Date.now()).toISOString().split("T")[0]; // today

	const results = await fetchNordigenTransactions(token, env.NORDIGEN_ACCOUNT_ID, dateFrom, dateTo);

	console.log("booked", results.transactions.booked);
	console.log("pending", results.transactions.pending);

	// store transactions in DB
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
		await notifyDiscord(
			env.DISCORD_URL,
			generateTransactionNotification(env.NOTIFY_PATTERN, tx),
		);
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
	async fetch(
		request: RequestInit,
		env: Env,
		context: ExecutionContext,
	): Promise<Response> {
		await execute(env);
		return Response.json({ status: "ok" })
	}
};
