#!/bin/bash

# Vision Service Management Script
# Manages the native macOS Vision Service (runs outside Docker)

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
VISION_SERVICE_DIR="$PROJECT_ROOT/packages/vision-service"
VISION_SERVICE_PID_FILE="$PROJECT_ROOT/.vision-service.pid"
VISION_SERVICE_PORT="${VISION_SERVICE_PORT:-8080}"
VISION_SERVICE_HOST="${VISION_SERVICE_HOST:-0.0.0.0}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check if service is running
is_running() {
    if [ -f "$VISION_SERVICE_PID_FILE" ]; then
        local pid=$(cat "$VISION_SERVICE_PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0
        else
            rm -f "$VISION_SERVICE_PID_FILE"
            return 1
        fi
    fi
    return 1
}

# Function to start the service
start() {
    if is_running; then
        echo -e "${YELLOW}Vision Service is already running (PID: $(cat "$VISION_SERVICE_PID_FILE"))${NC}"
        return 0
    fi

    echo -e "${GREEN}Starting Vision Service...${NC}"
    cd "$VISION_SERVICE_DIR"
    
    # Build if needed
    if [ ! -f ".build/release/VisionService" ]; then
        echo "Building Vision Service..."
        swift build -c release
    fi
    
    # Start service in background
    nohup swift run VisionService > "$PROJECT_ROOT/logs/vision-service.log" 2>&1 &
    local pid=$!
    echo $pid > "$VISION_SERVICE_PID_FILE"
    
    # Wait a moment and check if it's still running
    sleep 2
    if is_running; then
        echo -e "${GREEN}Vision Service started (PID: $pid, Port: $VISION_SERVICE_PORT)${NC}"
        echo "Logs: $PROJECT_ROOT/logs/vision-service.log"
        return 0
    else
        echo -e "${RED}Failed to start Vision Service${NC}"
        rm -f "$VISION_SERVICE_PID_FILE"
        return 1
    fi
}

# Function to stop the service
stop() {
    if ! is_running; then
        echo -e "${YELLOW}Vision Service is not running${NC}"
        return 0
    fi

    local pid=$(cat "$VISION_SERVICE_PID_FILE")
    echo -e "${GREEN}Stopping Vision Service (PID: $pid)...${NC}"
    
    # Try graceful shutdown first
    kill "$pid" 2>/dev/null
    
    # Wait up to 5 seconds
    for i in {1..5}; do
        if ! ps -p "$pid" > /dev/null 2>&1; then
            break
        fi
        sleep 1
    done
    
    # Force kill if still running
    if ps -p "$pid" > /dev/null 2>&1; then
        kill -9 "$pid" 2>/dev/null
    fi
    
    rm -f "$VISION_SERVICE_PID_FILE"
    echo -e "${GREEN}Vision Service stopped${NC}"
}

# Function to check service status
status() {
    if is_running; then
        local pid=$(cat "$VISION_SERVICE_PID_FILE")
        echo -e "${GREEN}Vision Service is running (PID: $pid)${NC}"
        
        # Check if service responds to health check
        if curl -s "http://localhost:$VISION_SERVICE_PORT/health" > /dev/null 2>&1; then
            echo -e "${GREEN}Service is healthy and responding${NC}"
            return 0
        else
            echo -e "${YELLOW}Service process is running but not responding to health checks${NC}"
            return 1
        fi
    else
        echo -e "${RED}Vision Service is not running${NC}"
        return 1
    fi
}

# Function to restart the service
restart() {
    stop
    sleep 1
    start
}

# Function to show logs
logs() {
    if [ -f "$PROJECT_ROOT/logs/vision-service.log" ]; then
        tail -f "$PROJECT_ROOT/logs/vision-service.log"
    else
        echo -e "${YELLOW}No log file found${NC}"
    fi
}

# Function to test the service
test() {
    echo -e "${GREEN}Testing Vision Service...${NC}"
    
    if ! is_running; then
        echo -e "${YELLOW}Service is not running. Starting it...${NC}"
        start
        sleep 2
    fi
    
    # Health check
    echo "Health Check:"
    curl -s "http://localhost:$VISION_SERVICE_PORT/health" | jq '.' 2>/dev/null || curl -s "http://localhost:$VISION_SERVICE_PORT/health"
    echo ""
    
    # Hardware acceleration check
    echo "Hardware Acceleration:"
    curl -s "http://localhost:$VISION_SERVICE_PORT/hardware-acceleration/available" | jq '.' 2>/dev/null || curl -s "http://localhost:$VISION_SERVICE_PORT/hardware-acceleration/available"
    echo ""
    
    # Apple Intelligence check (macOS 15+)
    echo "Apple Intelligence:"
    curl -s "http://localhost:$VISION_SERVICE_PORT/apple-intelligence/available" | jq '.' 2>/dev/null || curl -s "http://localhost:$VISION_SERVICE_PORT/apple-intelligence/available"
    echo ""
}

# Main command handling
case "$1" in
    start)
        start
        ;;
    stop)
        stop
        ;;
    restart)
        restart
        ;;
    status)
        status
        ;;
    logs)
        logs
        ;;
    test)
        test
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|logs|test}"
        echo ""
        echo "Commands:"
        echo "  start   - Start the Vision Service"
        echo "  stop    - Stop the Vision Service"
        echo "  restart - Restart the Vision Service"
        echo "  status  - Check if service is running"
        echo "  logs    - Show service logs"
        echo "  test    - Test service endpoints"
        exit 1
        ;;
esac

exit $?

