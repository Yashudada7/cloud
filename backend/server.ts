import express from "express";
import http from "http";
import path from "path";
import { createServer as createViteServer } from "vite";
import mongoose from "mongoose";
import dotenv from "dotenv";
import { Server as SocketIOServer } from "socket.io";
import { 
  DonationDrive, 
  CivicReport, 
  BloodRequest, 
  Course, 
  Enrollment, 
  Donation,
  User,
  PhysicalDonation,
  Volunteering,
  AnimalCase,
  VolunteerEvent,
  VolunteerApplication,
  AdoptionListing,
  AdoptionApplication,
  Feedback,
  ChatMessage
} from "./models/index";

dotenv.config();

const app = express();
const httpServer = http.createServer(app);
const PORT = 3000;

// ─── SOCKET.IO SETUP ──────────────────────────────────────────────────────────
const io = new SocketIOServer(httpServer, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  path: '/socket.io',
});

// Socket auth middleware — decode Firebase JWT (same logic as requireAuth)
io.use(async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Unauthorized: No token'));
    const parts = token.split('.');
    if (parts.length !== 3) return next(new Error('Unauthorized: Malformed token'));
    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    const uid = payload?.user_id || payload?.sub;
    if (!uid) return next(new Error('Unauthorized: Invalid payload'));
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) return next(new Error('Unauthorized: Token expired'));
    const user = await (User as any).findOne({ uid });
    if (!user) return next(new Error('Unauthorized: User not found'));
    if (user.isBanned) return next(new Error('Forbidden: Account suspended'));
    (socket as any).uid = uid;
    (socket as any).userName = user.name || 'Member';
    (socket as any).userRoles = user.roles || [];
    next();
  } catch (err) {
    next(new Error('Unauthorized: Token error'));
  }
});

io.on('connection', (socket) => {
  const uid: string = (socket as any).uid;
  const userName: string = (socket as any).userName;
  const userRoles: string[] = (socket as any).userRoles;

  // Join an NGO chat room — ngoId is the NGO's uid
  socket.on('join_room', async (ngoId: string) => {
    try {
      const isNgoOwner = uid === ngoId && userRoles.includes('ngo');
      const isAdmin = userRoles.includes('admin');

      // Check if user is blocked by the NGO
      const ngoUser = await (User as any).findOne({ uid: ngoId });
      if (ngoUser && ngoUser.blockedUsers && ngoUser.blockedUsers.includes(uid)) {
        socket.emit('error', { message: 'You have been blocked by this organization.' });
        return;
      }

      // Check if user is an approved volunteer for any event in this NGO
      let isApprovedVolunteer = false;
      if (!isNgoOwner && !isAdmin) {
        const events = await (VolunteerEvent as any).find({ ngoId });
        const eventIds = events.map((e: any) => e._id);
        const approved = await (VolunteerApplication as any).findOne({
          eventId: { $in: eventIds },
          userId: uid,
          status: 'APPROVED',
        });
        isApprovedVolunteer = !!approved;
      }

      if (!isNgoOwner && !isAdmin && !isApprovedVolunteer) {
        socket.emit('error', { message: 'You are not authorised to join this chat.' });
        return;
      }

      socket.join(ngoId);

      // Send last 50 messages as history
      const history = await (ChatMessage as any)
        .find({ ngoId })
        .sort({ createdAt: 1 })
        .limit(50)
        .lean();
      socket.emit('message_history', history);
    } catch (err) {
      socket.emit('error', { message: 'Failed to join room.' });
    }
  });

  socket.on('send_message', async (data: { ngoId: string; text: string }) => {
    try {
      const { ngoId, text } = data;
      if (!ngoId || !text?.trim()) return;
      const clean = text.trim().substring(0, 1000);
      const msg = await (ChatMessage as any).create({
        ngoId,
        senderId: uid,
        senderName: userName,
        text: clean,
      });
      io.to(ngoId).emit('new_message', msg);
    } catch (err) {
      socket.emit('error', { message: 'Failed to send message.' });
    }
  });

  socket.on('disconnect', () => {
    // cleanup handled by socket.io automatically
  });
});


// Connect to MongoDB
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI || !MONGODB_URI.trim()) {
  console.warn("⚠️ MONGODB_URI is not defined in environment variables. Database features will be disabled.");
} else if (!MONGODB_URI.startsWith('mongodb://') && !MONGODB_URI.startsWith('mongodb+srv://')) {
  console.warn("⚠️ MONGODB_URI has an invalid scheme. Expected 'mongodb://' or 'mongodb+srv://'. Found:", MONGODB_URI.substring(0, 15) + "...");
} else {
  mongoose
    .connect(MONGODB_URI)
    .then(() => console.log("✅ Connected to MongoDB"))
    .catch((err) => {
      console.error("❌ MongoDB connection error:", err.message);
      if (err.name === 'MongoParseError') {
        console.error("   Details: Please double check your MONGODB_URI format in the Settings menu.");
      }
    });
}

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// --- Rate Limiting -----------------------------------------------------------

import rateLimit from "express-rate-limit";

// Strict limiter for write operations (30 req per 10 min per IP)
const writeLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests from this IP. Please wait a moment and try again.' },
});

// General API limiter (200 req per minute per IP)
const generalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please slow down.' },
});

app.use('/api', generalLimiter);

// --- Auth Middleware ----------------------------------------------------------
// Verifies the Firebase Bearer token by decoding the JWT payload and cross-
// checking the uid against our User collection (checks isBanned too).
// For full cryptographic verification, replace with Firebase Admin SDK.
async function requireAuth(req: any, res: any, next: any) {
  const authHeader = req.headers['authorization'];
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized: No token provided.' });
  }
  try {
    const token = authHeader.split('Bearer ')[1];
    const parts = token.split('.');
    if (parts.length !== 3) return res.status(401).json({ error: 'Unauthorized: Malformed token.' });

    const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf-8'));
    const uid = payload?.user_id || payload?.sub;
    if (!uid) return res.status(401).json({ error: 'Unauthorized: Invalid token payload.' });

    // Verify token is not expired
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && payload.exp < now) {
      return res.status(401).json({ error: 'Unauthorized: Token has expired. Please sign in again.' });
    }

    // Verify user exists in DB and is not banned
    const user = await (User as any).findOne({ uid });
    if (!user) return res.status(401).json({ error: 'Unauthorized: User record not found.' });
    if (user.isBanned) return res.status(403).json({ error: 'Forbidden: This account has been suspended.' });

    req.uid = uid;
    req.userRoles = user.roles || [];
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: Token processing failed.' });
  }
}

