/**
 * Cloudflare Pages Worker
 *
 * If the environment variable PASSCODE_HASH is set, visitors must enter
 * a passcode before they can view the site. The hash is the SHA-256
 * hex digest of the chosen password.
 *
 * Generate a hash:
 *   echo -n "your-password" | shasum -a 256 | cut -d' ' -f1
 *
 * Set it in the Cloudflare dashboard under Settings → Environment Variables.
 * Leave it unset for a fully public (no-auth) site.
 */

// ---------------------------------------------------------------------------
// Auth helpers
// ---------------------------------------------------------------------------

async function sha256(input) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
}

function getCookieValue(cookieHeader, name) {
  if (!cookieHeader) return null;
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${name}=([^;]*)`));
  return match ? match[1] : null;
}

function getLoginPage(redirectPath, error) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Login – Attache Site</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: system-ui, -apple-system, sans-serif;
      display: flex; align-items: center; justify-content: center;
      min-height: 100vh;
      background: #f5f5f5; color: #333;
    }
    .card {
      background: #fff; border-radius: 12px; padding: 2.5rem;
      box-shadow: 0 4px 24px rgba(0,0,0,.08); max-width: 380px; width: 100%;
    }
    h1 { font-size: 1.25rem; margin-bottom: 1.5rem; text-align: center; }
    .brand { color: #6366f1; }
    label { display: block; font-size: .875rem; margin-bottom: .35rem; }
    input[type="password"] {
      width: 100%; padding: .6rem .75rem; border: 1px solid #ccc; border-radius: 6px;
      font-size: 1rem; margin-bottom: 1rem;
    }
    input[type="password"]:focus { outline: none; border-color: #6366f1; box-shadow: 0 0 0 3px #6366f133; }
    button {
      width: 100%; padding: .65rem; border: none; border-radius: 6px;
      background: #6366f1; color: #fff; font-size: 1rem; font-weight: 600;
      cursor: pointer;
    }
    button:hover { opacity: .9; }
    .error { color: #c0392b; font-size: .85rem; margin-bottom: 1rem; text-align: center; }
  </style>
</head>
<body>
  <div class="card">
    <h1><span class="brand">Attache Site</span></h1>
    ${error ? '<p class="error">Incorrect passcode. Please try again.</p>' : ''}
    <form method="POST" action="/cfp_login">
      <label for="password">Passcode</label>
      <input id="password" name="password" type="password" required autofocus />
      <input type="hidden" name="redirect" value="${redirectPath}" />
      <button type="submit">Enter</button>
    </form>
  </div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// Worker entry
// ---------------------------------------------------------------------------

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;
    const passcodeHash = env.PASSCODE_HASH;

    // ---- Auth gate (only when PASSCODE_HASH is configured) ----
    if (passcodeHash) {
      // Handle login form submission
      if (request.method === 'POST' && path === '/cfp_login') {
        const formData = await request.formData();
        const password = formData.get('password') || '';
        const redirect = formData.get('redirect') || '/';
        const hash = await sha256(password);

        if (hash === passcodeHash) {
          return new Response(null, {
            status: 302,
            headers: {
              'Location': redirect,
              'Set-Cookie': `CFP_Auth=${hash}; Max-Age=604800; Path=/; HttpOnly; Secure; SameSite=Lax`,
            },
          });
        }

        // Wrong password — re-render login with error
        return new Response(getLoginPage(redirect, true), {
          status: 401,
          headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
      }

      // Handle logout
      if (path === '/cfp_logout') {
        return new Response(null, {
          status: 302,
          headers: {
            'Location': '/',
            'Set-Cookie': 'CFP_Auth=; Max-Age=0; Path=/; HttpOnly; Secure; SameSite=Lax',
          },
        });
      }

      // Validate auth cookie
      const cookie = getCookieValue(request.headers.get('Cookie'), 'CFP_Auth');
      if (cookie !== passcodeHash) {
        return new Response(getLoginPage(path, false), {
          status: 401,
          headers: { 'Content-Type': 'text/html;charset=UTF-8' },
        });
      }
    }

    // ---- Asset serving ----

    // Try to serve the static asset first
    let response = await env.ASSETS.fetch(request);


    // If 404 or redirect and path starts with /docs/, serve docs SPA
    if ((response.status === 404 || response.status === 307) && path.startsWith('/docs/') && !path.includes('.')) {
      const spaUrl = new URL('/docs/', url.origin);
      response = await env.ASSETS.fetch(new Request(spaUrl, request));
    }

    return response;
  }
};
