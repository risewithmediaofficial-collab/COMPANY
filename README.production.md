# Production Setup Checklist

## 1. Environment configuration

- Copy backend/.env.example or backend/.env.production.example to backend/.env
- Set a production-safe MongoDB URI
- Set strong JWT secrets and encryption key
- Set CLIENT_URL to your deployed frontend URL
- Set DEFAULT_ADMIN_* only if you want the app to auto-create the first admin
- Fill in SMTP, Cloudinary, and any optional vendor credentials

## 2. Install dependencies

Backend:

```bash
cd backend
npm install --production
```

Frontend:

```bash
cd frontend
npm install
npm run build
```

## 3. Production startup

Backend:

```bash
cd backend
NODE_ENV=production node index.js
```

Frontend static hosting:

- Serve the produced frontend dist folder through a static host or CDN
- Ensure API requests point to the backend domain

## 4. Production-safe defaults

- Do not use the default development JWT secrets in production
- Do not keep localhost URLs in production
- Restrict MongoDB access by IP or private networking
- Keep uploads on a persistent volume
- Run behind a reverse proxy such as Nginx or PM2
- Enable HTTPS and secure cookies/session settings if applicable

## 5. Deployment notes

- Set NODE_ENV=production
- Use a real MongoDB Atlas or private MongoDB instance
- Keep your environment variables out of source control
- Verify API health with /api/health

## 6. Quick health check

```bash
curl http://localhost:5000/api/health
```