async function requireAdmin(req: any, res: any, next: any) {
  await requireAuth(req, res, () => {
    if (!req.userRoles?.includes('admin')) {
      return res.status(403).json({ error: 'Forbidden: Admin access required.' });
    }
    next();
  });
}

// Allows access if the caller has ANY of the given roles (admins always pass)
function requireRole(...roles: string[]) {
  return async (req: any, res: any, next: any) => {
    await requireAuth(req, res, () => {
      const hasRole = roles.some(r => req.userRoles?.includes(r));
      if (!hasRole) {
        return res.status(403).json({ error: `Forbidden: Requires role ${roles.join(' or ')}.` });
      }
      next();
    });
  };
}

// Allows access only to the resource owner (matched by URL param) or an admin
function requireSelfOrAdmin(paramName: string) {
  return async (req: any, res: any, next: any) => {
    await requireAuth(req, res, () => {
      if (req.uid !== req.params[paramName] && !req.userRoles?.includes('admin')) {
        return res.status(403).json({ error: 'Forbidden: Access denied.' });
      }
      next();
    });
  };
}

// --- Input Validation Helpers ------------------------------------------------

const VALID_BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['volunteer', 'ngo', 'hospital', 'govt', 'educator', 'admin'];

function sanitizeString(val: any, maxLength = 500): string {
  if (typeof val !== 'string') return '';
  // Strip HTML tags and trim
  return val.trim().replace(/<[^>]*>/g, '').substring(0, maxLength);
}

function validateRequired(fields: Record<string, any>): string | null {
  for (const [key, val] of Object.entries(fields)) {
    if (val === undefined || val === null || (typeof val === 'string' && !val.trim())) {
      return `'${key}' is required.`;
    }
  }
  return null;
}

// Database connection check middleware
app.use("/api", (req, res, next) => {
  if (mongoose.connection.readyState !== 1 && req.path !== "/health") {
    return res.status(503).json({ 
      error: "Database not connected", 
      message: "The server is unable to connect to MongoDB. Please check your MONGODB_URI in the Settings menu." 
    });
  }
  next();
});

// --- Health Check ------------------------------------------------------------
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", dbConnected: mongoose.connection.readyState === 1 });
});


// ─── DASHBOARD STATS ENDPOINTS ────────────────────────────────────────────────

