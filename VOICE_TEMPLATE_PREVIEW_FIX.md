# Voice Template Preview Error Fixes

## Problem
Users were experiencing 400 errors when trying to preview voice templates. The error message showed "Failed to preview voice template: Z" which was unclear and unhelpful.

## Root Causes Identified

1. **Missing Voice ID Validation**: Templates without voiceId were not caught early
2. **Empty Text Validation**: No check for empty message content after variable substitution
3. **Poor Error Messages**: Errors from Kokoro service weren't properly formatted
4. **Missing Error Handling**: Errors weren't wrapped with context

## Fixes Implemented

### 1. Added Voice ID Validation

**File**: `backend/src/voice-messages/voice-messages.service.ts`

**Changes:**
- Validate voiceId is set before attempting audio generation
- Clear error message if voiceId is missing
- Check both kokoroVoiceId and elevenLabsVoiceId

**Code:**
```typescript
// Validate voice ID is set
if (!finalVoiceId) {
  throw new BadRequestException(
    'Voice template does not have a voice ID configured. Please set kokoroVoiceId, elevenLabsVoiceId, or select a voice preset.'
  );
}
```

### 2. Added Text Validation

**Changes:**
- Validate template has message content
- Validate substituted text is not empty
- Clear error messages for both cases

**Code:**
```typescript
// Validate template has message content
if (!template.messageContent || template.messageContent.trim().length === 0) {
  throw new BadRequestException('Voice template message content is empty. Please add message content to the template.');
}

// Validate text is not empty
if (!substitutedText || substitutedText.trim().length === 0) {
  throw new BadRequestException(
    'Message content is empty after variable substitution. Please check your template message content and variable values.'
  );
}
```

### 3. Enhanced Error Handling

**Changes:**
- Wrapped entire preview method in try-catch
- Proper error propagation (BadRequestException and NotFoundException re-thrown)
- Better error messages with context
- Comprehensive logging

**Code:**
```typescript
try {
  // ... preview logic ...
} catch (error: any) {
  this.logger.error(`Failed to preview voice template ${templateId}: ${error.message}`, error.stack);
  
  // Re-throw known exceptions
  if (error instanceof BadRequestException || error instanceof NotFoundException) {
    throw error;
  }
  
  // Wrap other errors
  throw new BadRequestException(
    `Failed to generate preview: ${error.message || 'Unknown error occurred. Please check your TTS service configuration.'}`
  );
}
```

### 4. Improved Logging

**Changes:**
- Added logging when generating preview audio
- Include voiceId in logs for debugging
- Log errors with full stack trace

**Code:**
```typescript
this.logger.log(`Generating preview audio for template ${template.id} with voice ${finalVoiceId}`);
```

## Error Messages Users Will See

### Missing Voice ID
```
"Voice template does not have a voice ID configured. Please set kokoroVoiceId, elevenLabsVoiceId, or select a voice preset."
```

### Empty Message Content
```
"Voice template message content is empty. Please add message content to the template."
```

### Empty After Substitution
```
"Message content is empty after variable substitution. Please check your template message content and variable values."
```

### TTS Service Errors
```
"Failed to generate preview: [specific error from TTS service]"
```

## Testing Recommendations

1. **Test Missing Voice ID**:
   - Create template without voiceId
   - Attempt preview
   - Should see clear error message

2. **Test Empty Message**:
   - Create template with empty messageContent
   - Attempt preview
   - Should see error about empty content

3. **Test Empty After Substitution**:
   - Create template with only variables
   - Provide empty variable values
   - Should see error about empty after substitution

4. **Test Valid Preview**:
   - Create template with voiceId and messageContent
   - Provide variable values
   - Should generate preview successfully

## Files Modified

1. `backend/src/voice-messages/voice-messages.service.ts`
   - Added voiceId validation
   - Added text validation
   - Enhanced error handling
   - Improved logging

## Impact

**Before:**
- Unclear error messages ("Z")
- No validation of required fields
- Errors not properly caught
- Poor user experience

**After:**
- Clear, actionable error messages
- Early validation prevents wasted processing
- Proper error handling and logging
- Better user experience with helpful guidance

## Next Steps

1. **Monitor Error Logs**: Watch for common error patterns
2. **User Guidance**: Add UI hints about required fields
3. **Template Validation**: Consider validating templates on creation
4. **Error Recovery**: Consider fallback options for common errors
