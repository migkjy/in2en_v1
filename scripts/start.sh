
#!/bin/bash

# Kill any running node processes
pkill -f "node" || true
sleep 1

# Run the development server
npm run dev
