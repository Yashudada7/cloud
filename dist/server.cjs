var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// backend/server.ts
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_crypto = __toESM(require("crypto"), 1);
var import_https = __toESM(require("https"), 1);
var import_vite = require("vite");
var import_mongoose2 = __toESM(require("mongoose"), 1);
var import_dotenv = __toESM(require("dotenv"), 1);

// firebase-applet-config.json
var firebase_applet_config_default = {
  projectId: "ai-studio-applet-webapp-1e896",
  appId: "1:314425052799:web:70f2feb77ded62ce76394a",
  apiKey: "AIzaSyCpKcEQKiEhURpBrHH76zHjCuva0iCshV0",
  authDomain: "ai-studio-applet-webapp-1e896.firebaseapp.com",
  firestoreDatabaseId: "ai-studio-b01689ec-a215-4be7-8dae-1f37d0508ebf",
  storageBucket: "ai-studio-applet-webapp-1e896.firebasestorage.app",
  messagingSenderId: "314425052799",
  measurementId: ""
};

// backend/models/index.ts
var import_mongoose = __toESM(require("mongoose"), 1);
var DonationDriveSchema = new import_mongoose.default.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  createdBy: { type: String, required: true },
  creatorName: { type: String, required: true },
  category: { type: String, required: true },
  // GENERAL | MEDICAL | EDUCATION | ENVIRONMENT | DISASTER | BLOOD | BOOKS
  imageUrl: { type: String },
  status: { type: String, default: "ACTIVE" },
  supporterCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});
var DonationDrive = import_mongoose.default.models.DonationDrive || import_mongoose.default.model("DonationDrive", DonationDriveSchema);
var CivicReportSchema = new import_mongoose.default.Schema({
  userId: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  photoUrl: { type: String, required: true },
  address: { type: String },
  // Human-readable address
  lat: { type: Number },
  // Geolocation latitude
  lng: { type: Number },
  // Geolocation longitude
  status: { type: String, default: "SUBMITTED" },
  govtNotes: { type: String },
  history: [{
    status: String,
    title: String,
    date: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});
var CivicReport = import_mongoose.default.models.CivicReport || import_mongoose.default.model("CivicReport", CivicReportSchema);
var BloodRequestSchema = new import_mongoose.default.Schema({
  bloodGroup: { type: String, required: true },
  units: { type: Number, required: true },
  urgency: { type: String, required: true },
  locationName: { type: String, required: true },
  address: { type: String },
  // Full address string
  lat: { type: Number },
  // Geolocation latitude
  lng: { type: Number },
  // Geolocation longitude
  hospitalId: { type: String, required: true },
  postedBy: { type: String },
  // 'user' | 'hospital' | 'ngo'
  postedByName: { type: String },
  status: { type: String, default: "OPEN" },
  createdAt: { type: Date, default: Date.now }
});
var BloodRequest = import_mongoose.default.models.BloodRequest || import_mongoose.default.model("BloodRequest", BloodRequestSchema);
var CourseSchema = new import_mongoose.default.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  educatorId: { type: String, required: true },
  educatorName: { type: String, required: true },
  category: { type: String, required: true },
  thumbnailUrl: { type: String },
  videoUrl: { type: String },
  materials: [{ type: String }],
  mcqTest: [{
    question: { type: String, required: true },
    options: [{ type: String, required: true }],
    correctAnswer: { type: Number, required: true }
  }],
  price: { type: Number, default: 0 },
  // 0 = free
  enrolledCount: { type: Number, default: 0 },
  reviews: [{
    userId: String,
    userName: String,
    rating: Number,
    comment: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});
var Course = import_mongoose.default.models.Course || import_mongoose.default.model("Course", CourseSchema);
var EnrollmentSchema = new import_mongoose.default.Schema({
  userId: { type: String, required: true },
  courseId: { type: import_mongoose.default.Schema.Types.ObjectId, ref: "Course", required: true },
  userName: { type: String },
  status: { type: String, default: "ENROLLED" },
  // ENROLLED | PASSED | FAILED
  score: { type: Number },
  // Final quiz score percentage
  enrolledAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});
var Enrollment = import_mongoose.default.models.Enrollment || import_mongoose.default.model("Enrollment", EnrollmentSchema);
var DonationSchema = new import_mongoose.default.Schema({
  driveId: { type: import_mongoose.default.Schema.Types.ObjectId, ref: "DonationDrive", required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: "VIRTUAL_WALLET" },
  paypalOrderId: { type: String },
  status: { type: String, default: "SUCCESS" },
  timestamp: { type: Date, default: Date.now }
});
var Donation = import_mongoose.default.models.Donation || import_mongoose.default.model("Donation", DonationSchema);
var UserSchema = new import_mongoose.default.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  roles: [{ type: String }],
  isVerified: { type: Boolean, default: false },
  // Used for NGO verification status
  isBanned: { type: Boolean, default: false },
  bio: { type: String },
  avatarUrl: { type: String },
  bloodGroup: { type: String },
  // User's blood group for donation matching
  phone: { type: String },
  address: { type: String },
  createdAt: { type: Date, default: Date.now }
});
var User = import_mongoose.default.models.User || import_mongoose.default.model("User", UserSchema);
var PhysicalDonationSchema = new import_mongoose.default.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String },
  value: { type: String },
  status: { type: String, default: "CONFIRMED" },
  date: { type: Date, default: Date.now }
});
var PhysicalDonation = import_mongoose.default.models.PhysicalDonation || import_mongoose.default.model("PhysicalDonation", PhysicalDonationSchema);
var VolunteeringSchema = new import_mongoose.default.Schema({
  userId: { type: String, required: true },
  activity: { type: String, required: true },
  role: { type: String, required: true },
  hours: { type: Number, required: true },
  status: { type: String, default: "APPROVED" },
  date: { type: Date, default: Date.now }
});
var Volunteering = import_mongoose.default.models.Volunteering || import_mongoose.default.model("Volunteering", VolunteeringSchema);
var AnimalCaseSchema = new import_mongoose.default.Schema({
  reportedBy: { type: String, required: true },
  animalType: { type: String, required: true },
  description: { type: String, required: true },
  photoUrl: { type: String, required: true },
  location: { type: String },
  // Address where animal was spotted
  status: { type: String, default: "OPEN" },
  // OPEN | EN_ROUTE | RESCUED | ADOPTED
  rescuedBy: { type: String },
  // UID of rescuer (NGO)
  ngoId: { type: String },
  ngoName: { type: String },
  rescuedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});
