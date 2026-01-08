# External Access Configuration

## Server Information

- **External IP**: `34.29.105.211`
- **Backend Port**: `5000`
- **Frontend Port**: `5001`

## Access URLs

### External Access
- **Frontend**: http://34.29.105.211:5001
- **Backend API**: http://34.29.105.211:5000/api
- **Health Check**: http://34.29.105.211:5000/api/health

### Local Access
- **Frontend**: http://localhost:5001
- **Backend API**: http://localhost:5000/api

## Configuration

### Backend CORS
- Configured to allow requests from:
  - `http://localhost:5001`
  - `http://127.0.0.1:5001`
  - `http://34.29.105.211:5001`
  - `https://34.29.105.211:5001`

### Network Binding
- Backend listens on `0.0.0.0:5000` (all interfaces)
- Frontend listens on `0.0.0.0:5001` (all interfaces)

### API URL Detection
The frontend automatically detects if it's being accessed via external IP and adjusts the API URL accordingly.

## Firewall Rules

Ensure these ports are open in your firewall:
- **Port 5000** (Backend API)
- **Port 5001** (Frontend)

For GCP:
```bash
gcloud compute firewall-rules create allow-sms-platform \
  --allow tcp:5000,tcp:5001 \
  --source-ranges 0.0.0.0/0 \
  --description "Allow SMS Platform access"
```

## Testing

1. **Test Backend API**:
   ```bash
   curl http://34.29.105.211:5000/api/health
   ```

2. **Test Frontend**:
   ```bash
   curl http://34.29.105.211:5001
   ```

3. **Test CORS**:
   ```bash
   curl -X OPTIONS http://34.29.105.211:5000/api/health \
     -H "Origin: http://34.29.105.211:5001" \
     -H "Access-Control-Request-Method: GET" \
     -v
   ```

## Troubleshooting

If you can't access externally:

1. **Check firewall rules**:
   ```bash
   sudo ufw status
   # or
   sudo iptables -L -n
   ```

2. **Check if services are listening on all interfaces**:
   ```bash
   netstat -tlnp | grep -E ":(5000|5001)"
   # Should show 0.0.0.0:5000 and 0.0.0.0:5001
   ```

3. **Check backend logs**:
   ```bash
   tail -f /tmp/backend.log
   ```

4. **Check frontend logs**:
   ```bash
   tail -f /tmp/frontend.log
   ```

