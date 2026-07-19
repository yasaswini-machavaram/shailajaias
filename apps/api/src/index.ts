import "./env.js";
import express from "express";
import cors from "cors";
import path from "path";
import { fileURLToPath } from "url";
import connectDB from "./config/db.js";
import {
  authRoutes,
  articleRoutes,
  burningIssueRoutes,
  magazineRoutes,
  quizRoutes,
  courseRoutes,
  uploadRoutes,
  searchRoutes,
  resourceRoutes,
  testSeriesRoutes,
  adminUserRoutes,
  doubtRoutes,
  testReportRoutes,
  bookmarkRoutes,
} from "./routes/index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Connect to MongoDB
connectDB();

const app: express.Application = express();

// CORS configuration - allow multiple origins
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:3001',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:3001',
  process.env.CLIENT_URL,
].filter(Boolean) as string[];

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (like mobile apps or curl)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    return callback(null, false);
  },
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Serve uploaded files statically
app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

// Health check
app.get("/health", (_req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/articles', articleRoutes);
app.use('/api/burning-issues', burningIssueRoutes);
app.use('/api/magazines', magazineRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/search', searchRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/tests/series', testSeriesRoutes);
app.use('/api/admin/users', adminUserRoutes);
app.use('/api/doubts', doubtRoutes);
app.use('/api/reports', testReportRoutes);
app.use('/api/bookmarks', bookmarkRoutes);

// 404 handler
app.use((_req, res) => {
  res.status(404).json({ success: false, message: 'Route not found' });
});

// Error handling middleware
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Error:', err.message);
  res.status(500).json({ success: false, message: err.message || 'Internal server error' });
});

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});

export default app;