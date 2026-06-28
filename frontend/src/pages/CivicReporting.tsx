import React, { useState, useEffect } from 'react';
import { BauhausButton, BauhausCard, BauhausGrid, BauhausTag } from '../components/BauhausUI';
import { Camera, MapPin, CheckCircle2, ChevronRight, Filter, Navigation, Clock, List } from 'lucide-react';
import { db, storage, auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { reportsApi, usersApi } from '../lib/api';
import { toast } from 'react-toastify';

interface Report {
  id: string; category: string; description: string;
  photoUrl: string; status: string; createdAt: any;
  govtNotes?: string; address?: string; lat?: number; lng?: number; history?: any[];
}

const CivicReporting = () => {
  const [activeTab, setActiveTab] = useState<'all' | 'mine'>('all');
  const [reports, setReports] = useState<Report[]>([]);
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [isReporting, setIsReporting] = useState(false);
  const [newReport, setNewReport] = useState({
    category: 'Road',
    description: '',
    photo: null as File | null,
    address: '',
    lat: null as number | null,
    lng: null as number | null,
  });
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    if (auth.currentUser) {
      usersApi.get(auth.currentUser.uid)
        .then(res => {
          setUserRoles(res.data?.roles || []);
        })
        .catch(err => {
          console.error("Error loading user roles in CivicReporting:", err);
          setUserRoles([]);
        });
    } else {
      setUserRoles([]);
    }
  }, [auth.currentUser]);

  const handleMarkCompleted = async (reportId: string) => {
    setLoading(true);
    try {
      await reportsApi.updateStatus(reportId, {
        status: 'RESOLVED',
        govtNotes: 'Marked as completed by government official.',
        historyTitle: 'Issue completed and closed'
      });
      toast.success("Issue marked as Completed!");
      // Refresh reports list
      const response = await reportsApi.getAll();
      setReports(response.data.map((r: any) => ({
        ...r, id: r._id || r.id,
        createdAt: { toDate: () => new Date(r.createdAt) }
      })));
      if (auth.currentUser) fetchMyReports();
      setSelectedReport(null); // Close the detail modal
    } catch (err: any) {
      console.error("Error updating report status:", err);
      toast.error("Failed to mark as completed: " + (err.response?.data?.error || err.message));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      try {
        const response = await reportsApi.getAll();
        setReports(response.data.map((r: any) => ({
          ...r, id: r._id || r.id,
          createdAt: { toDate: () => new Date(r.createdAt) }
        })));
      } catch (err) { console.error("Error fetching reports from MongoDB:", err); }
    };
    fetchReports();
  }, []);

  useEffect(() => {
    if (auth.currentUser) fetchMyReports();
  }, [auth.currentUser]);

  const fetchMyReports = async () => {
    if (!auth.currentUser) return;
    try {
      const res = await reportsApi.getByUser(auth.currentUser.uid);
      setMyReports(res.data.map((r: any) => ({
        ...r, id: r._id || r.id,
        createdAt: { toDate: () => new Date(r.createdAt) }
      })));
    } catch (err) { console.error(err); }
  };

  const handleGetLocation = () => {
    setGeoLoading(true);
    if (!navigator.geolocation) { toast.info('Geolocation not supported.'); setGeoLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setNewReport(r => ({ ...r, lat: latitude, lng: longitude }));
        // Reverse geocode using nominatim (free, no key required)
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          if (data.display_name) setNewReport(r => ({ ...r, address: data.display_name }));
        } catch {}
        setGeoLoading(false);
      },
      (err) => { toast.error('Could not get location. Please type the address manually.'); setGeoLoading(false); }
    );
  };

  const getBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return toast.error("Please log in to report an issue.");
    if (newReport.description.trim().length < 20) {
      return toast.error("Description must be at least 20 characters.");
    }

    setLoading(true);
    try {
      let photoUrl = 'https://images.unsplash.com/photo-1515162816999-a0c47dc192f7?q=80&w=800&auto=format&fit=crop';
      if (newReport.photo) {
        try { photoUrl = await getBase64(newReport.photo); } catch (e) { console.warn("Base64 conversion failed", e); }
      }

      await reportsApi.create({
        userId: auth.currentUser.uid,
        category: newReport.category,
        description: newReport.description,
        photoUrl,
        address: newReport.address || undefined,
        lat: newReport.lat || undefined,
        lng: newReport.lng || undefined,
        status: 'SUBMITTED',
        history: [{ status: 'SUBMITTED', title: 'Report Filed', date: new Date() }]
      });

      setIsReporting(false);
      setNewReport({ category: 'Road', description: '', photo: null, address: '', lat: null, lng: null });
      const response = await reportsApi.getAll();
      setReports(response.data.map((r: any) => ({ ...r, id: r._id || r.id, createdAt: { toDate: () => new Date(r.createdAt) } })));
      fetchMyReports();
    } catch (error: any) {
      console.error("Failed to submit report to MongoDB:", error);
      toast.error(error.response?.data?.error || "Failed to submit report.");
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-bauhaus-yellow';
      case 'IN_PROGRESS': return 'bg-bauhaus-blue';
      case 'RESOLVED': return 'bg-green-600 text-white';
      default: return 'bg-gray-200';
    }
  };

  return (
    <div className="space-y-12 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 border-b-4 border-black pb-8">
        <div>
          <h1 className="bauhaus-header text-7xl uppercase">Civic System</h1>
          <p className="text-xl font-bold uppercase mt-2">MUNICIPAL TRANSPARENCY PIPELINE</p>
        </div>
        <BauhausButton variant="black" onClick={() => setIsReporting(true)}>REPORT NEW ISSUE +</BauhausButton>
      </div>

      {/* Tabs */}
      <div className="flex border-b-4 border-black">
        <button onClick={() => setActiveTab('all')}
          className={`flex-1 py-4 text-xl font-black uppercase transition-colors flex items-center justify-center gap-2 ${activeTab === 'all' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-bauhaus-yellow'}`}>
          <List size={18} /> ALL REPORTS
        </button>
        <button onClick={() => setActiveTab('mine')}
          className={`flex-1 py-4 text-xl font-black uppercase transition-colors flex items-center justify-center gap-2 ${activeTab === 'mine' ? 'bg-bauhaus-blue text-white' : 'bg-gray-100 hover:bg-bauhaus-yellow'}`}>
          <Clock size={18} /> MY REPORTS{myReports.length > 0 ? ` (${myReports.length})` : ''}
        </button>
      </div>

      {/* Reporting Modal/Form */}
      <AnimatePresence>
        {isReporting && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-white/90 flex items-center justify-center p-4 overflow-y-auto">
            <motion.div
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bauhaus-card w-full max-w-2xl bg-white relative my-8">
              <button onClick={() => setIsReporting(false)}
                className="absolute top-4 right-4 bg-black text-white p-2 hover:bg-bauhaus-red transition-colors z-10">
                CLOSE [X]
              </button>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                <h2 className="bauhaus-header text-4xl">FILE REPORT</h2>
                <div className="space-y-2">
                  <label className="font-black uppercase">Category</label>
                  <select value={newReport.category}
                    onChange={(e) => setNewReport({...newReport, category: e.target.value})}
                    className="w-full border-3 border-black p-3 font-bold uppercase appearance-none bg-bauhaus-yellow">
                    <option value="Road">Road (Pothole/Patch)</option>
                    <option value="Sanitation">Sanitation (Waste/Litter)</option>
                    <option value="Water">Water (Leakage/Supply)</option>
                    <option value="Electricity">Electricity (Streetlight/Wire)</option>
                    <option value="Park">Parks & Public Spaces</option>
                    <option value="Safety">Public Safety</option>
                  </select>
                </div>

                {/* Location */}
                <div className="space-y-2">
                  <label className="font-black uppercase flex items-center gap-2"><MapPin size={16} />Location / Address</label>
                  <div className="flex gap-2">
                    <input type="text" value={newReport.address}
                      onChange={e => setNewReport({ ...newReport, address: e.target.value })}
                      placeholder="ENTER ADDRESS OR USE GPS..."
                      className="flex-grow border-3 border-black p-3 font-bold uppercase focus:bg-bauhaus-yellow outline-none" />
                    <button type="button" onClick={handleGetLocation} disabled={geoLoading}
                      className="bg-bauhaus-blue text-white px-4 py-2 font-black uppercase text-xs flex items-center gap-2 border-3 border-black hover:bg-black transition-colors disabled:opacity-50">
                      <Navigation size={16} />{geoLoading ? '...' : 'GPS'}
                    </button>
                  </div>
                  {newReport.lat && newReport.lng && (
                    <div className="text-[10px] font-black uppercase text-green-600 flex items-center gap-1">
                      <CheckCircle2 size={12} /> GPS LOCKED: {newReport.lat.toFixed(4)}°N, {newReport.lng.toFixed(4)}°E
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  <label className="font-black uppercase">Description</label>
                  <textarea required minLength={20} value={newReport.description}
                    onChange={(e) => setNewReport({...newReport, description: e.target.value})}
                    placeholder="DESCRIBE THE ISSUE..."
                    className="w-full border-3 border-black p-3 font-bold uppercase min-h-[120px] focus:bg-bauhaus-secondary" />
                </div>

                <div className="space-y-2">
                  <label className="font-black uppercase">Upload Photo</label>
                  <div className="border-3 border-black border-dashed p-8 text-center bg-gray-50 relative">
                    <input type="file" accept="image/*"
                      onChange={(e) => setNewReport({...newReport, photo: e.target.files?.[0] || null})}
                      className="absolute inset-0 opacity-0 cursor-pointer" />
                    {newReport.photo ? (
                      <div className="text-xl font-black uppercase text-bauhaus-red">{newReport.photo.name} SELECTED</div>
                    ) : (
                      <div className="flex flex-col items-center gap-2"><Camera size={48} /><span className="font-bold uppercase">CLICK TO CAPTURE OR UPLOAD</span></div>
                    )}
                  </div>
                </div>

                <BauhausButton type="submit" variant="black" className="w-full text-2xl py-6" disabled={loading}>
                  {loading ? 'SUBMITTING...' : 'DEPLOY REPORT →'}
                </BauhausButton>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Detail Modal */}
      <AnimatePresence>
        {selectedReport && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedReport(null)}
          >
            <motion.div 
              initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
              className="w-full max-w-5xl bg-white border-4 border-black relative"
              onClick={e => e.stopPropagation()}
            >
              <button 
                onClick={() => setSelectedReport(null)}
                className="absolute top-0 right-[-4px] bg-black text-white p-4 hover:bg-bauhaus-red z-20 font-black"
              >
                EXIT [ESC]
              </button>

              <div className="grid grid-cols-1 lg:grid-cols-2">
                {/* Visual Left */}
                <div className="space-y-0">
                  <div className="aspect-video bg-black overflow-hidden border-b-4 border-black">
                    <img src={selectedReport.photoUrl} alt="Report" className="w-full h-full object-cover" />
                  </div>
                  <div className="p-8 space-y-6">
                    <h2 className="bauhaus-header text-5xl uppercase leading-none">{selectedReport.category}</h2>
                    <p className="text-xl font-medium uppercase tracking-tight">{selectedReport.description}</p>
                    
                    <div className="bg-bauhaus-yellow p-6 border-2 border-black">
                      <div className="text-[10px] font-black uppercase mb-4 tracking-widest opacity-50">STATUS HISTORY LOG</div>
                      <div className="space-y-4">
                        {(Array.isArray((selectedReport as any).history) ? (selectedReport as any).history : [
                          { status: 'SUBMITTED', title: 'Report filed by user', date: selectedReport.createdAt?.toDate() || new Date() },
                          { status: 'VERIFIED', title: 'Location verified by system', date: new Date() },
                          { status: selectedReport.status, title: 'Current processing state', date: new Date() }
                        ]).map((log: any, idx: number) => (
                          <div key={idx} className="flex gap-4 border-l-2 border-black pl-4">
                            <div>
                              <div className="text-[10px] font-black italic">{new Date(log.date).toLocaleDateString()}</div>
                              <div className="text-xs font-black uppercase">{log.status === 'RESOLVED' ? 'COMPLETED' : log.status} - {log.title}</div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Info Right */}
                <div className="border-l-4 border-black bg-gray-50 p-8 flex flex-col gap-8">
                  <div>
                    <div className="text-[10px] font-black uppercase mb-4 tracking-widest opacity-50">LOCATION COORDINATES [FIX]</div>
                    <div className="aspect-square bg-white border-2 border-black relative overflow-hidden group">
                       {/* Mock Map UI */}
                       <div className="absolute inset-0 bg-[#E0E0E0] grid grid-cols-10 grid-rows-10 opacity-20">
                          {Array.from({length: 100}).map((_, i) => <div key={i} className="border-[0.5px] border-black/10"></div>)}
                       </div>
                       <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
                          <MapPin size={48} className="text-bauhaus-red animate-bounce" />
                       </div>
                       <div className="absolute bottom-4 left-4 bg-black text-white p-2 text-[10px] font-black uppercase">
                          18.5204° N, 73.8567° E
                       </div>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="text-[10px] font-black uppercase tracking-widest opacity-50">GOVERNMENT INTERVENTION</div>
                    {selectedReport.govtNotes ? (
                      <div className="border-2 border-black p-4 bg-bauhaus-blue text-white">
                        <div className="text-xl font-bold uppercase">{selectedReport.govtNotes}</div>
                      </div>
                    ) : (
                      <div className="border-2 border-black p-4 italic opacity-50 font-bold uppercase">
                        Awaiting departmental review...
                      </div>
                    )}
                    {(userRoles.includes('govt') || userRoles.includes('admin')) && selectedReport.status !== 'RESOLVED' && (
                      <BauhausButton 
                        variant="black" 
                        className="w-full mt-2" 
                        onClick={() => handleMarkCompleted(selectedReport.id)}
                        disabled={loading}
                      >
                        MARK AS COMPLETED
                      </BauhausButton>
                    )}
                  </div>

                  <BauhausButton variant="black" className="mt-auto w-full" onClick={() => {
                    const url = `${window.location.origin}/civic`;
                    if (navigator.share) {
                      navigator.share({ title: `SEWA Civic Report: ${selectedReport?.category}`, url }).catch(() => {});
                    } else {
                      navigator.clipboard.writeText(url).then(() => toast.success('Link copied to clipboard!')).catch(() => {});
                    }
                  }}>SHARE GRID STATUS →</BauhausButton>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* MY REPORTS TAB */}
      {activeTab === 'mine' && (
        <div className="space-y-8">
          {!auth.currentUser ? (
            <div className="p-16 border-4 border-dashed border-black text-center opacity-40">
              <MapPin size={48} className="mx-auto mb-4" />
              <div className="text-2xl font-black uppercase">Login to view your reports</div>
            </div>
          ) : myReports.length === 0 ? (
            <div className="text-center py-24 border-4 border-black bg-gray-50">
              <h2 className="bauhaus-header text-4xl opacity-20">NO REPORTS YET</h2>
              <BauhausButton variant="black" className="mt-6" onClick={() => setIsReporting(true)}>REPORT AN ISSUE →</BauhausButton>
            </div>
          ) : (
            <div className="space-y-0 border-t-2 border-l-2 border-black">
              {myReports.map((report) => (
                <div key={report.id} className="border-b-2 border-r-2 border-black flex flex-col md:flex-row group">
                  <div className="w-full md:w-48 aspect-video relative bg-black overflow-hidden shrink-0">
                    <img src={report.photoUrl} alt={report.category} className="w-full h-full object-cover grayscale brightness-50 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-500" />
                    <BauhausTag color={getStatusColor(report.status)} className="absolute top-2 left-2 z-10 text-[8px]">{report.status === 'RESOLVED' ? 'COMPLETED' : report.status}</BauhausTag>
                  </div>
                  <div className="flex-grow p-6 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-2xl font-black uppercase">{report.category}</h3>
                      </div>
                      <p className="font-bold uppercase opacity-70 line-clamp-2 text-sm">{report.description}</p>
                      {report.address && <div className="text-[10px] font-black uppercase opacity-40 mt-1 flex items-center gap-1"><MapPin size={10} />{report.address.substring(0, 60)}...</div>}
                      {report.govtNotes && (
                        <div className="bg-bauhaus-yellow p-3 border-2 border-black mt-3">
                          <div className="text-[10px] font-black uppercase mb-1">GOVT NOTE:</div>
                          <div className="font-bold text-sm">{report.govtNotes}</div>
                        </div>
                      )}
                    </div>
                    {/* History Timeline */}
                    {report.history && report.history.length > 0 && (
                      <div className="mt-4 pt-4 border-t-2 border-black/10">
                        <div className="text-[9px] font-black uppercase opacity-40 mb-2">STATUS HISTORY</div>
                        <div className="flex gap-3 overflow-x-auto">
                          {report.history.map((h: any, i: number) => (
                            <div key={i} className="shrink-0 flex flex-col items-center gap-1">
                              <div className={`w-3 h-3 rounded-full border-2 border-black ${h.status === 'RESOLVED' ? 'bg-green-600' : h.status === 'IN_PROGRESS' ? 'bg-bauhaus-blue' : 'bg-bauhaus-yellow'}`} />
                              <div className="text-[8px] font-black uppercase text-center whitespace-nowrap opacity-60">{h.status === 'RESOLVED' ? 'COMPLETED' : h.status.replace('_', ' ')}</div>
                              <div className="text-[7px] font-bold opacity-40">{new Date(h.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-4 border-t-2 md:border-t-0 md:border-l-2 border-black flex items-center">
                    <button onClick={() => setSelectedReport(report)}
                      className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors">
                      <ChevronRight />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ALL REPORTS GRID */}
      {activeTab === 'all' && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-0 border-t-2 border-l-2 border-black">
            {reports.map((report) => (
              <div key={report.id} className="border-b-2 border-r-2 border-black flex flex-col md:flex-row h-full group">
                <div className="w-full md:w-1/2 aspect-square relative bg-black overflow-hidden">
                   <img src={report.photoUrl} alt={report.category}
                    className="w-full h-full object-cover grayscale brightness-50 group-hover:grayscale-0 group-hover:brightness-100 transition-all duration-500" />
                    <BauhausTag color={getStatusColor(report.status)} className="absolute top-4 left-4 z-10">{report.status === 'RESOLVED' ? 'COMPLETED' : report.status.replace('_', ' ')}</BauhausTag>
                   <div className="absolute bottom-4 left-4 z-10 bg-black text-white px-2 py-1 flex items-center gap-2 font-black">
                     <MapPin size={16} /> {(report as any).address ? (report as any).address.split(',')[0] : 'REPORTED LOCATION'}
                   </div>
                </div>
                <div className="w-full md:w-1/2 p-6 flex flex-col justify-between">
                  <div>
                    <div className="text-xs font-black uppercase opacity-50 mb-2">{report.createdAt?.toDate()?.toLocaleDateString() || 'JUST NOW'}</div>
                    <h3 className="text-3xl font-black uppercase leading-tight mb-4">{report.category}</h3>
                    <p className="font-medium text-lg mb-6 leading-tight uppercase line-clamp-3">{report.description}</p>
                  </div>
                  {report.govtNotes && (
                    <div className="bg-bauhaus-yellow p-4 border-2 border-black mb-4">
                       <div className="text-xs font-black uppercase mb-1">GOVT NOTE:</div>
                       <div className="font-bold">{report.govtNotes}</div>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t-2 border-black pt-4">
                     {report.status === 'RESOLVED' ? (
                       <span className="flex items-center gap-2 font-black text-green-600"><CheckCircle2 /> COMPLETED</span>
                     ) : (
                       <span className="font-black opacity-50 uppercase italic">AWAITING ACTION</span>
                     )}
                     <button onClick={() => setSelectedReport(report)}
                      className="p-2 border-2 border-black hover:bg-black hover:text-white transition-colors">
                        <ChevronRight />
                     </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {reports.length === 0 && !loading && (
            <div className="text-center py-24 border-4 border-black bg-gray-50">
              <h2 className="bauhaus-header text-4xl opacity-20">NO REPORTS FILED IN THIS GRID</h2>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default CivicReporting;
