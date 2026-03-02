# Supabase Custom SMTP Setup

This guide configures custom SMTP so you can:
- **Bypass** Supabase's 2 emails/hour rate limit
- **Test** the magic link flow immediately
- **Prepare for production** (proper deliverability, branding)

## Option 1: Resend (Recommended)

Resend has a generous free tier (3,000 emails/month) and works well with Supabase.

### Step 1: Create Resend account

1. Go to [resend.com](https://resend.com) and sign up
2. Verify your email
3. Add and verify your domain (or use their sandbox domain for testing)

### Step 2: Get API key

1. Resend Dashboard → API Keys → Create API Key
2. Copy the key (starts with `re_`)

### Step 3: Configure Supabase

1. Supabase Dashboard → **Project Settings** (gear icon)
2. **Authentication** → **SMTP Settings**
3. Enable **Custom SMTP**
4. Enter:

| Field | Value |
|-------|-------|
| Sender email | `noreply@yourdomain.com` (or `onboarding@resend.dev` for sandbox) |
| Sender name | `WorkflowFM` |
| Host | `smtp.resend.com` |
| Port | `465` (SSL) or `587` (TLS) |
| Username | `resend` |
| Password | Your Resend API key |

5. Click **Save**

### Step 4: Verify

Send a magic link from your app. It should arrive within seconds.

---

## Option 2: SendGrid

1. [SendGrid](https://sendgrid.com) → sign up
2. Create API key (Settings → API Keys)
3. Supabase SMTP:
   - Host: `smtp.sendgrid.net`
   - Port: `587`
   - Username: `apikey`
   - Password: Your SendGrid API key

---

## Option 3: Gmail (Dev only – not for production)

1. Google Account → Security → 2-Step Verification (enable)
2. App passwords → Generate new app password
3. Supabase SMTP:
   - Host: `smtp.gmail.com`
   - Port: `587`
   - Username: Your Gmail address
   - Password: The 16-char app password

**Note:** Gmail has daily limits (~500/day) and isn't suitable for production.

---

## After Setup

1. Go to `http://localhost:3000/test-school/sign-in`
2. Enter your email
3. Check inbox (and spam folder first time)
4. Click magic link
5. You should land on `/test-school/engineer` (not redirect to sign-in)

If you still get redirected to sign-in after clicking the magic link, the issue is in the callback (createBrowserClient cookie sync) – not email delivery.

---

## Production Checklist

- [ ] Custom domain verified with your SMTP provider
- [ ] Sender address uses your domain (e.g. `noreply@workflowfm.com`)
- [ ] SPF and DKIM configured for deliverability
- [ ] Remove sign-in-password route and API before production