// Volunteer stats
app.get("/api/stats/volunteer/:userId", async (req, res) => {
  try {
    const { userId } = req.params;
    const [volunteering, enrollments, reports, bloodRequests, activeDrives] = await Promise.all([
      (Volunteering as any).find({ userId }),
      (Enrollment as any).find({ userId }),
      (CivicReport as any).find({ userId }),
      (BloodRequest as any).find({ hospitalId: userId }),
      DonationDrive.countDocuments({ status: 'ACTIVE' }),
    ]);
    const totalHours = volunteering.reduce((sum: number, v: any) => sum + (v.hours || 0), 0);
    const passedCerts = enrollments.filter((e: any) => e.status === 'PASSED').length;
    const resolvedReports = reports.filter((r: any) => r.status === 'RESOLVED').length;
    const recentActivity = [
      ...volunteering.slice(0, 3).map((v: any) => ({ title: `Volunteered: ${v.activity}`, subtitle: `${v.hours}hrs • ${v.role}`, date: v.date })),
      ...enrollments.slice(0, 3).map((e: any) => ({ title: `Course Enrollment`, subtitle: `Status: ${e.status}`, date: e.enrolledAt })),
      ...reports.slice(0, 3).map((r: any) => ({ title: `Civic Report: ${r.category}`, subtitle: `Status: ${r.status}`, date: r.createdAt })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);

    res.json({ totalHours, passedCerts, resolvedReports, activeDrives, recentActivity });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch volunteer stats", details: err.message });
  }
});

// NGO stats
app.get("/api/stats/ngo/:ngoId", async (req, res) => {
  try {
    const { ngoId } = req.params;
    const [events, drives] = await Promise.all([
      (VolunteerEvent as any).find({ ngoId }),
      (DonationDrive as any).find({ createdBy: ngoId }),
    ]);
    const activeProjects = events.filter((e: any) => e.status === 'UPCOMING').length;
    const totalVolunteers = events.reduce((sum: number, e: any) => sum + (e.currentVolunteers || 0), 0);
    const fundsRaised = drives.reduce((sum: number, d: any) => sum + (d.currentAmount || 0), 0);
    const recentActivity = [
      ...events.slice(0, 3).map((e: any) => ({ title: e.title, subtitle: `${e.currentVolunteers}/${e.requiredVolunteers} volunteers • ${e.status}`, date: e.createdAt })),
      ...drives.slice(0, 2).map((d: any) => ({ title: `Drive: ${d.title}`, subtitle: `₹${d.currentAmount?.toLocaleString()} raised`, date: d.createdAt })),
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);

    res.json({ activeProjects, totalVolunteers, fundsRaised, recentActivity });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch NGO stats", details: err.message });
  }
});

// Educator stats (enhanced with all 8 metrics)
app.get("/api/stats/educator/:educatorId", async (req, res) => {
  try {
    const { educatorId } = req.params;
    const courses = await (Course as any).find({ educatorId });
    const courseIds = courses.map((c: any) => c._id);
    
    const [allEnrollments, passedEnrollments, recentEnrollments] = await Promise.all([
      (Enrollment as any).find({ courseId: { $in: courseIds } }),
      (Enrollment as any).find({ courseId: { $in: courseIds }, status: 'PASSED' }),
      (Enrollment as any).find({ courseId: { $in: courseIds } }).sort({ enrolledAt: -1 }).limit(5),
    ]);
    
    const totalLearners = allEnrollments.length;
    const certIssued = passedEnrollments.length;
    const activeLearners = allEnrollments.filter((e: any) => e.status === 'ENROLLED').length;
    const completionRate = totalLearners > 0 ? Math.round((certIssued / totalLearners) * 100) : 0;
    
    // Calculate avg quiz score from passed enrollments that have a score
    const scoredEnrollments = allEnrollments.filter((e: any) => e.score != null);
    const avgQuizScore = scoredEnrollments.length > 0 
      ? Math.round(scoredEnrollments.reduce((sum: number, e: any) => sum + e.score, 0) / scoredEnrollments.length)
      : 0;
    
    // Revenue from paid courses
    const revenue = courses.reduce((sum: number, c: any) => {
      const paidEnrollments = allEnrollments.filter((e: any) => e.courseId.toString() === c._id.toString());
      return sum + (paidEnrollments.length * (c.price || 0));
    }, 0);

    // Collect all reviews from courses
    const recentReviews = courses.flatMap((c: any) => 
      (c.reviews || []).map((r: any) => ({
        courseTitle: c.title,
        userName: r.userName,
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt
      }))
    ).sort((a: any, b: any) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);

    const recentActivity = courses.slice(0, 4).map((c: any) => ({
      title: c.title,
      subtitle: `${c.enrolledCount || 0} enrolled`,
      date: c.createdAt
    }));

    res.json({ 
      coursesCount: courses.length, 
      totalLearners, 
      certIssued, 
      activeLearners,
      completionRate,
      avgQuizScore, 
      revenue,
      recentReviews,
      recentEnrollments: recentEnrollments.map((e: any) => ({
        userName: e.userName,
        status: e.status,
        date: e.enrolledAt
      })),
      recentActivity 
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch educator stats", details: err.message });
  }
});

// ─── DONATION DRIVES ──────────────────────────────────────────────────────────

app.get("/api/donation-drives", async (req, res) => {
  try {
    const drives = await DonationDrive.find().sort({ createdAt: -1 });
    res.json(drives);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch donation drives", details: err.message });
  }
});

app.patch("/api/donation-drives/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['ACTIVE', 'COMPLETED', 'PAUSED'];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    const drive = await (DonationDrive as any).findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!drive) return res.status(404).json({ error: "Drive not found" });
    res.json(drive);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update drive status", details: err.message });
  }
});

app.post("/api/donation-drives", requireAuth, writeLimiter, async (req, res) => {
  try {
    const { title, description, targetAmount, createdBy, creatorName, category } = req.body;
    const missing = validateRequired({ title, description, targetAmount, createdBy, creatorName, category });
    if (missing) return res.status(400).json({ error: missing });
    if (typeof targetAmount !== 'number' || targetAmount <= 0) {
      return res.status(400).json({ error: "'targetAmount' must be a positive number." });
    }
    const sanitized = {
      ...req.body,
      title: sanitizeString(title, 200),
      description: sanitizeString(description, 1000),
      creatorName: sanitizeString(creatorName, 100),
    };
    const drive = new (DonationDrive as any)(sanitized);
    await drive.save();
    res.status(201).json(drive);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create donation drive", details: err.message });
  }
});

// ─── CIVIC REPORTS ────────────────────────────────────────────────────────────

app.get("/api/reports", async (req, res) => {
  try {
    const reports = await CivicReport.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch reports", details: err.message });
  }
});

// IMPORTANT: /stats and /user/:userId MUST be defined BEFORE /api/reports/:id
app.get("/api/reports/stats", async (req, res) => {
  try {
    const total = await CivicReport.countDocuments();
    const submitted = await CivicReport.countDocuments({ status: 'SUBMITTED' });
    const inProgress = await CivicReport.countDocuments({ status: 'IN_PROGRESS' });
    const resolved = await CivicReport.countDocuments({ status: 'RESOLVED' });

    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const newToday = await CivicReport.countDocuments({ createdAt: { $gte: startOfDay } });

    const categoryBreakdown = await (CivicReport as any).aggregate([
      { $group: { _id: '$category', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Overdue: IN_PROGRESS for more than 7 days
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const overdue = await CivicReport.countDocuments({ 
      status: 'IN_PROGRESS', 
      createdAt: { $lt: sevenDaysAgo } 
    });

    // Average resolution time in hours
    const resolvedReports = await (CivicReport as any).find({ status: 'RESOLVED' });
    let avgResolutionHours = 0;
    if (resolvedReports.length > 0) {
      const totalMs = resolvedReports.reduce((sum: number, r: any) => {
        const resolvedEntry = (r.history || []).find((h: any) => h.status === 'RESOLVED');
        if (resolvedEntry) return sum + (new Date(resolvedEntry.date).getTime() - new Date(r.createdAt).getTime());
        return sum;
      }, 0);
      avgResolutionHours = Math.round(totalMs / resolvedReports.length / (1000 * 60 * 60));
    }

    res.json({ total, submitted, inProgress, resolved, newToday, categoryBreakdown, overdue, avgResolutionHours });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch report stats", details: err.message });
  }
});

// Get reports by specific user
app.get("/api/reports/user/:userId", async (req, res) => {
  try {
    const reports = await (CivicReport as any).find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user reports", details: err.message });
  }
});

app.post("/api/reports", requireAuth, writeLimiter, async (req, res) => {
  try {
    const { userId, category, description, photoUrl } = req.body;
    const missing = validateRequired({ userId, category, description, photoUrl });
    if (missing) return res.status(400).json({ error: missing });

    const blockingGovt = await (User as any).findOne({ roles: 'govt', blockedUsers: userId });
    if (blockingGovt) {
      return res.status(403).json({ error: "Forbidden: You have been blocked from submitting civic reports by authorities." });
    }
    if (sanitizeString(description).length < 20) {
      return res.status(400).json({ error: "'description' must be at least 20 characters." });
    }
    const sanitized = {
      ...req.body,
      description: sanitizeString(description, 2000),
      address: sanitizeString(req.body.address, 500),
    };
    const report = new (CivicReport as any)(sanitized);
    await report.save();
    res.status(201).json(report);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to submit report", details: err.message });
  }
});

app.put("/api/reports/:id", async (req, res) => {
  try {
    const { status, govtNotes } = req.body;
    const updateData: any = { status };
    if (govtNotes !== undefined) updateData.govtNotes = govtNotes;

    const historyEntry = {
      status,
      title: req.body.historyTitle || `Status updated to ${status}`,
      date: new Date()
    };

    const report = await (CivicReport as any).findByIdAndUpdate(
      req.params.id,
      { ...updateData, $push: { history: historyEntry } },
      { new: true }
    );
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update report", details: err.message });
  }
});

// ─── BLOOD REQUESTS ───────────────────────────────────────────────────────────

app.get("/api/blood-requests", async (req, res) => {
  try {
    const { bloodGroup } = req.query;
    const filter: any = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    const requests = await BloodRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch blood requests", details: err.message });
  }
});

app.post("/api/blood-requests", requireAuth, writeLimiter, async (req, res) => {
  try {
    const { bloodGroup, units, urgency, locationName, hospitalId } = req.body;
    const missing = validateRequired({ bloodGroup, units, urgency, locationName, hospitalId });
    if (missing) return res.status(400).json({ error: missing });
    if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ error: `'bloodGroup' must be one of: ${VALID_BLOOD_GROUPS.join(', ')}` });
    }
    if (typeof units !== 'number' || units <= 0 || units > 20) {
      return res.status(400).json({ error: "'units' must be a positive number (max 20)." });
    }
    const sanitized = {
      ...req.body,
      locationName: sanitizeString(locationName, 200),
      address: sanitizeString(req.body.address, 500),
      postedByName: sanitizeString(req.body.postedByName, 100),
    };
    const request = new (BloodRequest as any)(sanitized);
    await request.save();
    res.status(201).json(request);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create blood request", details: err.message });
  }
});

// ─── ANIMAL CASES ─────────────────────────────────────────────────────────────

app.get("/api/animal-cases", async (req, res) => {
  try {
    const cases = await AnimalCase.find().sort({ createdAt: -1 });
    res.json(cases);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch animal cases", details: err.message });
  }
});

app.get("/api/animal-cases/user/:userId", async (req, res) => {
  try {
    const cases = await (AnimalCase as any).find({ reportedBy: req.params.userId }).sort({ createdAt: -1 });
    res.json(cases);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user animal cases", details: err.message });
  }
});

app.post("/api/animal-cases", requireAuth, writeLimiter, async (req: any, res) => {
  try {
    if (req.body.reportedBy !== req.uid) {
      return res.status(403).json({ error: "Forbidden: You can only submit reports as yourself." });
    }
    const { animalType, description, photoUrl } = req.body;
    const missing = validateRequired({ animalType, description, photoUrl });
    if (missing) return res.status(400).json({ error: missing });
    const animalCase = new AnimalCase({
      ...req.body,
      animalType: sanitizeString(animalType, 100),
      description: sanitizeString(description, 2000),
      location: sanitizeString(req.body.location, 500),
    });
    await animalCase.save();
    res.status(201).json(animalCase);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create animal case", details: err.message });
  }
});

app.patch("/api/animal-cases/:id/status", requireRole('ngo', 'admin'), async (req: any, res) => {
  try {
    const { status, ngoId, ngoName } = req.body;
    const allowed = ['OPEN', 'EN_ROUTE', 'RESCUED', 'ADOPTED'];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });

    const updateData: any = { status };
    if (ngoId && ngoId !== req.uid && !req.userRoles?.includes('admin')) {
      return res.status(403).json({ error: "Forbidden: NGOs can only assign cases to themselves." });
    }
    if (ngoId) updateData.ngoId = ngoId;
    if (ngoName) updateData.ngoName = ngoName;
    if (ngoId) updateData.rescuedBy = ngoId;
    if (status === 'RESCUED') updateData.rescuedAt = new Date();
    if (status === 'OPEN') {
      updateData.ngoId = null; updateData.ngoName = null;
      updateData.rescuedBy = null; updateData.rescuedAt = null;
    }

    const updated = await (AnimalCase as any).findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: "Animal case not found" });
    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update animal case status", details: err.message });
  }
});

