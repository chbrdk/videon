Coolify Deployment Guide & Best Practices
Objective: Ensure smooth, robost deployments of complex full-stack applications (Next.js + FastAPI + Worker + AI/Vector DBs) on Coolify/Docker.

1. Project Setup & GitHub Integration (Day 0)
A. Git Repository Setup
Initialize: git init locally.
Ignore: Ensure 
.env
, __pycache__, node_modules, and 
data/
 are in .gitignore.
Push: Create a NEW repository on GitHub (Private) and push your code.
git remote add origin https://github.com/your-org/your-repo.git
git branch -M main
git push -u origin main
B. Coolify Project Configuration
New Resource: In Coolify, click "New Resource" -> "Public Repository" (or Private if you connected GitHub App).
Select Repository: Choose the repo you just pushed.
Build Pack: Select "Docker Compose".
Coolify will ask for the path to your compose file. Default is 
/docker-compose.yml
.
Domains: Set the domains for your services (e.g., api.domain.com for the API service, app.domain.com for Web).
C. Environment Variables (Secret Injection)
CRITICAL: Before you deploy, you must copy your local 
.env
 values to Coolify.

Go to Environment Variables in your Coolify resource.
Bulk Edit: Paste the ENTIRE content of your local 
.env
.
Modifications: Update specific values for production:
APP_ENV -> production
QDRANT_URL -> External URL (e.g. https://qdrant...:443)
DATABASE_URL -> External Postgres URL (if using external DB).
D. Automated Deployment (CI/CD)
Webhooks: Coolify automatically configured a GitHub Webhook when you connected the repo.
Trigger: Any push to main (or your configured branch) will trigger a "Pull & Build".
Verification: Check the "Deployments" tab in Coolify to see the build logs.
2. Infrastructure & Docker Compose (
docker-compose.yml
)
A. Shared Storage (Critical for API + Workers)
If your API saves files that a background worker needs to process, they must share a volume. Anti-Pattern: Relying on ephemeral container storage. Best Practice:

services:
  api:
    volumes:
      - app_data:/app/data
  worker:
    volumes:
      - app_data:/app/data
volumes:
  app_data:
B. Worker Configuration
Workers are "deaf" by default if you use custom queues. Anti-Pattern: celery -A app worker (listens only to 'celery' queue). Best Practice: Explicitly list all queues your app uses.

command: celery -A app.celery_app worker -Q celery,ingestion,journeys,analytics
C. Healthchecks
Coolify needs to know when your container is "healthy" to route traffic or restart it. Best Practice: Use CMD-SHELL healthchecks in 
docker-compose.yml
.

healthcheck:
  test: ["CMD-SHELL", "curl -f http://localhost:8000/health || exit 1"]
  interval: 30s
  retries: 3
2. Networking & External Services
A. Connectivity to Managed Services (Qdrant, Redis, Postgres)
When using managed services (Coolify Resources or External Clouds):

Do NOT define them as services in your 
docker-compose.yml
 (this creates a confusing local ghost service).
Use External URLs provided by the platform.
Ports Matter:
Internal: Often uses raw ports (e.g., 6333 for Qdrant, 5432 for PG).
External (Public): Almost always exposed via Reverse Proxy on Port 443 (HTTPS).
Lesson Failed: Trying to connect to https://hostname:6333 usually fails because the firewall blocks it.
Lesson Learned: Connect to https://hostname:443 (standard HTTPS).
B. SSL Verification
When connecting to internal IPs or complex setups, SSL hostnames might not match. Best Practice: Always implement a verify_ssl flag in your application config.

# config.py
qdrant_verify_ssl: bool = True
# client instantiation
client = QdrantClient(url=..., verify=settings.qdrant_verify_ssl)
Why? It allows you to set QDRANT_VERIFY_SSL=False as a "Nuclear Option" to bypass connection issues without code changes.

C. DNS Issues
Docker internal DNS can occasionally fail to resolve strange external domains. Emergency Fix: Use IP-based connection + verify_ssl=False. Better Fix: Use standard public standard ports (443) which are more reliably routed.

3. Configuration Management
A. Pydantic Settings
Ensure every single environment variable you expect is defined in your 
Settings
 model. Anti-Pattern: os.getenv("VARIABLE") randomly in code. Best Practice: 
config.py
 is the Source of Truth.

class Settings(BaseSettings):
    qdrant_url: str
    qdrant_api_key: str | None = None  # Handle Auth!
    qdrant_verify_ssl: bool = True
B. Missing Config = 500 Error
Failed deployments are often due to missing env vars.

Verification Step: Before deploying, grep your codebase for settings. and ensure every match is in your 
.env
 or Coolify Variables.
4. Build Optimization
A. Dockerfile
Issue: Builds running out of memory (OOM) or error 255. Fixes:

Multi-stage builds: Only copy requirements.txt / 
package.json
 first, install dependencies, then copy source code.
Explicit Pip: Use --no-cache-dir to save space.
Clean Dependencies: Remove heavy, unused libraries from 
pyproject.toml
.
5. Database & Migrations
A. Idempotency is King
Your app will restart many times. Anti-Pattern: Migration scripts that crash if the column already exists. Best Practice:

Use IF NOT EXISTS in SQL.
Check context in Python initialization scripts (if not check_job_exists(): create_job()).
B. Startup Scripts
Use a robust 
start.sh
 that runs migrations before starting the app.

# start.sh
python scripts/init_db.py  # Check DB connection & init
alembic upgrade head       # Run migrations
exec uvicorn app.main:app  # Start app
Checklist for New Project
 Volumes: Are uploads/data shared between containers?
 Queues: Is the worker listening to all defined queues?
 URLs: Are we using Port 443 for external connections?
 Auth: Are API Keys supported in 
config.py
?
 Config: Are all variables in 
.env
 mirrored in 
Settings
?
 Build: Is the Dockerfile optimized?
 DB: Are migrations safe to run repeatedly?