var AnimalCase = import_mongoose.default.models.AnimalCase || import_mongoose.default.model("AnimalCase", AnimalCaseSchema);
var VolunteerEventSchema = new import_mongoose.default.Schema({
  ngoId: { type: String, required: true },
  ngoName: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  date: { type: Date, required: true },
  requiredVolunteers: { type: Number, required: true },
  currentVolunteers: { type: Number, default: 0 },
  skills: [{ type: String }],
  eventType: { type: String, default: "VOLUNTEER" },
  // 'VOLUNTEER' | 'BLOOD_CAMP' | 'CHARITY_DRIVE'
  status: { type: String, default: "UPCOMING" },
  // UPCOMING | ONGOING | COMPLETED
  createdAt: { type: Date, default: Date.now }
});
var VolunteerEvent = import_mongoose.default.models.VolunteerEvent || import_mongoose.default.model("VolunteerEvent", VolunteerEventSchema);
var VolunteerApplicationSchema = new import_mongoose.default.Schema({
  eventId: { type: import_mongoose.default.Schema.Types.ObjectId, ref: "VolunteerEvent", required: true },
  ngoId: { type: String },
  // NGO this application belongs to (for quick lookup)
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String },
  message: { type: String },
  // Applicant's cover message
  status: { type: String, default: "PENDING" },
  // PENDING | APPROVED | REJECTED
  appliedAt: { type: Date, default: Date.now }
});
var VolunteerApplication = import_mongoose.default.models.VolunteerApplication || import_mongoose.default.model("VolunteerApplication", VolunteerApplicationSchema);
var AdoptionListingSchema = new import_mongoose.default.Schema({
  ngoId: { type: String, required: true },
  ngoName: { type: String, required: true },
  animalName: { type: String, required: true },
  animalType: { type: String, required: true },
  breed: { type: String },
  age: { type: String },
  description: { type: String, required: true },
  photoUrl: { type: String, required: true },
  status: { type: String, default: "AVAILABLE" },
  // AVAILABLE | PENDING | ADOPTED
  createdAt: { type: Date, default: Date.now }
});
var AdoptionListing = import_mongoose.default.models.AdoptionListing || import_mongoose.default.model("AdoptionListing", AdoptionListingSchema);
var AdoptionApplicationSchema = new import_mongoose.default.Schema({
  listingId: { type: import_mongoose.default.Schema.Types.ObjectId, ref: "AdoptionListing", required: true },
  ngoId: { type: String },
  // For quick lookup
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  contactInfo: { type: String, required: true },
  message: { type: String },
  status: { type: String, default: "PENDING" },
  // PENDING | APPROVED | REJECTED
  appliedAt: { type: Date, default: Date.now }
});
var AdoptionApplication = import_mongoose.default.models.AdoptionApplication || import_mongoose.default.model("AdoptionApplication", AdoptionApplicationSchema);
var FeedbackSchema = new import_mongoose.default.Schema({
  userId: { type: String, required: true },
  userName: { type: String },
  type: { type: String, default: "feedback" },
  // 'feedback' | 'complaint' | 'report'
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, default: "OPEN" },
  // OPEN | IN_REVIEW | RESOLVED
  adminNote: { type: String },
  createdAt: { type: Date, default: Date.now }
});
var Feedback = import_mongoose.default.models.Feedback || import_mongoose.default.model("Feedback", FeedbackSchema);

