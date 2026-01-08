# AMI Originate Action Payload

This document shows the exact payload structure sent to Asterisk Manager Interface (AMI) when making a call.

## Payload Structure

```json
{
  "action": "Originate",
  "actionid": "1704067200000_12345",
  "channel": "PJSIP/+1234567890@MC",
  "context": "DynamicIVR",
  "exten": "s",
  "priority": 1,
  "callerid": "\"+19876543210\" <+19876543210>",
  "timeout": 30000,
  "async": true,
  "variable": {
    "to": "+1234567890",
    "from": "+19876543210",
    "transfer_number": "+15551234567",
    "ivr_file": "welcome_message",
    "ivr_vm_file": "welcome_message",
    "wait_strategy": "random",
    "press_key": "1",
    "amd_enabled": "true",
    "transfer_prefix": "",
    "custom_call_id": "1704067200000_12345",
    "trunk": "MC",
    "TRANSFER_NUMBER": "+15551234567",
    "FROM_NUMBER": "+19876543210",
    "TO_NUMBER": "+1234567890",
    "TRUNK": "MC",
    "IVR_FILE": "welcome_message",
    "IVR_VM_FILE": "welcome_message",
    "PRESS_KEY": "1",
    "AMD_ENABLED": "true"
  }
}
```

## Field Descriptions

### Top-Level Fields

- **action**: Always `"Originate"` - the AMI action type
- **actionid**: Unique identifier for this action (timestamp + random number)
- **channel**: PJSIP channel format: `PJSIP/{formattedTo}@{trunk}`
  - Example: `PJSIP/+1234567890@MC`
- **context**: Dialplan context (default: `"DynamicIVR"`)
- **exten**: Extension to dial (default: `"s"`)
- **priority**: Priority in dialplan (default: `1`)
- **callerid**: Caller ID in format `"{displayName}" <{number}>`
  - Example: `"+19876543210" <+19876543210>`
- **timeout**: Call timeout in milliseconds (default: `30000` = 30 seconds)
- **async**: Whether the action is asynchronous (default: `true`)

### Variable Fields (Channel Variables)

All variables are passed in both lowercase and uppercase (for dialplan compatibility):

#### Lowercase Variables:
- **to**: Destination phone number (E164 format: `+1234567890`)
- **from**: Caller ID number (E164 format: `+19876543210`)
- **transfer_number**: Transfer destination number (E164 format: `+15551234567`)
  - ⚠️ **Note**: No "5544" prefix is added - uses E164 format directly
- **ivr_file**: IVR audio file name (without extension)
- **ivr_vm_file**: Voicemail audio file name (without extension)
- **wait_strategy**: Wait strategy for IVR (default: `"random"`)
- **press_key**: Key to press for transfer (hardcoded: `"1"`)
- **amd_enabled**: Answering Machine Detection enabled (default: `"true"`)
- **transfer_prefix**: Transfer prefix (usually empty: `""`)
- **custom_call_id**: Custom call identifier (same as actionid)
- **trunk**: PJSIP trunk name (default: `"MC"`)

#### Uppercase Variables (for dialplan compatibility):
- **TRANSFER_NUMBER**: Same as `transfer_number`
- **FROM_NUMBER**: Same as `from`
- **TO_NUMBER**: Same as `to`
- **TRUNK**: Same as `trunk`
- **IVR_FILE**: Same as `ivr_file`
- **IVR_VM_FILE**: Same as `ivr_vm_file`
- **PRESS_KEY**: Same as `press_key`
- **AMD_ENABLED**: Same as `amd_enabled`

## Example Scenarios

### Scenario 1: Call with Transfer Number
```json
{
  "action": "Originate",
  "actionid": "1704067200000_12345",
  "channel": "PJSIP/+1234567890@MC",
  "context": "DynamicIVR",
  "exten": "s",
  "priority": 1,
  "callerid": "\"+19876543210\" <+19876543210>",
  "timeout": 30000,
  "async": true,
  "variable": {
    "to": "+1234567890",
    "from": "+19876543210",
    "transfer_number": "+15551234567",
    "ivr_file": "appointment_reminder",
    "ivr_vm_file": "appointment_reminder",
    "wait_strategy": "random",
    "press_key": "1",
    "amd_enabled": "true",
    "transfer_prefix": "",
    "custom_call_id": "1704067200000_12345",
    "trunk": "MC",
    "TRANSFER_NUMBER": "+15551234567",
    "FROM_NUMBER": "+19876543210",
    "TO_NUMBER": "+1234567890",
    "TRUNK": "MC",
    "IVR_FILE": "appointment_reminder",
    "IVR_VM_FILE": "appointment_reminder",
    "PRESS_KEY": "1",
    "AMD_ENABLED": "true"
  }
}
```

### Scenario 2: Call without Transfer Number
```json
{
  "action": "Originate",
  "actionid": "1704067200000_12345",
  "channel": "PJSIP/+1234567890@MC",
  "context": "DynamicIVR",
  "exten": "s",
  "priority": 1,
  "callerid": "\"+19876543210\" <+19876543210>",
  "timeout": 30000,
  "async": true,
  "variable": {
    "to": "+1234567890",
    "from": "+19876543210",
    "transfer_number": "",
    "ivr_file": "welcome_message",
    "ivr_vm_file": "",
    "wait_strategy": "random",
    "press_key": "1",
    "amd_enabled": "true",
    "transfer_prefix": "",
    "custom_call_id": "1704067200000_12345",
    "trunk": "MC",
    "TRANSFER_NUMBER": "",
    "FROM_NUMBER": "+19876543210",
    "TO_NUMBER": "+1234567890",
    "TRUNK": "MC",
    "IVR_FILE": "welcome_message",
    "IVR_VM_FILE": "",
    "PRESS_KEY": "1",
    "AMD_ENABLED": "true"
  }
}
```

## Important Notes

1. **Phone Number Format**: All phone numbers are formatted in E164 format (`+1234567890`) using `PhoneFormatter.formatToE164()`

2. **Transfer Number**: 
   - No "5544" prefix is added
   - Uses E164 format directly
   - If not provided, `transfer_number` will be an empty string

3. **Channel Variables**: Variables are passed in both lowercase and uppercase for backward compatibility with different dialplan implementations

4. **IVR Files**: File names should not include extensions (`.wav`, `.mp3`, etc.) - Asterisk will handle the format

5. **Async Mode**: The action is sent in async mode, meaning Asterisk will respond immediately and send events separately

## Code Location

The payload is constructed in:
- File: `backend/src/asterisk/ami.service.ts`
- Method: `makeCall()`
- Lines: 219-251

