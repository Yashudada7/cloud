import React, { useState, useEffect } from 'react';
import { BauhausButton, BauhausTag } from '../../components/BauhausUI';
import {
  Landmark, CheckCircle2, Clock, AlertTriangle, ChevronRight,
  X, FileText, BarChart3, RefreshCw, PawPrint, Loader2
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { reportsApi, usersApi, animalCasesApi } from '../../lib/api';
import { auth } from '../../lib/firebase';
import { toast } from 'react-toastify';

interface Report {
  _id: string;
  userId: string;
  category: string;
  description: string;
  photoUrl: string;
  status: string;
  govtNotes: string;
  createdAt: string;
  history: { status: string; title: string; date: string }[];
}

interface Stats {
  total: number;
  submitted: number;
  inProgress: number;
  resolved: number;
  newToday: number;
  overdue?: number;
  avgResolutionHours?: number;
  categoryBreakdown: { _id: string; count: number }[];
}

const STATUS_FLOW = ['SUBMITTED', 'IN_PROGRESS', 'RESOLVED'] as const;

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: 'bg-bauhaus-yellow text-black',
  IN_PROGRESS: 'bg-bauhaus-blue text-white',
  RESOLVED: 'bg-green-600 text-white',
};

const GovernmentDashboard = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isGovt, setIsGovt] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [govtNoteInput, setGovtNoteInput] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [userCases, setUserCases] = useState<any[]>([]);
  const [userReports, setUserReports] = useState<Report[]>([]);
  const [userPostsLoading, setUserPostsLoading] = useState(false);
  const [reporterUser, setReporterUser] = useState<any>(null);
  const [reporterLoading, setReporterLoading] = useState(false);

  useEffect(() => {
    checkRoleAndLoad();
  }, []);

  const checkRoleAndLoad = async () => {
    if (!auth.currentUser) { setLoading(false); return; }
    try {
      const userRes = await usersApi.get(auth.currentUser.uid);
      const roles: string[] = userRes.data?.roles || [];
      if (roles.includes('govt') || roles.includes('admin')) {
        setIsGovt(true);
        setBlockedUsers(userRes.data?.blockedUsers || []);
        await Promise.all([fetchReports(), fetchStats()]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUnblock = async (targetUid: string, action: 'block' | 'unblock') => {
    try {
      await usersApi.blockUnblock(targetUid, action);
      if (action === 'block') {
        setBlockedUsers(prev => [...prev, targetUid]);
        toast.success('User blocked successfully.');
      } else {
        setBlockedUsers(prev => prev.filter(uid => uid !== targetUid));
        toast.success('User unblocked successfully.');
      }
    } catch (err: any) {
      console.error('Error updating block status:', err);
      toast.error(err.response?.data?.error || 'Failed to update block status.');
    }
  };

  useEffect(() => {
    if (selectedUserUid) {
      loadUserDetails(selectedUserUid);
    } else {
      setSelectedUser(null);
      setUserCases([]);
      setUserReports([]);
    }
  }, [selectedUserUid]);

  const loadUserDetails = async (uid: string) => {
    setSelectedUserLoading(true);
    setUserPostsLoading(true);
    try {
      const [uRes, casesRes, reportsRes] = await Promise.all([
        usersApi.get(uid),
        animalCasesApi.getByUser(uid),
        reportsApi.getByUser(uid)
      ]);
      setSelectedUser(uRes.data);
      setUserCases(casesRes.data);
      setUserReports(reportsRes.data);
    } catch (err) {
      console.error("Error loading user details", err);
      toast.error("Failed to load user details.");
      setSelectedUserUid(null);
    } finally {
      setSelectedUserLoading(false);
      setUserPostsLoading(false);
    }
  };

  useEffect(() => {
    if (selectedReport) {
      loadReporterUser(selectedReport.userId);
    } else {
      setReporterUser(null);
    }
  }, [selectedReport]);

  const loadReporterUser = async (uid: string) => {
    setReporterLoading(true);
    try {
      const res = await usersApi.get(uid);
      setReporterUser(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setReporterLoading(false);
    }
  };

  const fetchReports = async () => {
    try {
      const res = await reportsApi.getAll();
      setReports(res.data);
    } catch (err) {
      console.error('Error fetching reports:', err);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await reportsApi.getStats();
      setStats(res.data);
    } catch (err) {
      console.error('Error fetching stats:', err);
    }
  };

  const handleUpdateStatus = async (report: Report, newStatus: string) => {
    setUpdating(true);
    try {
      const statusLabels: Record<string, string> = {
        IN_PROGRESS: 'Assigned to department for action',
        RESOLVED: 'Issue completed and closed',
        SUBMITTED: 'Re-opened for review',
      };
      const updated = await reportsApi.updateStatus(report._id, {
        status: newStatus,
        govtNotes: govtNoteInput || report.govtNotes,
        historyTitle: statusLabels[newStatus] || `Status changed to ${newStatus}`,
      });
      // Refresh data
      await Promise.all([fetchReports(), fetchStats()]);
      setSelectedReport(updated.data);
      setGovtNoteInput('');
    } catch (err) {
      console.error(err);
      toast.error('Failed to update status.');
    } finally {
      setUpdating(false);
    }
  };

  const filteredReports = filterStatus === 'ALL'
    ? reports
    : reports.filter(r => r.status === filterStatus);

  if (loading) return (
    <div className="p-24 text-center bauhaus-header text-4xl">LOADING CIVIC DASHBOARD...</div>
  );

  if (!isGovt) return (
    <div className="p-24 text-center flex flex-col items-center justify-center">
      <Landmark size={64} className="text-bauhaus-red mb-4" />
      <h1 className="bauhaus-header text-5xl text-bauhaus-red">RESTRICTED ACCESS</h1>
      <p className="font-bold uppercase mt-4">This portal is for authorized government personnel only.</p>
    </div>
  );

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <div className="bg-bauhaus-blue text-white p-12 border-4 border-black flex flex-col md:flex-row items-center justify-between gap-8 overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-10 -mr-10 -mt-10 pointer-events-none">
          <Landmark size={300} />
        </div>
        <div className="z-10">
          <div className="bg-bauhaus-yellow text-black text-[10px] font-black px-3 py-1 uppercase inline-block mb-4 tracking-widest">
            GOVERNMENT PORTAL
          </div>
          <h1 className="bauhaus-header text-7xl leading-none mb-2">CIVIC RESOLUTION</h1>
          <p className="text-xl font-bold uppercase opacity-80">Municipal Transparency Dashboard</p>
        </div>
        <button
          onClick={() => { fetchReports(); fetchStats(); }}
          className="z-10 flex items-center gap-2 bg-white text-black px-6 py-3 font-black uppercase text-sm border-2 border-black hover:bg-bauhaus-yellow transition-colors"
        >
          <RefreshCw size={16} /> REFRESH DATA
        </button>
      </div>

      {/* Metrics Grid */}
      {stats && (
        <div className="space-y-0 border-4 border-black overflow-hidden">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-0 border-b-4 border-black">
            {[
              { label: 'Total Reports', value: stats.total, color: 'bg-white' },
              { label: 'New Today', value: stats.newToday, color: 'bg-bauhaus-yellow' },
              { label: 'Submitted', value: stats.submitted, color: 'bg-gray-100' },
              { label: 'In Progress', value: stats.inProgress, color: 'bg-bauhaus-blue text-white' },
              { label: 'Completed', value: stats.resolved, color: 'bg-black text-white' },
            ].map((m, i) => (
              <div key={i} className={`${m.color} p-6 border-r-4 last:border-r-0 border-black text-center`}>
                <div className="text-5xl font-black">{m.value}</div>
                <div className="text-[10px] font-black uppercase mt-1 opacity-70">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-0">
            <div className={`p-6 border-r-4 border-black text-center ${(stats.overdue ?? 0) > 0 ? 'bg-bauhaus-red text-white' : 'bg-gray-50'}`}>
              <div className="text-5xl font-black">{stats.overdue ?? 0}</div>
              <div className="text-[10px] font-black uppercase mt-1 opacity-70">Overdue Issues (&gt;7 days)</div>
            </div>
            <div className="bg-bauhaus-yellow p-6 text-center">
              <div className="text-5xl font-black">{stats.avgResolutionHours != null ? `${Math.round(stats.avgResolutionHours)}h` : '—'}</div>
              <div className="text-[10px] font-black uppercase mt-1 opacity-70">Avg Resolution Time</div>
            </div>
          </div>
        </div>
      )}

      {/* Category Breakdown + Filter */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Category breakdown */}
        {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 && (
          <div className="border-4 border-black p-6 space-y-4">
            <div className="flex items-center gap-3 border-b-2 border-black pb-4">
              <BarChart3 size={20} />
              <h3 className="font-black uppercase text-xl">Dept. Breakdown</h3>
            </div>
            {stats.categoryBreakdown.map((cat, i) => {
              const pct = stats.total > 0 ? Math.round((cat.count / stats.total) * 100) : 0;
              return (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between font-black uppercase text-xs">
                    <span>{cat._id}</span>
                    <span>{cat.count} ({pct}%)</span>
                  </div>
                  <div className="h-3 border-2 border-black bg-gray-100 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${pct}%` }}
                      transition={{ duration: 0.8, delay: i * 0.1 }}
                      className="h-full bg-bauhaus-blue"
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Resolution rate */}
        {stats && (
          <div className="border-4 border-black p-6 flex flex-col items-center justify-center bg-black text-white">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">Resolution Rate</div>
            <div className="text-8xl font-black text-bauhaus-yellow">
              {stats.total > 0 ? Math.round((stats.resolved / stats.total) * 100) : 0}%
            </div>
            <div className="text-sm font-bold uppercase opacity-60 mt-2">
              {stats.resolved} of {stats.total} issues resolved
            </div>
          </div>
        )}

        {/* Filter controls */}
        <div className="border-4 border-black p-6 space-y-4">
          <h3 className="font-black uppercase text-xl border-b-2 border-black pb-4">Filter Queue</h3>
          {['ALL', 'SUBMITTED', 'IN_PROGRESS', 'RESOLVED'].map(s => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`w-full py-3 font-black uppercase text-sm border-2 border-black transition-colors ${
                filterStatus === s ? 'bg-black text-white' : 'bg-white hover:bg-bauhaus-yellow'
              }`}
            >
              {s === 'ALL' ? `All Reports (${reports.length})` : `${s.replace('_', ' ')} (${reports.filter(r => r.status === s).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Reports Queue */}
      <div className="space-y-4">
        <h2 className="bauhaus-header text-4xl border-b-4 border-black pb-4 flex items-center gap-4">
          ISSUE QUEUE
          <span className="bg-black text-white px-3 py-1 text-2xl">{filteredReports.length}</span>
        </h2>

        <div className="space-y-0 border-t-2 border-l-2 border-black">
          {filteredReports.map((report) => (
            <motion.div
              key={report._id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="border-b-2 border-r-2 border-black flex flex-col md:flex-row group"
            >
              {/* Photo */}
              <div className="w-full md:w-40 h-40 bg-black shrink-0 overflow-hidden">
                <img
                  src={report.photoUrl}
                  alt={report.category}
                  className="w-full h-full object-cover grayscale group-hover:grayscale-0 transition-all duration-500"
                />
              </div>

              {/* Info */}
              <div className="flex-grow p-5 flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <span className={`text-[10px] font-black uppercase px-2 py-1 ${STATUS_COLORS[report.status] || 'bg-gray-200'}`}>
                      {report.status.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] font-black uppercase opacity-50 bg-gray-100 px-2 py-1">
                      {report.category}
                    </span>
                    <span className="text-[10px] font-black uppercase opacity-40">
                      {new Date(report.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </span>
                  </div>
                  <p className="font-black uppercase text-base leading-tight line-clamp-2">{report.description}</p>
                  {report.govtNotes && (
                    <p className="text-xs font-bold opacity-60 mt-1 italic">Note: {report.govtNotes}</p>
                  )}
                </div>

                {/* Quick action buttons */}
                <div className="flex items-center gap-3 mt-3 flex-wrap">
                  {STATUS_FLOW.filter(s => s !== report.status).map(nextStatus => {
                    const label = nextStatus === 'RESOLVED' ? 'MARK AS COMPLETED' : nextStatus === 'IN_PROGRESS' ? 'IN PROGRESS' : 'REOPEN';
                    return (
                      <button
                        key={nextStatus}
                        onClick={() => handleUpdateStatus(report, nextStatus)}
                        className="text-[10px] font-black uppercase px-3 py-1.5 border-2 border-black hover:bg-black hover:text-white transition-colors"
                      >
                        {label}
                      </button>
                    );
                  })}
                  <button
                    onClick={() => { setSelectedReport(report); setGovtNoteInput(report.govtNotes || ''); }}
                    className="ml-auto p-2 border-2 border-black hover:bg-black hover:text-white transition-colors"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        {filteredReports.length === 0 && (
          <div className="p-24 border-4 border-black border-dashed text-center opacity-40">
            <FileText size={64} className="mx-auto mb-4" />
            <div className="text-3xl font-black uppercase">No Reports in This Category</div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-4xl bg-white border-4 border-black relative my-8"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setSelectedReport(null)}
                className="absolute top-4 right-4 bg-black text-white p-2 hover:bg-bauhaus-red z-20 font-black"
              >
                <X size={20} />
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Left: Photo + Info */}
                <div>
                  <div className="aspect-video bg-black overflow-hidden border-b-4 border-black">
                    <img src={selectedReport.photoUrl} alt="Report" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-8 space-y-4">
                    <div className="flex items-center gap-3 flex-wrap">
                      <span className={`text-xs font-black uppercase px-3 py-1 ${STATUS_COLORS[selectedReport.status]}`}>
                        {selectedReport.status.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-black uppercase bg-gray-100 px-3 py-1">{selectedReport.category}</span>
                    </div>
                    <h2 className="bauhaus-header text-4xl uppercase leading-tight">{selectedReport.description}</h2>
                    <p className="text-sm font-bold uppercase opacity-50">
                      Filed: {new Date(selectedReport.createdAt).toLocaleString('en-IN')}
                    </p>
                    
                    {/* Reporter Info */}
                    <div className="pt-4 border-t-2 border-black space-y-2">
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-50">REPORTER DETAILS</div>
                      {reporterLoading ? (
                        <div className="text-xs font-bold uppercase animate-pulse opacity-50">Loading reporter info...</div>
                      ) : reporterUser ? (
                        <div className="flex justify-between items-center bg-white p-3 border-2 border-black">
                          <div>
                            <div className="font-black uppercase text-sm">{reporterUser.name}</div>
                            <div className="text-xs font-bold opacity-60">{reporterUser.email}</div>
                          </div>
                          <button 
                            type="button"
                            onClick={() => { setSelectedUserUid(selectedReport.userId); setSelectedReport(null); }}
                            className="bg-black text-white px-3 py-1 font-black uppercase text-[10px] hover:bg-bauhaus-blue transition-colors border border-black"
                          >
                            VIEW PROFILE & CONTROL
                          </button>
                        </div>
                      ) : (
                        <div className="text-xs font-bold opacity-50">Could not retrieve reporter profile.</div>
                      )}
                    </div>

                    {/* History Timeline */}
                    <div className="space-y-3 pt-4 border-t-2 border-black">
                      <div className="text-[10px] font-black uppercase tracking-widest opacity-50">STATUS HISTORY</div>
                      {(selectedReport.history || []).map((h, i) => (
                        <div key={i} className="flex gap-3 border-l-2 border-black pl-3">
                          <div>
                            <div className="text-[10px] font-black uppercase">{h.status.replace('_', ' ')} — {h.title}</div>
                            <div className="text-[9px] opacity-50">{new Date(h.date).toLocaleString('en-IN')}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right: Government Action Panel */}
                <div className="border-l-4 border-black bg-gray-50 p-8 flex flex-col gap-6">
                  <div>
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-4">GOVERNMENT ACTION CENTER</div>
                    <h3 className="bauhaus-header text-3xl uppercase">Update Status</h3>
                  </div>

                  {/* Status buttons */}
                  <div className="space-y-3">
                    {STATUS_FLOW.map(status => (
                      <button
                        key={status}
                        disabled={updating || selectedReport.status === status}
                        onClick={() => handleUpdateStatus(selectedReport, status)}
                        className={`w-full py-4 font-black uppercase text-sm border-2 border-black transition-all ${
                          selectedReport.status === status
                            ? `${STATUS_COLORS[status]} opacity-100 cursor-default shadow-[4px_4px_0px_0px_black]`
                            : 'bg-white hover:bg-black hover:text-white opacity-60 hover:opacity-100'
                        }`}
                      >
                        {selectedReport.status === status ? '✓ CURRENT: ' : 'SET → '}
                        {status === 'RESOLVED' ? 'COMPLETED' : status.replace('_', ' ')}
                      </button>
                    ))}
                  </div>

                  {/* Govt Notes */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest">
                      DEPARTMENT NOTES (visible to citizen)
                    </label>
                    <textarea
                      value={govtNoteInput}
                      onChange={e => setGovtNoteInput(e.target.value)}
                      placeholder="E.g. Assigned to Road Dept. Team B. ETA 3 days."
                      className="w-full border-2 border-black p-3 font-bold min-h-[100px] focus:bg-bauhaus-yellow outline-none resize-none text-sm"
                    />
                    <BauhausButton
                      variant="black"
                      className="w-full"
                      onClick={() => handleUpdateStatus(selectedReport, selectedReport.status)}
                      disabled={updating || !govtNoteInput.trim()}
                    >
                      {updating ? 'SAVING...' : 'SAVE NOTE →'}
                    </BauhausButton>
                  </div>

                  {/* Quick resolve */}
                  {selectedReport.status !== 'RESOLVED' && (
                    <div className="border-t-2 border-black pt-4">
                      <BauhausButton
                        variant="secondary"
                        className="w-full flex items-center justify-center gap-2"
                        onClick={() => handleUpdateStatus(selectedReport, 'RESOLVED')}
                        disabled={updating}
                      >
                        <CheckCircle2 size={18} />
                        MARK AS COMPLETED
                      </BauhausButton>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── User Details Modal (Govt) ─────────────────────── */}
        {selectedUserUid && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[110] bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedUserUid(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-4xl bg-white border-[6px] border-black relative my-8 shadow-[16px_16px_0px_0px_black]"
              onClick={e => e.stopPropagation()}>
              
              {/* Header */}
              <div className="bg-black text-white p-8 flex justify-between items-start border-b-[6px] border-black">
                <div>
                  <span className="bg-bauhaus-yellow text-black text-[10px] font-black px-2 py-1 uppercase inline-block mb-2">
                    Citizen Control Profile
                  </span>
                  <h2 className="bauhaus-header text-5xl uppercase leading-none">
                    {selectedUserLoading ? 'Loading User...' : selectedUser?.name || 'Unknown Citizen'}
                  </h2>
                  <p className="text-xs font-bold uppercase opacity-60 mt-2">
                    UID: {selectedUserUid}
                  </p>
                </div>
                <button onClick={() => setSelectedUserUid(null)} 
                  className="bg-white text-black p-2 hover:bg-bauhaus-red hover:text-white transition-colors border-2 border-black">
                  <X size={20} />
                </button>
              </div>

              {selectedUserLoading ? (
                <div className="p-24 text-center font-black uppercase text-2xl animate-pulse">
                  Fetching citizen record database...
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-3 divide-y-4 lg:divide-y-0 lg:divide-x-4 divide-black">
                  
                  {/* Left: User Profile & Actions */}
                  <div className="p-6 space-y-6 bg-gray-50">
                    <div className="w-24 h-24 bg-black text-white font-black flex items-center justify-center text-4xl border-4 border-black mx-auto">
                      {selectedUser?.name?.[0]?.toUpperCase() || '?'}
                    </div>

                    <div className="space-y-3">
                      <div className="border-b border-black/10 pb-2">
                        <div className="text-[9px] font-black uppercase opacity-40">Email Address</div>
                        <div className="font-bold text-sm break-all">{selectedUser?.email || 'N/A'}</div>
                      </div>
                      <div className="border-b border-black/10 pb-2">
                        <div className="text-[9px] font-black uppercase opacity-40">Phone Number</div>
                        <div className="font-bold text-sm">{selectedUser?.phone || 'N/A'}</div>
                      </div>
                      <div className="border-b border-black/10 pb-2">
                        <div className="text-[9px] font-black uppercase opacity-40">Address</div>
                        <div className="font-bold text-sm leading-tight">{selectedUser?.address || 'N/A'}</div>
                      </div>
                      <div className="border-b border-black/10 pb-2">
                        <div className="text-[9px] font-black uppercase opacity-40">Bio Description</div>
                        <div className="text-xs font-bold italic">"{selectedUser?.bio || 'No bio provided'}"</div>
                      </div>
                    </div>

                    <div className="pt-4 border-t-2 border-black space-y-3">
                      <div className="text-[10px] font-black uppercase tracking-wider text-center">AUTHORIZATION CONTROL</div>
                      {blockedUsers.includes(selectedUserUid) ? (
                        <button 
                          type="button"
                          onClick={() => handleBlockUnblock(selectedUserUid, 'unblock')}
                          className="w-full py-4 bg-bauhaus-yellow text-black font-black uppercase text-sm border-4 border-black shadow-[4px_4px_0px_0px_black] hover:bg-black hover:text-white transition-colors"
                        >
                          UNBLOCK CITIZEN
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => handleBlockUnblock(selectedUserUid, 'block')}
                          className="w-full py-4 bg-bauhaus-red text-white font-black uppercase text-sm border-4 border-black shadow-[4px_4px_0px_0px_black] hover:bg-black transition-colors"
                        >
                          BLOCK CITIZEN
                        </button>
                      )}
                      <p className="text-[9px] font-bold text-center opacity-50 uppercase text-bauhaus-red">
                        Blocked citizens cannot submit new civic reports.
                      </p>
                    </div>
                  </div>

                  {/* Middle & Right: User's Posts / Activities */}
                  <div className="lg:col-span-2 p-6 space-y-8 max-h-[60vh] overflow-y-auto">
                    
                    {/* Civic Reports Submitted by user */}
                    <div className="space-y-4">
                      <h3 className="font-black uppercase text-xl border-b-2 border-black pb-2 flex items-center gap-2">
                        <FileText size={18} /> Filed Civic Reports ({userReports.length})
                      </h3>
                      {userPostsLoading ? (
                        <div className="text-xs font-bold uppercase animate-pulse opacity-50">Loading reports...</div>
                      ) : userReports.length === 0 ? (
                        <div className="text-xs font-bold opacity-40 uppercase py-2">No civic reports filed by this citizen.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {userReports.map(r => (
                            <div key={r._id} className="border-2 border-black p-3 bg-white space-y-2 flex flex-col justify-between">
                              <div className="space-y-2">
                                <div className="aspect-video bg-black overflow-hidden border-2 border-black">
                                  <img src={r.photoUrl} alt={r.category} className="w-full h-full object-cover" />
                                </div>
                                <div className="flex justify-between items-center">
                                  <span className="font-black uppercase text-xs">{r.category}</span>
                                  <span className={`text-[8px] font-black uppercase px-2 py-0.5 ${STATUS_COLORS[r.status] || 'bg-gray-200'}`}>{r.status}</span>
                                </div>
                                <p className="text-xs font-bold opacity-70 line-clamp-2">{r.description}</p>
                              </div>
                              <div className="space-y-1 pt-2 border-t border-black/10">
                                <div className="flex gap-1">
                                  {STATUS_FLOW.map(flow => (
                                    <button
                                      key={flow}
                                      disabled={updating || r.status === flow}
                                      onClick={async () => {
                                        setUpdating(true);
                                        try {
                                          await reportsApi.updateStatus(r._id, {
                                            status: flow,
                                            govtNotes: r.govtNotes || 'Updated status via profile control center.',
                                            historyTitle: `Status changed to ${flow} via user control`,
                                          });
                                          // Refresh lists
                                          await Promise.all([fetchReports(), fetchStats()]);
                                          if (selectedUserUid) {
                                            const reportsRes = await reportsApi.getByUser(selectedUserUid);
                                            setUserReports(reportsRes.data);
                                          }
                                          toast.success('Report status updated.');
                                        } catch (err) {
                                          console.error(err);
                                          toast.error('Failed to update status.');
                                        } finally {
                                          setUpdating(false);
                                        }
                                      }}
                                      className={`flex-1 py-1 text-[8px] font-black uppercase border border-black ${
                                        r.status === flow ? 'bg-black text-white' : 'bg-gray-100 hover:bg-bauhaus-yellow'
                                      }`}
                                    >
                                      {flow.substring(0, 3)}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Animal Cases Reported by user (Read Only for Govt) */}
                    <div className="space-y-4">
                      <h3 className="font-black uppercase text-xl border-b-2 border-black pb-2 flex items-center gap-2">
                        <PawPrint size={18} /> Reported Animal Cases ({userCases.length})
                      </h3>
                      {userPostsLoading ? (
                        <div className="text-xs font-bold uppercase animate-pulse opacity-50">Loading cases...</div>
                      ) : userCases.length === 0 ? (
                        <div className="text-xs font-bold opacity-40 uppercase py-2">No animal cases filed by this citizen.</div>
                      ) : (
                        <div className="space-y-3">
                          {userCases.map(c => (
                            <div key={c._id} className="border-2 border-black p-3 bg-white flex gap-3 items-center">
                              <img src={c.photoUrl} alt={c.animalType} className="w-12 h-12 object-cover border border-black shrink-0" />
                              <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-center">
                                  <span className="font-black uppercase text-xs">{c.animalType}</span>
                                  <span className="text-[8px] font-black uppercase opacity-60 bg-gray-100 border border-black px-1.5 py-0.5">{c.status}</span>
                                </div>
                                <p className="text-xs font-bold opacity-70 line-clamp-1 truncate">{c.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default GovernmentDashboard;
