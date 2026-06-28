/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter as Router, Routes, Route, Link, useNavigate, Navigate } from 'react-router-dom';
import { ThemeProvider } from './context/ThemeContext';
import { auth } from './lib/firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { useState, useEffect } from 'react';
import React from 'react';
import { BauhausButton } from './components/BauhausUI';
import { LogOut, User, Menu, X, Activity, Shield, Building2, GraduationCap, HeartHandshake } from 'lucide-react';
import { usersApi } from './lib/api';

// Public pages
import HomeView from './pages/Home';
import AuthPage from './pages/Auth';
import Profile from './pages/Profile';
import Dashboard from './pages/Dashboard';

// Shared/public pages
import CivicReporting from './pages/CivicReporting';
import BloodDonation from './pages/BloodDonation';
import AnimalRescue from './pages/AnimalRescue';
import Education from './pages/Education';
import MyCourses from './pages/MyCourses';
import DonationDrives from './pages/DonationDrives';
import VolunteerOpportunities from './pages/VolunteerOpportunities';

// Role-specific dashboards
import NGODashboard from './pages/ngo/NGODashboard';
import AdminDashboard from './pages/admin/AdminDashboard';
import EducatorDashboard from './pages/educator/EducatorDashboard';
import GovernmentDashboard from './pages/govt/GovernmentDashboard';
import FeedbackWidget from './components/FeedbackWidget';

// ─── Role detection ────────────────────────────────────────────────────────────
interface UserRoles {
  isAdmin: boolean;
  isNgo: boolean;
  isNgoPending: boolean; // registered as NGO but not yet verified by admin
  isEducator: boolean;
  isGovt: boolean;
  isBanned: boolean;
  loaded: boolean;
}

// ─── NGO NAVBAR ───────────────────────────────────────────────────────────────
function NgoNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const handleSignOut = async () => {
    try { await signOut(auth); } catch (e) { console.error('Signout error', e); }
  };
  return (
    <nav className="border-b-4 border-black bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center gap-4">
            <Link to="/ngo" className="flex items-baseline gap-3 hover:text-bauhaus-red transition-colors">
              <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">S E W A</h1>
            </Link>
            <span className="hidden md:inline bg-bauhaus-red text-white text-[10px] font-black px-2 py-1 uppercase">NGO PORTAL</span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/ngo" className="font-bold uppercase hover:bg-black hover:text-white px-2 py-1 transition-colors">Dashboard</Link>
            <Link to="/animal" className="font-bold uppercase hover:bg-bauhaus-blue hover:text-white px-2 py-1 transition-colors">Animal Rescue</Link>
            <Link to="/civic" className="font-bold uppercase hover:bg-bauhaus-yellow px-2 py-1 transition-colors">Civic</Link>
            <Link to="/donations" className="font-bold uppercase hover:bg-bauhaus-yellow px-2 py-1 transition-colors">Donations</Link>
            <Link to="/blood" className="font-bold uppercase hover:bg-bauhaus-red hover:text-white px-2 py-1 transition-colors">Blood</Link>
            <div className="flex items-center gap-3 ml-4">
              <Link to="/profile" className="p-2 border-2 border-black hover:bg-bauhaus-yellow transition-colors" title="Profile">
                <User size={20} />
              </Link>
              <button onClick={handleSignOut} className="p-2 border-2 border-black hover:bg-bauhaus-red hover:text-white transition-colors" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </div>
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2">{isOpen ? <X size={32} /> : <Menu size={32} />}</button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden border-t-4 border-black bg-white p-4 space-y-4" onClick={() => setIsOpen(false)}>
          <Link to="/ngo" className="block text-2xl font-black uppercase">Dashboard</Link>
          <Link to="/animal" className="block text-2xl font-black uppercase">Animal Rescue</Link>
          <Link to="/civic" className="block text-2xl font-black uppercase">Civic</Link>
          <Link to="/donations" className="block text-2xl font-black uppercase">Donations</Link>
          <Link to="/blood" className="block text-2xl font-black uppercase">Blood</Link>
        </div>
      )}
    </nav>
  );
}

