# Auto-fill worker

Powers the **✨ Auto-fill from the web** button in `jakarta.html`. You type a place name
(or paste a Google Maps link) and the form fills in what the place sells, must-try, menu +
prices, price range, hours, address, and tips, plus the sites the info came from.

How it works: the page sends the name/link to this small Cloudflare Worker. The worker
expands Maps short links (`maps.app.goo.gl/…`) to get the place name, then asks Gemini to look
the place up with Google Search and answer in JSON. Your keys stay in the worker, never in the
public page.

Everything here runs on **free plans**, no credit card:

- **Cloudflare Workers Free**: 100,000 requests a day.
- **Gemini API free tier** (Google AI Studio): includes Google Search grounding, with a daily
  limit far above what two people need. If the quota runs out, the button says so; try again later.
  On the free tier Google may use what you send to improve its products. Here that's only place
  names and links.

## Setup (~10 minutes, one time)

### 1. Get a Gemini API key
1. Go to **aistudio.google.com** and sign in with a Google account.
2. Click **Get API key → Create API key**. Copy it.

### 2. Create the worker
1. Sign up at **dash.cloudflare.com** (free).
2. **Workers & Pages → Create → Create Worker** (the "Hello World" starter). Give it a
   name like `momo-autofill`, then **Deploy**.
3. Click **Edit code**, delete everything in `worker.js`, paste in the contents of
   [`worker.js`](worker.js) from this folder, and click **Deploy**.

**Connected to GitHub instead?** If you created the worker with **Import a repository**
(the dashboard shows **New deployment** instead of **Edit code**), you don't paste anything:
[`wrangler.jsonc`](../wrangler.jsonc) at the repo root tells Cloudflare to deploy
`worker/worker.js`, and every merge to `main` redeploys it. The worker must be named
`momo-salsa-philippines` (or change `name` in `wrangler.jsonc` to match).

### 3. Add the secrets
In the worker: **Settings → Variables and Secrets → Add**:

| Name | Type | Value |
|---|---|---|
| `GEMINI_API_KEY` | Secret | the key from step 1 |
| `PASSCODE` | Secret | any word you like, e.g. `momosalsa` |

Optional:

| Name | Value |
|---|---|
| `ALLOWED_ORIGIN` | Optional lock to specific sites, e.g. `https://salsabillayudha.github.io`. Leave it out and any site can call the worker; the passcode still guards it. |
| `GEMINI_MODEL` | Defaults to `gemini-3.8-flash`. If it's rate-limited or retired, the worker falls back to `gemini-flash-lite-latest`, then `gemini-flash-latest`. |

Click **Deploy** again after adding them.

### 4. Check it
Open the worker URL in your browser. You should see:

```
{"ok":true,"message":"Auto-fill worker is running","GEMINI_API_KEY":"set","PASSCODE":"set",...}
```

`MISSING` means that secret isn't saved yet (add it and deploy again). "Hello World!" or a
web page means `worker.js` isn't what's deployed there.

### 5. Connect the page
Copy the worker URL (looks like `https://momo-autofill.<you>.workers.dev`). Then either:

- **Easiest:** open `jakarta.html`, tap **＋ Add a place → ✨ Auto-fill**, and paste the URL and
  passcode when it asks. They're remembered in that browser. Momo does the same once on
  their phone.
- **Or** put the URL in `const AUTOFILL_URL = '';` in `jakarta.html`, so only the passcode is asked.

"Change auto-fill setup" under the button clears what that browser remembers.

## Troubleshooting
- **"Couldn't reach the auto-fill worker"** (Safari used to just say "Load failed"): open the
  worker URL. If it doesn't show "Auto-fill worker is running", redeploy `worker.js`. If it
  does, the URL saved in the page is probably off, so tap **Change auto-fill setup** and paste it again.
- **"…not like the auto-fill worker"**: something else is deployed at that URL.
- **An error that mentions the model**: set `GEMINI_MODEL` to a current free-tier Gemini model.

## Staying under the free limits
- If a model is rate-limited, the worker tries the next one (Flash-Lite has the roomiest free tier).
- A lookup is remembered on that phone for 30 days, so asking for the same place again costs nothing.
- For per-minute limits, the button counts down and retries once by itself. The daily limit resets
  around 14.00 WIB (midnight Pacific).

## Notes
- The passcode keeps strangers who find the page from using up your free quota.
- Results come from the web and can be out of date or incomplete. Fields the search couldn't
  support stay empty rather than being made up, and anything you already typed is never
  overwritten. Check before you save.
