# Asterisk Twilio Trunk Configuration Guide

This guide provides step-by-step instructions for configuring Twilio SIP trunking in Asterisk to enable outbound calling through Twilio's infrastructure.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Obtaining Twilio SIP Credentials](#obtaining-twilio-sip-credentials)
3. [Asterisk Configuration](#asterisk-configuration)
4. [Testing the Trunk](#testing-the-trunk)
5. [Troubleshooting](#troubleshooting)
6. [Security Considerations](#security-considerations)

---

## Prerequisites

Before starting, ensure you have:

- **Asterisk** installed and running (version 13+ recommended)
- **PJSIP** module loaded in Asterisk
- **Twilio Account** with SIP Trunking enabled
- **Root/Admin access** to Asterisk configuration files
- **Network access** to Twilio SIP endpoints (sip.twilio.com:5060)

### Verify PJSIP Module

```bash
asterisk -rx "module show like pjsip"
```

You should see `res_pjsip.so` loaded. If not, load it:

```bash
asterisk -rx "module load res_pjsip.so"
```

---

## Obtaining Twilio SIP Credentials

### Step 1: Access Twilio Console

1. Log in to [Twilio Console](https://console.twilio.com/)
2. Navigate to **Phone Numbers** → **Manage** → **Active Numbers**
3. Select any phone number or go to **Elastic SIP Trunking**

### Step 2: Get SIP Credentials

#### Option A: Using Elastic SIP Trunking (Recommended)

1. Go to **Elastic SIP Trunking** → **Trunks**
2. Create a new trunk or select an existing one
3. Go to **Credentials Lists** → Create or select a credentials list
4. Note down:
   - **SIP Username** (from the credentials list)
   - **SIP Password** (you'll need to create/view this)
   - **SIP Domain** (usually `sip.twilio.com`)

#### Option B: Using Phone Number SIP Credentials

1. Go to **Phone Numbers** → Select a number
2. Scroll to **SIP Credentials** section
3. Note down:
   - **SIP Username**
   - **SIP Password**
   - **SIP Domain** (usually `sip.twilio.com`)

### Step 3: Get Your Twilio Account SID

1. From the Twilio Console dashboard
2. Copy your **Account SID** (starts with `AC...`)
3. This may be needed for some advanced configurations

---

## Asterisk Configuration

### Step 1: Copy Configuration File

Copy the provided `pjsip-twilio-trunk.conf` to your Asterisk configuration directory:

```bash
# Copy to Asterisk config directory
cp pjsip-twilio-trunk.conf /etc/asterisk/pjsip.d/twilio.conf

# Or if using a single pjsip.conf file, append to it:
cat pjsip-twilio-trunk.conf >> /etc/asterisk/pjsip.conf
```

### Step 2: Update Credentials

Edit the configuration file:

```bash
nano /etc/asterisk/pjsip.d/twilio.conf
# or
nano /etc/asterisk/pjsip.conf
```

Replace the following placeholders:

- `YOUR_TWILIO_SIP_USERNAME` → Your actual Twilio SIP username
- `YOUR_TWILIO_SIP_PASSWORD` → Your actual Twilio SIP password

**Example:**

```ini
[TWILIO]
type=endpoint
transport=transport-udp
context=from-twilio
disallow=all
allow=ulaw
allow=alaw
allow=g729
direct_media=no
rtp_symmetric=yes
force_rport=yes
rewrite_contact=yes
from_user=YOUR_TWILIO_ACCOUNT_SID
from_domain=sip.twilio.com
outbound_auth=TWILIO-auth
aors=TWILIO-aor

[TWILIO-auth]
type=auth
auth_type=userpass
username=YOUR_TWILIO_ACCOUNT_SID
password=your_actual_sip_password_here
```

### Step 3: Include Configuration (if using separate files)

If you're using separate PJSIP configuration files, ensure `pjsip.conf` includes them:

```bash
nano /etc/asterisk/pjsip.conf
```

Add at the top:

```ini
#include "pjsip.d/twilio.conf"
```

### Step 4: Configure Dialplan Contexts

You need two dialplan contexts for Twilio:

#### 4.1: Incoming Calls Context (Optional)

For incoming calls from Twilio (if needed):

```bash
nano /etc/asterisk/extensions.conf
```

Add or verify:

```ini
[from-twilio]
exten => _X.,1,NoOp(Incoming call from Twilio: ${EXTEN})
same => n,Dial(SIP/${EXTEN}@TWILIO,30)
same => n,Hangup()
```

#### 4.2: Outbound Calls Context (Required)

For outbound calls through Twilio, copy the TwilioDynamicIVR dialplan:

```bash
# Copy Twilio dialplan to Asterisk
cp backend/asterisk-config/twilio-dynamicivr-dialplan.conf /etc/asterisk/extensions.d/twilio-dynamicivr.conf

# Or append to extensions.conf
cat backend/asterisk-config/twilio-dynamicivr-dialplan.conf >> /etc/asterisk/extensions.conf
```

**Important:** The `TwilioDynamicIVR` context handles calls made through Twilio trunk. It uses `+1` format for phone numbers (E164 with + prefix) as required by Twilio.

### Step 5: Reload Asterisk Configuration

```bash
# Reload PJSIP module
asterisk -rx "pjsip reload"

# Reload dialplan (if you added TwilioDynamicIVR context)
asterisk -rx "dialplan reload"

# Or reload all configurations
asterisk -rx "reload"
```

**Note:** After adding the `TwilioDynamicIVR` context, you must reload the dialplan for it to be available.

---

## Testing the Trunk

### Step 1: Verify Endpoint Status

```bash
asterisk -rx "pjsip show endpoints"
```

You should see `TWILIO` endpoint listed. Check for:
- **State**: `Unavailable` or `Available` (depends on registration)
- **Transport**: Should show `transport-udp`

### Step 2: Check Endpoint Details

```bash
asterisk -rx "pjsip show endpoint TWILIO"
```

Verify:
- **Auth**: Should show `TWILIO-auth`
- **AOR**: Should show `TWILIO-aor`
- **Transport**: Should show `transport-udp`

### Step 3: Test Outbound Call

Make a test call through the trunk:

```bash
asterisk -rx "originate PJSIP/+1234567890@TWILIO application Playback hello-world"
```

Replace `+1234567890` with a test number.

### Step 4: Monitor Call Logs

Watch Asterisk logs in real-time:

```bash
tail -f /var/log/asterisk/full
```

Or use Asterisk CLI:

```bash
asterisk -rvvv
```

Look for:
- Successful authentication messages
- Call initiation messages
- Any error messages

### Step 5: Test from Application

Test using the application's call functionality:

1. Navigate to a journey with a MAKE_CALL node
2. Select a DID from the Twilio segment
3. Execute the journey
4. Monitor Asterisk logs for call attempts

---

## Troubleshooting

### Issue: Endpoint Shows as "Unavailable"

**Symptoms:**
```
TWILIO/endpoint-00000001  Unavailable
```

**Solutions:**

1. **Check Credentials:**
   ```bash
   asterisk -rx "pjsip show endpoint TWILIO"
   ```
   Verify username and password are correct.

2. **Check Network Connectivity:**
   ```bash
   telnet sip.twilio.com 5060
   ```
   Should connect. If not, check firewall rules.

3. **Check DNS Resolution:**
   ```bash
   nslookup sip.twilio.com
   ```
   Should resolve to an IP address.

4. **Review Asterisk Logs:**
   ```bash
   tail -100 /var/log/asterisk/full | grep -i twilio
   ```
   Look for authentication errors or connection issues.

### Issue: "401 Unauthorized" Errors

**Symptoms:**
```
PJSIP/2.0 401 Unauthorized
```

**Solutions:**

1. **Verify SIP Credentials:**
   - Double-check username and password in configuration
   - Ensure no extra spaces or special characters
   - Verify credentials in Twilio Console

2. **Check Authentication Section:**
   ```bash
   asterisk -rx "pjsip show auths"
   ```
   Verify `TWILIO-auth` is listed and configured correctly.

### Issue: Calls Not Completing

**Symptoms:**
- Calls initiate but don't connect
- One-way audio
- Calls drop immediately

**Solutions:**

1. **Check RTP Settings:**
   - Ensure `rtp_symmetric=yes` is set
   - Verify firewall allows RTP traffic (UDP ports 10000-20000)
   - Check `direct_media=no` is set

2. **Check Codec Compatibility:**
   ```bash
   asterisk -rx "pjsip show endpoint TWILIO"
   ```
   Verify codecs match (ulaw, alaw, or g729)

3. **Review Call Logs:**
   ```bash
   asterisk -rx "core show channels"
   asterisk -rx "pjsip show channels"
   ```

### Issue: "No such context" Error

**Symptoms:**
```
No such context 'from-twilio'
```

**Solutions:**

1. **Create Context:**
   Add to `extensions.conf`:
   ```ini
   [from-twilio]
   exten => _X.,1,NoOp(Incoming call from Twilio)
   same => n,Hangup()
   ```

2. **Reload Dialplan:**
   ```bash
   asterisk -rx "dialplan reload"
   ```

### Issue: Trunk Not Found in Application

**Symptoms:**
- Application can't find TWILIO trunk
- Calls fail with "trunk not found"

**Solutions:**

1. **Verify Trunk Name:**
   - Ensure trunk name matches exactly: `TWILIO`
   - Check case sensitivity (should be uppercase)

2. **Check Application Configuration:**
   - Verify DIDs are imported with trunk name `TWILIO`
   - Check segment configuration in database

3. **Verify Database:**
   ```sql
   SELECT DISTINCT trunk FROM asterisk_dids WHERE segment = 'twilio-main';
   ```
   Should return `TWILIO`

---

## Security Considerations

### 1. Protect Configuration Files

```bash
chmod 640 /etc/asterisk/pjsip.d/twilio.conf
chown root:asterisk /etc/asterisk/pjsip.d/twilio.conf
```

### 2. Use Strong SIP Passwords

- Generate strong, random passwords
- Store passwords securely (consider using Asterisk's password management)
- Rotate passwords regularly

### 3. Firewall Configuration

Allow only necessary ports:

```bash
# SIP (UDP 5060)
ufw allow 5060/udp

# RTP (UDP 10000-20000)
ufw allow 10000:20000/udp
```

### 4. IP Restrictions (Optional)

If Twilio provides IP ranges, restrict access:

```ini
[TWILIO-identify]
type=identify
endpoint=TWILIO
match=54.172.60.0/24
match=54.244.51.0/24
```

### 5. Monitor for Unauthorized Access

Regularly review Asterisk logs:

```bash
grep -i "unauthorized\|failed\|rejected" /var/log/asterisk/full
```

---

## Advanced Configuration

### Multiple Twilio Endpoints

If you need multiple Twilio trunks (e.g., different regions):

1. Copy the `[TWILIO]` section
2. Rename to `[TWILIO-US]`, `[TWILIO-EU]`, etc.
3. Configure different SIP domains if needed
4. Update DIDs in database to use appropriate trunk names

### Load Balancing

For high-volume scenarios:

1. Create multiple Twilio endpoints
2. Configure DIDs to use different trunks
3. Implement rotation logic in application

### Codec Prioritization

Adjust codec order for better quality:

```ini
[TWILIO]
disallow=all
allow=ulaw    ; G.711 μ-law (highest quality)
allow=alaw    ; G.711 A-law
allow=g729    ; G.729 (lower bandwidth)
```

---

## Verification Checklist

Before going live, verify:

- [ ] Twilio SIP credentials are correct
- [ ] Endpoint shows in `pjsip show endpoints`
- [ ] Test call completes successfully
- [ ] Audio is clear in both directions
- [ ] Firewall allows SIP and RTP traffic
- [ ] Configuration files have correct permissions
- [ ] Logs show no authentication errors
- [ ] DIDs are imported with correct trunk name
- [ ] Application can select DIDs from Twilio segment

---

## Support and Resources

### Twilio Resources

- [Twilio SIP Trunking Documentation](https://www.twilio.com/docs/sip-trunking)
- [Twilio SIP Domain Setup](https://www.twilio.com/docs/sip-trunking/getting-started)
- [Twilio Support](https://support.twilio.com/)

### Asterisk Resources

- [Asterisk PJSIP Configuration](https://wiki.asterisk.org/wiki/display/AST/Configuring+res_pjsip)
- [Asterisk SIP Trunking Guide](https://www.asterisk.org/get-started/sip-trunking)
- [Asterisk Community Forums](https://community.asterisk.org/)

### Application-Specific

- Check application logs: `/var/log/application/`
- Review database DID configuration
- Verify journey node configurations

---

## Quick Reference

### Common Commands

```bash
# Reload PJSIP
asterisk -rx "pjsip reload"

# Show endpoints
asterisk -rx "pjsip show endpoints"

# Show specific endpoint
asterisk -rx "pjsip show endpoint TWILIO"

# Show authentication
asterisk -rx "pjsip show auths"

# Show AORs
asterisk -rx "pjsip show aors"

# Test call
asterisk -rx "originate PJSIP/+1234567890@TWILIO application Playback hello-world"

# Monitor logs
tail -f /var/log/asterisk/full

# Check channels
asterisk -rx "core show channels"
```

### Configuration File Locations

- PJSIP Config: `/etc/asterisk/pjsip.conf` or `/etc/asterisk/pjsip.d/`
- Dialplan: `/etc/asterisk/extensions.conf`
- Logs: `/var/log/asterisk/full`

---

**Last Updated:** December 2025  
**Version:** 1.0

