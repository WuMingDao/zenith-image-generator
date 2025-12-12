## Local Development and Contribute

### 1. Fork and clone the repository

1. Go to [https://github.com/WuMingDao/zenith-image-generator](https://github.com/WuMingDao/zenith-image-generator)
2. Click **Fork** button in the top right corner
3. Clone your forked repository:

```bash
git clone https://github.com/YOUR_USERNAME/zenith-image-generator.git
cd zenith-image-generator
```

### 2. Install dependencies

```bash
pnpm install
```

### 3. Configure environment

```bash
cp apps/web/.env.example apps/web/.env
```

### 4. Start development server

**Option A: Full stack with Cloudflare Pages**

> ⚠️ **Help Wanted**: This method has compatibility issues with wrangler 4.x. PRs welcome to fix this! See [issue tracker](https://github.com/WuMingDao/zenith-image-generator/issues/10).

**Option B: Frontend + API separately (Recommended)**

Runs frontend and API in separate terminals.

```bash
# Step 1: Set VITE_API_URL in apps/web/.env
# VITE_API_URL=http://localhost:8787

# Step 2: Start API (Terminal 1)
pnpm dev:api

# Step 3: Start Web (Terminal 2)
pnpm dev:web
```

Access via `http://localhost:5173`

> **Note**: Set `VITE_API_URL=http://localhost:8787` in `apps/web/.env`

### 5. Open browser

Navigate to `http://localhost:5173`

### 6. LAN Access (Optional)

If you want to access the dev server from other devices on your local network (e.g., testing on mobile):

**Problem**: By default, both frontend and API only listen on `localhost`, which is not accessible from other devices.

**Solution**:

1. **Update `.env`** - Point API URL to your machine's LAN IP:

```bash
# apps/web/.env
VITE_API_URL=http://192.168.1.9:8787  # Replace with your IP
```

2. **Update `wrangler.toml`** - Make API listen on all interfaces:

```toml
# apps/api/wrangler.toml
[dev]
port = 8787
ip = "0.0.0.0"

[vars]
CORS_ORIGINS = "http://localhost:5173,http://192.168.1.9:5173"  # Add your LAN IP
```

3. **Start with host flag**:

```bash
# Terminal 1: Start API
pnpm dev:api

# Terminal 2: Start Web with LAN access
pnpm dev:web -- --host=0.0.0.0
```

4. **Access from other devices**: `http://192.168.1.9:5173`

> **Tip**: Find your LAN IP with `ip addr` (Linux) or `ipconfig` (Windows)
