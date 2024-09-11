# Auto-Clockify

This script automates Clockify time tracking based on changes to `package.json` files. It watches for updates and logs time entries accordingly. The script can be used locally, on a server, or as part of a CI/CD pipeline.

## Quick Start

1. **Clone the repository:**
   ```sh
   git clone git@github.com:7flash/clockify-cli-auto.git
   cd clockify-cli-auto
   ```

2. **Install dependencies:**
   ```sh
   bun install
   ```

3. **Run tests:**
   ```sh
   bun test --timeout 10000
   ```

4. **Example usage:**
	Start background process:
	```sh
	CHECK_INTERVAL=2000 WATCH_FILES=./package.json,/Users/gur/Documents/clockify-cli-auto/package.json bun auto-clockify.ts
	```

	Trigger update with git pull, assuming it incremented version in package.json, or trigger it manually:
   ```sh
   npm version patch
   ```