// ─── COURSES ──────────────────────────────────────────────────────────────────

app.get("/api/courses", async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});

app.post("/api/courses", requireRole('educator', 'admin'), writeLimiter, async (req: any, res) => {
  try {
    if (req.body.educatorId !== req.uid && !req.userRoles?.includes('admin')) {
      return res.status(403).json({ error: "Forbidden: You can only create courses as yourself." });
    }
    const { title, description, educatorId, educatorName, category } = req.body;
    const missing = validateRequired({ title, description, educatorId, educatorName, category });
    if (missing) return res.status(400).json({ error: missing });
    const course = new (Course as any)({
      ...req.body,
      title: sanitizeString(title, 200),
      description: sanitizeString(description, 2000),
      educatorName: sanitizeString(educatorName, 100),
      category: sanitizeString(category, 100),
    });
    await course.save();
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ error: "Failed to create course" });
  }
});

// Add a review to a course
app.post("/api/courses/:id/reviews", requireAuth, writeLimiter, async (req: any, res) => {
  try {
    if (req.body.userId && req.body.userId !== req.uid) {
      return res.status(403).json({ error: "Forbidden: You can only review as yourself." });
    }
    const course = await (Course as any).findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          reviews: {
            ...req.body,
            userId: req.uid,
            userName: sanitizeString(req.body.userName, 100),
            comment: sanitizeString(req.body.comment, 1000),
          },
        },
      },
      { new: true }
    );
    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json(course);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to add review", details: err.message });
  }
});

// ─── ENROLLMENTS ──────────────────────────────────────────────────────────────

app.get("/api/enrollments/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const enrollments = await (Enrollment as any).find({ userId: req.params.userId }).populate('courseId');
    res.json(enrollments);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
});

