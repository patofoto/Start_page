export async function onRequestPut(context) {
  try {
    const { clientId, allowedEmail, allowedEmails } = await context.request.json();
    
    // Normalize allowed emails to an array of lowercase strings (support legacy single value)
    let allowedEmailsArr = [];
    if (Array.isArray(allowedEmails)) {
        allowedEmailsArr = allowedEmails.filter(Boolean).map(e => e.toLowerCase());
    } else if (typeof allowedEmail === 'string' && allowedEmail.trim()) {
        allowedEmailsArr = [allowedEmail.trim().toLowerCase()];
    }
    
    // 1. Check if auth is already configured (Security check)
    const currentConfig = await context.env.START_PAGE_DATA.get("authConfig", { type: "json" });
    
    if (currentConfig && (currentConfig.allowedEmail || (currentConfig.allowedEmails && currentConfig.allowedEmails.length))) {
        // If configuration exists, require valid authorization to change it
        const authHeader = context.request.headers.get("Authorization");
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
             return new Response("Unauthorized: Auth config already set", { status: 401 });
        }
        
        const token = authHeader.split(" ")[1];
        
        // Verify token
        const tokenRes = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${token}`);
        if (!tokenRes.ok) {
             return new Response("Invalid Token", { status: 403 });
        }
        
        const payload = await tokenRes.json();
        
        const email = (payload.email || '').toLowerCase();
        const currentAllowed = currentConfig.allowedEmails && currentConfig.allowedEmails.length
            ? currentConfig.allowedEmails.map(e => e.toLowerCase())
            : currentConfig.allowedEmail
                ? [currentConfig.allowedEmail.toLowerCase()]
                : [];
        if (currentAllowed.length && !currentAllowed.includes(email)) {
             return new Response("Unauthorized Email", { status: 403 });
        }
        
        // Also verify the token was issued for this client
        if (currentConfig.clientId && payload.aud !== currentConfig.clientId) {
             return new Response("Invalid Client ID in token", { status: 403 });
        }
    }
    
    // 2. Save new config to KV
    const config = { clientId, allowedEmails: allowedEmailsArr };
    await context.env.START_PAGE_DATA.put("authConfig", JSON.stringify(config));
    
    return new Response(JSON.stringify({ success: true }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { 
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