// ─── EDUCATOR NAVBAR ─────────────────────────────────────────────────────────
function EducatorNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const navigate = useNavigate();
  const handleSignOut = async () => { try { await signOut(auth); navigate('/'); } catch (e) { console.error('Signout error', e); } };
  return (
    <nav className="border-b-4 border-black bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center gap-4">
            <Link to="/educator" className="flex items-baseline gap-3 hover:text-bauhaus-blue transition-colors">
              <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">S E W A</h1>
            </Link>
            <span className="hidden md:inline bg-bauhaus-blue text-white text-[10px] font-black px-2 py-1 uppercase">EDUCATOR STUDIO</span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/educator" className="font-bold uppercase hover:bg-black hover:text-white px-2 py-1 transition-colors">Dashboard</Link>
            <Link to="/edu" className="font-bold uppercase hover:bg-bauhaus-yellow px-2 py-1 transition-colors">Course Catalog</Link>
            <Link to="/my-courses" className="font-bold uppercase hover:bg-bauhaus-yellow px-2 py-1 transition-colors">My Courses</Link>
            <div className="flex items-center gap-3 ml-4">
              <Link to="/profile" className="p-2 border-2 border-black hover:bg-bauhaus-yellow transition-colors" title="Profile">
                <User size={20} />
              </Link>
              <button onClick={handleSignOut} className="p-2 border-2 border-black hover:bg-bauhaus-red hover:text-white transition-colors" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </div>
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2">{isOpen ? <X size={32} /> : <Menu size={32} />}</button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden border-t-4 border-black bg-white p-4 space-y-4" onClick={() => setIsOpen(false)}>
          <Link to="/educator" className="block text-2xl font-black uppercase">Dashboard</Link>
          <Link to="/edu" className="block text-2xl font-black uppercase">Course Catalog</Link>
          <Link to="/my-courses" className="block text-2xl font-black uppercase">My Courses</Link>
        </div>
      )}
    </nav>
  );
}

// ─── GOVT NAVBAR ────────────────────────────────────────────────────────────
function GovtNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const handleSignOut = async () => { try { await signOut(auth); } catch (e) { console.error('Signout error', e); } };
  return (
    <nav className="border-b-4 border-black bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center gap-4">
            <Link to="/govt" className="flex items-baseline gap-3 hover:text-green-700 transition-colors">
              <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">S E W A</h1>
            </Link>
            <span className="hidden md:inline bg-green-700 text-white text-[10px] font-black px-2 py-1 uppercase">GOVERNMENT PORTAL</span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/govt" className="font-bold uppercase hover:bg-black hover:text-white px-2 py-1 transition-colors">Dashboard</Link>
            <Link to="/civic" className="font-bold uppercase hover:bg-bauhaus-yellow px-2 py-1 transition-colors">Civic Reports</Link>
            <div className="flex items-center gap-3 ml-4">
              <Link to="/profile" className="p-2 border-2 border-black hover:bg-bauhaus-yellow transition-colors" title="Profile">
                <User size={20} />
              </Link>
              <button onClick={handleSignOut} className="p-2 border-2 border-black hover:bg-bauhaus-red hover:text-white transition-colors" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </div>
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2">{isOpen ? <X size={32} /> : <Menu size={32} />}</button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden border-t-4 border-black bg-white p-4 space-y-4" onClick={() => setIsOpen(false)}>
          <Link to="/govt" className="block text-2xl font-black uppercase">Dashboard</Link>
          <Link to="/civic" className="block text-2xl font-black uppercase">Civic Reports</Link>
        </div>
      )}
    </nav>
  );
}