app.post("/api/enrollments", requireAuth, writeLimiter, async (req: any, res) => {
  try {
    const { userId, courseId, userName } = req.body;
    if (userId !== req.uid) {
      return res.status(403).json({ error: "Forbidden: You can only enroll yourself." });
    }
    const missing = validateRequired({ userId, courseId, userName });
    if (missing) return res.status(400).json({ error: missing });
    const existing = await (Enrollment as any).findOne({ userId, courseId });
    if (existing) return res.status(400).json({ error: "Already enrolled" });

    const enrollment = new (Enrollment as any)(req.body);
    await enrollment.save();
    await (Course as any).findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });
    res.status(201).json(enrollment);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to enroll" });
  }
});

app.put("/api/enrollments/:id", requireAuth, async (req: any, res) => {
  try {
    const { status, score } = req.body;
    const allowed = ['ENROLLED', 'PASSED', 'FAILED'];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });
    const existing = await (Enrollment as any).findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Enrollment not found" });
    if (existing.userId !== req.uid && !req.userRoles?.includes('admin')) {
      return res.status(403).json({ error: "Forbidden: You can only update your own enrollment." });
    }
    const updateData: any = { status };
    if (score !== undefined) updateData.score = score;
    if (status === 'PASSED' || status === 'FAILED') updateData.completedAt = new Date();
    
    const enrollment = await (Enrollment as any).findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(enrollment);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update enrollment" });
  }
});

// ─── PHYSICAL DONATIONS ───────────────────────────────────────────────────────

app.get("/api/physical-donations/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const data = await (PhysicalDonation as any).find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch physical donations" });
  }
});

// ─── VOLUNTEERING ─────────────────────────────────────────────────────────────

app.get("/api/volunteering/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const data = await (Volunteering as any).find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch volunteering data" });
  }
});

// ─── MONETARY DONATIONS ───────────────────────────────────────────────────────

app.get("/api/monetary-donations/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const data = await (Donation as any).find({ userId: req.params.userId }).sort({ timestamp: -1 });
    res.json(data);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch monetary donations" });
  }
});

app.post("/api/donations", requireAuth, writeLimiter, async (req: any, res) => {
  try {
    const { driveId, userId, userName, amount } = req.body;
    const missing = validateRequired({ driveId, userId, userName, amount });
    if (missing) return res.status(400).json({ error: missing });
    if (userId !== req.uid) {
      return res.status(403).json({ error: "Forbidden: You can only record donations as yourself." });
    }
    if (typeof amount !== 'number' || amount <= 0) {
      return res.status(400).json({ error: "'amount' must be a positive number." });
    }
    const drive = await (DonationDrive as any).findById(driveId);
    if (!drive) return res.status(404).json({ error: "Drive not found" });
    const donation = new (Donation as any)({
      ...req.body,
      userName: sanitizeString(userName, 100),
      paymentMethod: sanitizeString(req.body.paymentMethod || 'PAYPAL', 50),
      paypalOrderId: sanitizeString(req.body.paypalOrderId, 120),
    });
    await donation.save();
    await (DonationDrive as any).findByIdAndUpdate(driveId, { $inc: { currentAmount: amount, supporterCount: 1 } });
    res.status(201).json(donation);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to process donation", details: err.message });
  }
});

// ─── USERS ────────────────────────────────────────────────────────────────────

app.get("/api/users/:uid", requireSelfOrAdmin("uid"), async (req, res) => {
  try {
    const user = await (User as any).findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// POST /api/users is intentionally public — needed during signup before a session exists.
// The server still validates and sanitizes input, and only allows valid roles.
app.post("/api/users", writeLimiter, async (req, res) => {
  try {
    let { uid, name, email, roles, bio, address, bloodGroup, phone } = req.body;

    // Validate required fields
    const missing = validateRequired({ uid, name, email });
    if (missing) return res.status(400).json({ error: missing });
    if (!EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).json({ error: "'email' is not a valid email address." });
    }
    if (bloodGroup && !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ error: `'bloodGroup' must be one of: ${VALID_BLOOD_GROUPS.join(', ')}` });
    }

    const normalizedEmail = String(email).trim().toLowerCase();

    // ── Duplicate email guard ────────────────────────────────────────────────
    // Check if this email is already registered under a DIFFERENT uid.
    // (Same uid = updating an existing user, which is fine.)
    const existingByEmail = await (User as any).findOne({ email: normalizedEmail, uid: { $ne: uid } });
    if (existingByEmail) {
      return res.status(409).json({
        error: "An account with this email address already exists. Please log in instead.",
        code: "EMAIL_ALREADY_IN_USE"
      });
    }

    // Ensure roles are valid and allow admin role from signup
    if (!roles || !Array.isArray(roles) || roles.length === 0) {
      roles = ['volunteer'];
    } else {
      roles = roles.filter((r: string) => VALID_ROLES.includes(r));
      if (roles.length === 0) roles = ['volunteer'];
    }

    const updateData: any = {
      name: sanitizeString(name, 100),
      email: normalizedEmail,
      roles
    };
    if (bio !== undefined) updateData.bio = sanitizeString(bio, 300);
    if (address !== undefined) updateData.address = sanitizeString(address, 500);
    if (bloodGroup !== undefined) updateData.bloodGroup = bloodGroup;
    if (phone !== undefined) updateData.phone = sanitizeString(phone, 20);

    const user = await (User as any).findOneAndUpdate(
      { uid },
      updateData,
      { upsert: true, new: true }
    );
    res.json(user);
  } catch (err: any) {
    // MongoDB unique-index violation (duplicate email or uid)
    if (err.code === 11000) {
      const field = err.keyPattern?.email ? 'email' : 'uid';
      return res.status(409).json({
        error: `An account with this ${field} already exists. Please log in instead.`,
        code: "EMAIL_ALREADY_IN_USE"
      });
    }
    res.status(500).json({ error: "Failed to save user" });
  }
});


