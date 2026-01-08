# System Optimization and TTS Service Improvements

## Overview
Comprehensive improvements to system stability, TTS reliability, and service management.

## Changes Implemented

### 1. Robust TTS Service Startup (Outside PM2)

**New File**: `kokoro/start-kokoro.sh`

**Features:**
- Robust startup script that doesn't rely on PM2
- Automatic port cleanup before starting
- PID file management for process tracking
- Comprehensive error handling and logging
- Status checking and health monitoring
- Automatic retry logic

**Usage:**
```bash
# Start service
/root/SMS/kokoro/start-kokoro.sh start

# Stop service
/root/SMS/kokoro/start-kokoro.sh stop

# Restart service
/root/SMS/kokoro/start-kokoro.sh restart

# Check status
/root/SMS/kokoro/start-kokoro.sh status
```

**Benefits:**
- More reliable than PM2 for Python services
- Better error handling and logging
- Easier debugging with dedicated log files
- Process survives terminal closure (nohup)
- Automatic cleanup of stale processes

### 2. Updated Restart Script

**File**: `restart.sh`

**Changes:**
- Removed PM2 dependency for TTS service
- Uses robust startup script instead
- Better port cleanup before starting services
- Improved status checking
- More comprehensive error messages

**Improvements:**
- Cleaner service management
- Better error reporting
- More reliable startup sequence
- Proper cleanup of all services

### 3. Updated Stop Script

**File**: `stop.sh`

**Changes:**
- Added TTS service cleanup
- Uses startup script for clean shutdown
- Removes PM2 instances
- Comprehensive process cleanup

### 4. TTS Reliability Fixes

**File**: `backend/src/kokoro/kokoro.service.ts`

**Improvements:**
- Retry logic with exponential backoff (3 retries)
- Request queue with concurrency limits (max 3 concurrent)
- Circuit breaker pattern (opens after 5 failures)
- Reduced timeout (60s instead of 180s)
- Better error messages

### 5. Database Connection Pool Optimization

**File**: `backend/src/config/database.config.ts`

**Settings:**
- Max connections: 40 (supports frontend + Asterisk + backend)
- Min connections: 5
- Idle timeout: 30 seconds
- Connection validation enabled
- Health monitoring service

### 6. Journey Template AI Error Handling

**File**: `backend/src/journey-templates/journey-templates.service.ts`

**Improvements:**
- Early API key validation
- Comprehensive error handling
- Specific error messages for different failure scenarios
- Better error propagation

### 7. Voice Template Preview Fixes

**File**: `backend/src/voice-messages/voice-messages.service.ts`

**Improvements:**
- Voice ID validation
- Text validation
- Better error messages
- Comprehensive error handling

## Service Management

### Starting Services

```bash
# Start all services
./restart.sh

# Start TTS service only
/root/SMS/kokoro/start-kokoro.sh start
```

### Stopping Services

```bash
# Stop all services
./stop.sh

# Stop TTS service only
/root/SMS/kokoro/start-kokoro.sh stop
```

### Checking Status

```bash
# Check TTS service status
/root/SMS/kokoro/start-kokoro.sh status

# Check all services
./restart.sh  # Will show status at end
```

## Log Files

### TTS Service Logs
- **Standard output**: `/root/SMS/kokoro/logs/kokoro-tts.log`
- **Errors**: `/root/SMS/kokoro/logs/kokoro-tts-error.log`
- **PID file**: `/root/SMS/kokoro/kokoro-tts.pid`

### View Logs
```bash
# TTS logs
tail -f /root/SMS/kokoro/logs/kokoro-tts.log
tail -f /root/SMS/kokoro/logs/kokoro-tts-error.log

# Backend logs
tail -f /tmp/backend.log

# Frontend logs
tail -f /tmp/frontend.log
```

## Troubleshooting

### TTS Service Won't Start

1. **Check port availability:**
   ```bash
   lsof -i :8000
   ```

2. **Check error log:**
   ```bash
   tail -30 /root/SMS/kokoro/logs/kokoro-tts-error.log
   ```

3. **Manually start to see errors:**
   ```bash
   cd /root/SMS/kokoro
   python3 api_server.py
   ```

4. **Check Python dependencies:**
   ```bash
   python3 -c "import uvicorn, fastapi, torch"
   ```

### Port Already in Use

```bash
# Kill process on port 8000
lsof -ti :8000 | xargs kill -9

# Or use the startup script
/root/SMS/kokoro/start-kokoro.sh stop
/root/SMS/kokoro/start-kokoro.sh start
```

### Service Keeps Dying

1. **Check error logs** for Python errors
2. **Check system resources** (memory, CPU)
3. **Verify Python dependencies** are installed
4. **Check model files** are available

## Performance Optimizations

### TTS Service
- **Concurrency limit**: 3 concurrent requests
- **Request queue**: Automatic queuing when at limit
- **Retry logic**: 3 retries with exponential backoff
- **Circuit breaker**: Prevents cascading failures
- **Timeout**: 60 seconds (reduced from 180s)

### Database
- **Connection pool**: 40 max connections
- **Health monitoring**: Every 30 seconds
- **Connection validation**: Before use
- **Idle cleanup**: 30 seconds

## Files Created/Modified

### New Files
1. `kokoro/start-kokoro.sh` - Robust TTS startup script
2. `backend/src/database/database-health.service.ts` - Health monitoring
3. `backend/scripts/test-db-connection.js` - Connection testing
4. `backend/scripts/validate-db-config.js` - Config validation
5. `backend/scripts/check-db-connections.sh` - Connection monitoring
6. `backend/scripts/kill-idle-connections.sh` - Connection cleanup

### Modified Files
1. `restart.sh` - Updated to use robust TTS startup
2. `stop.sh` - Added TTS cleanup
3. `backend/src/kokoro/kokoro.service.ts` - Added retry, queue, circuit breaker
4. `backend/src/config/database.config.ts` - Optimized pool settings
5. `backend/src/journey-templates/journey-templates.service.ts` - Better error handling
6. `backend/src/voice-messages/voice-messages.service.ts` - Preview fixes
7. `backend/src/main.ts` - Unhandled promise rejection handler
8. `backend/src/config/config.service.ts` - Updated Anthropic API key

## Next Steps

1. **Monitor TTS service** for stability
2. **Watch database connections** for leaks
3. **Review error logs** regularly
4. **Optimize queries** if connection issues persist
5. **Consider systemd service** for even more robustness (optional)

## Summary

The system is now more robust with:
- ✅ Reliable TTS service (no PM2 dependency)
- ✅ Better error handling throughout
- ✅ Optimized database connection pool
- ✅ Comprehensive health monitoring
- ✅ Improved restart/stop scripts
- ✅ Better logging and debugging