// ─── ADMIN NAVBAR ────────────────────────────────────────────────────────────
function AdminNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const handleSignOut = async () => { try { await signOut(auth); } catch (e) { console.error('Signout error', e); } };
  return (
    <nav className="border-b-4 border-black bg-black text-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="flex items-baseline gap-3 hover:text-bauhaus-yellow transition-colors">
              <h1 className="text-4xl font-black uppercase tracking-tighter leading-none text-bauhaus-yellow">S E W A</h1>
            </Link>
            <span className="hidden md:inline bg-bauhaus-red text-white text-[10px] font-black px-2 py-1 uppercase">ADMIN CONTROL</span>
          </div>
          <div className="hidden md:flex items-center space-x-6">
            <Link to="/admin" className="font-bold uppercase hover:text-bauhaus-yellow px-2 py-1 transition-colors flex items-center gap-1">
              <Shield size={16} /> Dashboard
            </Link>
            <div className="flex items-center gap-3 ml-4">
              <Link to="/profile" className="p-2 border-2 border-white hover:bg-white hover:text-black transition-colors" title="Profile">
                <User size={20} />
              </Link>
              <button onClick={handleSignOut} className="p-2 border-2 border-bauhaus-red hover:bg-bauhaus-red transition-colors" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </div>
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2">{isOpen ? <X size={32} /> : <Menu size={32} />}</button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden border-t-4 border-white bg-black text-white p-4 space-y-4" onClick={() => setIsOpen(false)}>
          <Link to="/admin" className="block text-2xl font-black uppercase">Admin Dashboard</Link>
        </div>
      )}
    </nav>
  );
}




// ─── PUBLIC NAVBAR ────────────────────────────────────────────────────────────
function PublicNavbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [user, setUser] = useState(auth.currentUser);
  const navigate = useNavigate();

  useEffect(() => {
    return onAuthStateChanged(auth, (u) => setUser(u));
  }, []);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      navigate('/', { replace: true }); // always land on home after logout
    } catch (e) {
      console.error('Signout error', e);
    }
  };

  return (
    <nav className="border-b-4 border-black bg-white sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-20">
          <div className="flex items-center">
            <Link to="/" className="flex items-baseline gap-4 hover:text-bauhaus-red transition-colors">
              <h1 className="text-4xl font-black uppercase tracking-tighter leading-none">S E W A</h1>
            </Link>
          </div>
          <div className="hidden md:flex items-center space-x-8">
            <Link to="/civic" className="font-bold uppercase hover:bg-bauhaus-yellow px-2">Civic</Link>
            <Link to="/blood" className="font-bold uppercase hover:bg-bauhaus-red hover:text-white px-2">Blood</Link>
            <Link to="/donations" className="font-bold uppercase hover:bg-bauhaus-yellow px-2">Donations</Link>
            <Link to="/volunteer" className="font-bold uppercase hover:bg-black hover:text-white px-2">Volunteer</Link>
            <Link to="/animal" className="font-bold uppercase hover:bg-bauhaus-blue hover:text-white px-2">Rescue</Link>
            <Link to="/edu" className="font-bold uppercase hover:bg-black hover:text-white px-2">Edu</Link>
            {user ? (
              <div className="flex items-center gap-4 ml-4">
                <Link to="/profile" className="p-2 border-2 border-black hover:bg-bauhaus-yellow transition-colors" title="My Profile">
                  <User size={20} />
                </Link>
                <Link to="/dashboard" className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors" title="Dashboard">
                  <Activity size={20} />
                </Link>
                <button onClick={handleSignOut} className="p-2 border-2 border-black hover:bg-bauhaus-red hover:text-white transition-colors" title="Logout">
                  <LogOut size={20} />
                </button>
              </div>
            ) : (
              <Link to="/auth">
                <BauhausButton variant="black">Join Us</BauhausButton>
              </Link>
            )}
          </div>
          <div className="md:hidden flex items-center">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2">{isOpen ? <X size={32} /> : <Menu size={32} />}</button>
          </div>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden border-t-4 border-black bg-white p-4 space-y-4" onClick={() => setIsOpen(false)}>
          <Link to="/civic" className="block text-2xl font-black uppercase">Civic</Link>
          <Link to="/blood" className="block text-2xl font-black uppercase">Blood</Link>
          <Link to="/donations" className="block text-2xl font-black uppercase">Donations</Link>
          <Link to="/volunteer" className="block text-2xl font-black uppercase">Volunteer</Link>
          <Link to="/animal" className="block text-2xl font-black uppercase">Rescue</Link>
          <Link to="/edu" className="block text-2xl font-black uppercase">Edu</Link>
          {!user && <Link to="/auth" className="block text-2xl font-black uppercase">Join</Link>}
        </div>
      )}
    </nav>
  );
}

