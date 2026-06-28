import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { sampleData } from '../frontend/src/data/data.js';
import { 
  User, DonationDrive, Donation, CivicReport, BloodRequest, 
  Course, Enrollment, PhysicalDonation, Volunteering, AnimalCase, 
  VolunteerEvent, VolunteerApplication, AdoptionListing, AdoptionApplication 
} from './models/index.ts'; // Adjust the import path depending on where models/index.ts is compiled or if we can run this directly with tsx.

// Actually, wait, the models are in `../models/index.ts` based on my knowledge.
// Let's use `import { User, ... } from '../models/index.js';` for tsx.
// Wait, I will use `npm run dev` style imports.

dotenv.config({ path: '../.env' }); // or just dotenv.config() if running from root

const seedDatabase = async () => {
  try {
    const uri = process.env.MONGODB_URI || "mongodb://localhost:27017/sewa-db";
    await mongoose.connect(uri);
    console.log("Connected to MongoDB...");

    console.log("Clearing existing data...");
    await User.deleteMany({});
    await DonationDrive.deleteMany({});
    await CivicReport.deleteMany({});
    await BloodRequest.deleteMany({});
    await Course.deleteMany({});
    await Enrollment.deleteMany({});
    await Donation.deleteMany({});
    await PhysicalDonation.deleteMany({});
    await Volunteering.deleteMany({});
    await AnimalCase.deleteMany({});
    await VolunteerEvent.deleteMany({});
    await VolunteerApplication.deleteMany({});
    await AdoptionListing.deleteMany({});
    await AdoptionApplication.deleteMany({});

    console.log("Inserting sample data...");
    await (User as any).insertMany(sampleData.users);
    await (DonationDrive as any).insertMany(sampleData.donationDrives);
    await (CivicReport as any).insertMany(sampleData.civicReports);
    await (BloodRequest as any).insertMany(sampleData.bloodRequests);
    await (Course as any).insertMany(sampleData.courses);
    await (Enrollment as any).insertMany(sampleData.enrollments);
    await (Donation as any).insertMany(sampleData.donations);
    await (PhysicalDonation as any).insertMany(sampleData.physicalDonations);
    await (Volunteering as any).insertMany(sampleData.volunteeringHistory);
    await (AnimalCase as any).insertMany(sampleData.animalCases);
    await (VolunteerEvent as any).insertMany(sampleData.volunteerEvents);
    await (VolunteerApplication as any).insertMany(sampleData.volunteerApplications);
    await (AdoptionListing as any).insertMany(sampleData.adoptionListings);
    await (AdoptionApplication as any).insertMany(sampleData.adoptionApplications);

    console.log("Database seeded successfully!");
    process.exit(0);
  } catch (error) {
    console.error("Error seeding database:", error);
    process.exit(1);
  }
};

seedDatabase();