app.post("/api/users/block", requireAuth, async (req: any, res) => {
  try {
    const { targetUid, action } = req.body;
    if (!targetUid) return res.status(400).json({ error: "targetUid is required." });
    if (!['block', 'unblock'].includes(action)) return res.status(400).json({ error: "action must be 'block' or 'unblock'." });

    const isNgo = req.userRoles?.includes('ngo');
    const isGovt = req.userRoles?.includes('govt');
    const isAdmin = req.userRoles?.includes('admin');
    if (!isNgo && !isGovt && !isAdmin) {
      return res.status(403).json({ error: "Forbidden: Only organizations or civic authorities can block users." });
    }

    const update = action === 'block' 
      ? { $addToSet: { blockedUsers: targetUid } } 
      : { $pull: { blockedUsers: targetUid } };

    const user = await (User as any).findOneAndUpdate({ uid: req.uid }, update, { new: true });
    if (!user) return res.status(404).json({ error: "User profile not found." });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update block list", details: err.message });
  }
});

// Update user profile (blood group, bio, etc.)
app.put("/api/users/:uid", requireAuth, async (req: any, res) => {
  try {
    if (req.uid !== req.params.uid && !req.userRoles?.includes('admin')) {
      return res.status(403).json({ error: "Forbidden: You can only update your own profile." });
    }
    const { bloodGroup, bio, phone, address, avatarUrl, name } = req.body;
    const updateData: any = {};
    if (bloodGroup !== undefined) {
      if (bloodGroup && !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
        return res.status(400).json({ error: `'bloodGroup' must be one of: ${VALID_BLOOD_GROUPS.join(', ')}` });
      }
      updateData.bloodGroup = bloodGroup;
    }
    if (bio !== undefined) updateData.bio = sanitizeString(bio, 300);
    if (phone !== undefined) updateData.phone = sanitizeString(phone, 20);
    if (address !== undefined) updateData.address = sanitizeString(address, 500);
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl;
    if (name !== undefined) {
      const trimmedName = sanitizeString(name, 100);
      if (trimmedName.length < 2) return res.status(400).json({ error: "'name' must be at least 2 characters." });
      updateData.name = trimmedName;
    }

    const user = await (User as any).findOneAndUpdate({ uid: req.params.uid }, updateData, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update user profile", details: err.message });
  }
});

// ─── VOLUNTEER EVENTS ─────────────────────────────────────────────────────────

app.get("/api/volunteer-events", async (req, res) => {
  try {
    const { eventType } = req.query;
    const filter: any = {};
    if (eventType) filter.eventType = eventType;
    const events = await (VolunteerEvent as any).find(filter).sort({ createdAt: -1 });
    res.json(events);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch volunteer events" });
  }
});

app.post("/api/volunteer-events", requireRole('ngo', 'admin'), writeLimiter, async (req: any, res) => {
  try {
    if (req.body.ngoId !== req.uid && !req.userRoles?.includes('admin')) {
      return res.status(403).json({ error: "Forbidden: You can only create events for your own organization." });
    }
    const { ngoId, ngoName, title, description, location, date, requiredVolunteers } = req.body;
    const missing = validateRequired({ ngoId, ngoName, title, description, location, date, requiredVolunteers });
    if (missing) return res.status(400).json({ error: missing });
    const event = new (VolunteerEvent as any)({
      ...req.body,
      ngoName: sanitizeString(ngoName, 100),
      title: sanitizeString(title, 200),
      description: sanitizeString(description, 2000),
      location: sanitizeString(location, 500),
    });
    await event.save();
    res.status(201).json(event);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create volunteer event", details: err.message });
  }
});

app.delete("/api/volunteer-events/:id", requireRole('ngo', 'admin'), async (req: any, res) => {
  try {
    const event = await (VolunteerEvent as any).findById(req.params.id);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.ngoId !== req.uid && !req.userRoles?.includes('admin')) {
      return res.status(403).json({ error: "Forbidden: You can only delete your own organization's events." });
    }
    await (VolunteerEvent as any).findByIdAndDelete(req.params.id);
    // Also delete associated applications
    await (VolunteerApplication as any).deleteMany({ eventId: req.params.id });
    res.json({ message: "Event deleted successfully" });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to delete volunteer event", details: err.message });
  }
});

// ─── VOLUNTEER APPLICATIONS ───────────────────────────────────────────────────

// Get applications by event
app.get("/api/volunteer-applications/:eventId", requireRole('ngo', 'admin'), async (req: any, res) => {
  try {
    const event = await (VolunteerEvent as any).findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.ngoId !== req.uid && !req.userRoles?.includes('admin')) {
      return res.status(403).json({ error: "Forbidden: You can only view applications for your own events." });
    }
    const applications = await (VolunteerApplication as any).find({ eventId: req.params.eventId }).sort({ appliedAt: -1 });
    res.json(applications);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch volunteer applications" });
  }
});

// Get applications by user (for my-applications view)
app.get("/api/volunteer-applications/by-user/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const applications = await (VolunteerApplication as any).find({ userId: req.params.userId }).sort({ appliedAt: -1 });
    // Populate event details
    const populated = await Promise.all(applications.map(async (app: any) => {
      const event = await (VolunteerEvent as any).findById(app.eventId);
      return { ...app.toObject(), event };
    }));
    res.json(populated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user applications", details: err.message });
  }
});

app.post("/api/volunteer-applications", requireAuth, writeLimiter, async (req: any, res) => {
  try {
    if (req.body.userId !== req.uid) {
      return res.status(403).json({ error: "Forbidden: You can only apply as yourself." });
    }
    const { eventId, userId, userName } = req.body;
    const missing = validateRequired({ eventId, userId, userName });
    if (missing) return res.status(400).json({ error: missing });

    const event = await (VolunteerEvent as any).findById(eventId);
    if (!event) return res.status(404).json({ error: "Volunteer event not found." });
    const ngoUser = await (User as any).findOne({ uid: event.ngoId });
    if (ngoUser && ngoUser.blockedUsers && ngoUser.blockedUsers.includes(userId)) {
      return res.status(403).json({ error: "Forbidden: You have been blocked by this organization." });
    }

    // Check for duplicate application
    const existing = await (VolunteerApplication as any).findOne({ eventId: req.body.eventId, userId: req.body.userId });
    if (existing) return res.status(400).json({ error: "Already applied to this event" });

    const application = new (VolunteerApplication as any)({
      ...req.body,
      userName: sanitizeString(userName, 100),
      userEmail: sanitizeString(req.body.userEmail, 200),
      message: sanitizeString(req.body.message, 1000),
    });
    await application.save();
    await (VolunteerEvent as any).findByIdAndUpdate(req.body.eventId, { $inc: { currentVolunteers: 1 } });
    res.status(201).json(application);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to apply for volunteer event", details: err.message });
  }
});

