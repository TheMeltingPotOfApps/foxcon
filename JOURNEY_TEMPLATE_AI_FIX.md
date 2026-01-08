# Journey Template Builder AI Error Fixes

## Problem
Users were experiencing errors when attempting to use the journey template builder AI feature. The errors were not properly handled or communicated to users.

## Root Causes Identified

1. **Async Initialization Issue**: Claude client initialization was called synchronously in constructor
2. **Poor Error Handling**: API errors were not properly caught and formatted
3. **Missing Error Messages**: Users didn't receive clear error messages about what went wrong
4. **No API Key Validation**: Missing API key errors weren't caught early
5. **Network Errors**: Connection/timeout errors weren't handled gracefully

## Fixes Implemented

### 1. Improved Error Handling in `generateTextFromPrompt`

**File**: `backend/src/journey-templates/journey-templates.service.ts`

**Changes:**
- Added comprehensive try-catch block
- Specific error messages for different failure scenarios:
  - Missing API key
  - Invalid API key (401)
  - Rate limit exceeded (429)
  - Service unavailable (500+)
  - Connection errors
  - Timeout errors
- Validates response before processing
- Checks for empty responses

**Before:**
```typescript
const response = await this.claudeClient.messages.create({...});
// No error handling for API failures
```

**After:**
```typescript
try {
  // ... API call ...
} catch (error: any) {
  // Specific error handling for different scenarios
  if (error.status === 401) {
    throw new BadRequestException('Invalid Anthropic API key...');
  } else if (error.status === 429) {
    throw new BadRequestException('Rate limit exceeded...');
  }
  // ... more error handling ...
}
```

### 2. Early API Key Validation

**Changes:**
- Check API key availability before starting generation
- Clear error message if API key is missing
- Prevents wasted processing time

**Code:**
```typescript
// Ensure Claude client is initialized before starting
if (!this.claudeClient) {
  await this.initializeClaudeClient();
  if (!this.claudeClient) {
    throw new BadRequestException('Anthropic API key is not configured...');
  }
}
```

### 3. Better Error Propagation

**Changes:**
- `generatePress1AudioScript` and `generateSmsContent` now properly propagate API errors
- Fallback scripts/messages only used for non-critical errors
- BadRequestException errors (API key, rate limit) are re-thrown to inform users

**Before:**
```typescript
catch (error: any) {
  // Always used fallback, hiding the real error
  return fallbackScript;
}
```

**After:**
```typescript
catch (error: any) {
  // Re-throw API configuration errors
  if (error instanceof BadRequestException) {
    throw error;
  }
  // Only use fallback for unexpected errors
  return fallbackScript;
}
```

### 4. Enhanced Main Method Error Handling

**Changes:**
- Wrapped entire generation process in try-catch
- Provides context about where failure occurred
- Ensures errors are properly formatted for frontend

**Code:**
```typescript
async generateAiPoweredJourneyTemplate(...) {
  try {
    // ... entire generation process ...
  } catch (error: any) {
    // Log error with context
    this.logger.error(`Failed to generate AI-powered journey template: ${error.message}`, error.stack);
    
    // Re-throw BadRequestException as-is
    if (error instanceof BadRequestException) {
      throw error;
    }
    
    // Wrap other errors with helpful message
    throw new BadRequestException(`Failed to generate journey template: ${error.message}`);
  }
}
```

### 5. Response Validation

**Changes:**
- Validates AI response is not empty
- Checks response structure before processing
- Prevents processing invalid responses

**Code:**
```typescript
if (!text || text.trim().length === 0) {
  throw new Error('AI service returned empty response');
}
```

## Error Messages Users Will See

### Missing API Key
```
"Anthropic API key is not configured. Please configure ANTHROPIC_API_KEY in system settings."
```

### Invalid API Key
```
"Invalid Anthropic API key. Please check your ANTHROPIC_API_KEY configuration."
```

### Rate Limit
```
"Anthropic API rate limit exceeded. Please try again in a few moments."
```

### Service Unavailable
```
"Anthropic API service is temporarily unavailable. Please try again later."
```

### Connection Error
```
"Cannot connect to Anthropic API. Please check your network connection."
```

### Timeout
```
"AI service request timed out. Please try again."
```

## Testing Recommendations

1. **Test Missing API Key**:
   - Remove ANTHROPIC_API_KEY from config
   - Attempt to generate journey template
   - Should see clear error message

2. **Test Invalid API Key**:
   - Set invalid API key
   - Attempt to generate journey template
   - Should see "Invalid API key" error

3. **Test Rate Limiting**:
   - Make many rapid requests
   - Should see rate limit error

4. **Test Network Issues**:
   - Disconnect network temporarily
   - Should see connection error

5. **Test Successful Generation**:
   - With valid API key
   - Should generate template successfully

## Files Modified

1. `backend/src/journey-templates/journey-templates.service.ts`
   - Enhanced `generateTextFromPrompt` error handling
   - Added early API key validation
   - Improved error propagation in `generatePress1AudioScript`
   - Improved error propagation in `generateSmsContent`
   - Added main method error handling

## Impact

**Before:**
- Errors were silently caught or poorly formatted
- Users didn't know what went wrong
- Missing API key caused confusing failures
- Network errors weren't handled

**After:**
- Clear, actionable error messages
- Early validation prevents wasted processing
- Proper error propagation to frontend
- Better logging for debugging
- Graceful handling of all error scenarios

## Next Steps

1. **Monitor Error Logs**: Watch for common error patterns
2. **Add Retry Logic**: Consider adding retry for transient errors
3. **Rate Limit Handling**: Implement exponential backoff for rate limits
4. **User Guidance**: Add UI hints about API key configuration
