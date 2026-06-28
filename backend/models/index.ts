import mongoose from 'mongoose';

const DonationDriveSchema = new mongoose.Schema({
  title: { type: String, required: true },
  description: { type: String, required: true },
  targetAmount: { type: Number, required: true },
  currentAmount: { type: Number, default: 0 },
  createdBy: { type: String, required: true },
  creatorName: { type: String, required: true },
  category: { type: String, required: true }, // GENERAL | MEDICAL | EDUCATION | ENVIRONMENT | DISASTER | BLOOD | BOOKS
  imageUrl: { type: String },
  status: { type: String, default: 'ACTIVE' },
  supporterCount: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now }
});

export const DonationDrive = mongoose.models.DonationDrive || mongoose.model('DonationDrive', DonationDriveSchema);

const CivicReportSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  category: { type: String, required: true },
  description: { type: String, required: true },
  photoUrl: { type: String, required: true },
  address: { type: String },          // Human-readable address
  lat: { type: Number },              // Geolocation latitude
  lng: { type: Number },              // Geolocation longitude
  status: { type: String, default: 'SUBMITTED' },
  govtNotes: { type: String },
  history: [{
    status: String,
    title: String,
    date: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
});

export const CivicReport = mongoose.models.CivicReport || mongoose.model('CivicReport', CivicReportSchema);

const BloodRequestSchema = new mongoose.Schema({
  bloodGroup: { type: String, required: true },
  units: { type: Number, required: true },
  urgency: { type: String, required: true },
  locationName: { type: String, required: true },
  address: { type: String },          // Full address string
  lat: { type: Number },              // Geolocation latitude
  lng: { type: Number },              // Geolocation longitude
  hospitalId: { type: String, required: true },
  postedBy: { type: String },         // 'user' | 'hospital' | 'ngo'
  postedByName: { type: String },
  status: { type: String, default: 'OPEN' },
  createdAt: { type: Date, default: Date.now }
});

export const BloodRequest = mongoose.models.BloodRequest || mongoose.model('BloodRequest', BloodRequestSchema);

const CourseSchema = new mongoose.Schema({
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
  price: { type: Number, default: 0 },     // 0 = free
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

export const Course = mongoose.models.Course || mongoose.model('Course', CourseSchema);

const EnrollmentSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  courseId: { type: mongoose.Schema.Types.ObjectId, ref: 'Course', required: true },
  userName: { type: String },
  status: { type: String, default: 'ENROLLED' }, // ENROLLED | PASSED | FAILED
  score: { type: Number },                         // Final quiz score percentage
  enrolledAt: { type: Date, default: Date.now },
  completedAt: { type: Date }
});

export const Enrollment = mongoose.models.Enrollment || mongoose.model('Enrollment', EnrollmentSchema);

const DonationSchema = new mongoose.Schema({
  driveId: { type: mongoose.Schema.Types.ObjectId, ref: 'DonationDrive', required: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  amount: { type: Number, required: true },
  paymentMethod: { type: String, default: 'VIRTUAL_WALLET' },
  paypalOrderId: { type: String },
  status: { type: String, default: 'SUCCESS' },
  timestamp: { type: Date, default: Date.now }
});

export const Donation = mongoose.models.Donation || mongoose.model('Donation', DonationSchema);

const UserSchema = new mongoose.Schema({
  uid: { type: String, required: true, unique: true },
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  roles: [{ type: String }],
  isVerified: { type: Boolean, default: false },   // Used for NGO verification status
  isBanned: { type: Boolean, default: false },
  bio: { type: String },
  avatarUrl: { type: String },
  bloodGroup: { type: String },                    // User's blood group for donation matching
  phone: { type: String },
  address: { type: String },
  blockedUsers: [{ type: String }],
  createdAt: { type: Date, default: Date.now }
});


export const User = mongoose.models.User || mongoose.model('User', UserSchema);

const PhysicalDonationSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  type: { type: String, required: true },
  description: { type: String },
  value: { type: String },
  status: { type: String, default: 'CONFIRMED' },
  date: { type: Date, default: Date.now }
});

export const PhysicalDonation = mongoose.models.PhysicalDonation || mongoose.model('PhysicalDonation', PhysicalDonationSchema);

const VolunteeringSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  activity: { type: String, required: true },
  role: { type: String, required: true },
  hours: { type: Number, required: true },
  status: { type: String, default: 'APPROVED' },
  date: { type: Date, default: Date.now }
});

export const Volunteering = mongoose.models.Volunteering || mongoose.model('Volunteering', VolunteeringSchema);

