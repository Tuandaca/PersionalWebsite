import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    {
      name: 'api-contact-dev-middleware',
      configureServer(server) {
        server.middlewares.use('/api/contact', (req, res) => {
          if (req.method !== 'POST') {
            res.statusCode = 405;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: 'Method Not Allowed' }));
            return;
          }

          let body = '';
          req.on('data', chunk => {
            body += chunk;
          });

          req.on('end', () => {
            try {
              const data = JSON.parse(body || '{}');
              const { name, email, subject, message, website, formLoadedAt } = data;

              // Honeypot spam trap
              if (website && typeof website === 'string' && website.trim().length > 0) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: 'Message received.' }));
                return;
              }

              // Speed spam trap
              if (formLoadedAt && typeof formLoadedAt === 'number' && Date.now() - formLoadedAt < 1200) {
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ success: true, message: 'Message received.' }));
                return;
              }

              // Validation
              if (!name || name.trim().length < 2 || name.trim().length > 80) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Name must be between 2 and 80 characters.' }));
                return;
              }

              const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
              if (!email || !emailRegex.test(email.trim())) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Please enter a valid email address.' }));
                return;
              }

              if (!subject || subject.trim().length < 3 || subject.trim().length > 120) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Subject must be between 3 and 120 characters.' }));
                return;
              }

              if (!message || message.trim().length < 10 || message.trim().length > 2000) {
                res.statusCode = 400;
                res.setHeader('Content-Type', 'application/json');
                res.end(JSON.stringify({ error: 'Message must be between 10 and 2000 characters.' }));
                return;
              }

              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({
                success: true,
                message: 'Message delivered successfully via local dev environment.'
              }));
            } catch (err) {
              res.statusCode = 500;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Internal server error processing contact message.' }));
            }
          });
        });
      },
    },
  ],
  server: {
    host: true,
    port: 5173,
  },
  build: {
    chunkSizeWarningLimit: 1600,
    modulePreload: {
      resolveDependencies: (_filename, deps, { hostType }) => {
        if (hostType === 'html') {
          // Exclude vendor-p5 and vendor-three from the initial HTML modulepreload critical path
          return deps.filter(
            dep => !dep.includes('vendor-p5') && !dep.includes('vendor-three')
          );
        }
        return deps;
      },
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-p5': ['p5'],
          'vendor-react': ['react', 'react-dom'],
          'vendor-lucide': ['lucide-react'],
          'vendor-three': ['three'],
        },
      },
    },
  },
});
