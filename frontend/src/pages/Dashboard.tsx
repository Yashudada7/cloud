import React, { useEffect, useState } from 'react';
import { auth } from '../lib/firebase';
import { BauhausButton } from '../components/BauhausUI';
import { User as UserIcon, Settings, ChevronRight, MapPin, TrendingUp, Award, Clock, CheckCircle2 } from 'lucide-react';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { usersApi, reportsApi, statsApi } from '../lib/api';
import { motion } from 'motion/react';

interface Metric { label: string; value: string | number; color: string; icon?: React.ReactNode; }
interface Activity { title: string; subtitle: string; date?: string; }

const Dashboard = () => {
  const [userData, setUserData] = useState<any>(null);
  const [liveStats, setLiveStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (!user) { navigate('/auth'); return; }
      try {
        const response = await usersApi.get(user.uid);
        const data = response.data;
        setUserData(data);

        // Fetch live stats based on role
        const role = (data?.roles?.[0] || 'volunteer').toLowerCase();
        try {
          if (role === 'volunteer' || role === 'citizen') {
            const s = await statsApi.volunteer(user.uid);
            setLiveStats(s.data);
          } else if (role === 'ngo') {
            const s = await statsApi.ngo(user.uid);
            setLiveStats(s.data);
          } else if (role === 'educator') {
            const s = await statsApi.educator(user.uid);
            setLiveStats(s.data);
          } else if (role === 'govt') {
            const s = await reportsApi.getStats();
            setLiveStats(s.data);
          }
        } catch (statsErr) {
          console.warn('Stats fetch failed, using fallback:', statsErr);
        }
      } catch (err: any) {
        console.error("Error fetching user from MongoDB:", err);
        setUserData({ name: user.displayName || 'USER', roles: ['volunteer'] });
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [navigate]);

  if (loading) return (
    <div className="p-24 text-center bauhaus-header text-4xl animate-pulse">LOADING MISSION CONTROL...</div>
  );

  const role = (userData?.roles?.[0] || 'volunteer').toLowerCase();

  // ─── Build metrics per role using live data ─────────────────────────────
  const buildMetrics = (): Metric[] => {
    if (liveStats) {
      switch (role) {
        case 'volunteer':
        case 'citizen':
          return [
            { label: 'Active Drives', value: liveStats.activeDrives ?? '—', color: 'bg-bauhaus-yellow' },
            { label: 'Volunteering Hrs', value: liveStats.totalHours ?? 0, color: 'bg-white' },
            { label: 'Certifications', value: liveStats.passedCerts ?? 0, color: 'bg-black text-white' },
          ];
        case 'ngo':
          return [
            { label: 'Active Projects', value: liveStats.activeProjects ?? 0, color: 'bg-bauhaus-yellow' },
            { label: 'Volunteers Managed', value: liveStats.totalVolunteers ?? 0, color: 'bg-white' },
            { label: 'Funds Raised', value: liveStats.fundsRaised ? `₹${(liveStats.fundsRaised / 1000).toFixed(1)}k` : '₹0', color: 'bg-black text-white' },
          ];
        case 'educator':
          return [
            { label: 'Active Learners', value: liveStats.totalLearners ?? 0, color: 'bg-bauhaus-yellow' },
            { label: 'Courses Published', value: liveStats.coursesCount ?? 0, color: 'bg-white' },
            { label: 'Certs Issued', value: liveStats.certIssued ?? 0, color: 'bg-black text-white' },
          ];
        case 'govt':
          return [
            { label: 'Reports Resolved', value: liveStats.total > 0 ? `${Math.round((liveStats.resolved / liveStats.total) * 100)}%` : '0%', color: 'bg-bauhaus-blue text-white' },
            { label: 'Pending Tasks', value: (liveStats.submitted ?? 0) + (liveStats.inProgress ?? 0), color: 'bg-white' },
            { label: 'Resolved Today', value: liveStats.resolved ?? 0, color: 'bg-black text-white' },
          ];
        default: break;
      }
    }
    // Fallback static values
    const fallbacks: Record<string, Metric[]> = {
      ngo: [
        { label: 'Active Projects', value: '—', color: 'bg-bauhaus-yellow' },
        { label: 'Volunteers Managed', value: '—', color: 'bg-white' },
        { label: 'Funds Raised', value: '—', color: 'bg-black text-white' },
      ],
      educator: [
        { label: 'Active Learners', value: '—', color: 'bg-bauhaus-yellow' },
        { label: 'Courses Published', value: '—', color: 'bg-white' },
        { label: 'Certs Issued', value: '—', color: 'bg-black text-white' },
      ],
      govt: [
        { label: 'Reports Resolved', value: '—', color: 'bg-bauhaus-blue text-white' },
        { label: 'Pending Tasks', value: '—', color: 'bg-white' },
        { label: 'Resolved', value: '—', color: 'bg-black text-white' },
      ],
    };
    return fallbacks[role] || [
      { label: 'Active Drives', value: '—', color: 'bg-bauhaus-yellow' },
      { label: 'Volunteering Hrs', value: '—', color: 'bg-white' },
      { label: 'Certifications', value: '—', color: 'bg-black text-white' },
    ];
  };

  const buildActivities = (): Activity[] => {
    if (liveStats?.recentActivity?.length > 0) return liveStats.recentActivity;
    // Fallback
    const fallbacks: Record<string, Activity[]> = {
      ngo: [
        { title: 'No events posted yet', subtitle: 'Create your first volunteer event' },
      ],
      educator: [
        { title: 'No courses published yet', subtitle: 'Head to STUDIO to create a course' },
      ],
      govt: [
        { title: 'No civic reports yet', subtitle: 'Reports submitted by citizens appear here' },
      ],
    };
    return fallbacks[role] || [
      { title: 'No activity yet', subtitle: 'Join drives, volunteer, or report issues' },
    ];
  };

  const roleConfig: Record<string, { actionLabel: string; actionLink: string; alertTitle: string; alertContent: string; alertType: string; academyTitle: string; academyProgress: number; }> = {
    ngo: {
      actionLabel: 'CREATE NEW PROJECT +', actionLink: '/ngo',
      alertTitle: 'NGO ADVISORY', alertContent: 'Keep your volunteer events updated for maximum applications.',
      alertType: 'NGO/Ops', academyTitle: 'NGO MANAGEMENT 101', academyProgress: 45,
    },
    educator: {
      actionLabel: 'OPEN STUDIO +', actionLink: '/educator',
      alertTitle: 'CREATOR TIP', alertContent: 'Courses with MCQ tests see 3x more completions.',
      alertType: 'Platform/Tips', academyTitle: 'DIGITAL TEACHING PRO', academyProgress: 90,
    },
    govt: {
      actionLabel: 'OPEN CIVIC PORTAL →', actionLink: '/govt',
      alertTitle: 'CIVIC ALERT', alertContent: `${liveStats?.submitted ?? 0} reports awaiting review.`,
      alertType: 'Data/Live', academyTitle: 'SMART CITY GOVERNANCE', academyProgress: 60,
    },
    hospital: {
      actionLabel: 'NEW BLOOD REQUEST +', actionLink: '/blood',
      alertTitle: 'STOCK ALERT', alertContent: 'Check your blood group inventory.',
      alertType: 'System/Inventory', academyTitle: 'EMERGENCY PROTOCOLS', academyProgress: 100,
    },
  };
  const config = roleConfig[role] || {
    actionLabel: 'JOIN NEW MISSION +', actionLink: '/volunteer',
    alertTitle: 'STAY ACTIVE', alertContent: `${liveStats?.activeDrives ?? 0} donation drives are currently active near you.`,
    alertType: 'Platform/Live', academyTitle: 'FIRST AID BASIC', academyProgress: 82,
  };

  const metrics = buildMetrics();
  const activities = buildActivities();

  return (
    <div className="space-y-12">
      {/* Header */}
      <div className="border-b-[6px] border-black pb-8 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
        <div>
          <div className="flex items-center gap-4 mb-4">
            <div className="w-16 h-16 bg-black flex items-center justify-center text-white border-2 border-white">
              <UserIcon size={40} />
            </div>
            <div>
              <h1 className="bauhaus-header text-6xl leading-none">{userData?.name || 'USER'}</h1>
              <p className="text-[10px] font-black uppercase tracking-[0.3em] bg-bauhaus-red text-white px-2 py-0.5 inline-block mt-2">
                MISSION CONTROL / {role.toUpperCase()}
              </p>
            </div>
          </div>
        </div>
        <div className="flex gap-4">
          <BauhausButton variant="outline" className="p-3" onClick={() => navigate('/profile')}>
            <Settings size={18} />
          </BauhausButton>
          <BauhausButton variant="black" className="text-xs" onClick={() => navigate('/profile')}>
            EDIT PROFILE
          </BauhausButton>
        </div>
      </div>

      {/* 12-Column High Density Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border-[4px] border-black bg-white overflow-hidden">

        {/* Section 01: Metrics */}
        <section className="md:col-span-3 border-b-4 md:border-b-0 md:border-r-4 border-black p-5 flex flex-col bg-[#FAFAFA]">
          <div className="text-[10px] font-black uppercase mb-6 tracking-widest opacity-50">
            01. {role.toUpperCase()} METRIC MATRIX
            {liveStats && <span className="ml-2 text-green-600">● LIVE</span>}
          </div>
          <div className="space-y-4">
            {metrics.map((m, idx) => (
              <motion.div
                key={idx}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: idx * 0.1 }}
                className={`border-2 border-black p-4 ${m.color} shadow-[4px_4px_0px_0px_black]`}
              >
                <div className="text-4xl font-black">{m.value}</div>
                <div className="text-[10px] font-black uppercase">{m.label}</div>
              </motion.div>
            ))}
          </div>

          {/* Extra educator stat */}
          {role === 'educator' && liveStats && (
            <div className="mt-4 border-2 border-black p-4 bg-bauhaus-blue text-white shadow-[4px_4px_0px_0px_black]">
              <div className="text-4xl font-black">{liveStats.avgScore ?? 0}%</div>
              <div className="text-[10px] font-black uppercase">Avg Pass Rate</div>
            </div>
          )}
        </section>

        {/* Section 02: Activity Feed */}
        <section className="md:col-span-6 border-b-4 md:border-b-0 md:border-r-4 border-black p-5 bg-white">
          <div className="flex justify-between items-center mb-6">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-50">
              02. RECENT ACTIVITY LOG
              {liveStats && <span className="ml-2 text-green-600">● LIVE</span>}
            </div>
            <div
              className="text-[10px] font-bold uppercase cursor-pointer border-b border-black"
              onClick={() => navigate(config.actionLink)}
            >
              Full View
            </div>
          </div>

          <div className="space-y-3">
            {activities.map((activity, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08 }}
                className="border-2 border-black p-3 flex items-center justify-between group hover:bg-[#0000FF10] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-black text-white flex items-center justify-center font-black text-xs shrink-0">
                    {i + 1}
                  </div>
                  <div>
                    <div className="text-xs font-black uppercase leading-none">{activity.title}</div>
                    <div className="text-[9px] font-bold uppercase opacity-50 mt-1 flex items-center gap-1">
                      <MapPin size={10} /> {activity.subtitle}
                      {activity.date && (
                        <span className="ml-2 opacity-40">
                          {new Date(activity.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <ChevronRight size={16} className="opacity-0 group-hover:opacity-100" />
              </motion.div>
            ))}
          </div>

          <button
            onClick={() => navigate(config.actionLink)}
            className="w-full mt-6 border-2 border-black py-2 font-black uppercase text-xs hover:bg-black hover:text-white transition-colors"
          >
            {config.actionLabel}
          </button>
        </section>

        {/* Section 03: Alerts + Status */}
        <section className="md:col-span-3 p-5 flex flex-col gap-6">
          <div>
            <div className="text-[10px] font-black uppercase mb-4 tracking-widest opacity-50">03. SYSTEM ALERTS</div>
            <motion.div
              animate={{ scale: [1, 1.01, 1] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
              className="bg-bauhaus-red p-4 border-2 border-black text-white shadow-[4px_4px_0px_0px_black]"
            >
              <div className="text-[9px] font-black uppercase mb-1">{config.alertType}</div>
              <div className="text-2xl font-black leading-none uppercase">{config.alertTitle}</div>
              <div className="text-[9px] font-bold uppercase mt-2">{config.alertContent}</div>
            </motion.div>
          </div>

          {/* Govt: live pending count */}
          {role === 'govt' && liveStats && (
            <div className="border-2 border-black p-4 bg-bauhaus-yellow">
              <div className="text-[10px] font-black uppercase opacity-60 mb-1">NEW TODAY</div>
              <div className="text-4xl font-black">{liveStats.newToday ?? 0}</div>
              <div className="text-[10px] font-black uppercase opacity-60">Reports filed today</div>
            </div>
          )}

          <div className="mt-auto">
            <div className="text-[10px] font-black uppercase mb-2 opacity-50">Account Status</div>
            <div className="grid grid-cols-2 gap-2">
              <div className="border-2 border-black p-2 text-center bg-gray-50">
                <div className="text-xl font-black uppercase">{role.slice(0, 3).toUpperCase()}</div>
                <div className="text-[8px] font-black uppercase">ROLE</div>
              </div>
              <div className={`border-2 border-black p-2 text-center ${userData?.isVerified ? 'bg-bauhaus-blue text-white' : 'bg-gray-100'}`}>
                <div className="text-xl font-black">{userData?.isVerified ? '✓' : '—'}</div>
                <div className="text-[8px] font-black uppercase">
                  {userData?.isVerified ? 'Verified' : 'Unverified'}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Academy Segment */}
      <section className="border-[4px] border-black p-8 bg-black text-white grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
        <div>
          <div className="text-[10px] font-black uppercase mb-2 tracking-[0.3em] opacity-40">04. ACADEMY PROGRESS</div>
          <h2 className="bauhaus-header text-5xl mb-4">{config.academyTitle}</h2>
          <div className="w-full h-4 border-2 border-white bg-gray-900 relative">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${config.academyProgress}%` }}
              transition={{ duration: 1, ease: 'easeOut' }}
              className="absolute top-0 left-0 h-full bg-bauhaus-blue"
            />
          </div>
          <div className="flex justify-between mt-2 text-[10px] font-black uppercase">
            <span>Progress</span>
            <span>{config.academyProgress}% Completed</span>
          </div>
        </div>
        <div className="flex justify-center md:justify-end">
          <BauhausButton variant="secondary" className="text-xl py-4 px-12" onClick={() => navigate('/edu')}>
            CONTINUE LEARNING
          </BauhausButton>
        </div>
      </section>
    </div>
  );
};

export default Dashboard;
