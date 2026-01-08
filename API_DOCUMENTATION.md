# iMessage API Documentation

Complete API reference for the iMessage API server. This API allows you to send and receive iMessages/SMS messages, manage conversations, accounts, and webhooks.

## Table of Contents

- [Authentication](#authentication)
- [Base URL](#base-url)
- [Endpoints](#endpoints)
  - [API Information](#api-information)
  - [Messages](#messages)
  - [Conversations](#conversations)
  - [Accounts](#accounts)
  - [Devices](#devices)
  - [Notifications](#notifications)
  - [Webhooks](#webhooks)
  - [Debug](#debug)
- [Data Models](#data-models)
- [Error Handling](#error-handling)
- [Rate Limiting](#rate-limiting)

---

## Authentication

All API endpoints (except `/` and `/api`) require authentication using an API key.

### Headers

Include the API key in one of these headers:
- `Api-Key: your-api-key`
- `X-API-Key: your-api-key`

**Example:**
```bash
curl -H "X-API-Key: your-api-key" http://localhost:5000/conversations
```

---

## Base URL

Default base URL: `http://localhost:5000`

You can configure the port using the `PORT_NUMBER` environment variable.

---

## Endpoints

### API Information

#### Get API Information

Get information about available endpoints.

**Endpoint:** `GET /api`

**Authentication:** Not required

**Response:**
```json
{
  "message": "iMessage API",
  "version": "1.0",
  "endpoints": {
    "conversations": "/conversations",
    "messages": "/conversations/{contact_id}/messages",
    "notifications": "/notifications",
    "accounts": "/accounts",
    "webhooks": "/webhooks",
    "webhook_test": "/webhooks/{webhook_id}/test"
  }
}
```

---

### Messages

#### Send Message

Send a message to a recipient.

**Endpoint:** `POST /send`

**Authentication:** Required

**Query Parameters:**
- `name` (boolean, default: `true`) - If `true`, recipient is treated as a contact name; if `false`, as a phone number

**Request Body:**
```json
{
  "recipient": "+1234567890",
  "message": "Hello, this is a test message!"
}
```

**Response:**
```json
{
  "status": "ok",
  "recipient": "+1234567890"
}
```

**Example:**
```bash
curl -X POST http://localhost:5000/send?name=false \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "recipient": "+1234567890",
    "message": "Hello!"
  }'
```

---

#### Get Messages

Retrieve recent messages.

**Endpoint:** `GET /messages`

**Authentication:** Required

**Query Parameters:**
- `num_messages` (integer, default: `10`) - Number of messages to retrieve
- `sent` (boolean, default: `true`) - Include sent messages
- `formatted` (boolean, default: `true`) - Return formatted messages

**Response (formatted=true):**
```json
{
  "messages": [
    {
      "from": "John Doe",
      "body": "Hello!",
      "to": "Your Name",
      "datetime": "2024-01-01T12:00:00"
    }
  ]
}
```

**Response (formatted=false):**
Returns raw message tuples from the database.

**Example:**
```bash
curl "http://localhost:5000/messages?num_messages=20&sent=true" \
  -H "X-API-Key: your-api-key"
```

---

#### Get Messages for a Person

Get messages from/to a specific person.

**Endpoint:** `GET /messages/<person>`

**Authentication:** Required

**Path Parameters:**
- `person` - Phone number or contact name

**Query Parameters:**
- `name` (boolean, default: `true`) - Treat person as contact name
- `num_messages` (integer, default: `10`) - Number of messages
- `sent` (boolean, default: `true`) - Include sent messages
- `formatted` (boolean, default: `true`) - Return formatted messages

**Example:**
```bash
curl "http://localhost:5000/messages/John%20Doe?name=true&num_messages=10" \
  -H "X-API-Key: your-api-key"
```

---

### Conversations

#### Get All Conversations

Get a list of all conversations with metadata.

**Endpoint:** `GET /conversations`

**Authentication:** Required

**Query Parameters:**
- `account` (string, optional) - Filter conversations by account ID

**Response:**
```json
{
  "conversations": [
    {
      "contact_id": "+1234567890",
      "contact_name": "John Doe",
      "last_message": {
        "body": "Hello!",
        "timestamp": "2024-01-01 12:00:00",
        "sent_by_me": false
      },
      "unread_count": 0,
      "total_messages": 5,
      "last_activity": "2024-01-01 12:00:00",
      "account": {
        "login": "user@example.com",
        "service": "iMessage",
        "display_name": "user"
      }
    }
  ],
  "total": 1,
  "account_filter": null
}
```

**Example:**
```bash
curl "http://localhost:5000/conversations?account=user@example.com" \
  -H "X-API-Key: your-api-key"
```

---

#### Get Conversation Info

Get metadata for a specific conversation.

**Endpoint:** `GET /conversations/<contact_id>`

**Authentication:** Required

**Path Parameters:**
- `contact_id` - Phone number or contact name

**Response:**
```json
{
  "contact_id": "+1234567890",
  "contact_name": "John Doe",
  "last_message": {
    "body": "Hello!",
    "timestamp": "2024-01-01 12:00:00",
    "sent_by_me": false
  },
  "unread_count": 0,
  "total_messages": 5,
  "last_activity": "2024-01-01 12:00:00",
  "account": {
    "login": "user@example.com",
    "service": "iMessage",
    "display_name": "user"
  }
}
```

**Example:**
```bash
curl "http://localhost:5000/conversations/+1234567890" \
  -H "X-API-Key: your-api-key"
```

---

#### Get Conversation Messages

Get messages for a specific conversation.

**Endpoint:** `GET /conversations/<contact_id>/messages`

**Authentication:** Required

**Path Parameters:**
- `contact_id` - Phone number or contact name

**Response:**
```json
{
  "contact_id": "+1234567890",
  "contact_name": "John Doe",
  "messages": [
    {
      "id": "+1234567890_2024-01-01 12:00:00",
      "body": "Hello!",
      "from": "John Doe",
      "to": "Your Name",
      "sent_by_me": false,
      "timestamp": "2024-01-01 12:00:00",
      "datetime": "2024-01-01T12:00:00",
      "account": {
        "login": "user@example.com",
        "service": "iMessage",
        "display_name": "user"
      }
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "total_pages": 1,
    "has_next": false,
    "has_prev": false
  },
  "note": "Showing only the 10 most recent messages from conversations you started"
}
```

**Note:** Only returns conversations that the user has initiated (sent at least one message).

**Example:**
```bash
curl "http://localhost:5000/conversations/+1234567890/messages" \
  -H "X-API-Key: your-api-key"
```

---

#### Send Message to Conversation

Send a message to a specific conversation.

**Endpoint:** `POST /conversations/<contact_id>/messages`

**Authentication:** Required

**Path Parameters:**
- `contact_id` - Phone number or contact name

**Request Body:**
```json
{
  "message": "Hello!",
  "account": "user@example.com",
  "use_usb": false,
  "device_udid": "abc123...",
  "use_imessage": false
}
```

**Request Body Fields:**
- `message` (string, required) - Message content
- `account` (string, optional) - Account ID to send from
- `use_usb` (boolean, optional, default: `false`) - Use USB device for sending
- `device_udid` (string, optional) - USB device UDID
- `use_imessage` (boolean, optional, default: `false`) - Prefer iMessage over SMS

**Response:**
```json
{
  "status": "ok",
  "contact_id": "+1234567890",
  "contact_name": "John Doe",
  "message": "Hello!",
  "timestamp": "2024-01-01 12:00:00"
}
```

**Example:**
```bash
curl -X POST "http://localhost:5000/conversations/+1234567890/messages" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello!",
    "account": "user@example.com"
  }'
```

---

### Accounts

#### Get All Accounts

Get a list of all available iMessage accounts and USB devices.

**Endpoint:** `GET /accounts`

**Authentication:** Required

**Response:**
```json
{
  "macos_accounts": [
    {
      "id": "user@example.com",
      "login": "user@example.com",
      "service": "iMessage",
      "display_name": "user",
      "signed_in": true,
      "type": "imessage",
      "source": "macos"
    }
  ],
  "usb_devices": [
    {
      "udid": "abc123...",
      "name": "iPhone 12 Pro",
      "phone_number": "+1234567890",
      "connected": true,
      "source": "usb",
      "supports_imessage": true,
      "imessage_account": "E:user@example.com"
    }
  ],
  "all_accounts": [
    {
      "id": "user@example.com",
      "login": "user@example.com",
      "service": "iMessage",
      "display_name": "user",
      "type": "imessage",
      "source": "macos"
    },
    {
      "id": "USB:abc123...",
      "login": "USB:abc123...",
      "service": "SMS",
      "display_name": "iPhone 12 Pro",
      "type": "sms",
      "source": "usb",
      "phone_number": "+1234567890",
      "udid": "abc123..."
    }
  ],
  "total_accounts": 2
}
```

**Example:**
```bash
curl "http://localhost:5000/accounts" \
  -H "X-API-Key: your-api-key"
```

---

#### Get Account Status

Get the status of a specific account.

**Endpoint:** `GET /accounts/<account_id>/status`

**Authentication:** Required

**Path Parameters:**
- `account_id` - Account ID (e.g., `user@example.com` or `USB:abc123...`)

**Response (macOS account):**
```json
{
  "account_id": "user@example.com",
  "signed_in": true,
  "type": "macos"
}
```

**Response (USB device):**
```json
{
  "account_id": "USB:abc123...",
  "connected": true,
  "type": "usb",
  "device_info": {
    "udid": "abc123...",
    "name": "iPhone 12 Pro",
    "phone_number": "+1234567890",
    "connected": true
  }
}
```

**Example:**
```bash
curl "http://localhost:5000/accounts/user@example.com/status" \
  -H "X-API-Key: your-api-key"
```

---

### Devices

#### Get USB Devices

Get a list of USB-connected iPhones.

**Endpoint:** `GET /devices/usb`

**Authentication:** Required

**Response:**
```json
{
  "devices": [
    {
      "udid": "abc123...",
      "name": "iPhone 12 Pro",
      "phone_number": "+1234567890",
      "connected": true,
      "source": "usb",
      "supports_imessage": true,
      "imessage_account": "E:user@example.com"
    }
  ],
  "total": 1
}
```

**Example:**
```bash
curl "http://localhost:5000/devices/usb" \
  -H "X-API-Key: your-api-key"
```

---

#### Sync iPhone Messages

Sync messages from a USB-connected iPhone to macOS chat.db.

**Endpoint:** `POST /sync/iphone`

**Authentication:** Required

**Request Body:**
```json
{
  "device_udid": "abc123...",
  "phone_number": "+1234567890",
  "backup_password": "optional-password"
}
```

**Request Body Fields:**
- `device_udid` (string, optional) - Device UDID
- `phone_number` (string, optional) - Phone number
- `backup_password` (string, optional) - Password for encrypted backups

**Response:**
```json
{
  "status": "success",
  "message": "iPhone messages synced to macOS chat.db"
}
```

**Error Response:**
```json
{
  "status": "error",
  "message": "Failed to sync iPhone messages. Check if backup is encrypted and password is required.",
  "hint": "If backup is encrypted, include \"backup_password\" in request body"
}
```

**Example:**
```bash
curl -X POST "http://localhost:5000/sync/iphone" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "device_udid": "abc123...",
    "phone_number": "+1234567890"
  }'
```

---

### Notifications

#### Get Notifications

Get new incoming messages since last check (for polling).

**Endpoint:** `GET /notifications`

**Authentication:** Required

**Query Parameters:**
- `since` (string, optional) - Timestamp in format `YYYY-MM-DD HH:MM:SS` - Only return messages newer than this timestamp

**Response:**
```json
{
  "notifications": [
    {
      "id": "+1234567890_2024-01-01 12:00:00",
      "contact_id": "+1234567890",
      "contact_name": "John Doe",
      "body": "Hello!",
      "timestamp": "2024-01-01 12:00:00",
      "datetime": "2024-01-01T12:00:00"
    }
  ],
  "count": 1,
  "current_timestamp": "2024-01-01 12:00:00",
  "has_new": true
}
```

**Note:** Only returns incoming messages (not sent by you).

**Example:**
```bash
# Get all recent notifications
curl "http://localhost:5000/notifications" \
  -H "X-API-Key: your-api-key"

# Get notifications since a specific timestamp
curl "http://localhost:5000/notifications?since=2024-01-01%2012:00:00" \
  -H "X-API-Key: your-api-key"
```

---

### Webhooks

Webhooks are automatically triggered for every new incoming SMS message. Configure webhooks to receive real-time notifications.

#### Create Webhook

Create a new webhook.

**Endpoint:** `POST /webhooks`

**Authentication:** Required

**Request Body:**
```json
{
  "url": "https://your-server.com/webhook",
  "secret": "optional-secret-key",
  "enabled": true
}
```

**Request Body Fields:**
- `url` (string, required) - Webhook URL (must be valid HTTP/HTTPS URL)
- `secret` (string, optional) - Secret key for authentication (sent in `X-Webhook-Secret` header)
- `enabled` (boolean, optional, default: `true`) - Enable/disable webhook

**Response:**
```json
{
  "status": "success",
  "webhook": {
    "id": "wh_1234567890_0",
    "url": "https://your-server.com/webhook",
    "secret": "optional-secret-key",
    "enabled": true,
    "created_at": "2024-01-01T12:00:00",
    "last_triggered": null,
    "success_count": 0,
    "failure_count": 0
  }
}
```

**Example:**
```bash
curl -X POST "http://localhost:5000/webhooks" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "secret": "my-secret-key",
    "enabled": true
  }'
```

---

#### List Webhooks

Get all configured webhooks.

**Endpoint:** `GET /webhooks`

**Authentication:** Required

**Response:**
```json
{
  "webhooks": [
    {
      "id": "wh_1234567890_0",
      "url": "https://your-server.com/webhook",
      "secret": "optional-secret-key",
      "enabled": true,
      "created_at": "2024-01-01T12:00:00",
      "last_triggered": "2024-01-01T13:00:00",
      "success_count": 10,
      "failure_count": 0
    }
  ],
  "total": 1
}
```

**Example:**
```bash
curl "http://localhost:5000/webhooks" \
  -H "X-API-Key: your-api-key"
```

---

#### Get Webhook

Get a specific webhook by ID.

**Endpoint:** `GET /webhooks/<webhook_id>`

**Authentication:** Required

**Path Parameters:**
- `webhook_id` - Webhook ID

**Response:**
```json
{
  "webhook": {
    "id": "wh_1234567890_0",
    "url": "https://your-server.com/webhook",
    "secret": "optional-secret-key",
    "enabled": true,
    "created_at": "2024-01-01T12:00:00",
    "last_triggered": "2024-01-01T13:00:00",
    "success_count": 10,
    "failure_count": 0
  }
}
```

**Example:**
```bash
curl "http://localhost:5000/webhooks/wh_1234567890_0" \
  -H "X-API-Key: your-api-key"
```

---

#### Update Webhook

Update a webhook's configuration.

**Endpoint:** `PUT /webhooks/<webhook_id>`

**Authentication:** Required

**Path Parameters:**
- `webhook_id` - Webhook ID

**Request Body:**
```json
{
  "url": "https://new-url.com/webhook",
  "secret": "new-secret",
  "enabled": false
}
```

**Request Body Fields (all optional):**
- `url` (string) - New webhook URL
- `secret` (string) - New secret key
- `enabled` (boolean) - Enable/disable webhook

**Response:**
```json
{
  "status": "success",
  "webhook": {
    "id": "wh_1234567890_0",
    "url": "https://new-url.com/webhook",
    "secret": "new-secret",
    "enabled": false,
    "created_at": "2024-01-01T12:00:00",
    "last_triggered": "2024-01-01T13:00:00",
    "success_count": 10,
    "failure_count": 0
  }
}
```

**Example:**
```bash
curl -X PUT "http://localhost:5000/webhooks/wh_1234567890_0" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "enabled": false
  }'
```

---

#### Delete Webhook

Delete a webhook.

**Endpoint:** `DELETE /webhooks/<webhook_id>`

**Authentication:** Required

**Path Parameters:**
- `webhook_id` - Webhook ID

**Response:**
```json
{
  "status": "success",
  "message": "Webhook deleted"
}
```

**Example:**
```bash
curl -X DELETE "http://localhost:5000/webhooks/wh_1234567890_0" \
  -H "X-API-Key: your-api-key"
```

---

#### Test Webhook

Send a test payload to a webhook.

**Endpoint:** `POST /webhooks/<webhook_id>/test`

**Authentication:** Required

**Path Parameters:**
- `webhook_id` - Webhook ID

**Response:**
```json
{
  "status": "success",
  "message": "Test webhook triggered",
  "webhook_id": "wh_1234567890_0"
}
```

**Example:**
```bash
curl -X POST "http://localhost:5000/webhooks/wh_1234567890_0/test" \
  -H "X-API-Key: your-api-key"
```

---

#### Webhook Payload

When a new SMS message is received, all enabled webhooks are triggered with the following payload:

**HTTP Method:** `POST`

**Headers:**
- `Content-Type: application/json`
- `User-Agent: iMessage-API-Webhook/1.0`
- `X-Webhook-Secret: <secret>` (if secret is configured)
- `X-Webhook-ID: <webhook_id>`

**Request Body:**
```json
{
  "event": "new_sms",
  "message": {
    "id": "+1234567890_2024-01-01 12:00:00",
    "body": "Hello!",
    "sender_phone": "+1234567890",
    "sender_name": "John Doe",
    "receiver_phone": "+0987654321",
    "timestamp": "2024-01-01 12:00:00",
    "datetime": "2024-01-01T12:00:00",
    "sent_by_me": false,
    "account": {
      "login": "user@example.com",
      "service": "iMessage"
    }
  }
}
```

**Payload Fields:**
- `event` (string) - Event type, always `"new_sms"` for new messages
- `message.id` (string) - Unique message identifier
- `message.body` (string) - Message content
- `message.sender_phone` (string) - Sender's phone number or email
- `message.sender_name` (string) - Sender's display name
- `message.receiver_phone` (string) - Receiver's phone number
- `message.timestamp` (string) - Timestamp in format `YYYY-MM-DD HH:MM:SS`
- `message.datetime` (string) - ISO 8601 formatted timestamp
- `message.sent_by_me` (boolean) - Always `false` for webhook triggers (only incoming messages)
- `message.account` (object, optional) - Account information
  - `account.login` (string) - Account login/identifier
  - `account.service` (string) - Service type (`"iMessage"` or `"SMS"`)

**Webhook Requirements:**
- Webhook endpoint must respond with HTTP status code 200-299 for success
- Webhook calls have a 10-second timeout
- Failed webhooks are tracked in `failure_count`
- Successful webhooks are tracked in `success_count`
- Webhooks are triggered asynchronously (non-blocking)

---

### Debug

#### Debug Messages

Debug endpoint to check message loading status.

**Endpoint:** `GET /debug/messages`

**Authentication:** Required

**Response:**
```json
{
  "total_messages_in_db": 1000,
  "messages_loaded_in_memory": 100,
  "db_filepath": "/path/to/chat.db",
  "db_exists": true,
  "sample_messages": [...],
  "last_update": "2024-01-01T12:00:00",
  "note": "Messages are loaded on-demand, not all at startup"
}
```

**Example:**
```bash
curl "http://localhost:5000/debug/messages" \
  -H "X-API-Key: your-api-key"
```

---

### Other Endpoints

#### Get Recent Contacts

Get a list of recent contacts you've messaged.

**Endpoint:** `GET /recent_contacts`

**Authentication:** Required

**Query Parameters:**
- `num_contacts` (integer, default: `10`) - Number of contacts to return

**Response:**
```json
{
  "recent_contacts": [
    "John Doe",
    "Jane Smith"
  ]
}
```

**Example:**
```bash
curl "http://localhost:5000/recent_contacts?num_contacts=20" \
  -H "X-API-Key: your-api-key"
```

---

## Data Models

### Message Object

```json
{
  "id": "string",
  "body": "string",
  "from": "string",
  "to": "string",
  "sent_by_me": boolean,
  "timestamp": "YYYY-MM-DD HH:MM:SS",
  "datetime": "ISO 8601 timestamp",
  "account": {
    "login": "string",
    "service": "string",
    "display_name": "string"
  }
}
```

### Conversation Object

```json
{
  "contact_id": "string",
  "contact_name": "string",
  "last_message": {
    "body": "string",
    "timestamp": "YYYY-MM-DD HH:MM:SS",
    "sent_by_me": boolean
  },
  "unread_count": integer,
  "total_messages": integer,
  "last_activity": "YYYY-MM-DD HH:MM:SS",
  "account": {
    "login": "string",
    "service": "string",
    "display_name": "string"
  }
}
```

### Account Object

```json
{
  "id": "string",
  "login": "string",
  "service": "string",
  "display_name": "string",
  "signed_in": boolean,
  "type": "string",
  "source": "string"
}
```

### Webhook Object

```json
{
  "id": "string",
  "url": "string",
  "secret": "string (optional)",
  "enabled": boolean,
  "created_at": "ISO 8601 timestamp",
  "last_triggered": "ISO 8601 timestamp (nullable)",
  "success_count": integer,
  "failure_count": integer
}
```

---

## Error Handling

All errors follow a consistent format:

**Error Response:**
```json
{
  "error": "Error message description"
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created (for POST requests)
- `400` - Bad Request (invalid parameters)
- `401` - Unauthorized (invalid or missing API key)
- `404` - Not Found (resource doesn't exist)
- `500` - Internal Server Error

**Example Error Response:**
```json
{
  "error": "Missing recipient or message in the request"
}
```

---

## Rate Limiting

Currently, there are no rate limits enforced. However, it's recommended to:
- Poll `/notifications` endpoint at reasonable intervals (e.g., every 5-10 seconds)
- Avoid making excessive requests in short time periods
- Use webhooks for real-time notifications instead of frequent polling

---

## Examples

### Complete Workflow Example

```bash
# 1. Get all conversations
curl "http://localhost:5000/conversations" \
  -H "X-API-Key: your-api-key"

# 2. Get messages for a conversation
curl "http://localhost:5000/conversations/+1234567890/messages" \
  -H "X-API-Key: your-api-key"

# 3. Send a message
curl -X POST "http://localhost:5000/conversations/+1234567890/messages" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Hello!"
  }'

# 4. Set up a webhook for new messages
curl -X POST "http://localhost:5000/webhooks" \
  -H "X-API-Key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-server.com/webhook",
    "secret": "my-secret-key"
  }'

# 5. Poll for notifications
curl "http://localhost:5000/notifications?since=2024-01-01%2012:00:00" \
  -H "X-API-Key: your-api-key"
```

---

## Notes

1. **Phone Number Format**: Phone numbers should be in E.164 format (e.g., `+1234567890`) or normalized 10-digit format.

2. **Contact Names**: Contact names are resolved from `contacts.json` file. Ensure contacts are properly configured.

3. **Conversations**: Only conversations where the user has sent at least one message are returned by default.

4. **Message Limits**: Some endpoints limit the number of messages returned (e.g., conversations show max 10 recent messages).

5. **Database**: The API reads from macOS Messages database (`chat.db`). Ensure proper permissions are set.

6. **USB Devices**: USB device support requires `libimobiledevice` tools and proper device trust setup.

7. **Webhooks**: Webhooks are triggered asynchronously and won't block message processing. Failed webhooks are tracked but don't prevent message delivery.

---

## Support

For issues, questions, or contributions, please refer to the main README.md file or open an issue on the repository.
