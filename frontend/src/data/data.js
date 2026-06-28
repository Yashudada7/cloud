import { CERTIFICATION_DATA } from './question.js';

export const sampleData = {
  users: [
    {
      uid: "user-123",
      name: "Abhay Sharma",
      email: "abhay@example.com",
      roles: ["citizen"],
      isVerified: false,
      bio: "Passionate about community service.",
      createdAt: new Date().toISOString()
    },
    {
      uid: "ngo-456",
      name: "Happy Paws Foundation",
      email: "contact@happypaws.ngo",
      roles: ["ngo"],
      isVerified: true,
      bio: "Rescuing and sheltering street animals.",
      createdAt: new Date().toISOString()
    },
    {
      uid: "admin-789",
      name: "System Admin",
      email: "admin@sewa.com",
      roles: ["admin"],
      isVerified: true,
      bio: "Platform moderator.",
      createdAt: new Date().toISOString()
    },
    {
      uid: "edu-101",
      name: "SEWA Academy",
      email: "academy@sewa.org",
      roles: ["educator"],
      isVerified: true,
      bio: "Expert in Civic Responsibilities and Environment.",
      createdAt: new Date().toISOString()
    }
  ],

  donationDrives: [
    {
      _id: "5f8d0d55b54764421b7156d1",
      title: "Winter Blankets Distribution",
      description: "Collecting funds to buy blankets for the homeless during the harsh winter months.",
      targetAmount: 50000,
      currentAmount: 12500,
      createdBy: "ngo-456",
      creatorName: "Happy Paws Foundation",
      category: "Humanitarian",
      imageUrl: "https://images.unsplash.com/photo-1531206715517-5c0ba140b2b8?auto=format&fit=crop&q=80&w=800",
      status: "ACTIVE",
      supporterCount: 15,
      createdAt: new Date().toISOString()
    }
  ],

  civicReports: [
    {
      _id: "5f8d0d55b54764421b7156d2",
      userId: "user-123",
      category: "Road Infrastructure",
      description: "Massive pothole on the main crossroad causing traffic jams and accidents.",
      photoUrl: "https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?auto=format&fit=crop&q=80&w=800",
      status: "SUBMITTED",
      govtNotes: "",
      history: [
        {
          status: "SUBMITTED",
          title: "Report Created",
          date: new Date().toISOString()
        }
      ],
      createdAt: new Date().toISOString()
    }
  ],

  bloodRequests: [
    {
      _id: "5f8d0d55b54764421b7156d3",
      bloodGroup: "O+",
      units: 2,
      urgency: "CRITICAL",
      locationName: "City General Hospital",
      hospitalId: "hospital-999",
      status: "OPEN",
      createdAt: new Date().toISOString()
    },
    {
      _id: "5f8d0d55b54764421b7156d4",
      bloodGroup: "A-",
      units: 1,
      urgency: "URGENT",
      locationName: "Metro Care Center",
      hospitalId: "hospital-888",
      status: "OPEN",
      createdAt: new Date().toISOString()
    }
  ],

  courses: Object.keys(CERTIFICATION_DATA).map((title, index) => {
    // Generate a deterministic or semi-random hex ID (24 chars) based on index
    const id = "5f8d0d55b54764421b71" + (5600 + index).toString(16);
    return {
      _id: id,
      title: title,
      description: `Comprehensive certification course for ${title}.`,
      educatorId: "edu-101",
      educatorName: "SEWA Academy",
      category: "Education",
      thumbnailUrl: "https://images.unsplash.com/photo-1524178232363-1fb2b075b655?auto=format&fit=crop&q=80&w=800",
      videoUrl: "",
      materials: ["Course Syllabus PDF"],
      mcqTest: CERTIFICATION_DATA[title].map(q => ({
        question: q.question,
        options: q.options,
        correctAnswer: q.correctAnswerIndex
      })),
      enrolledCount: Math.floor(Math.random() * 100) + 20,
      createdAt: new Date().toISOString()
    };
  }),

  enrollments: [
    {
      _id: "5f8d0d55b54764421b7156d6",
      userId: "user-123",
      courseId: "5f8d0d55b54764421b7156d5",
      userName: "Abhay Sharma",
      status: "ENROLLED",
      enrolledAt: new Date().toISOString()
    }
  ],

  donations: [
    {
      _id: "5f8d0d55b54764421b7156d7",
      driveId: "5f8d0d55b54764421b7156d1",
      userId: "user-123",
      userName: "Abhay Sharma",
      amount: 1500,
      paymentMethod: "VIRTUAL_WALLET",
      status: "SUCCESS",
      timestamp: new Date().toISOString()
    }
  ],

  physicalDonations: [
    {
      _id: "5f8d0d55b54764421b7156d8",
      userId: "user-123",
      type: "Books",
      description: "15 high school science textbooks in good condition.",
      value: "Approx 2000 INR",
      status: "CONFIRMED",
      date: new Date().toISOString()
    }
  ],

  volunteeringHistory: [
    {
      _id: "5f8d0d55b54764421b7156d9",
      userId: "user-123",
      activity: "Beach Cleanup",
      role: "Team Leader",
      hours: 4,
      status: "APPROVED",
      date: new Date().toISOString()
    }
  ],

  animalCases: [
    {
      _id: "5f8d0d55b54764421b7156da",
      reportedBy: "user-123",
      animalType: "Dog",
      description: "Injured stray dog near the central park entrance.",
      photoUrl: "https://images.unsplash.com/photo-1548681528-6a5c45b66b42?auto=format&fit=crop&q=80&w=800",
      status: "OPEN",
      rescuedBy: "",
      createdAt: new Date().toISOString()
    }
  ],

  volunteerEvents: [
    {
      _id: "5f8d0d55b54764421b7156db",
      ngoId: "ngo-456",
      ngoName: "Happy Paws Foundation",
      title: "Weekend Shelter Cleanup",
      description: "Help us clean and paint the animal shelter enclosures.",
      location: "Northside Shelter",
      date: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
      requiredVolunteers: 20,
      currentVolunteers: 5,
      skills: ["Cleaning", "Painting", "Animal Handling"],
      status: "UPCOMING",
      createdAt: new Date().toISOString()
    }
  ],

  volunteerApplications: [
    {
      _id: "5f8d0d55b54764421b7156dc",
      eventId: "5f8d0d55b54764421b7156db",
      userId: "user-123",
      userName: "Abhay Sharma",
      userEmail: "abhay@example.com",
      status: "PENDING",
      appliedAt: new Date().toISOString()
    }
  ],

  adoptionListings: [
    {
      _id: "5f8d0d55b54764421b7156dd",
      ngoId: "ngo-456",
      ngoName: "Happy Paws Foundation",
      animalName: "Buddy",
      animalType: "Dog",
      breed: "Golden Retriever Mix",
      age: "2 Years",
      description: "Friendly and energetic boy looking for a loving home.",
      photoUrl: "https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?auto=format&fit=crop&q=80&w=800",
      status: "AVAILABLE",
      createdAt: new Date().toISOString()
    }
  ],

  adoptionApplications: [
    {
      _id: "5f8d0d55b54764421b7156de",
      listingId: "5f8d0d55b54764421b7156dd",
      userId: "user-123",
      userName: "Abhay Sharma",
      contactInfo: "9876543210",
      message: "I have a large backyard and experience with retrievers.",
      status: "PENDING",
      appliedAt: new Date().toISOString()
    }
  ]
};

// You can import this file and map over the arrays to seed your database or feed your frontend state!