// backend/server.ts
var import_express_rate_limit = __toESM(require("express-rate-limit"), 1);
import_dotenv.default.config();
var app = (0, import_express.default)();
var PORT = 3e3;
var MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI || !MONGODB_URI.trim()) {
  console.warn("\u26A0\uFE0F MONGODB_URI is not defined in environment variables. Database features will be disabled.");
} else if (!MONGODB_URI.startsWith("mongodb://") && !MONGODB_URI.startsWith("mongodb+srv://")) {
  console.warn("\u26A0\uFE0F MONGODB_URI has an invalid scheme. Expected 'mongodb://' or 'mongodb+srv://'. Found:", MONGODB_URI.substring(0, 15) + "...");
} else {
  import_mongoose2.default.connect(MONGODB_URI).then(() => console.log("\u2705 Connected to MongoDB")).catch((err) => {
    console.error("\u274C MongoDB connection error:", err.message);
    if (err.name === "MongoParseError") {
      console.error("   Details: Please double check your MONGODB_URI format in the Settings menu.");
    }
  });
}
app.use(import_express.default.json({ limit: "50mb" }));
app.use(import_express.default.urlencoded({ extended: true, limit: "50mb" }));
var writeLimiter = (0, import_express_rate_limit.default)({
  windowMs: 10 * 60 * 1e3,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests from this IP. Please wait a moment and try again." }
});
var generalLimiter = (0, import_express_rate_limit.default)({
  windowMs: 60 * 1e3,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Please slow down." }
});
app.use("/api", generalLimiter);
var firebaseCertCache = {
  expiresAt: 0,
  certs: {}
};
function decodeBase64Url(value) {
  return Buffer.from(value, "base64url").toString("utf-8");
}
function fetchFirebaseCerts() {
  if (firebaseCertCache.expiresAt > Date.now() && Object.keys(firebaseCertCache.certs).length > 0) {
    return Promise.resolve(firebaseCertCache.certs);
  }
  return new Promise((resolve, reject) => {
    import_https.default.get("https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com", (response) => {
      let body = "";
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => {
        if (response.statusCode !== 200) {
          reject(new Error(`Firebase cert fetch failed with ${response.statusCode}`));
          return;
        }
        const cacheControl = response.headers["cache-control"];
        const maxAge = typeof cacheControl === "string" ? /max-age=(\d+)/.exec(cacheControl)?.[1] : void 0;
        const ttlMs = maxAge ? Number(maxAge) * 1e3 : 60 * 60 * 1e3;
        firebaseCertCache = {
          expiresAt: Date.now() + ttlMs,
          certs: JSON.parse(body)
        };
        resolve(firebaseCertCache.certs);
      });
    }).on("error", reject);
  });
}
async function verifyFirebaseIdToken(token) {
  const parts = token.split(".");
  if (parts.length !== 3) throw new Error("Malformed token");
  const [headerPart, payloadPart, signaturePart] = parts;
  const header = JSON.parse(decodeBase64Url(headerPart));
  const payload = JSON.parse(decodeBase64Url(payloadPart));
  const projectId = process.env.FIREBASE_PROJECT_ID || firebase_applet_config_default.projectId;
  if (header.alg !== "RS256" || !header.kid) throw new Error("Invalid token header");
  if (payload.aud !== projectId) throw new Error("Invalid token audience");
  if (payload.iss !== `https://securetoken.google.com/${projectId}`) throw new Error("Invalid token issuer");
  if (!payload.sub || payload.sub.length > 128) throw new Error("Invalid token subject");
  const now = Math.floor(Date.now() / 1e3);
  if (!payload.exp || payload.exp < now) throw new Error("Expired token");
  if (!payload.iat || payload.iat > now + 300) throw new Error("Invalid token issue time");
  const certs = await fetchFirebaseCerts();
  const cert = certs[header.kid];
  if (!cert) throw new Error("Unknown token key");
  const verifier = import_crypto.default.createVerify("RSA-SHA256");
  verifier.update(`${headerPart}.${payloadPart}`);
  verifier.end();
  const isValid = verifier.verify(cert, Buffer.from(signaturePart, "base64url"));
  if (!isValid) throw new Error("Invalid token signature");
  return payload;
}
async function requireAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Unauthorized: No token provided." });
  }
  try {
    const token = authHeader.split("Bearer ")[1];
    const payload = await verifyFirebaseIdToken(token);
    const uid = payload?.user_id || payload?.sub;
    if (!uid) return res.status(401).json({ error: "Unauthorized: Invalid token payload." });
    const user = await User.findOne({ uid });
    if (!user) return res.status(401).json({ error: "Unauthorized: User record not found." });
    if (user.isBanned) return res.status(403).json({ error: "Forbidden: This account has been suspended." });
    req.uid = uid;
    req.userRoles = user.roles || [];
    next();
  } catch (err) {
    return res.status(401).json({ error: "Unauthorized: Token processing failed." });
  }
}
function requireRole(...roles) {
  return async (req, res, next) => {
    await requireAuth(req, res, () => {
      if (!roles.some((role) => req.userRoles?.includes(role))) {
        return res.status(403).json({ error: `Forbidden: ${roles.join(" or ")} access required.` });
      }
      next();
    });
  };
}
function requireSelfOrAdmin(paramName) {
  return async (req, res, next) => {
    await requireAuth(req, res, () => {
      if (req.uid !== req.params[paramName] && !req.userRoles?.includes("admin")) {
        return res.status(403).json({ error: "Forbidden: You can only access your own records." });
      }
      next();
    });
  };
}
async function requireAdmin(req, res, next) {
  await requireAuth(req, res, () => {
    if (!req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: Admin access required." });
    }
    next();
  });
}
var VALID_BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "O+", "O-", "AB+", "AB-"];
var EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
var VALID_ROLES = ["volunteer", "ngo", "hospital", "govt", "educator", "admin"];
function sanitizeString(val, maxLength = 500) {
  if (typeof val !== "string") return "";
  return val.trim().replace(/<[^>]*>/g, "").substring(0, maxLength);
}
function validateRequired(fields) {
  for (const [key, val] of Object.entries(fields)) {
    if (val === void 0 || val === null || typeof val === "string" && !val.trim()) {
      return `'${key}' is required.`;
    }
  }
  return null;
}
app.use("/api", (req, res, next) => {
  if (import_mongoose2.default.connection.readyState !== 1 && req.path !== "/health") {
    return res.status(503).json({
      error: "Database not connected",
      message: "The server is unable to connect to MongoDB. Please check your MONGODB_URI in the Settings menu."
    });
  }
  next();
});
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", dbConnected: import_mongoose2.default.connection.readyState === 1 });
});
app.get("/api/stats/volunteer/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const { userId } = req.params;
    const [volunteering, enrollments, reports, bloodRequests, activeDrives] = await Promise.all([
      Volunteering.find({ userId }),
      Enrollment.find({ userId }),
      CivicReport.find({ userId }),
      BloodRequest.find({ hospitalId: userId }),
      DonationDrive.countDocuments({ status: "ACTIVE" })
    ]);
    const totalHours = volunteering.reduce((sum, v) => sum + (v.hours || 0), 0);
    const passedCerts = enrollments.filter((e) => e.status === "PASSED").length;
    const resolvedReports = reports.filter((r) => r.status === "RESOLVED").length;
    const recentActivity = [
      ...volunteering.slice(0, 3).map((v) => ({ title: `Volunteered: ${v.activity}`, subtitle: `${v.hours}hrs \u2022 ${v.role}`, date: v.date })),
      ...enrollments.slice(0, 3).map((e) => ({ title: `Course Enrollment`, subtitle: `Status: ${e.status}`, date: e.enrolledAt })),
      ...reports.slice(0, 3).map((r) => ({ title: `Civic Report: ${r.category}`, subtitle: `Status: ${r.status}`, date: r.createdAt }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);
    res.json({ totalHours, passedCerts, resolvedReports, activeDrives, recentActivity });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch volunteer stats", details: err.message });
  }
});
app.get("/api/stats/ngo/:ngoId", requireSelfOrAdmin("ngoId"), async (req, res) => {
  try {
    const { ngoId } = req.params;
    const [events, drives] = await Promise.all([
      VolunteerEvent.find({ ngoId }),
      DonationDrive.find({ createdBy: ngoId })
    ]);
    const activeProjects = events.filter((e) => e.status === "UPCOMING").length;
    const totalVolunteers = events.reduce((sum, e) => sum + (e.currentVolunteers || 0), 0);
    const fundsRaised = drives.reduce((sum, d) => sum + (d.currentAmount || 0), 0);
    const recentActivity = [
      ...events.slice(0, 3).map((e) => ({ title: e.title, subtitle: `${e.currentVolunteers}/${e.requiredVolunteers} volunteers \u2022 ${e.status}`, date: e.createdAt })),
      ...drives.slice(0, 2).map((d) => ({ title: `Drive: ${d.title}`, subtitle: `\u20B9${d.currentAmount?.toLocaleString()} raised`, date: d.createdAt }))
    ].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 4);
    res.json({ activeProjects, totalVolunteers, fundsRaised, recentActivity });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch NGO stats", details: err.message });
  }
});
app.get("/api/stats/educator/:educatorId", requireSelfOrAdmin("educatorId"), async (req, res) => {
  try {
    const { educatorId } = req.params;
    const courses = await Course.find({ educatorId });
    const courseIds = courses.map((c) => c._id);
    const [allEnrollments, passedEnrollments, recentEnrollments] = await Promise.all([
      Enrollment.find({ courseId: { $in: courseIds } }),
      Enrollment.find({ courseId: { $in: courseIds }, status: "PASSED" }),
      Enrollment.find({ courseId: { $in: courseIds } }).sort({ enrolledAt: -1 }).limit(5)
    ]);
    const totalLearners = allEnrollments.length;
    const certIssued = passedEnrollments.length;
    const activeLearners = allEnrollments.filter((e) => e.status === "ENROLLED").length;
    const completionRate = totalLearners > 0 ? Math.round(certIssued / totalLearners * 100) : 0;
    const scoredEnrollments = allEnrollments.filter((e) => e.score != null);
    const avgQuizScore = scoredEnrollments.length > 0 ? Math.round(scoredEnrollments.reduce((sum, e) => sum + e.score, 0) / scoredEnrollments.length) : 0;
    const revenue = courses.reduce((sum, c) => {
      const paidEnrollments = allEnrollments.filter((e) => e.courseId.toString() === c._id.toString());
      return sum + paidEnrollments.length * (c.price || 0);
    }, 0);
    const recentReviews = courses.flatMap(
      (c) => (c.reviews || []).map((r) => ({
        courseTitle: c.title,
        userName: r.userName,
        rating: r.rating,
        comment: r.comment,
        date: r.createdAt
      }))
    ).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    const recentActivity = courses.slice(0, 4).map((c) => ({
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
      recentEnrollments: recentEnrollments.map((e) => ({
        userName: e.userName,
        status: e.status,
        date: e.enrolledAt
      })),
      recentActivity
    });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch educator stats", details: err.message });
  }
});
app.get("/api/donation-drives", async (req, res) => {
  try {
    const drives = await DonationDrive.find().sort({ createdAt: -1 });
    res.json(drives);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch donation drives", details: err.message });
  }
});
app.patch("/api/donation-drives/:id/status", requireAuth, async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["ACTIVE", "COMPLETED", "PAUSED"];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(", ")}` });
    const existing = await DonationDrive.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Drive not found" });
    if (existing.createdBy !== req.uid && !req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: Only the drive creator or an admin can update this drive." });
    }
    existing.status = status;
    await existing.save();
    res.json(existing);
  } catch (err) {
    res.status(500).json({ error: "Failed to update drive status", details: err.message });
  }
});
app.post("/api/donation-drives", requireAuth, writeLimiter, async (req, res) => {
  try {
    const { title, description, targetAmount, createdBy, creatorName, category } = req.body;
    const missing = validateRequired({ title, description, targetAmount, createdBy, creatorName, category });
    if (missing) return res.status(400).json({ error: missing });
    if (req.uid !== createdBy && !req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: You can only create drives as yourself." });
    }
    if (typeof targetAmount !== "number" || targetAmount <= 0) {
      return res.status(400).json({ error: "'targetAmount' must be a positive number." });
    }
    const sanitized = {
      ...req.body,
      title: sanitizeString(title, 200),
      description: sanitizeString(description, 1e3),
      creatorName: sanitizeString(creatorName, 100)
    };
    const drive = new DonationDrive(sanitized);
    await drive.save();
    res.status(201).json(drive);
  } catch (err) {
    res.status(500).json({ error: "Failed to create donation drive", details: err.message });
  }
});
app.get("/api/reports", async (req, res) => {
  try {
    const reports = await CivicReport.find().sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch reports", details: err.message });
  }
});
app.get("/api/reports/stats", async (req, res) => {
  try {
    const total = await CivicReport.countDocuments();
    const submitted = await CivicReport.countDocuments({ status: "SUBMITTED" });
    const inProgress = await CivicReport.countDocuments({ status: "IN_PROGRESS" });
    const resolved = await CivicReport.countDocuments({ status: "RESOLVED" });
    const startOfDay = /* @__PURE__ */ new Date();
    startOfDay.setHours(0, 0, 0, 0);
    const newToday = await CivicReport.countDocuments({ createdAt: { $gte: startOfDay } });
    const categoryBreakdown = await CivicReport.aggregate([
      { $group: { _id: "$category", count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1e3);
    const overdue = await CivicReport.countDocuments({
      status: "IN_PROGRESS",
      createdAt: { $lt: sevenDaysAgo }
    });
    const resolvedReports = await CivicReport.find({ status: "RESOLVED" });
    let avgResolutionHours = 0;
    if (resolvedReports.length > 0) {
      const totalMs = resolvedReports.reduce((sum, r) => {
        const resolvedEntry = (r.history || []).find((h) => h.status === "RESOLVED");
        if (resolvedEntry) return sum + (new Date(resolvedEntry.date).getTime() - new Date(r.createdAt).getTime());
        return sum;
      }, 0);
      avgResolutionHours = Math.round(totalMs / resolvedReports.length / (1e3 * 60 * 60));
    }
    res.json({ total, submitted, inProgress, resolved, newToday, categoryBreakdown, overdue, avgResolutionHours });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch report stats", details: err.message });
  }
});
app.get("/api/reports/user/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const reports = await CivicReport.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(reports);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user reports", details: err.message });
  }
});
app.post("/api/reports", requireAuth, writeLimiter, async (req, res) => {
  try {
    const { userId, category, description, photoUrl } = req.body;
    const missing = validateRequired({ userId, category, description, photoUrl });
    if (missing) return res.status(400).json({ error: missing });
    if (req.uid !== userId) {
      return res.status(403).json({ error: "Forbidden: You can only submit reports as yourself." });
    }
    if (sanitizeString(description).length < 20) {
      return res.status(400).json({ error: "'description' must be at least 20 characters." });
    }
    const sanitized = {
      ...req.body,
      description: sanitizeString(description, 2e3),
      address: sanitizeString(req.body.address, 500)
    };
    const report = new CivicReport(sanitized);
    await report.save();
    res.status(201).json(report);
  } catch (err) {
    res.status(500).json({ error: "Failed to submit report", details: err.message });
  }
});
app.put("/api/reports/:id", requireRole("govt", "admin"), async (req, res) => {
  try {
    const { status, govtNotes } = req.body;
    const allowed = ["SUBMITTED", "IN_PROGRESS", "RESOLVED"];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(", ")}` });
    const updateData = { status };
    if (govtNotes !== void 0) updateData.govtNotes = govtNotes;
    const historyEntry = {
      status,
      title: req.body.historyTitle || `Status updated to ${status}`,
      date: /* @__PURE__ */ new Date()
    };
    const report = await CivicReport.findByIdAndUpdate(
      req.params.id,
      { ...updateData, $push: { history: historyEntry } },
      { new: true }
    );
    if (!report) return res.status(404).json({ error: "Report not found" });
    res.json(report);
  } catch (err) {
    res.status(500).json({ error: "Failed to update report", details: err.message });
  }
});
app.get("/api/blood-requests", async (req, res) => {
  try {
    const { bloodGroup } = req.query;
    const filter = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    const requests = await BloodRequest.find(filter).sort({ createdAt: -1 });
    res.json(requests);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch blood requests", details: err.message });
  }
});
app.post("/api/blood-requests", requireAuth, writeLimiter, async (req, res) => {
  try {
    const { bloodGroup, units, urgency, locationName, hospitalId } = req.body;
    const missing = validateRequired({ bloodGroup, units, urgency, locationName, hospitalId });
    if (missing) return res.status(400).json({ error: missing });
    if (req.uid !== hospitalId && !req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: You can only create blood requests as yourself." });
    }
    if (!VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ error: `'bloodGroup' must be one of: ${VALID_BLOOD_GROUPS.join(", ")}` });
    }
    if (typeof units !== "number" || units <= 0 || units > 20) {
      return res.status(400).json({ error: "'units' must be a positive number (max 20)." });
    }
    const sanitized = {
      ...req.body,
      locationName: sanitizeString(locationName, 200),
      address: sanitizeString(req.body.address, 500),
      postedByName: sanitizeString(req.body.postedByName, 100)
    };
    const request = new BloodRequest(sanitized);
    await request.save();
    res.status(201).json(request);
  } catch (err) {
    res.status(500).json({ error: "Failed to create blood request", details: err.message });
  }
});
app.get("/api/animal-cases", async (req, res) => {
  try {
    const cases = await AnimalCase.find().sort({ createdAt: -1 });
    res.json(cases);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch animal cases", details: err.message });
  }
});
app.post("/api/animal-cases", requireAuth, writeLimiter, async (req, res) => {
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
      description: sanitizeString(description, 2e3),
      location: sanitizeString(req.body.location, 500)
    });
    await animalCase.save();
    res.status(201).json(animalCase);
  } catch (err) {
    res.status(500).json({ error: "Failed to create animal case", details: err.message });
  }
});
app.patch("/api/animal-cases/:id/status", requireRole("ngo", "admin"), async (req, res) => {
  try {
    const { status, ngoId, ngoName } = req.body;
    const allowed = ["OPEN", "EN_ROUTE", "RESCUED", "ADOPTED"];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(", ")}` });
    const updateData = { status };
    if (ngoId && ngoId !== req.uid && !req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: NGOs can only assign cases to themselves." });
    }
    if (ngoId) updateData.ngoId = ngoId;
    if (ngoName) updateData.ngoName = ngoName;
    if (ngoId) updateData.rescuedBy = ngoId;
    if (status === "RESCUED") updateData.rescuedAt = /* @__PURE__ */ new Date();
    if (status === "OPEN") {
      updateData.ngoId = null;
      updateData.ngoName = null;
      updateData.rescuedBy = null;
      updateData.rescuedAt = null;
    }
    const updated = await AnimalCase.findByIdAndUpdate(req.params.id, updateData, { new: true });
    if (!updated) return res.status(404).json({ error: "Animal case not found" });
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update animal case status", details: err.message });
  }
});
app.get("/api/courses", async (req, res) => {
  try {
    const courses = await Course.find().sort({ createdAt: -1 });
    res.json(courses);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch courses" });
  }
});
app.post("/api/courses", requireRole("educator", "admin"), writeLimiter, async (req, res) => {
  try {
    if (req.body.educatorId !== req.uid && !req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: You can only create courses as yourself." });
    }
    const { title, description, educatorId, educatorName, category } = req.body;
    const missing = validateRequired({ title, description, educatorId, educatorName, category });
    if (missing) return res.status(400).json({ error: missing });
    const course = new Course({
      ...req.body,
      title: sanitizeString(title, 200),
      description: sanitizeString(description, 2e3),
      educatorName: sanitizeString(educatorName, 100),
      category: sanitizeString(category, 100)
    });
    await course.save();
    res.status(201).json(course);
  } catch (err) {
    res.status(500).json({ error: "Failed to create course" });
  }
});
app.post("/api/courses/:id/reviews", requireAuth, writeLimiter, async (req, res) => {
  try {
    if (req.body.userId && req.body.userId !== req.uid) {
      return res.status(403).json({ error: "Forbidden: You can only review as yourself." });
    }
    const course = await Course.findByIdAndUpdate(
      req.params.id,
      {
        $push: {
          reviews: {
            ...req.body,
            userId: req.uid,
            userName: sanitizeString(req.body.userName, 100),
            comment: sanitizeString(req.body.comment, 1e3)
          }
        }
      },
      { new: true }
    );
    if (!course) return res.status(404).json({ error: "Course not found" });
    res.json(course);
  } catch (err) {
    res.status(500).json({ error: "Failed to add review", details: err.message });
  }
});
app.get("/api/enrollments/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const enrollments = await Enrollment.find({ userId: req.params.userId }).populate("courseId");
    res.json(enrollments);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch enrollments" });
  }
});
app.post("/api/enrollments", requireAuth, writeLimiter, async (req, res) => {
  try {
    const { userId, courseId, userName } = req.body;
    if (userId !== req.uid) {
      return res.status(403).json({ error: "Forbidden: You can only enroll yourself." });
    }
    const missing = validateRequired({ userId, courseId, userName });
    if (missing) return res.status(400).json({ error: missing });
    const existing = await Enrollment.findOne({ userId, courseId });
    if (existing) return res.status(400).json({ error: "Already enrolled" });
    const enrollment = new Enrollment(req.body);
    await enrollment.save();
    await Course.findByIdAndUpdate(courseId, { $inc: { enrolledCount: 1 } });
    res.status(201).json(enrollment);
  } catch (err) {
    res.status(500).json({ error: "Failed to enroll" });
  }
});
app.put("/api/enrollments/:id", requireAuth, async (req, res) => {
  try {
    const { status, score } = req.body;
    const allowed = ["ENROLLED", "PASSED", "FAILED"];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(", ")}` });
    const existing = await Enrollment.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Enrollment not found" });
    if (existing.userId !== req.uid && !req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: You can only update your own enrollment." });
    }
    const updateData = { status };
    if (score !== void 0) updateData.score = score;
    if (status === "PASSED" || status === "FAILED") updateData.completedAt = /* @__PURE__ */ new Date();
    const enrollment = await Enrollment.findByIdAndUpdate(req.params.id, updateData, { new: true });
    res.json(enrollment);
  } catch (err) {
    res.status(500).json({ error: "Failed to update enrollment" });
  }
});
app.get("/api/physical-donations/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const data = await PhysicalDonation.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch physical donations" });
  }
});
app.get("/api/volunteering/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const data = await Volunteering.find({ userId: req.params.userId }).sort({ date: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch volunteering data" });
  }
});
app.get("/api/monetary-donations/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const data = await Donation.find({ userId: req.params.userId }).sort({ timestamp: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch monetary donations" });
  }
});
app.post("/api/donations", requireAuth, writeLimiter, async (req, res) => {
  try {
    const { driveId, userId, userName, amount } = req.body;
    const missing = validateRequired({ driveId, userId, userName, amount });
    if (missing) return res.status(400).json({ error: missing });
    if (userId !== req.uid) {
      return res.status(403).json({ error: "Forbidden: You can only record donations as yourself." });
    }
    if (typeof amount !== "number" || amount <= 0) {
      return res.status(400).json({ error: "'amount' must be a positive number." });
    }
    const drive = await DonationDrive.findById(driveId);
    if (!drive) return res.status(404).json({ error: "Drive not found" });
    const donation = new Donation({
      ...req.body,
      userName: sanitizeString(userName, 100),
      paymentMethod: sanitizeString(req.body.paymentMethod || "PAYPAL", 50),
      paypalOrderId: sanitizeString(req.body.paypalOrderId, 120)
    });
    await donation.save();
    await DonationDrive.findByIdAndUpdate(driveId, { $inc: { currentAmount: amount, supporterCount: 1 } });
    res.status(201).json(donation);
  } catch (err) {
    res.status(500).json({ error: "Failed to process donation", details: err.message });
  }
});
app.get("/api/users/:uid", requireSelfOrAdmin("uid"), async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.params.uid });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user" });
  }
});
app.post("/api/users", writeLimiter, async (req, res) => {
  try {
    let { uid, name, email, roles, bio, address, bloodGroup, phone } = req.body;
    const missing = validateRequired({ uid, name, email });
    if (missing) return res.status(400).json({ error: missing });
    if (!EMAIL_REGEX.test(String(email).trim())) {
      return res.status(400).json({ error: "'email' is not a valid email address." });
    }
    if (bloodGroup && !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
      return res.status(400).json({ error: `'bloodGroup' must be one of: ${VALID_BLOOD_GROUPS.join(", ")}` });
    }
    const normalizedEmail = String(email).trim().toLowerCase();
    const existingByEmail = await User.findOne({ email: normalizedEmail, uid: { $ne: uid } });
    if (existingByEmail) {
      return res.status(409).json({
        error: "An account with this email address already exists. Please log in instead.",
        code: "EMAIL_ALREADY_IN_USE"
      });
    }
    roles = ["volunteer"];
    const updateData = {
      name: sanitizeString(name, 100),
      email: normalizedEmail,
      roles
    };
    if (bio !== void 0) updateData.bio = sanitizeString(bio, 300);
    if (address !== void 0) updateData.address = sanitizeString(address, 500);
    if (bloodGroup !== void 0) updateData.bloodGroup = bloodGroup;
    if (phone !== void 0) updateData.phone = sanitizeString(phone, 20);
    const user = await User.findOneAndUpdate(
      { uid },
      updateData,
      { upsert: true, new: true }
    );
    res.json(user);
  } catch (err) {
    if (err.code === 11e3) {
      const field = err.keyPattern?.email ? "email" : "uid";
      return res.status(409).json({
        error: `An account with this ${field} already exists. Please log in instead.`,
        code: "EMAIL_ALREADY_IN_USE"
      });
    }
    res.status(500).json({ error: "Failed to save user" });
  }
});
app.put("/api/users/:uid", requireAuth, async (req, res) => {
  try {
    if (req.uid !== req.params.uid && !req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: You can only update your own profile." });
    }
    const { bloodGroup, bio, phone, address, avatarUrl, name } = req.body;
    const updateData = {};
    if (bloodGroup !== void 0) {
      if (bloodGroup && !VALID_BLOOD_GROUPS.includes(bloodGroup)) {
        return res.status(400).json({ error: `'bloodGroup' must be one of: ${VALID_BLOOD_GROUPS.join(", ")}` });
      }
      updateData.bloodGroup = bloodGroup;
    }
    if (bio !== void 0) updateData.bio = sanitizeString(bio, 300);
    if (phone !== void 0) updateData.phone = sanitizeString(phone, 20);
    if (address !== void 0) updateData.address = sanitizeString(address, 500);
    if (avatarUrl !== void 0) updateData.avatarUrl = avatarUrl;
    if (name !== void 0) {
      const trimmedName = sanitizeString(name, 100);
      if (trimmedName.length < 2) return res.status(400).json({ error: "'name' must be at least 2 characters." });
      updateData.name = trimmedName;
    }
    const user = await User.findOneAndUpdate({ uid: req.params.uid }, updateData, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user profile", details: err.message });
  }
});
app.get("/api/volunteer-events", async (req, res) => {
  try {
    const { eventType } = req.query;
    const filter = {};
    if (eventType) filter.eventType = eventType;
    const events = await VolunteerEvent.find(filter).sort({ createdAt: -1 });
    res.json(events);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch volunteer events" });
  }
});
app.post("/api/volunteer-events", requireRole("ngo", "admin"), writeLimiter, async (req, res) => {
  try {
    if (req.body.ngoId !== req.uid && !req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: You can only create events for your own organization." });
    }
    const { ngoId, ngoName, title, description, location, date, requiredVolunteers } = req.body;
    const missing = validateRequired({ ngoId, ngoName, title, description, location, date, requiredVolunteers });
    if (missing) return res.status(400).json({ error: missing });
    const event = new VolunteerEvent({
      ...req.body,
      ngoName: sanitizeString(ngoName, 100),
      title: sanitizeString(title, 200),
      description: sanitizeString(description, 2e3),
      location: sanitizeString(location, 500)
    });
    await event.save();
    res.status(201).json(event);
  } catch (err) {
    res.status(500).json({ error: "Failed to create volunteer event", details: err.message });
  }
});
app.get("/api/volunteer-applications/:eventId", requireRole("ngo", "admin"), async (req, res) => {
  try {
    const event = await VolunteerEvent.findById(req.params.eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.ngoId !== req.uid && !req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: You can only view applications for your own events." });
    }
    const applications = await VolunteerApplication.find({ eventId: req.params.eventId }).sort({ appliedAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch volunteer applications" });
  }
});
app.get("/api/volunteer-applications/by-user/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const applications = await VolunteerApplication.find({ userId: req.params.userId }).sort({ appliedAt: -1 });
    const populated = await Promise.all(applications.map(async (app2) => {
      const event = await VolunteerEvent.findById(app2.eventId);
      return { ...app2.toObject(), event };
    }));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user applications", details: err.message });
  }
});
app.post("/api/volunteer-applications", requireAuth, writeLimiter, async (req, res) => {
  try {
    if (req.body.userId !== req.uid) {
      return res.status(403).json({ error: "Forbidden: You can only apply as yourself." });
    }
    const { eventId, userId, userName } = req.body;
    const missing = validateRequired({ eventId, userId, userName });
    if (missing) return res.status(400).json({ error: missing });
    const existing = await VolunteerApplication.findOne({ eventId: req.body.eventId, userId: req.body.userId });
    if (existing) return res.status(400).json({ error: "Already applied to this event" });
    const application = new VolunteerApplication({
      ...req.body,
      userName: sanitizeString(userName, 100),
      userEmail: sanitizeString(req.body.userEmail, 200),
      message: sanitizeString(req.body.message, 1e3)
    });
    await application.save();
    await VolunteerEvent.findByIdAndUpdate(req.body.eventId, { $inc: { currentVolunteers: 1 } });
    res.status(201).json(application);
  } catch (err) {
    res.status(500).json({ error: "Failed to apply for volunteer event", details: err.message });
  }
});
app.put("/api/volunteer-applications/:id", requireRole("ngo", "admin"), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["PENDING", "APPROVED", "REJECTED"];
    if (!allowed.includes(status)) return res.status(400).json({ error: `Status must be one of: ${allowed.join(", ")}` });
    const existing = await VolunteerApplication.findById(req.params.id);
    if (!existing) return res.status(404).json({ error: "Application not found" });
    const event = await VolunteerEvent.findById(existing.eventId);
    if (!event) return res.status(404).json({ error: "Event not found" });
    if (event.ngoId !== req.uid && !req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: You can only update applications for your own events." });
    }
    const updated = await VolunteerApplication.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (status === "REJECTED" && existing.status === "APPROVED") {
      await VolunteerEvent.findByIdAndUpdate(existing.eventId, { $inc: { currentVolunteers: -1 } });
    }
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: "Failed to update application", details: err.message });
  }
});
app.get("/api/adoptions", async (req, res) => {
  try {
    const listings = await AdoptionListing.find().sort({ createdAt: -1 });
    res.json(listings);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch adoption listings" });
  }
});
app.post("/api/adoptions", requireRole("ngo", "admin"), writeLimiter, async (req, res) => {
  try {
    if (req.body.ngoId !== req.uid && !req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: You can only create listings for your own organization." });
    }
    const { ngoId, ngoName, animalName, animalType, description, photoUrl } = req.body;
    const missing = validateRequired({ ngoId, ngoName, animalName, animalType, description, photoUrl });
    if (missing) return res.status(400).json({ error: missing });
    const listing = new AdoptionListing({
      ...req.body,
      ngoName: sanitizeString(ngoName, 100),
      animalName: sanitizeString(animalName, 100),
      animalType: sanitizeString(animalType, 100),
      breed: sanitizeString(req.body.breed, 100),
      age: sanitizeString(req.body.age, 50),
      description: sanitizeString(description, 2e3)
    });
    await listing.save();
    res.status(201).json(listing);
  } catch (err) {
    res.status(500).json({ error: "Failed to create adoption listing", details: err.message });
  }
});
app.get("/api/adoption-applications/:listingId", requireRole("ngo", "admin"), async (req, res) => {
  try {
    const listing = await AdoptionListing.findById(req.params.listingId);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.ngoId !== req.uid && !req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: You can only view applications for your own listings." });
    }
    const applications = await AdoptionApplication.find({ listingId: req.params.listingId }).sort({ appliedAt: -1 });
    res.json(applications);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch adoption applications" });
  }
});
app.get("/api/adoption-applications/by-user/:userId", requireSelfOrAdmin("userId"), async (req, res) => {
  try {
    const applications = await AdoptionApplication.find({ userId: req.params.userId }).sort({ appliedAt: -1 });
    const populated = await Promise.all(applications.map(async (app2) => {
      const listing = await AdoptionListing.findById(app2.listingId);
      return { ...app2.toObject(), listing };
    }));
    res.json(populated);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch user adoption applications", details: err.message });
  }
});
app.post("/api/adoption-applications", requireAuth, writeLimiter, async (req, res) => {
  try {
    if (req.body.userId !== req.uid) {
      return res.status(403).json({ error: "Forbidden: You can only apply as yourself." });
    }
    const { listingId, userId, userName, contactInfo } = req.body;
    const missing = validateRequired({ listingId, userId, userName, contactInfo });
    if (missing) return res.status(400).json({ error: missing });
    const existing = await AdoptionApplication.findOne({ listingId: req.body.listingId, userId: req.body.userId });
    if (existing) return res.status(400).json({ error: "Already applied for this animal" });
    const application = new AdoptionApplication({
      ...req.body,
      userName: sanitizeString(userName, 100),
      contactInfo: sanitizeString(contactInfo, 300),
      message: sanitizeString(req.body.message, 1e3)
    });
    await application.save();
    await AdoptionListing.findByIdAndUpdate(req.body.listingId, { status: "PENDING" });
    res.status(201).json(application);
  } catch (err) {
    res.status(500).json({ error: "Failed to apply for adoption", details: err.message });
  }
});
app.put("/api/adoption-applications/:id", requireRole("ngo", "admin"), async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ["PENDING", "APPROVED", "REJECTED"];
    if (!allowed.includes(status)) return res.status(400).json({ error: "Invalid status" });
    const app2 = await AdoptionApplication.findById(req.params.id);
    if (!app2) return res.status(404).json({ error: "Application not found" });
    const listing = await AdoptionListing.findById(app2.listingId);
    if (!listing) return res.status(404).json({ error: "Listing not found" });
    if (listing.ngoId !== req.uid && !req.userRoles?.includes("admin")) {
      return res.status(403).json({ error: "Forbidden: You can only update applications for your own listings." });
    }
    app2.status = status;
    await app2.save();
    if (status === "APPROVED") {
      await AdoptionListing.findByIdAndUpdate(app2.listingId, { status: "ADOPTED" });
    } else if (status === "REJECTED") {
      await AdoptionListing.findByIdAndUpdate(app2.listingId, { status: "AVAILABLE" });
    }
    res.json(app2);
  } catch (err) {
    res.status(500).json({ error: "Failed to update adoption application", details: err.message });
  }
});
app.get("/api/admin/stats", requireAdmin, async (req, res) => {
  try {
    const [totalUsers, totalNgos, verifiedNgos, totalDrives, totalReports, totalFeedback, totalCourses] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ roles: "ngo" }),
      User.countDocuments({ roles: "ngo", isVerified: true }),
      DonationDrive.countDocuments(),
      CivicReport.countDocuments(),
      Feedback.countDocuments({ status: "OPEN" }),
      Course.countDocuments()
    ]);
    const pendingNgos = totalNgos - verifiedNgos;
    res.json({ totalUsers, totalNgos, verifiedNgos, pendingNgos, totalDrives, totalReports, totalFeedback, totalCourses });
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch admin stats", details: err.message });
  }
});
app.get("/api/admin/ngos", requireAdmin, async (req, res) => {
  try {
    const ngos = await User.find({ roles: "ngo" }).sort({ createdAt: -1 });
    res.json(ngos);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch NGOs" });
  }
});
app.put("/api/admin/ngos/:uid/verify", requireAdmin, async (req, res) => {
  try {
    const { isVerified } = req.body;
    if (typeof isVerified !== "boolean") return res.status(400).json({ error: "'isVerified' must be a boolean." });
    const user = await User.findOneAndUpdate({ uid: req.params.uid }, { isVerified }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update NGO verification" });
  }
});
app.get("/api/admin/users", requireAdmin, async (req, res) => {
  try {
    const users = await User.find().sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch users" });
  }
});
app.put("/api/admin/users/:uid/role", requireAdmin, async (req, res) => {
  try {
    const { role, action } = req.body;
    if (!VALID_ROLES.includes(role)) return res.status(400).json({ error: `'role' must be one of: ${VALID_ROLES.join(", ")}` });
    if (!["add", "remove"].includes(action)) return res.status(400).json({ error: "'action' must be 'add' or 'remove'." });
    const update = action === "add" ? { $addToSet: { roles: role } } : { $pull: { roles: role } };
    const user = await User.findOneAndUpdate({ uid: req.params.uid }, update, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update user role" });
  }
});
app.put("/api/admin/users/:uid/ban", requireAdmin, async (req, res) => {
  try {
    const { isBanned } = req.body;
    if (typeof isBanned !== "boolean") return res.status(400).json({ error: "'isBanned' must be a boolean." });
    const user = await User.findOneAndUpdate({ uid: req.params.uid }, { isBanned }, { new: true });
    if (!user) return res.status(404).json({ error: "User not found" });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: "Failed to update ban status" });
  }
});
app.get("/api/feedback", requireAdmin, async (req, res) => {
  try {
    const feedback = await Feedback.find().sort({ createdAt: -1 });
    res.json(feedback);
  } catch (err) {
    res.status(500).json({ error: "Failed to fetch feedback" });
  }
});
app.post("/api/feedback", requireAuth, writeLimiter, async (req, res) => {
  try {
    const { userId, subject, message } = req.body;
    const missing = validateRequired({ userId, subject, message });
    if (missing) return res.status(400).json({ error: missing });
    if (req.uid !== userId) {
      return res.status(403).json({ error: "Forbidden: You can only submit feedback as yourself." });
    }
    const cleanSubject = sanitizeString(subject, 200);
    const cleanMessage = sanitizeString(message, 2e3);
    if (cleanMessage.length < 10) {
      return res.status(400).json({ error: "'message' must be at least 10 characters." });
    }
    const item = new Feedback({
      ...req.body,
      subject: cleanSubject,
      message: cleanMessage,
      userName: sanitizeString(req.body.userName, 100)
    });
    await item.save();
    res.status(201).json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to submit feedback", details: err.message });
  }
});
app.put("/api/feedback/:id", requireAdmin, async (req, res) => {
  try {
    const { status, adminNote } = req.body;
    const item = await Feedback.findByIdAndUpdate(req.params.id, { status, adminNote }, { new: true });
    if (!item) return res.status(404).json({ error: "Feedback not found" });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: "Failed to update feedback", details: err.message });
  }
});
async function setupVite() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa",
      root: import_path.default.join(process.cwd(), "frontend")
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*all", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} Server running on http://localhost:${PORT}`);
  });
}
setupVite();
//# sourceMappingURL=server.cjs.map