// ─── ROLE-BASED APP SHELL ────────────────────────────────────────────────────
const fetchUserWithRetry = async (uid: string, retries = 5, delay = 500): Promise<any> => {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await usersApi.get(uid);
      return res.data;
    } catch (err: any) {
      if (err.response?.status === 404 && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, delay));
      } else {
        throw err;
      }
    }
  }
};

export default function App() {
  const [roles, setRoles] = useState<UserRoles>({ isAdmin: false, isNgo: false, isNgoPending: false, isEducator: false, isGovt: false, isBanned: false, loaded: false });

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (!u) {
        setRoles({ isAdmin: false, isNgo: false, isNgoPending: false, isEducator: false, isGovt: false, isBanned: false, loaded: true });
        return;
      }
      try {
        let userData;
        try {
          userData = await fetchUserWithRetry(u.uid);
        } catch (err: any) {
          if (err.response?.status === 404) {
            // Re-create user in MongoDB if missing (e.g. database wiped or restarted)
            const savedRes = await usersApi.save({
              uid: u.uid,
              name: u.displayName || 'User',
              email: u.email || '',
              roles: ['volunteer']
            });
            userData = savedRes.data;
          } else {
            throw err;
          }
        }

        const r: string[] = userData?.roles || [];

        // ── Banned user enforcement ──────────────────────────────────────────
        if (userData?.isBanned) {
          await signOut(auth);
          setRoles({ isAdmin: false, isNgo: false, isNgoPending: false, isEducator: false, isGovt: false, isBanned: true, loaded: true });
          return;
        }

        setRoles({
          isAdmin: r.includes('admin'),
          isNgo: r.includes('ngo') && !r.includes('admin') && userData?.isVerified === true,
          isNgoPending: r.includes('ngo') && !r.includes('admin') && !userData?.isVerified,
          isEducator: r.includes('educator') && !r.includes('admin'),
          isGovt: r.includes('govt') && !r.includes('admin'),
          isBanned: false,
          loaded: true,
        });
      } catch (err) {
        console.error("Error loading user roles:", err);
        setRoles({ isAdmin: false, isNgo: false, isNgoPending: false, isEducator: false, isGovt: false, isBanned: false, loaded: true });
      }
    });
  }, []);

  if (!roles.loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white border-[6px] border-black m-0 md:m-4">
        <div className="text-center space-y-4">
          <div className="text-6xl font-black uppercase tracking-tighter animate-pulse">S E W A</div>
          <div className="text-sm font-black uppercase opacity-40">Loading...</div>
        </div>
      </div>
    );
  }

  // ── Banned user — show message on auth page ───────────────────────────────
  if (roles.isBanned) {
    return (
      <ThemeProvider>
        <Router>
          <div className="min-h-screen flex items-center justify-center bg-black m-0 md:m-4 border-[6px] border-bauhaus-red">
            <div className="text-center space-y-6 p-12 border-4 border-bauhaus-red bg-black text-white max-w-lg">
              <div className="text-bauhaus-red text-8xl font-black uppercase tracking-tighter">S E W A</div>
              <div className="bg-bauhaus-red text-white px-4 py-2 font-black uppercase text-xl">ACCOUNT SUSPENDED</div>
              <p className="font-bold uppercase opacity-70 leading-relaxed">
                Your account has been suspended by the SEWA administration team.
                If you believe this is an error, please contact support.
              </p>
              <div className="text-xs font-black uppercase opacity-40 border-t border-white/20 pt-4">
                SEWA — SOCIAL WELFARE ECOSYSTEM
              </div>
            </div>
          </div>
        </Router>
      </ThemeProvider>
    );
  }

  // ── NGO PENDING APPROVAL ─────────────────────────────────────────────────
  if (roles.isNgoPending) {
    return (
      <ThemeProvider>
        <Router>
          <div className="min-h-screen flex items-center justify-center bg-white border-[6px] border-black m-0 md:m-4">
            <div className="text-center space-y-6 p-12 border-4 border-black bg-white max-w-lg">
              <div className="text-6xl font-black uppercase tracking-tighter">S E W A</div>
              <div className="bg-bauhaus-yellow text-black px-4 py-2 font-black uppercase text-xl">ACCOUNT PENDING APPROVAL</div>
              <p className="font-bold uppercase leading-relaxed opacity-70">
                Your NGO account is registered and under review.
                An administrator will verify your account shortly.
                You will have full access once approved.
              </p>
              <button
                onClick={() => signOut(auth)}
                className="border-4 border-black px-6 py-2 font-black uppercase hover:bg-black hover:text-white transition-colors"
              >
                Sign Out
              </button>
              <div className="text-xs font-black uppercase opacity-40 border-t border-black/20 pt-4">
                SEWA — SOCIAL WELFARE ECOSYSTEM
              </div>
            </div>
          </div>
        </Router>
      </ThemeProvider>
    );
  }

  // ── ADMIN SHELL ──────────────────────────────────────────────────────────
  if (roles.isAdmin) {
    return (
      <ThemeProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-white border-[6px] border-black m-0 md:m-4 overflow-hidden">
            <AdminNavbar />
            <main className="flex-grow w-full py-12 px-4 sm:px-6 lg:px-8 bg-[#FDFDFD]">
              <Routes>
                <Route path="/admin" element={<AdminDashboard />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/auth" element={<AuthPage />} />
                {/* Redirect all other routes to admin dashboard */}
                <Route path="*" element={<Navigate to="/admin" replace />} />
              </Routes>
            </main>
            <AdminFooter />
          </div>
        </Router>
      </ThemeProvider>
    );
  }

  // ── NGO SHELL ────────────────────────────────────────────────────────────
  if (roles.isNgo) {
    return (
      <ThemeProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-white border-[6px] border-black m-0 md:m-4 overflow-hidden">
            <NgoNavbar />
            <main className="flex-grow w-full py-12 px-4 sm:px-6 lg:px-8 bg-[#FDFDFD]">
              <Routes>
                <Route path="/ngo" element={<NGODashboard />} />
                <Route path="/animal" element={<AnimalRescue />} />
                <Route path="/civic" element={<CivicReporting />} />
                <Route path="/donations" element={<DonationDrives />} />
                <Route path="/blood" element={<BloodDonation />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/auth" element={<AuthPage />} />
                {/* Redirect all other routes to NGO dashboard */}
                <Route path="*" element={<Navigate to="/ngo" replace />} />
              </Routes>
            </main>
            <PublicFooter />
          </div>
        </Router>
      </ThemeProvider>
    );
  }

  // ── EDUCATOR SHELL ───────────────────────────────────────────────────────
  if (roles.isEducator) {
    return (
      <ThemeProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-white border-[6px] border-black m-0 md:m-4 overflow-hidden">
            <EducatorNavbar />
            <main className="flex-grow w-full py-12 px-4 sm:px-6 lg:px-8 bg-[#FDFDFD]">
              <Routes>
                <Route path="/educator" element={<EducatorDashboard />} />
                <Route path="/edu" element={<Education />} />
                <Route path="/my-courses" element={<MyCourses />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/auth" element={<AuthPage />} />
                {/* Redirect all other routes to educator dashboard */}
                <Route path="*" element={<Navigate to="/educator" replace />} />
              </Routes>
            </main>
            <PublicFooter />
          </div>
        </Router>
      </ThemeProvider>
    );
  }

  // ── GOVT SHELL ───────────────────────────────────────────────────────────
  if (roles.isGovt) {
    return (
      <ThemeProvider>
        <Router>
          <div className="min-h-screen flex flex-col bg-white border-[6px] border-black m-0 md:m-4 overflow-hidden">
            <GovtNavbar />
            <main className="flex-grow w-full py-12 px-4 sm:px-6 lg:px-8 bg-[#FDFDFD]">
              <Routes>
                <Route path="/govt" element={<GovernmentDashboard />} />
                <Route path="/civic" element={<CivicReporting />} />
                <Route path="/profile" element={<Profile />} />
                <Route path="/auth" element={<AuthPage />} />
                {/* Redirect all other routes to govt dashboard */}
                <Route path="*" element={<Navigate to="/govt" replace />} />
              </Routes>
            </main>
            <PublicFooter />
          </div>
        </Router>
      </ThemeProvider>
    );
  }

  // ── PUBLIC / CITIZEN SHELL ───────────────────────────────────────────────
  return (
    <ThemeProvider>
      <Router>
        <div className="min-h-screen flex flex-col bg-white border-[6px] border-black m-0 md:m-4 overflow-hidden">
          <PublicNavbar />
          <main className="flex-grow w-full py-12 px-4 sm:px-6 lg:px-8 bg-[#FDFDFD]">
            <Routes>
              <Route path="/" element={<HomeView />} />
              <Route path="/auth" element={<AuthPage />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/civic" element={<CivicReporting />} />
              <Route path="/blood" element={<BloodDonation />} />
              <Route path="/animal" element={<AnimalRescue />} />
              <Route path="/edu" element={<Education />} />
              <Route path="/donations" element={<DonationDrives />} />
              <Route path="/volunteer" element={<VolunteerOpportunities />} />
              <Route path="/my-courses" element={<MyCourses />} />
              <Route path="/profile" element={<Profile />} />
              {/* Non-citizens trying to hit /ngo get redirected to auth */}
              <Route path="/ngo" element={<Navigate to="/auth" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </main>
          <FeedbackWidget />
          <PublicFooter />
        </div>
      </Router>
    </ThemeProvider>
  );
}

// ─── FOOTERS ──────────────────────────────────────────────────────────────────
function AdminFooter() {
  return (
    <footer className="border-t-4 border-black p-8 bg-black text-white">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div>
          <h4 className="text-2xl font-black uppercase tracking-tighter">SEWA — ADMIN</h4>
          <p className="text-xs opacity-40 font-black uppercase mt-1">RESTRICTED ACCESS — AUTHORIZED PERSONNEL ONLY</p>
        </div>
        <p className="text-xs opacity-30 font-black uppercase">© 2026 SEWA.</p>
      </div>
    </footer>
  );
}

function FooterNewsletter() {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const trimmed = email.trim();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return;
    setSubmitted(true);
    setEmail('');
    setTimeout(() => setSubmitted(false), 4000);
  };
  0
  if (submitted) {
    return (
      <div className="flex items-center gap-2 border-2 border-green-400 p-3 text-green-400">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
        <span className="font-black uppercase text-sm">You're subscribed!</span>
      </div>
    );
  }

  return (
    <div className="flex border-2 border-white">
      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        onKeyDown={e => e.key === 'Enter' && handleSubmit()}
        placeholder="EMAIL"
        className="bg-transparent p-2 outline-none w-full placeholder:opacity-50 text-white font-bold"
      />
      <button
        onClick={handleSubmit}
        className="bg-white text-black px-4 font-black hover:bg-bauhaus-yellow transition-colors"
      >
        GO
      </button>
    </div>
  );
}

function PublicFooter() {
  return (
    <footer className="border-t-4 border-black p-12 bg-black text-white">
      <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
        <div>
          <h4 className="text-4xl font-black uppercase mb-4 tracking-tighter">SEWA</h4>
          <p className="font-medium opacity-80">Social Welfare Ecosystem - Building a better society through civic action</p>
        </div>
        <div>
          <h5 className="font-black uppercase mb-4 text-xl">Quick Links</h5>
          <div className="space-y-2 flex flex-col font-bold uppercase">
            <Link to="/civic" className="hover:text-bauhaus-yellow">Report Issue</Link>
            <Link to="/blood" className="hover:text-bauhaus-red">Blood Alerts</Link>
            <Link to="/volunteer" className="hover:text-bauhaus-yellow">Volunteer</Link>
            <Link to="/animal" className="hover:text-bauhaus-blue">Rescue Animals</Link>
          </div>
        </div>
        <div className="flex flex-col justify-between">
          <div>
            <h5 className="font-black uppercase mb-4 text-xl">Newsletter</h5>
            <FooterNewsletter />
          </div>
          <p className="mt-8 text-xs opacity-50 uppercase font-black">© 2026 SEWA</p>
        </div>
      </div>
    </footer>
  );
}

