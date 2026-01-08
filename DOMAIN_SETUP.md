# Domain Setup Guide for NurtureEngine

This guide walks you through setting up custom domains with SSL certificates for NurtureEngine.

## Prerequisites

1. **DNS Configuration**: Ensure your DNS provider has A records pointing to your server IP:
   - `app.nurtureengine.net` → Your server IP (e.g., 34.29.105.211)
   - `api.nurtureengine.net` → Your server IP (e.g., 34.29.105.211)

2. **Server Access**: SSH access to your server with sudo privileges

3. **Ports**: Ensure ports 80 and 443 are open:
   ```bash
   sudo ufw allow 80/tcp
   sudo ufw allow 443/tcp
   ```

## Step-by-Step Setup

### Step 1: Install and Configure Nginx

Run the Nginx setup script:

```bash
cd /root/SMS
sudo chmod +x scripts/setup-nginx.sh
sudo ./scripts/setup-nginx.sh
```

This script will:
- Install Nginx
- Install Certbot (for SSL certificates)
- Copy the Nginx configuration
- Enable the site
- Start Nginx

### Step 2: Obtain SSL Certificates

After DNS records are propagated (can take a few minutes to hours), run:

```bash
sudo chmod +x scripts/setup-ssl.sh
sudo ./scripts/setup-ssl.sh
```

This script will:
- Verify DNS is pointing to your server
- Obtain SSL certificates from Let's Encrypt
- Configure auto-renewal
- Reload Nginx with SSL configuration

**Note**: DNS must be fully propagated before running this script, or certificate issuance will fail.

### Step 3: Verify Services Are Running

Ensure your frontend and backend services are running:

```bash
# Check frontend (should be on port 5001)
curl http://localhost:5001

# Check backend (should be on port 5000)
curl http://localhost:5000/api
```

### Step 4: Run Migration Script

Run the complete migration verification:

```bash
chmod +x scripts/migrate-to-domains.sh
./scripts/migrate-to-domains.sh
```

This script will verify:
- DNS configuration
- Nginx installation and status
- SSL certificate installation
- Service availability
- HTTPS endpoint accessibility

## Configuration Details

### Nginx Configuration

The Nginx configuration (`nginx/nurtureengine.conf`) includes:

- **Frontend** (`app.nurtureengine.net`): Proxies to `localhost:5001`
- **Backend** (`api.nurtureengine.net`): Proxies to `localhost:5000`
- **SSL/TLS**: Modern security settings with TLS 1.2 and 1.3
- **Security Headers**: HSTS, X-Frame-Options, etc.
- **HTTP to HTTPS Redirect**: Automatic redirect for all HTTP traffic

### Port Configuration

- **Port 80**: HTTP (redirects to HTTPS)
- **Port 443**: HTTPS (SSL/TLS)
- **Port 5000**: Backend API (internal)
- **Port 5001**: Frontend (internal)

## SSL Certificate Auto-Renewal

Certificates are automatically renewed via Certbot timer. To verify:

```bash
# Check timer status
sudo systemctl status certbot.timer

# Test renewal (dry run)
sudo certbot renew --dry-run
```

## Troubleshooting

### DNS Not Resolving

If DNS isn't resolving correctly:

```bash
# Check DNS resolution
dig app.nurtureengine.net
dig api.nurtureengine.net

# Compare with server IP
hostname -I
```

### SSL Certificate Issues

If certificate issuance fails:

1. Verify DNS is pointing to your server
2. Ensure ports 80 and 443 are open
3. Check Nginx is running: `sudo systemctl status nginx`
4. Check Nginx logs: `sudo tail -f /var/log/nginx/error.log`

### Service Not Accessible

If services aren't accessible:

1. Check services are running:
   ```bash
   # Frontend
   curl http://localhost:5001
   
   # Backend
   curl http://localhost:5000/api
   ```

2. Check Nginx configuration:
   ```bash
   sudo nginx -t
   sudo systemctl reload nginx
   ```

3. Check Nginx logs:
   ```bash
   sudo tail -f /var/log/nginx/app.nurtureengine.net.error.log
   sudo tail -f /var/log/nginx/api.nurtureengine.net.error.log
   ```

### CORS Issues

If you encounter CORS errors:

1. Verify backend CORS configuration includes the domains
2. Check browser console for specific error messages
3. Verify `X-Forwarded-Proto` header is being set correctly

## Testing

After setup, test your endpoints:

```bash
# Test frontend
curl -I https://app.nurtureengine.net

# Test backend
curl -I https://api.nurtureengine.net/api

# Test with browser
# Open: https://app.nurtureengine.net
```

## Maintenance

### Renew Certificates Manually

```bash
sudo certbot renew
sudo systemctl reload nginx
```

### View Certificate Expiration

```bash
sudo certbot certificates
```

### Update Nginx Configuration

After modifying `nginx/nurtureengine.conf`:

```bash
sudo cp nginx/nurtureengine.conf /etc/nginx/sites-available/nurtureengine.conf
sudo nginx -t
sudo systemctl reload nginx
```

## Security Notes

1. **Firewall**: Ensure only necessary ports are open
2. **SSL**: Certificates auto-renew, but monitor expiration
3. **Updates**: Keep Nginx and Certbot updated
4. **Logs**: Regularly review Nginx access and error logs

## Support

For issues or questions:
1. Check Nginx logs: `/var/log/nginx/`
2. Check application logs
3. Verify DNS propagation: `dig app.nurtureengine.net`
4. Test connectivity: `curl -v https://app.nurtureengine.net`