const AnimalCaseSchema = new mongoose.Schema({
  reportedBy: { type: String, required: true },
  animalType: { type: String, required: true },
  description: { type: String, required: true },
  photoUrl: { type: String, required: true },
  location: { type: String },                      // Address where animal was spotted
  status: { type: String, default: 'OPEN' },       // OPEN | EN_ROUTE | RESCUED | ADOPTED
  rescuedBy: { type: String },                     // UID of rescuer (NGO)
  ngoId: { type: String },
  ngoName: { type: String },
  rescuedAt: { type: Date },
  createdAt: { type: Date, default: Date.now }
});

export const AnimalCase = mongoose.models.AnimalCase || mongoose.model('AnimalCase', AnimalCaseSchema);

const VolunteerEventSchema = new mongoose.Schema({
  ngoId: { type: String, required: true },
  ngoName: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, required: true },
  location: { type: String, required: true },
  lat: { type: Number },              // Geolocation latitude of venue
  lng: { type: Number },              // Geolocation longitude of venue
  date: { type: Date, required: true },
  requiredVolunteers: { type: Number, required: true },
  currentVolunteers: { type: Number, default: 0 },
  skills: [{ type: String }],
  eventType: { type: String, default: 'VOLUNTEER' }, // 'VOLUNTEER' | 'BLOOD_CAMP' | 'CHARITY_DRIVE'
  status: { type: String, default: 'UPCOMING' },     // UPCOMING | ONGOING | COMPLETED
  createdAt: { type: Date, default: Date.now }
});

export const VolunteerEvent = mongoose.models.VolunteerEvent || mongoose.model('VolunteerEvent', VolunteerEventSchema);

const VolunteerApplicationSchema = new mongoose.Schema({
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'VolunteerEvent', required: true },
  ngoId: { type: String },                           // NGO this application belongs to (for quick lookup)
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  userEmail: { type: String },
  message: { type: String },                         // Applicant's cover message
  status: { type: String, default: 'PENDING' },      // PENDING | APPROVED | REJECTED
  appliedAt: { type: Date, default: Date.now }
});

export const VolunteerApplication = mongoose.models.VolunteerApplication || mongoose.model('VolunteerApplication', VolunteerApplicationSchema);

const AdoptionListingSchema = new mongoose.Schema({
  ngoId: { type: String, required: true },
  ngoName: { type: String, required: true },
  animalName: { type: String, required: true },
  animalType: { type: String, required: true },
  breed: { type: String },
  age: { type: String },
  description: { type: String, required: true },
  photoUrl: { type: String, required: true },
  status: { type: String, default: 'AVAILABLE' },  // AVAILABLE | PENDING | ADOPTED
  createdAt: { type: Date, default: Date.now }
});

export const AdoptionListing = mongoose.models.AdoptionListing || mongoose.model('AdoptionListing', AdoptionListingSchema);

const AdoptionApplicationSchema = new mongoose.Schema({
  listingId: { type: mongoose.Schema.Types.ObjectId, ref: 'AdoptionListing', required: true },
  ngoId: { type: String },                           // For quick lookup
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  contactInfo: { type: String, required: true },
  message: { type: String },
  status: { type: String, default: 'PENDING' },     // PENDING | APPROVED | REJECTED
  appliedAt: { type: Date, default: Date.now }
});

export const AdoptionApplication = mongoose.models.AdoptionApplication || mongoose.model('AdoptionApplication', AdoptionApplicationSchema);

// New: Feedback / Complaint model
const FeedbackSchema = new mongoose.Schema({
  userId: { type: String, required: true },
  userName: { type: String },
  type: { type: String, default: 'feedback' },  // 'feedback' | 'complaint' | 'report'
  subject: { type: String, required: true },
  message: { type: String, required: true },
  status: { type: String, default: 'OPEN' },    // OPEN | IN_REVIEW | RESOLVED
  adminNote: { type: String },
  createdAt: { type: Date, default: Date.now }
});

export const Feedback = mongoose.models.Feedback || mongoose.model('Feedback', FeedbackSchema);

// ─── NGO GROUP CHAT ───────────────────────────────────────────────────────────

const ChatMessageSchema = new mongoose.Schema({
  ngoId:      { type: String, required: true },   // Room key = NGO uid
  senderId:   { type: String, required: true },
  senderName: { type: String, required: true },
  text:       { type: String, required: true },
  createdAt:  { type: Date,   default: Date.now }
});

ChatMessageSchema.index({ ngoId: 1, createdAt: 1 });

export const ChatMessage = mongoose.models.ChatMessage || mongoose.model('ChatMessage', ChatMessageSchema);
