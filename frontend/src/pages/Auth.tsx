import React, { useState } from 'react';
import { BauhausButton } from '../components/BauhausUI';
import { auth } from '../lib/firebase';
import {
  signInWithPopup,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  sendPasswordResetEmail,
  deleteUser,
  signOut,
} from 'firebase/auth';

import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck,
  User as UserIcon,
  Building2,
  Landmark,
  GraduationCap,
  AlertTriangle,
  CheckCircle,
  Eye,
  EyeOff,
  Mail,
  Lock,
  RefreshCw,
  ArrowRight,
  Heart,
  BookOpen,
  Shield,
} from 'lucide-react';
import { usersApi } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';

// ─── Validation helpers ───────────────────────────────────────────────────────
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getPasswordStrength(pw: string): { score: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;

  if (score <= 1) return { score, label: 'WEAK', color: 'bg-bauhaus-red' };
  if (score <= 3) return { score, label: 'MEDIUM', color: 'bg-bauhaus-yellow' };
  return { score, label: 'STRONG', color: 'bg-green-500' };
}

interface FieldErrors {
  name?: string;
  orgName?: string;
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
}

function validateSignup(
  name: string,
  email: string,
  password: string,
  confirmPassword: string,
  role: string,
  orgName: string
): FieldErrors {
  const errors: FieldErrors = {};
  if (!name.trim() || name.trim().length < 2) errors.name = 'Full name must be at least 2 characters.';
  if (!email.trim() || !EMAIL_REGEX.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (password.length < 8) errors.password = 'Password must be at least 8 characters.';
  if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match.';
  if (!role) errors.role = 'Please select a role to continue.';
  if ((role === 'ngo' || role === 'educator' || role === 'govt') && !orgName.trim()) {
    errors.orgName = 'Organization / institution name is required.';
  }
  return errors;
}

function validateLogin(email: string, password: string): FieldErrors {
  const errors: FieldErrors = {};
  if (!email.trim() || !EMAIL_REGEX.test(email.trim())) errors.email = 'Enter a valid email address.';
  if (!password) errors.password = 'Password is required.';
  return errors;
}

// ─── Role definitions ─────────────────────────────────────────────────────────
const ROLE_OPTIONS = [
  {
    id: 'volunteer',
    label: 'Volunteer / Citizen',
    shortLabel: 'VOLUNTEER',
    description: 'Join drives, donate blood, report civic issues & rescue animals.',
    icon: Heart,
    color: 'bg-bauhaus-blue',
    accent: '#0000FF',
    features: ['Join volunteer events', 'Blood donation alerts', 'Civic reporting', 'Animal rescue'],
  },
  {
    id: 'ngo',
    label: 'NGO / Organisation',
    shortLabel: 'NGO',
    description: 'Register your NGO to post drives, manage volunteers & rescue animals.',
    icon: Building2,
    color: 'bg-bauhaus-red',
    accent: '#FF0000',
    features: ['Post volunteer events', 'Manage applications', 'Animal rescue ops', 'Team chat'],
    requiresOrg: true,
    requiresVerification: true,
  },
  {
    id: 'educator',
    label: 'Educator / Trainer',
    shortLabel: 'EDUCATOR',
    description: 'Create and publish courses with MCQ tests and certification.',
    icon: GraduationCap,
    color: 'bg-black',
    accent: '#000000',
    features: ['Publish courses', 'Create MCQ tests', 'Issue certificates', 'Track learners'],
    requiresOrg: true,
  },
  {
    id: 'govt',
    label: 'Government Official',
    shortLabel: 'GOVT',
    description: 'Manage civic reports, update statuses and coordinate with NGOs.',
    icon: Landmark,
    color: 'bg-green-700',
    accent: '#166534',
    features: ['Civic report management', 'Status updates', 'NGO coordination', 'Analytics'],
    requiresOrg: true,
  },
  {
    id: 'admin',
    label: 'System Administrator',
    shortLabel: 'ADMIN',
    description: 'System administrator with power to moderate content and manage users.',
    icon: ShieldCheck,
    color: 'bg-bauhaus-red',
    accent: '#D32F2F',
    features: ['Moderate reports', 'Block / unblock users', 'Manage system settings', 'Analytics'],
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
const FieldError: React.FC<{ message?: string }> = ({ message }) => (
  <AnimatePresence>
    {message && (
      <motion.p
        initial={{ opacity: 0, y: -4 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0 }}
        className="text-bauhaus-red text-[11px] font-black uppercase mt-1 leading-tight"
      >
        ▲ {message}
      </motion.p>
    )}
  </AnimatePresence>
);

const PasswordStrengthBar: React.FC<{ password: string }> = ({ password }) => {
  if (!password) return null;
  const { score, label, color } = getPasswordStrength(password);
  const bars = 5;
  return (
    <div className="mt-2 space-y-1">
      <div className="flex gap-1">
        {Array.from({ length: bars }).map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 transition-all duration-300 ${i < score ? color : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <p className={`text-[10px] font-black uppercase ${score <= 1 ? 'text-bauhaus-red' : score <= 3 ? 'text-yellow-600' : 'text-green-600'}`}>
        PASSWORD STRENGTH: {label}
      </p>
    </div>
  );
};

// ─── Role Selection Card ──────────────────────────────────────────────────────
const RoleCard: React.FC<{
  role: typeof ROLE_OPTIONS[0];
  selected: boolean;
  onClick: () => void;
}> = ({ role, selected, onClick }) => {
  const Icon = role.icon;
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      className={`w-full text-left border-4 transition-all relative overflow-hidden ${
        selected
          ? `border-black ${role.color} text-white shadow-[6px_6px_0px_0px_black]`
          : 'border-black bg-white hover:bg-gray-50 shadow-[4px_4px_0px_0px_#e5e5e5]'
      }`}
    >
      <div className="p-4">
        <div className="flex items-start gap-3 mb-2">
          <div className={`p-2 border-2 ${selected ? 'border-white/40 bg-white/20' : 'border-black bg-gray-100'} shrink-0`}>
            <Icon size={20} className={selected ? 'text-white' : ''} />
          </div>
          <div className="flex-grow min-w-0">
            <div className={`font-black uppercase text-sm leading-tight ${selected ? 'text-white' : 'text-black'}`}>
              {role.label}
            </div>
            {role.requiresVerification && (
              <div className={`text-[9px] font-black uppercase mt-1 flex items-center gap-1 ${selected ? 'text-white/70' : 'text-yellow-600'}`}>
                <Shield size={9} /> Requires admin approval
              </div>
            )}
          </div>
          {selected && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="w-5 h-5 bg-white rounded-full flex items-center justify-center shrink-0"
            >
              <CheckCircle size={14} style={{ color: role.accent }} />
            </motion.div>
          )}
        </div>
        <p className={`text-[10px] font-bold leading-tight ${selected ? 'text-white/80' : 'text-black/50'}`}>
          {role.description}
        </p>
      </div>
      {selected && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="border-t-2 border-white/20 px-4 py-2"
        >
          <div className="grid grid-cols-2 gap-1">
            {role.features.map(f => (
              <div key={f} className="flex items-center gap-1 text-[9px] font-black uppercase text-white/80">
                <ArrowRight size={8} /> {f}
              </div>
            ))}
          </div>
        </motion.div>
      )}
    </motion.button>
  );
};

// ─── Left Panel ───────────────────────────────────────────────────────────────
const LeftPanel: React.FC<{ isLogin: boolean; selectedRole: typeof ROLE_OPTIONS[0] | undefined }> = ({ isLogin, selectedRole }) => {
  const bgColor = selectedRole && !isLogin ? selectedRole.color : isLogin ? 'bg-bauhaus-red' : 'bg-bauhaus-red';

  return (
    <div className={`${bgColor} p-10 text-white flex flex-col justify-between border-b-4 lg:border-b-0 lg:border-r-4 border-black transition-colors duration-500 relative overflow-hidden`}>
      {/* Background geometric shapes */}
      <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 -mr-20 -mt-20 rotate-45" />
      <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/10 -ml-16 -mb-16 rounded-full" />
      <div className="absolute bottom-24 right-4 w-20 h-20 border-4 border-white/20 rotate-12" />

      <div className="relative z-10">
        <div className="text-[10px] font-black uppercase tracking-[0.4em] opacity-60 mb-6">
          SEWA — SOCIAL WELFARE ECOSYSTEM
        </div>
        <h1 className="bauhaus-header text-7xl leading-none mb-6">
          {isLogin
            ? <>WELCOME<br />BACK</>
            : selectedRole
            ? <>{selectedRole.shortLabel}<br />PORTAL</>
            : <>JOIN THE<br />ECOSYSTEM</>}
        </h1>
        <p className="text-lg font-bold uppercase leading-tight max-w-xs opacity-90">
          {isLogin
            ? 'Sign in to continue your social impact journey.'
            : selectedRole
            ? selectedRole.description
            : 'Select your role to unlock your personalized SEWA portal.'}
        </p>
      </div>

      <div className="relative z-10 space-y-3">
        <div className="flex items-center gap-2 text-white/60 text-xs font-black uppercase">
          <ShieldCheck size={14} /> SECURED BY FIREBASE AUTH
        </div>
        {!isLogin && (
          <div className="grid grid-cols-2 gap-2 opacity-60">
            {['ROLE BASED ACCESS', 'ENCRYPTED STORAGE', '8+ CHAR PASSWORD', 'EMAIL VERIFIED'].map(t => (
              <div key={t} className="flex items-center gap-1 text-[10px] font-black uppercase">
                <CheckCircle size={9} /> {t}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const AuthPage = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [orgName, setOrgName] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});

  const navigate = useNavigate();

  const selectedRoleObj = ROLE_OPTIONS.find(r => r.id === role);

  const resetForm = () => {
    setError('');
    setSuccessMsg('');
    setFieldErrors({});
  };

  const saveUserToDb = async (uid: string, userName: string, userEmail: string, roles: string[]) => {
    await usersApi.save({ uid, name: userName, email: userEmail, roles });
  };

  // ── Forgot Password ─────────────────────────────────────────────────────────
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();
    if (!email.trim() || !EMAIL_REGEX.test(email.trim())) {
      setFieldErrors({ email: 'Enter a valid email address to reset password.' });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setSuccessMsg('Password reset email sent! Check your inbox.');
    } catch (err: any) {
      if (err.code === 'auth/user-not-found') {
        setError('No account found with this email.');
      } else {
        setError('Failed to send reset email. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // ── Main Auth Handler ────────────────────────────────────────────────────────
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    resetForm();

    const errors = isLogin
      ? validateLogin(email, password)
      : validateSignup(name, email, password, confirmPassword, role, orgName);

    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }

    setLoading(true);
    try {
      if (isLogin) {
        const { user } = await signInWithEmailAndPassword(auth, email.trim(), password);
        try {
          await usersApi.get(user.uid);
        } catch (err: any) {
          if (err.response?.status === 404) {
            await saveUserToDb(user.uid, user.displayName || 'User', user.email || '', ['volunteer']);
          }
        }
        navigate('/dashboard');
      } else {
        const { user } = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Use org name as display name for NGO/Educator/Govt, personal name for volunteer
        const displayName = (role === 'ngo' || role === 'educator' || role === 'govt')
          ? orgName.trim()
          : name.trim();
        await updateProfile(user, { displayName });

        const assignedRoles = [role];
        try {
          await saveUserToDb(user.uid, displayName, email.trim(), assignedRoles);
        } catch (dbErr: any) {
          await deleteUser(user);
          const code = dbErr.response?.data?.code;
          if (code === 'EMAIL_ALREADY_IN_USE' || dbErr.response?.status === 409) {
            setFieldErrors({ email: 'This email is already registered. Please log in instead.' });
            setError('An account with this email already exists. Please switch to LOGIN.');
          } else {
            setError('Account created in Firebase but failed to save to database. Please try again.');
          }
          setLoading(false);
          return;
        }

        // NGOs need admin verification — show them the pending screen (handled in App.tsx)
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error('Authentication Error:', err);
      let message = 'Something went wrong. Please try again.';
      if (err.code === 'auth/operation-not-allowed') {
        message = 'Email/Password sign-in is not enabled. Please use Google Login or contact your admin.';
      } else if (err.code === 'auth/email-already-in-use') {
        message = 'This email is already registered. Switch to LOGIN.';
        setFieldErrors({ email: 'This email is already in use.' });
      } else if (
        err.code === 'auth/invalid-credential' ||
        err.code === 'auth/wrong-password' ||
        err.code === 'auth/user-not-found'
      ) {
        message = 'Invalid email or password. Please check your credentials.';
        setFieldErrors({ password: 'Invalid email or password.' });
      } else if (err.code === 'auth/weak-password') {
        message = 'Password must be at least 8 characters.';
        setFieldErrors({ password: 'Password must be at least 8 characters.' });
      } else if (err.code === 'auth/too-many-requests') {
        message = 'Too many failed attempts. Please wait a moment and try again, or reset your password.';
      } else if (err.message) {
        message = err.message;
      }
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  // ── Google Auth ──────────────────────────────────────────────────────────────
  const handleGoogleAuth = async () => {
    resetForm();
    setGoogleLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const { user } = await signInWithPopup(auth, provider);
      try {
        await usersApi.get(user.uid);
      } catch (err: any) {
        if (err.response?.status === 404) {
          try {
            await saveUserToDb(user.uid, user.displayName || 'User', user.email || '', ['volunteer']);
          } catch (dbErr: any) {
            const code = dbErr.response?.data?.code;
            if (code === 'EMAIL_ALREADY_IN_USE' || dbErr.response?.status === 409) {
              await signOut(auth);
              setError('An account with this email already exists. Please log in with email and password instead.');
              setGoogleLoading(false);
              return;
            }
          }
        }
      }
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Google Auth Error:', err);
      if (err.code !== 'auth/popup-closed-by-user') {
        setError(err.message || 'Google login failed. Please try again.');
      }
    } finally {
      setGoogleLoading(false);
    }
  };

  const switchTab = (login: boolean) => {
    setIsLogin(login);
    setIsForgotPassword(false);
    resetForm();
    setPassword('');
    setConfirmPassword('');
    setRole('');
    setOrgName('');
  };

  const needsOrgField = role === 'ngo' || role === 'educator' || role === 'govt';

  // ── Forgot Password Screen ───────────────────────────────────────────────────
  if (isForgotPassword) {
    return (
      <div className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-0 border-4 border-black min-h-[500px]">
        <div className="bg-bauhaus-blue p-12 text-white flex flex-col justify-between border-b-4 lg:border-b-0 lg:border-r-4 border-black relative overflow-hidden">
          <div className="absolute top-0 right-0 w-40 h-40 bg-white/10 -mr-20 -mt-20 rotate-45" />
          <div>
            <h1 className="bauhaus-header text-7xl leading-none mb-6">RESET<br />ACCESS</h1>
            <p className="text-xl font-bold uppercase max-w-md leading-tight">
              Enter your registered email and we'll send a secure reset link.
            </p>
          </div>
          <div className="flex items-center gap-2 text-white/60 text-sm font-black uppercase">
            <Lock size={16} /> SECURE RESET VIA FIREBASE
          </div>
        </div>

        <div className="p-12 bg-white flex flex-col justify-center">
          <h2 className="text-3xl font-black uppercase mb-2">FORGOT PASSWORD</h2>
          <p className="text-xs font-bold uppercase opacity-50 mb-8">We'll send a recovery link to your inbox</p>

          <AnimatePresence>
            {error && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-6 bg-bauhaus-red text-white p-4 border-2 border-black flex items-start gap-3">
                <AlertTriangle size={20} className="shrink-0 mt-0.5" />
                <div className="font-bold uppercase text-sm leading-tight">{error}</div>
              </motion.div>
            )}
            {successMsg && (
              <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="mb-6 bg-green-600 text-white p-4 border-2 border-black flex items-start gap-3">
                <CheckCircle size={20} className="shrink-0 mt-0.5" />
                <div className="font-bold uppercase text-sm leading-tight">{successMsg}</div>
              </motion.div>
            )}
          </AnimatePresence>

          <form onSubmit={handleForgotPassword} className="space-y-6">
            <div className="space-y-1">
              <label className="font-black uppercase text-sm">Email Address</label>
              <div className="relative">
                <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value.toLowerCase()); setFieldErrors({}); }}
                  placeholder="email@example.com"
                  className={`w-full border-4 pl-10 border-black p-4 font-bold bg-gray-50 focus:bg-bauhaus-yellow outline-none transition-colors ${fieldErrors.email ? 'border-bauhaus-red bg-red-50' : ''}`}
                />
              </div>
              <FieldError message={fieldErrors.email} />
            </div>

            <BauhausButton type="submit" variant="black" className="w-full py-5 text-xl" disabled={loading}>
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <RefreshCw size={18} className="animate-spin" /> SENDING...
                </span>
              ) : 'SEND RESET LINK →'}
            </BauhausButton>

            <button type="button" onClick={() => { setIsForgotPassword(false); resetForm(); }}
              className="w-full text-center text-sm font-black uppercase opacity-50 hover:opacity-100 transition-opacity">
              ← BACK TO LOGIN
            </button>
          </form>
        </div>
      </div>
    );
  }

  // ── Main Auth Form ───────────────────────────────────────────────────────────
  return (
    <div className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-0 border-4 border-black min-h-[700px]">

      {/* Left: Info/Branding Side */}
      <LeftPanel isLogin={isLogin} selectedRole={selectedRoleObj} />

      {/* Right: Form Side */}
      <div className="p-10 bg-white flex flex-col justify-start overflow-y-auto">

        {/* Tab Switcher */}
        <div className="flex gap-6 mb-8 border-b-4 border-black pb-4">
          <button
            onClick={() => switchTab(true)}
            className={`text-2xl font-black uppercase pb-1 border-b-4 -mb-[18px] transition-all ${isLogin ? 'border-black' : 'border-transparent opacity-30'}`}
          >
            LOGIN
          </button>
          <button
            onClick={() => switchTab(false)}
            className={`text-2xl font-black uppercase pb-1 border-b-4 -mb-[18px] transition-all ${!isLogin ? 'border-black' : 'border-transparent opacity-30'}`}
          >
            SIGN UP
          </button>
        </div>

        {/* Global Alert Banners */}
        <AnimatePresence>
          {error && (
            <motion.div key="error" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-5 bg-bauhaus-red text-white p-4 border-2 border-black flex items-start gap-3">
              <AlertTriangle size={20} className="shrink-0 mt-0.5" />
              <div className="font-bold uppercase text-sm leading-tight">{error}</div>
            </motion.div>
          )}
          {successMsg && (
            <motion.div key="success" initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-5 bg-green-600 text-white p-4 border-2 border-black flex items-start gap-3">
              <CheckCircle size={20} className="shrink-0 mt-0.5" />
              <div className="font-bold uppercase text-sm leading-tight">{successMsg}</div>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleAuth} className="space-y-5" noValidate>

          {/* ── SIGN UP ONLY FIELDS ────────────────────────────────────────── */}
          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-5 overflow-hidden"
              >
                {/* Role Selection */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="font-black uppercase text-sm">Select Your Role</label>
                    {!role && <span className="text-[10px] font-black uppercase text-bauhaus-red opacity-70">Required</span>}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {ROLE_OPTIONS.map(r => (
                      <RoleCard
                        key={r.id}
                        role={r}
                        selected={role === r.id}
                        onClick={() => {
                          setRole(r.id);
                          setOrgName('');
                          setFieldErrors(fe => ({ ...fe, role: undefined }));
                        }}
                      />
                    ))}
                  </div>
                  <FieldError message={fieldErrors.role} />
                </div>

                {/* Separator */}
                {role && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="border-t-4 border-black pt-5 space-y-5"
                  >
                    {/* Personal Full Name */}
                    <div className="space-y-1">
                      <label className="font-black uppercase text-sm">
                        {needsOrgField ? 'Your Full Name' : 'Full Name'}
                      </label>
                      <div className="relative">
                        <UserIcon size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
                        <input
                          type="text"
                          value={name}
                          onChange={(e) => { setName(e.target.value); setFieldErrors(fe => ({ ...fe, name: undefined })); }}
                          placeholder="YOUR FULL NAME"
                          className={`w-full border-4 pl-10 border-black p-4 font-bold uppercase bg-gray-50 focus:bg-bauhaus-yellow outline-none transition-colors ${fieldErrors.name ? 'border-bauhaus-red bg-red-50' : ''}`}
                        />
                      </div>
                      <FieldError message={fieldErrors.name} />
                    </div>

                    {/* Organisation / Institution Name (for NGO, Educator, Govt) */}
                    {needsOrgField && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="space-y-1 overflow-hidden"
                      >
                        <label className="font-black uppercase text-sm flex items-center gap-2">
                          {role === 'ngo' && <><Building2 size={14} /> Organisation Name</>}
                          {role === 'educator' && <><BookOpen size={14} /> Institution / Channel Name</>}
                          {role === 'govt' && <><Landmark size={14} /> Department / Office Name</>}
                        </label>
                        <input
                          type="text"
                          value={orgName}
                          onChange={(e) => { setOrgName(e.target.value); setFieldErrors(fe => ({ ...fe, orgName: undefined })); }}
                          placeholder={
                            role === 'ngo' ? 'E.G. HELPING HANDS FOUNDATION' :
                            role === 'educator' ? 'E.G. BRIGHT FUTURES INSTITUTE' :
                            'E.G. MUNICIPAL CORPORATION, SURAT'
                          }
                          className={`w-full border-4 border-black p-4 font-bold uppercase bg-gray-50 focus:bg-bauhaus-yellow outline-none transition-colors ${fieldErrors.orgName ? 'border-bauhaus-red bg-red-50' : ''}`}
                        />
                        <FieldError message={fieldErrors.orgName} />
                        {role === 'ngo' && (
                          <div className="flex items-start gap-2 mt-2 p-3 bg-bauhaus-yellow/30 border-2 border-bauhaus-yellow">
                            <AlertTriangle size={14} className="text-yellow-700 shrink-0 mt-0.5" />
                            <p className="text-[10px] font-black uppercase text-yellow-700 leading-tight">
                              NGO accounts require admin verification before full portal access. This typically takes 1–2 business days.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Email */}
          <div className="space-y-1">
            <label className="font-black uppercase text-sm">Email Address</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value.toLowerCase()); setFieldErrors(fe => ({ ...fe, email: undefined })); setError(''); }}
                placeholder="email@example.com"
                autoComplete="email"
                className={`w-full border-4 pl-10 border-black p-4 font-bold bg-gray-50 focus:bg-bauhaus-yellow outline-none transition-colors ${fieldErrors.email ? 'border-bauhaus-red bg-red-50' : ''}`}
              />
            </div>
            <FieldError message={fieldErrors.email} />
          </div>

          {/* Password */}
          <div className="space-y-1">
            <label className="font-black uppercase text-sm">Password</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => { setPassword(e.target.value); setFieldErrors(fe => ({ ...fe, password: undefined })); setError(''); }}
                placeholder="••••••••"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                className={`w-full border-4 pl-10 pr-12 border-black p-4 font-bold bg-gray-50 focus:bg-bauhaus-yellow outline-none transition-colors ${fieldErrors.password ? 'border-bauhaus-red bg-red-50' : ''}`}
              />
              <button type="button" onClick={() => setShowPassword(v => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity"
                tabIndex={-1} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            <FieldError message={fieldErrors.password} />
            {!isLogin && <PasswordStrengthBar password={password} />}
          </div>

          {/* Confirm Password — signup only */}
          <AnimatePresence>
            {!isLogin && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="space-y-1 overflow-hidden"
              >
                <label className="font-black uppercase text-sm">Confirm Password</label>
                <div className="relative">
                  <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-40" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setFieldErrors(fe => ({ ...fe, confirmPassword: undefined })); }}
                    placeholder="REPEAT PASSWORD"
                    autoComplete="new-password"
                    className={`w-full border-4 pl-10 pr-12 border-black p-4 font-bold bg-gray-50 focus:bg-bauhaus-yellow outline-none transition-colors ${fieldErrors.confirmPassword ? 'border-bauhaus-red bg-red-50' : ''}`}
                  />
                  <button type="button" onClick={() => setShowConfirmPassword(v => !v)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 opacity-40 hover:opacity-100 transition-opacity"
                    tabIndex={-1} aria-label={showConfirmPassword ? 'Hide' : 'Show'}>
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <FieldError message={fieldErrors.confirmPassword} />
                {confirmPassword && password && (
                  <p className={`text-[10px] font-black uppercase ${password === confirmPassword ? 'text-green-600' : 'text-bauhaus-red'}`}>
                    {password === confirmPassword ? '✓ PASSWORDS MATCH' : '✗ PASSWORDS DO NOT MATCH'}
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Forgot password link */}
          {isLogin && (
            <div className="text-right">
              <button type="button" onClick={() => { setIsForgotPassword(true); resetForm(); }}
                className="text-[11px] font-black uppercase opacity-50 hover:opacity-100 transition-opacity hover:text-bauhaus-blue">
                FORGOT PASSWORD?
              </button>
            </div>
          )}

          {/* Submit */}
          <BauhausButton
            type="submit"
            variant="black"
            className="w-full py-6 text-2xl"
            disabled={loading || googleLoading}
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <RefreshCw size={20} className="animate-spin" /> PROCESSING...
              </span>
            ) : isLogin ? 'LOGIN →' : role ? `CREATE ${selectedRoleObj?.shortLabel ?? ''} ACCOUNT →` : 'SELECT A ROLE FIRST'}
          </BauhausButton>

          {/* OR divider */}
          <div className="flex items-center gap-4 py-1">
            <div className="flex-grow h-0.5 bg-black" />
            <span className="font-black uppercase text-sm">OR</span>
            <div className="flex-grow h-0.5 bg-black" />
          </div>

          {/* Google Auth (volunteers / citizens only via Google) */}
          <BauhausButton
            variant="outline"
            className="w-full py-4 border-2 border-black flex items-center justify-center gap-3"
            onClick={handleGoogleAuth}
            disabled={loading || googleLoading}
          >
            {googleLoading ? (
              <span className="flex items-center gap-2">
                <RefreshCw size={18} className="animate-spin" /> CONNECTING...
              </span>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                CONTINUE WITH GOOGLE {!isLogin && <span className="text-[10px] opacity-50">(VOLUNTEER)</span>}
              </>
            )}
          </BauhausButton>

          {!isLogin && (
            <p className="text-center text-[10px] font-black uppercase opacity-40">
              Google sign-up is for Volunteer/Citizen accounts only. For NGO, Educator, or Government roles, use email sign-up above.
            </p>
          )}
        </form>
      </div>
    </div>
  );
};

export default AuthPage;
