# Secure Auth Email Templates (Required for Production)

Invite and magic link flows use **server-side verification** (`token_hash` in query params) so tokens never appear in the URL hash. This requires custom Supabase email templates.

## Setup

1. Go to **Supabase Dashboard** → **Authentication** → **Email Templates**
2. Select **Invite user**
3. Replace the default link with the template below
4. Ensure **Site URL** (Auth → URL Configuration) matches your app base URL (e.g. `https://app.workflowfm.com`)

## Subject

```
You've been invited
```

## Body (HTML)

Replace the link in your template. The critical part is the `<a href="...">` — it must point to your app’s verify route with `token_hash` and `type` as query params (not the default Supabase ConfirmationURL):

```html
<h2>You've been invited</h2>

<p>You have been invited to join {{ .SiteURL }}.</p>

<p>
  <a
    href="{{ .SiteURL }}/{{ .Data.org_slug }}/auth/verify?token_hash={{ .TokenHash }}&type=invite"
    >Accept the invite</a
  >
</p>

<p>If the link doesn't work, copy and paste this URL into your browser:</p>
<p>
  {{ .SiteURL }}/{{ .Data.org_slug }}/auth/verify?token_hash={{ .TokenHash
  }}&type=invite
</p>
```

## Redirect URLs

Add these to **Auth** → **URL Configuration** → **Redirect URLs**:

- `http://localhost:3000/**/auth/verify` (development)
- `https://your-domain.com/**/auth/verify` (production)

## How it works

- Invite links go directly to your app (`/auth/verify?token_hash=...&type=invite`)
- The server verifies the token with Supabase (`verifyOtp`), sets the session in httpOnly cookies, and redirects
- Tokens are never exposed in the client or URL hash

---

## Magic Link (Engineer sign-in)

Required so magic links work cross-device without exposing tokens in the URL.

1. Go to **Authentication** → **Email Templates** → **Magic Link**
2. Replace the default link with the template below
3. `{{ .RedirectTo }}` is the `emailRedirectTo` we pass (e.g. `https://app.com/orgslug/auth/verify`)

### Subject

```
Your sign-in link
```

### Body (HTML)

```html
<h2>Sign in</h2>

<p>Click the link below to sign in:</p>

<p>
  <a href="{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink">Sign in</a>
</p>

<p>If the link doesn't work, copy and paste this URL into your browser:</p>
<p>{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=magiclink</p>
```

---

## Fallback

If custom templates are not configured, links use the default Supabase flow (tokens in hash). The `/auth/confirm` page handles that, but it is less secure. **Use the custom templates above for production.**
