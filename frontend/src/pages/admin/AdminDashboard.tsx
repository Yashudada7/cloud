import React, { useState, useEffect } from 'react';
import { BauhausButton } from '../../components/BauhausUI';
import {
  Shield, CheckCircle, XCircle, AlertTriangle, Users, Ban, UserCheck,
  ChevronDown, BarChart3, MessageSquare, RefreshCw, CheckCircle2
} from 'lucide-react';
import { auth } from '../../lib/firebase';
import { usersApi, adminApi, feedbackApi } from '../../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-toastify';

interface NGOUser {
  uid: string; name: string; email: string; isVerified: boolean; isBanned?: boolean; createdAt: string;
}
interface ManagedUser {
  uid: string; name: string; email: string; roles: string[]; isBanned?: boolean; createdAt: string;
}
interface AdminStats {
  totalUsers: number; totalNgos: number; verifiedNgos: number;
  pendingNgos: number; totalDrives: number; totalReports: number;
  totalFeedback: number; totalCourses: number;
}
interface FeedbackItem {
  _id: string; userId: string; userName: string; type: string;
  subject: string; message: string; status: string; adminNote?: string; createdAt: string;
}

const AVAILABLE_ROLES = ['citizen', 'ngo', 'educator', 'govt', 'admin'];

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-bauhaus-red text-white',
  IN_REVIEW: 'bg-bauhaus-yellow text-black',
  RESOLVED: 'bg-green-600 text-white',
};

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'ngos' | 'users' | 'feedback'>('overview');
  const [ngos, setNgos] = useState<NGOUser[]>([]);
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [adminStats, setAdminStats] = useState<AdminStats | null>(null);
  const [feedbackList, setFeedbackList] = useState<FeedbackItem[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updatingUid, setUpdatingUid] = useState<string | null>(null);
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [selectedFeedback, setSelectedFeedback] = useState<FeedbackItem | null>(null);
  const [adminNote, setAdminNote] = useState<string>('');
  const [updatingFeedback, setUpdatingFeedback] = useState<string | null>(null);
  const [ngoSubTab, setNgoSubTab] = useState<'pending' | 'all'>('pending');

  useEffect(() => { checkAdminAndFetchData(); }, []);

  const checkAdminAndFetchData = async () => {
    if (!auth.currentUser) { setLoading(false); return; }
    try {
      const userRes = await usersApi.get(auth.currentUser.uid);
      const roles = userRes.data?.roles || [];
      if (roles.includes('admin')) {
        setIsAdmin(true);
        await Promise.all([fetchNgos(), fetchUsers(), fetchStats(), fetchFeedback()]);
      }
    } catch (err) {
      console.error("Error fetching admin data:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchNgos = async () => {
    try { const res = await adminApi.getNgos(); setNgos(res.data); } catch (err) { console.error(err); }
  };
  const fetchUsers = async () => {
    try { const res = await adminApi.getAllUsers(); setUsers(res.data); } catch (err) { console.error(err); }
  };
  const fetchStats = async () => {
    try { const res = await adminApi.getStats(); setAdminStats(res.data); } catch (err) { console.error(err); }
  };
  const fetchFeedback = async () => {
    try { const res = await feedbackApi.getAll(); setFeedbackList(res.data); } catch (err) { console.error(err); }
  };

  const handleVerifyToggle = async (uid: string, currentStatus: boolean) => {
    setUpdatingUid(uid);
    try {
      await adminApi.verifyNgo(uid, !currentStatus);
      setNgos(ngos.map(ngo => ngo.uid === uid ? { ...ngo, isVerified: !currentStatus } : ngo));
      fetchStats();
    } catch (err) { toast.error("Failed to update verification status."); }
    finally { setUpdatingUid(null); }
  };

  const handleToggleNgoBan = async (uid: string, isBanned: boolean) => {
    setUpdatingUid(uid);
    try {
      await adminApi.banUser(uid, !isBanned);
      setNgos(ngos.map(n => n.uid === uid ? { ...n, isBanned: !isBanned } : n));
      toast.success(isBanned ? 'NGO account unblocked.' : 'NGO account blocked.');
    } catch (err) { toast.error("Failed to update block status."); }
    finally { setUpdatingUid(null); }
  };

  const handleToggleRole = async (uid: string, role: string, hasRole: boolean) => {
    setUpdatingUid(uid);
    try {
      await adminApi.assignRole(uid, role, hasRole ? 'remove' : 'add');
      setUsers(users.map(u => {
        if (u.uid !== uid) return u;
        const newRoles = hasRole ? u.roles.filter(r => r !== role) : [...u.roles, role];
        return { ...u, roles: newRoles };
      }));
    } catch (err) { toast.error("Failed to update role."); }
    finally { setUpdatingUid(null); }
  };

  const handleToggleBan = async (uid: string, isBanned: boolean) => {
    setUpdatingUid(uid);
    try {
      await adminApi.banUser(uid, !isBanned);
      setUsers(users.map(u => u.uid === uid ? { ...u, isBanned: !isBanned } : u));
    } catch (err) { toast.error("Failed to update ban status."); }
    finally { setUpdatingUid(null); }
  };

  const handleUpdateFeedback = async (id: string, status: string) => {
    setUpdatingFeedback(id);
    try {
      await feedbackApi.updateStatus(id, status, adminNote || undefined);
      setFeedbackList(prev => prev.map(f => f._id === id ? { ...f, status, adminNote: adminNote || f.adminNote } : f));
      if (selectedFeedback?._id === id) setSelectedFeedback(prev => prev ? { ...prev, status, adminNote: adminNote || prev.adminNote } : null);
      setAdminNote('');
    } catch (err) { toast.error("Failed to update feedback."); }
    finally { setUpdatingFeedback(null); }
  };

  if (loading) return <div className="p-24 text-center bauhaus-header text-4xl">VERIFYING CREDENTIALS...</div>;

  if (!isAdmin) return (
    <div className="p-24 text-center flex flex-col items-center justify-center">
      <AlertTriangle size={64} className="text-bauhaus-red mb-4" />
      <h1 className="bauhaus-header text-5xl text-bauhaus-red">ACCESS DENIED</h1>
      <p className="font-bold uppercase mt-4">You do not have administrative privileges.</p>
    </div>
  );

  const openFeedback = feedbackList.filter(f => f.status === 'OPEN').length;

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <div className="bg-black text-white p-12 border-4 border-black flex flex-col md:flex-row items-center justify-between gap-12 relative overflow-hidden">
        <div className="absolute right-0 top-0 opacity-10 -mr-10 -mt-10"><Shield size={300} /></div>
        <div className="z-10">
          <div className="bg-bauhaus-red text-white text-[10px] font-black px-2 py-1 uppercase mb-4 inline-block tracking-widest">RESTRICTED ACCESS AREA</div>
          <h1 className="bauhaus-header text-7xl leading-none text-bauhaus-yellow mb-4">ADMIN PORTAL</h1>
          <p className="text-xl font-bold uppercase max-w-2xl opacity-80">System Moderation & Entity Verification</p>
        </div>
        <div className="z-10 bg-white text-black p-6 border-4 border-black transform rotate-2">
          <div className="text-[10px] font-black uppercase mb-2">CURRENT MODERATOR</div>
          <div className="text-2xl font-black uppercase">{auth.currentUser?.displayName || 'ADMIN'}</div>
          <div className="text-sm font-bold opacity-60">{auth.currentUser?.email}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b-4 border-black overflow-x-auto">
        {[
          { id: 'overview', label: 'OVERVIEW', icon: <BarChart3 size={18} />, activeColor: 'bg-bauhaus-yellow text-black' },
          { id: 'ngos', label: `NGO APPROVAL (${ngos.length})`, icon: <Shield size={18} />, activeColor: 'bg-black text-white' },
          { id: 'users', label: `USER MANAGEMENT (${users.length})`, icon: <Users size={18} />, activeColor: 'bg-bauhaus-blue text-white' },
          { id: 'feedback', label: `FEEDBACK${openFeedback > 0 ? ` (${openFeedback})` : ''}`, icon: <MessageSquare size={18} />, activeColor: 'bg-bauhaus-red text-white' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 min-w-[140px] py-4 text-sm font-black uppercase flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-2 ${activeTab === tab.id ? tab.activeColor : 'bg-gray-100 hover:bg-gray-200'}`}>
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW TAB ─────────────────────────────── */}
      {activeTab === 'overview' && adminStats && (
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <h2 className="bauhaus-header text-4xl">PLATFORM METRICS</h2>
            <button onClick={() => { fetchStats(); fetchNgos(); fetchUsers(); fetchFeedback(); }}
              className="flex items-center gap-2 border-4 border-black px-4 py-2 font-black uppercase text-sm hover:bg-black hover:text-white transition-colors">
              <RefreshCw size={16} /> REFRESH
            </button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-4 border-black overflow-hidden">
            {[
              { label: 'Total Users', value: adminStats.totalUsers, color: 'bg-white' },
              { label: 'Total NGOs', value: adminStats.totalNgos, color: 'bg-bauhaus-blue text-white' },
              { label: 'Verified NGOs', value: adminStats.verifiedNgos, color: 'bg-green-600 text-white' },
              { label: 'Pending NGOs', value: adminStats.pendingNgos, color: adminStats.pendingNgos > 0 ? 'bg-bauhaus-yellow' : 'bg-gray-100' },
            ].map((m, i) => (
              <div key={i} className={`${m.color} p-8 border-r-4 last:border-r-0 border-black text-center`}>
                <div className="text-5xl font-black">{m.value}</div>
                <div className="text-[10px] font-black uppercase mt-1 opacity-70">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-4 border-black overflow-hidden">
            {[
              { label: 'Donation Drives', value: adminStats.totalDrives, color: 'bg-bauhaus-red text-white' },
              { label: 'Civic Reports', value: adminStats.totalReports, color: 'bg-bauhaus-yellow' },
              { label: 'Active Courses', value: adminStats.totalCourses, color: 'bg-black text-white' },
              { label: 'Open Feedback', value: adminStats.totalFeedback, color: adminStats.totalFeedback > 0 ? 'bg-bauhaus-red text-white' : 'bg-gray-100' },
            ].map((m, i) => (
              <div key={i} className={`${m.color} p-8 border-r-4 last:border-r-0 border-black text-center`}>
                <div className="text-5xl font-black">{m.value}</div>
                <div className="text-[10px] font-black uppercase mt-1 opacity-70">{m.label}</div>
              </div>
            ))}
          </div>

          {/* Quick actions */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="border-4 border-black p-6 space-y-4">
              <div className="text-[10px] font-black uppercase opacity-50 tracking-widest">PENDING NGO APPROVALS</div>
              <div className="text-6xl font-black text-bauhaus-red">{adminStats.pendingNgos}</div>
              <BauhausButton variant="black" className="w-full" onClick={() => setActiveTab('ngos')}>REVIEW NGOs →</BauhausButton>
            </div>
            <div className="border-4 border-black p-6 space-y-4">
              <div className="text-[10px] font-black uppercase opacity-50 tracking-widest">OPEN COMPLAINTS</div>
              <div className="text-6xl font-black text-bauhaus-red">{adminStats.totalFeedback}</div>
              <BauhausButton variant="black" className="w-full" onClick={() => setActiveTab('feedback')}>HANDLE FEEDBACK →</BauhausButton>
            </div>
            <div className="border-4 border-black p-6 space-y-4">
              <div className="text-[10px] font-black uppercase opacity-50 tracking-widest">TOTAL PLATFORM USERS</div>
              <div className="text-6xl font-black">{adminStats.totalUsers}</div>
              <BauhausButton variant="black" className="w-full" onClick={() => setActiveTab('users')}>MANAGE USERS →</BauhausButton>
            </div>
          </div>
        </div>
      )}

      {/* ── NGO MANAGEMENT TAB ──────────────────────── */}
      {activeTab === 'ngos' && (() => {
        const pendingNgos = ngos.filter(n => !n.isVerified);
        const allNgos = ngos;
        const displayedNgos = ngoSubTab === 'pending' ? pendingNgos : allNgos;
        return (
        <div className="space-y-8">
          <h2 className="bauhaus-header text-4xl border-b-4 border-black pb-4 flex items-center gap-4">
            NGO MANAGEMENT <span className="bg-black text-white px-3 py-1 text-2xl">{ngos.length}</span>
          </h2>

          {/* Sub-tabs */}
          <div className="flex border-b-4 border-black">
            <button onClick={() => setNgoSubTab('pending')}
              className={`flex-1 py-3 text-sm font-black uppercase flex items-center justify-center gap-2 transition-colors ${ngoSubTab === 'pending' ? 'bg-bauhaus-yellow text-black' : 'bg-gray-100 hover:bg-gray-200'}`}>
              <AlertTriangle size={16} /> PENDING APPROVALS <span className="bg-black text-white text-[10px] px-2 py-0.5 ml-1">{pendingNgos.length}</span>
            </button>
            <button onClick={() => setNgoSubTab('all')}
              className={`flex-1 py-3 text-sm font-black uppercase flex items-center justify-center gap-2 transition-colors ${ngoSubTab === 'all' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>
              <Shield size={16} /> ALL NGOS <span className={`text-[10px] px-2 py-0.5 ml-1 ${ngoSubTab === 'all' ? 'bg-white text-black' : 'bg-black text-white'}`}>{allNgos.length}</span>
            </button>
          </div>

          {/* NGO Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {displayedNgos.map((ngo) => (
              <motion.div key={ngo.uid} initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
                className={`border-4 border-black p-6 flex flex-col ${ngo.isBanned ? 'bg-red-50' : ngo.isVerified ? 'bg-white' : 'bg-yellow-50'}`}>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-2xl font-black uppercase leading-tight mb-1 flex items-center gap-2">
                      {ngo.name}
                      {ngo.isBanned && <span className="bg-bauhaus-red text-white text-[8px] font-black px-2 py-0.5 uppercase">BLOCKED</span>}
                    </h3>
                    <div className="text-xs font-bold opacity-60">{ngo.email}</div>
                  </div>
                  {ngo.isBanned ? (
                    <Ban size={32} className="text-bauhaus-red shrink-0" />
                  ) : ngo.isVerified ? (
                    <CheckCircle size={32} className="text-green-600 shrink-0" />
                  ) : (
                    <AlertTriangle size={32} className="text-bauhaus-yellow shrink-0" />
                  )}
                </div>
                <div className="flex gap-2 flex-wrap mb-4">
                  <div className={`text-xs font-black uppercase px-2 py-1 inline-block w-fit ${ngo.isVerified ? 'bg-green-100 text-green-700' : 'bg-bauhaus-yellow text-black'}`}>
                    {ngo.isVerified ? '✓ VERIFIED' : 'PENDING REVIEW'}
                  </div>
                  {ngo.isBanned && (
                    <div className="text-xs font-black uppercase px-2 py-1 inline-block w-fit bg-red-100 text-red-700">
                      ✕ BLOCKED
                    </div>
                  )}
                </div>
                <div className="text-[10px] font-black uppercase opacity-50 mb-6 flex-grow">
                  Registered: {new Date(ngo.createdAt).toLocaleDateString()}
                </div>
                <div className="border-t-4 border-black pt-4 space-y-3">
                  {/* Approve / Revoke */}
                  <button
                    onClick={() => handleVerifyToggle(ngo.uid, ngo.isVerified)}
                    disabled={updatingUid === ngo.uid}
                    className={`w-full py-3 font-black uppercase transition-colors border-2 border-black disabled:opacity-50 ${ngo.isVerified ? 'bg-white text-black hover:bg-bauhaus-red hover:text-white' : 'bg-black text-white hover:bg-green-600 hover:border-green-600'}`}>
                    {updatingUid === ngo.uid ? 'UPDATING...' : ngo.isVerified ? 'REVOKE VERIFICATION' : '✓ APPROVE NGO'}
                  </button>
                  {/* Block / Unblock */}
                  <button
                    onClick={() => handleToggleNgoBan(ngo.uid, !!ngo.isBanned)}
                    disabled={updatingUid === ngo.uid}
                    className={`w-full py-3 font-black uppercase transition-colors border-2 border-black disabled:opacity-50 flex items-center justify-center gap-2 ${ngo.isBanned ? 'bg-green-600 text-white hover:bg-green-700 border-green-600' : 'bg-bauhaus-red text-white hover:bg-red-700 border-bauhaus-red'}`}>
                    {ngo.isBanned ? <><UserCheck size={16} /> UNBLOCK NGO</> : <><Ban size={16} /> BLOCK NGO</>}
                  </button>
                </div>
              </motion.div>
            ))}
            {displayedNgos.length === 0 && (
              <div className="col-span-full p-12 text-center border-4 border-dashed border-black opacity-50">
                <Shield size={48} className="mx-auto mb-4" />
                <h3 className="text-2xl font-black uppercase">{ngoSubTab === 'pending' ? 'NO PENDING NGO APPROVALS' : 'NO NGOS REGISTERED YET'}</h3>
              </div>
            )}
          </div>
        </div>
        );
      })()}

      {/* ── USER MANAGEMENT TAB ───────────────────────── */}
      {activeTab === 'users' && (
        <div className="space-y-8">
          <h2 className="bauhaus-header text-4xl border-b-4 border-black pb-4 flex items-center gap-4">
            USER MANAGEMENT <span className="bg-bauhaus-blue text-white px-3 py-1 text-2xl">{users.length}</span>
          </h2>
          <div className="space-y-0 border-t-2 border-l-2 border-black">
            {users.map((user) => {
              const isExpanded = expandedUser === user.uid;
              return (
                <motion.div key={user.uid} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className={`border-b-2 border-r-2 border-black ${user.isBanned ? 'bg-red-50' : 'bg-white'}`}>
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-5 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => setExpandedUser(isExpanded ? null : user.uid)}>
                    <div className="flex items-center gap-4">
                      <div className={`w-12 h-12 ${user.isBanned ? 'bg-bauhaus-red' : 'bg-black'} text-white font-black flex items-center justify-center text-lg shrink-0`}>
                        {user.name?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div className="font-black uppercase text-lg leading-none flex items-center gap-2">
                          {user.name}
                          {user.isBanned && <span className="bg-bauhaus-red text-white text-[8px] font-black px-2 py-0.5 uppercase">BANNED</span>}
                        </div>
                        <div className="text-xs font-bold opacity-60 mt-1">{user.email}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 mt-3 md:mt-0">
                      <div className="flex flex-wrap gap-1">
                        {user.roles.map(role => (
                          <span key={role} className={`text-[9px] font-black uppercase px-2 py-1 border border-black ${role === 'admin' ? 'bg-bauhaus-red text-white' : role === 'ngo' ? 'bg-bauhaus-blue text-white' : role === 'educator' ? 'bg-bauhaus-yellow text-black' : role === 'govt' ? 'bg-green-600 text-white' : 'bg-gray-100 text-black'}`}>
                            {role}
                          </span>
                        ))}
                      </div>
                      <ChevronDown size={18} className={`transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t-2 border-black">
                        <div className="p-6 bg-gray-50 space-y-6">
                          <div className="space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-50">ROLE MANAGEMENT</div>
                            <div className="flex flex-wrap gap-3">
                              {AVAILABLE_ROLES.map(role => {
                                const hasRole = user.roles.includes(role);
                                return (
                                  <button key={role} disabled={updatingUid === user.uid}
                                    onClick={(e) => { e.stopPropagation(); handleToggleRole(user.uid, role, hasRole); }}
                                    className={`px-4 py-2 font-black uppercase text-xs border-2 border-black transition-all disabled:opacity-50 ${hasRole ? 'bg-black text-white hover:bg-bauhaus-red shadow-[4px_4px_0px_0px_black]' : 'bg-white text-black hover:bg-bauhaus-yellow'}`}>
                                    {hasRole ? `✓ ${role}` : `+ ${role}`}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                          <div className="space-y-3">
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-50">ACCOUNT ACTION</div>
                            <div className="flex gap-4 items-center">
                              <button disabled={updatingUid === user.uid}
                                onClick={(e) => { e.stopPropagation(); handleToggleBan(user.uid, !!user.isBanned); }}
                                className={`flex items-center gap-2 px-6 py-3 font-black uppercase text-sm border-2 border-black transition-colors disabled:opacity-50 ${user.isBanned ? 'bg-green-600 text-white hover:bg-green-700' : 'bg-bauhaus-red text-white hover:bg-red-700'}`}>
                                {user.isBanned ? <><UserCheck size={16} /> UNBAN USER</> : <><Ban size={16} /> BAN USER</>}
                              </button>
                              <div className="text-[10px] font-black uppercase opacity-40">UID: {user.uid.substring(0, 12)}...</div>
                            </div>
                          </div>
                          <div className="text-[10px] font-black uppercase opacity-30">
                            Registered: {new Date(user.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
          {users.length === 0 && (
            <div className="col-span-full p-12 text-center border-4 border-dashed border-black opacity-50">
              <Users size={48} className="mx-auto mb-4" />
              <h3 className="text-2xl font-black uppercase">NO USERS FOUND</h3>
            </div>
          )}
        </div>
      )}

      {/* ── FEEDBACK / COMPLAINTS TAB ─────────────────── */}
      {activeTab === 'feedback' && (
        <div className="space-y-8">
          <h2 className="bauhaus-header text-4xl border-b-4 border-black pb-4 flex items-center gap-4">
            FEEDBACK & COMPLAINTS <span className="bg-bauhaus-red text-white px-3 py-1 text-2xl">{openFeedback} OPEN</span>
          </h2>
          <div className="space-y-0 border-t-2 border-l-2 border-black">
            {feedbackList.map((item) => (
              <motion.div key={item._id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className={`border-b-2 border-r-2 border-black p-5 cursor-pointer hover:bg-gray-50 transition-colors ${item.status === 'RESOLVED' ? 'bg-green-50' : ''}`}
                onClick={() => { setSelectedFeedback(item); setAdminNote(item.adminNote || ''); }}>
                <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                      <span className={`text-[9px] font-black uppercase px-2 py-1 ${STATUS_COLORS[item.status] || 'bg-gray-200'}`}>{item.status}</span>
                      <span className="text-[9px] font-black uppercase bg-gray-100 px-2 py-1 border border-black">{item.type.toUpperCase()}</span>
                      <span className="text-[9px] font-black uppercase opacity-40">{new Date(item.createdAt).toLocaleDateString('en-IN')}</span>
                    </div>
                    <div className="font-black uppercase text-base">{item.subject}</div>
                    <div className="text-sm font-bold opacity-60 mt-1 line-clamp-2">{item.message}</div>
                    <div className="text-[9px] font-black uppercase opacity-40 mt-1">FROM: {item.userName || item.userId}</div>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    {item.status !== 'RESOLVED' && (
                      <button onClick={(e) => { e.stopPropagation(); handleUpdateFeedback(item._id, 'RESOLVED'); }}
                        disabled={updatingFeedback === item._id}
                        className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 font-black uppercase text-[10px] hover:bg-green-700 disabled:opacity-50 transition-colors border-2 border-black">
                        <CheckCircle2 size={12} /> RESOLVE
                      </button>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            {feedbackList.length === 0 && (
              <div className="p-12 text-center border-4 border-dashed border-black opacity-50">
                <MessageSquare size={48} className="mx-auto mb-4" />
                <h3 className="text-2xl font-black uppercase">NO FEEDBACK YET</h3>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Feedback Detail Modal */}
      <AnimatePresence>
        {selectedFeedback && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 flex items-center justify-center p-4"
            onClick={() => setSelectedFeedback(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-white border-4 border-black shadow-[16px_16px_0px_0px_black] relative"
              onClick={e => e.stopPropagation()}>
              <div className="bg-black text-white p-6 flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-black uppercase opacity-50 mb-1">{selectedFeedback.type.toUpperCase()}</div>
                  <h2 className="bauhaus-header text-3xl uppercase">{selectedFeedback.subject}</h2>
                  <div className="text-xs font-bold opacity-60 mt-1">FROM: {selectedFeedback.userName}</div>
                </div>
                <button onClick={() => setSelectedFeedback(null)} className="p-2 hover:bg-bauhaus-red transition-colors">
                  <XCircle size={20} />
                </button>
              </div>
              <div className="p-6 space-y-6">
                <div>
                  <div className="text-[10px] font-black uppercase opacity-50 mb-2">MESSAGE</div>
                  <p className="font-bold bg-gray-50 p-4 border-2 border-black">{selectedFeedback.message}</p>
                </div>
                {selectedFeedback.adminNote && (
                  <div>
                    <div className="text-[10px] font-black uppercase opacity-50 mb-2">PREVIOUS ADMIN NOTE</div>
                    <p className="font-bold italic opacity-70">{selectedFeedback.adminNote}</p>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">ADMIN RESPONSE / NOTE</label>
                  <textarea value={adminNote} onChange={e => setAdminNote(e.target.value)}
                    className="w-full border-2 border-black p-3 font-bold min-h-[80px] focus:bg-bauhaus-yellow outline-none resize-none text-sm"
                    placeholder="Enter your response or action taken..." />
                </div>
                <div className="flex gap-4">
                  {selectedFeedback.status !== 'IN_REVIEW' && (
                    <BauhausButton variant="outline" onClick={() => handleUpdateFeedback(selectedFeedback._id, 'IN_REVIEW')} disabled={updatingFeedback === selectedFeedback._id}>
                      MARK IN REVIEW
                    </BauhausButton>
                  )}
                  {selectedFeedback.status !== 'RESOLVED' && (
                    <BauhausButton variant="black" onClick={() => handleUpdateFeedback(selectedFeedback._id, 'RESOLVED')} disabled={updatingFeedback === selectedFeedback._id}>
                      <CheckCircle2 size={16} className="inline mr-2" />RESOLVE
                    </BauhausButton>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminDashboard;
