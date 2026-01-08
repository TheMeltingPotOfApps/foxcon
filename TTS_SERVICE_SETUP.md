# TTS Service Robust Setup Guide

## Overview
The Kokoro TTS service is now configured to run robustly outside of PM2, using a direct Python process with nohup for reliability.

## Service Management

### Starting the TTS Service

**Method 1: Using the startup script (recommended)**
```bash
cd /root/SMS/kokoro
./start-kokoro.sh start
```

**Method 2: Direct start (used by restart.sh)**
```bash
cd /root/SMS/kokoro
mkdir -p logs
nohup python3 api_server.py >> logs/kokoro-tts.log 2>> logs/kokoro-tts-error.log < /dev/null &
echo $! > kokoro-tts.pid
```

**Method 3: Via restart.sh (starts all services)**
```bash
cd /root/SMS
./restart.sh
```

### Stopping the TTS Service

**Method 1: Using the startup script**
```bash
cd /root/SMS/kokoro
./start-kokoro.sh stop
```

**Method 2: Manual stop**
```bash
# Stop by PID file
if [ -f /root/SMS/kokoro/kokoro-tts.pid ]; then
    kill $(cat /root/SMS/kokoro/kokoro-tts.pid) 2>/dev/null
    rm /root/SMS/kokoro/kokoro-tts.pid
fi

# Kill any remaining processes
pkill -9 -f "api_server.py" 2>/dev/null
lsof -ti :8000 | xargs kill -9 2>/dev/null
```

**Method 3: Via stop.sh (stops all services)**
```bash
cd /root/SMS
./stop.sh
```

### Checking Status

```bash
# Using startup script
cd /root/SMS/kokoro
./start-kokoro.sh status

# Manual check
if [ -f /root/SMS/kokoro/kokoro-tts.pid ]; then
    PID=$(cat /root/SMS/kokoro/kokoro-tts.pid)
    if ps -p $PID > /dev/null 2>&1 && lsof -i :8000 > /dev/null 2>&1; then
        echo "Service is running (PID: $PID)"
    else
        echo "Service is not running"
    fi
else
    echo "Service is not running (no PID file)"
fi
```

## Log Files

- **Standard output**: `/root/SMS/kokoro/logs/kokoro-tts.log`
- **Errors**: `/root/SMS/kokoro/logs/kokoro-tts-error.log`
- **PID file**: `/root/SMS/kokoro/kokoro-tts.pid`

### View Logs

```bash
# Standard logs
tail -f /root/SMS/kokoro/logs/kokoro-tts.log

# Error logs
tail -f /root/SMS/kokoro/logs/kokoro-tts-error.log

# Last 50 lines of errors
tail -50 /root/SMS/kokoro/logs/kokoro-tts-error.log
```

## Troubleshooting

### Service Won't Start

1. **Check if port is in use:**
   ```bash
   lsof -i :8000
   ```

2. **Kill processes on port:**
   ```bash
   lsof -ti :8000 | xargs kill -9
   ```

3. **Check error log:**
   ```bash
   tail -30 /root/SMS/kokoro/logs/kokoro-tts-error.log
   ```

4. **Test Python dependencies:**
   ```bash
   python3 -c "import uvicorn, fastapi, torch"
   ```

5. **Start manually to see errors:**
   ```bash
   cd /root/SMS/kokoro
   python3 api_server.py
   ```

### Service Keeps Dying

1. **Check error logs** for Python errors or import issues
2. **Check system resources** (memory, disk space)
3. **Verify model files** are available
4. **Check Python version** (requires Python 3.7+)

### Port Already in Use

```bash
# Find and kill process on port 8000
lsof -ti :8000 | xargs kill -9

# Or use the startup script
cd /root/SMS/kokoro
./start-kokoro.sh stop
./start-kokoro.sh start
```

## Integration with restart.sh

The `restart.sh` script now:
1. Stops any PM2 instances
2. Kills existing TTS processes
3. Frees port 8000
4. Starts TTS service with nohup
5. Saves PID for tracking
6. Verifies startup

## Benefits of This Approach

1. **No PM2 dependency** - More reliable for Python services
2. **Process isolation** - Survives terminal closure
3. **Better logging** - Dedicated log files
4. **PID tracking** - Easy to find and manage process
5. **Automatic cleanup** - Script handles port conflicts
6. **Robust startup** - Handles edge cases

## Files

- **Startup script**: `/root/SMS/kokoro/start-kokoro.sh`
- **PID file**: `/root/SMS/kokoro/kokoro-tts.pid`
- **Logs**: `/root/SMS/kokoro/logs/`
- **API server**: `/root/SMS/kokoro/api_server.py`

## Next Steps

1. Test the service startup: `./start-kokoro.sh start`
2. Verify it's running: `./start-kokoro.sh status`
3. Test API endpoint: Check if port 8000 responds
4. Monitor logs for any issues
5. Use `./restart.sh` to start all services together