app.put("/api/volunteer-applications/:id", requireRole('ngo', 'admin'), async (req: any, res) => {
  try {
    const { status } = req.body;
    const allowed = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(', ')}` });

    const existing = await (VolunteerApplication as any).findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Application not found" });
    const event = await (VolunteerEvent as any).findById(existing.eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.ngoId !== req.uid && !req.userRoles?.includes('admin')) {
      return res.status(403).json({ error: "Forbidden: You can only update applications for your own events." });
    }

    const updated = await (VolunteerApplication as any).findByIdAndUpdate(req.params.id, { status }, { new: true });

    if (status === 'REJECTED' && existing.status === 'APPROVED') {
      await (VolunteerEvent as any).findByIdAndUpdate(existing.eventId, { $inc: { currentVolunteers: -1 } });
    }

    res.json(updated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update application", details: err.message });
  }
});

// ─── ADOPTION LISTINGS ────────────────────────────────────────────────────────

app.get("/api/adoptions", async (req, res) => {
  try {
    const listings = await (AdoptionListing as any).find().sort({ createdAt: -1 });
    res.json(listings);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch adoption listings" });
  }
});

app.post("/api/adoptions", requireRole('ngo', 'admin'), writeLimiter, async (req: any, res) => {
  try {
    if (req.body.ngoId !== req.uid && !req.userRoles?.includes('admin')) {
      return res.status(403).json({ error: "Forbidden: You can only create listings for your own organization." });
    }
    const { ngoId, ngoName, animalName, animalType, description, photoUrl } = req.body;
    const missing = validateRequired({ ngoId, ngoName, animalName, animalType, description, photoUrl });
    if (missing) return res.status(400).json({ error: missing });
    const listing = new (AdoptionListing as any)({
      ...req.body,
      ngoName: sanitizeString(ngoName, 100),
      animalName: sanitizeString(animalName, 100),
      animalType: sanitizeString(animalType, 100),
      breed: sanitizeString(req.body.breed, 100),
      age: sanitizeString(req.body.age, 50),
      description: sanitizeString(description, 2000),
    });
    await listing.save();
    res.status(201).json(listing);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to create adoption listing", details: err.message });
  }
});

// ─── ADOPTION APPLICATIONS ────────────────────────────────────────────────────

// Get by listing
app.get("/api/adoption-applications/:listingId", requireRole('ngo', 'admin'), async (req: any, res) => {
  try {
    const listing = await (AdoptionListing as any).findById(req.params.listingId);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.ngoId !== req.uid && !req.userRoles?.includes('admin')) {
      return res.status(403).json({ error: "Forbidden: You can only view applications for your own listings." });
    }
    const applications = await (AdoptionApplication as any).find({ listingId: req.params.listingId }).sort({ appliedAt: -1 });
    res.json(applications);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch adoption applications" });
  }
});

// Get by user
app.get("/api/adoption-applications/by-user/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const applications = await (AdoptionApplication as any).find({ userId: req.params.userId }).sort({ appliedAt: -1 });
    const populated = await Promise.all(applications.map(async (app: any) => {
      const listing = await (AdoptionListing as any).findById(app.listingId);
      return { ...app.toObject(), listing };
    }));
    res.json(populated);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch user adoption applications", details: err.message });
  }
});

app.post("/api/adoption-applications", requireAuth, writeLimiter, async (req: any, res) => {
  try {
    if (req.body.userId !== req.uid) {
      return res.status(403).json({ error: "Forbidden: You can only apply as yourself." });
    }
    const { listingId, userId, userName, contactInfo } = req.body;
    const missing = validateRequired({ listingId, userId, userName, contactInfo });
    if (missing) return res.status(400).json({ error: missing });

    const listing = await (AdoptionListing as any).findById(listingId);
    if (!listing) return res.status(404).json({ error: "Adoption listing not found." });
    const ngoUser = await (User as any).findOne({ uid: listing.ngoId });
    if (ngoUser && ngoUser.blockedUsers && ngoUser.blockedUsers.includes(userId)) {
      return res.status(403).json({ error: "Forbidden: You have been blocked by this organization." });
    }

    // Check for duplicate
    const existing = await (AdoptionApplication as any).findOne({ listingId: req.body.listingId, userId: req.body.userId });
    if (existing) return res.status(400).json({ error: "Already applied for this animal" });

    const application = new (AdoptionApplication as any)({
      ...req.body,
      userName: sanitizeString(userName, 100),
      contactInfo: sanitizeString(contactInfo, 300),
      message: sanitizeString(req.body.message, 1000),
    });
    await application.save();
    // Mark listing as PENDING
    await (AdoptionListing as any).findByIdAndUpdate(req.body.listingId, { status: 'PENDING' });
    res.status(201).json(application);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to apply for adoption", details: err.message });
  }
});

// Approve/reject an adoption application
app.put("/api/adoption-applications/:id", requireRole('ngo', 'admin'), async (req: any, res) => {
  try {
    const { status } = req.body;
    const allowed = ['PENDING', 'APPROVED', 'REJECTED'];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });

    const app = await (AdoptionApplication as any).findById(req.params.id);
    if (!app) return res.status(404).json({ error: "Application not found" });
    const listing = await (AdoptionListing as any).findById(app.listingId);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.ngoId !== req.uid && !req.userRoles?.includes('admin')) {
      return res.status(403).json({ error: "Forbidden: You can only update applications for your own listings." });
    }
    app.status = status;
    await app.save();

    // If approved, mark listing as ADOPTED
    if (status === 'APPROVED') {
      await (AdoptionListing as any).findByIdAndUpdate(app.listingId, { status: 'ADOPTED' });
    } else if (status === 'REJECTED') {
      // Revert listing to AVAILABLE if rejected
      await (AdoptionListing as any).findByIdAndUpdate(app.listingId, { status: 'AVAILABLE' });
    }

    res.json(app);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update adoption application", details: err.message });
  }
});

// --- ADMIN ROUTES (all protected with requireAdmin) --------------------------

// Admin overview stats
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalNgos, verifiedNgos, totalDrives, totalReports, totalFeedback, totalCourses] = await Promise.all([
      (User as any).countDocuments(),
      (User as any).countDocuments({ roles: 'ngo' }),
      (User as any).countDocuments({ roles: 'ngo', isVerified: true }),
      DonationDrive.countDocuments(),
      CivicReport.countDocuments(),
      (Feedback as any).countDocuments({ status: 'OPEN' }),
      Course.countDocuments(),
    ]);
    const pendingNgos = totalNgos - verifiedNgos;
    res.json({ totalUsers, totalNgos, verifiedNgos, pendingNgos, totalDrives, totalReports, totalFeedback, totalCourses });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch admin stats", details: err.message });
  }
});

app.get("/api/admin/ngos", requireAdmin, async (req, res) => {
  try {
    const ngos = await (User as any).find({ roles: 'ngo' }).sort({ createdAt: -1 });
    res.json(ngos);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch NGOs" });
  }
});

app.put("/api/admin/ngos/:uid/verify", requireAdmin, async (req, res) => {
  try {
    const { isVerified } = req.body;
    if (typeof isVerified !== 'boolean') return res.status(400).json({ error: "'isVerified' must be a boolean." });
    const user = await (User as any).findOneAndUpdate({ uid: req.params.uid }, { isVerified }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update NGO verification" });
  }
});

app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await (User as any).find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});

app.put("/api/admin/users/:uid/role", requireAdmin, async (req, res) => {
  try {
    const { role, action } = req.body;
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: `'role' must be one of: ${VALID_ROLES.join(', ')}` });
    if (!['add', 'remove'].includes(action)) return res.status(400).json({ error: "'action' must be 'add' or 'remove'." });
    const update = action === 'add' ? { $addToSet: { roles: role } } : { $pull: { roles: role } };
    const user = await (User as any).findOneAndUpdate({ uid: req.params.uid }, update, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update user role" });
  }
});

app.put("/api/admin/users/:uid/ban", requireAdmin, async (req, res) => {
  try {
    const { isBanned } = req.body;
    if (typeof isBanned !== 'boolean') return res.status(400).json({ error: "'isBanned' must be a boolean." });
    const user = await (User as any).findOneAndUpdate({ uid: req.params.uid }, { isBanned }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update ban status" });
  }
});

// ─── FEEDBACK / COMPLAINTS ────────────────────────────────────────────────────

app.get("/api/feedback", requireAdmin, async (req, res) => {
  try {
    const feedback = await (Feedback as any).find().sort({ createdAt: -1 });
    res.json(feedback);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});

app.post("/api/feedback", requireAuth, writeLimiter, async (req, res) => {
  try {
    const { userId, subject, message } = req.body;
    const missing = validateRequired({ userId, subject, message });
    if (missing) return res.status(400).json({ error: missing });
    if ((req as any).uid !== userId) {
      return res.status(403).json({ error: "Forbidden: You can only submit feedback as yourself." });
    }
    const cleanSubject = sanitizeString(subject, 200);
    const cleanMessage = sanitizeString(message, 2000);
    if (cleanMessage.length < 10) {
      return res.status(400).json({ error: "'message' must be at least 10 characters." });
    }
    const item = new (Feedback as any)({
      ...req.body,
      subject: cleanSubject,
      message: cleanMessage,
      userName: sanitizeString(req.body.userName, 100),
    });
    await item.save();
    res.status(201).json(item);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to submit feedback", details: err.message });
  }
});

app.put("/api/feedback/:id", requireAdmin, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const item = await (Feedback as any).findByIdAndUpdate(req.params.id, { status, adminNote }, { new: true });
    if (!item) return res.status(404).json({ error: "Feedback not found" });
    res.json(item);
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update feedback", details: err.message });
  }
});

// ─── CHAT HISTORY REST ENDPOINT ───────────────────────────────────────────────
// Fallback for initial load if Socket.IO is slow to connect
app.get("/api/chat/:ngoId/history", requireAuth, async (req: any, res) => {
  try {
    const { ngoId } = req.params;
    const ngoUser = await (User as any).findOne({ uid: ngoId });
    if (ngoUser && ngoUser.blockedUsers && ngoUser.blockedUsers.includes(req.uid)) {
      return res.status(403).json({ error: 'Forbidden: You have been blocked by this organization.' });
    }

    const isNgoOwner = req.uid === ngoId && req.userRoles?.includes('ngo');
    const isAdmin = req.userRoles?.includes('admin');
    let canJoin = isNgoOwner || isAdmin;
    if (!canJoin) {
      const events = await (VolunteerEvent as any).find({ ngoId });
      const eventIds = events.map((e: any) => e._id);
      const approved = await (VolunteerApplication as any).findOne({
        eventId: { $in: eventIds }, userId: req.uid, status: 'APPROVED',
      });
      canJoin = !!approved;
    }
    if (!canJoin) return res.status(403).json({ error: 'Forbidden: Not a member of this chat.' });
    const messages = await (ChatMessage as any)
      .find({ ngoId })
      .sort({ createdAt: 1 })
      .limit(50)
      .lean();
    res.json(messages);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch chat history', details: err.message });
  }
});

// ─── VITE MIDDLEWARE ──────────────────────────────────────────────────────────

async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
      root: path.join(process.cwd(), "frontend")
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`🔌 Socket.IO ready`);
  });
}

setupVite();
