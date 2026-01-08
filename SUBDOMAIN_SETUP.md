# Subdomain Setup for Nurture Leads

## Overview

The `leads.nurtureengine.net` subdomain has been configured to serve the Nurture Leads marketplace as a standalone application.

## Configuration

### Nginx Configuration

The nginx configuration (`/root/SMS/nginx/nurtureengine.conf`) has been updated to:

1. **HTTP Server (Port 80)**: Redirects `leads.nurtureengine.net` to HTTPS
2. **HTTPS Server (Port 443)**: Proxies `leads.nurtureengine.net` to the frontend server (port 5001)

### Frontend Routing

1. **Middleware** (`frontend/middleware.ts`): Detects `leads.nurtureengine.net` subdomain and rewrites routes:
   - `/` → `/nurture-leads-landing` (landing page)
   - `/login` → `/nurture-leads/login` (login page)

2. **Root Page** (`frontend/app/page.tsx`): Client-side detection redirects:
   - If on `leads.nurtureengine.net` and authenticated → `/nurture-leads`
   - If on `leads.nurtureengine.net` and not authenticated → `/nurture-leads-landing`

3. **API Client** (`frontend/lib/api/client.ts`): Detects `leads.nurtureengine.net` and uses `api.nurtureengine.net` for API calls

## Routes

### Nurture Leads Routes (on leads.nurtureengine.net)

- `/` - Landing page (redirects to `/nurture-leads-landing`)
- `/nurture-leads-landing` - Marketing landing page
- `/nurture-leads/login` - Login page
- `/nurture-leads` - Main marketplace (requires auth)
- `/nurture-leads/*` - All marketplace routes

### Engine Routes (on app.nurtureengine.net)

- `/` - Engine landing page
- `/dashboard` - Engine dashboard
- `/campaigns`, `/contacts`, etc. - Engine features

## DNS Configuration

Ensure DNS A record is set:
```
leads.nurtureengine.net  →  [SERVER_IP]
```

## SSL Certificate

The SSL certificate for `nurtureengine.net` (wildcard or multi-domain) should include `leads.nurtureengine.net`. If using Let's Encrypt:

```bash
certbot certonly --nginx -d nurtureengine.net -d app.nurtureengine.net -d api.nurtureengine.net -d leads.nurtureengine.net
```

## Testing

1. **Test HTTP redirect**: `curl -I http://leads.nurtureengine.net` should return 301 to HTTPS
2. **Test HTTPS**: `curl -I https://leads.nurtureengine.net` should return 200
3. **Test routing**: Visit `https://leads.nurtureengine.net` in browser - should show Nurture Leads landing page

## Reload Nginx

After making changes to nginx config:

```bash
sudo nginx -t  # Test configuration
sudo systemctl reload nginx  # Reload nginx
```

## Troubleshooting

1. **Check nginx logs**: `/var/log/nginx/leads.nurtureengine.net.access.log` and `error.log`
2. **Check DNS**: `dig leads.nurtureengine.net` or `nslookup leads.nurtureengine.net`
3. **Check SSL**: `openssl s_client -connect leads.nurtureengine.net:443 -servername leads.nurtureengine.net`
4. **Check frontend logs**: `tail -f /tmp/frontend.log`

