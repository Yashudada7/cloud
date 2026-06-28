import React, { useState, useEffect } from 'react';
import { BauhausButton } from '../components/BauhausUI';
import {
  Users, MapPin, Calendar, Clock, CheckCircle2, XCircle,
  Droplets, HeartHandshake, Search, Filter, Send, ArrowRight, MessageCircle, X
} from 'lucide-react';
import { auth } from '../lib/firebase';
import { usersApi, volunteerEventsApi, volunteerApplicationsApi } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import NGOChat from '../components/NGOChat';
import { toast } from 'react-toastify';

interface VolunteerEvent {
  _id: string; ngoId: string; ngoName: string; title: string; description: string;
  location: string; date: string; requiredVolunteers: number; currentVolunteers: number;
  skills: string[]; eventType: string; status: string;
}

interface MyApplication {
  _id: string; eventId: any; userId: string; status: 'PENDING' | 'APPROVED' | 'REJECTED';
  appliedAt: string; event?: VolunteerEvent;
}

const STATUS_UI: Record<string, { bg: string; label: string; icon: React.ReactNode }> = {
  PENDING:  { bg: 'bg-bauhaus-yellow text-black', label: 'PENDING', icon: <Clock size={14} /> },
  APPROVED: { bg: 'bg-green-600 text-white', label: 'APPROVED', icon: <CheckCircle2 size={14} /> },
  REJECTED: { bg: 'bg-bauhaus-red text-white', label: 'REJECTED', icon: <XCircle size={14} /> },
};

const VolunteerOpportunities = () => {
  const [allEvents, setAllEvents] = useState<VolunteerEvent[]>([]);
  const [bloodCamps, setBloodCamps] = useState<VolunteerEvent[]>([]);
  const [myApplications, setMyApplications] = useState<MyApplication[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [applyModal, setApplyModal] = useState<VolunteerEvent | null>(null);
  const [applyMessage, setApplyMessage] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'blood_camps' | 'my_applications'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState<'ALL' | 'VOLUNTEER' | 'BLOOD_CAMP'>('ALL');
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState('');
  const [chatNgo, setChatNgo] = useState<{ id: string; name: string } | null>(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      if (auth.currentUser) {
        const uid = auth.currentUser.uid;
        setUserId(uid);
        const [userRes, eventsRes, campsRes, appsRes] = await Promise.all([
          usersApi.get(uid).catch(() => null),
          volunteerEventsApi.getAll('VOLUNTEER'),
          volunteerEventsApi.getAll('BLOOD_CAMP'),
          volunteerApplicationsApi.getByUser(uid),
        ]);
        setUserName(userRes?.data?.name || auth.currentUser.displayName || 'Volunteer');
        setAllEvents(eventsRes.data);
        setBloodCamps(campsRes.data);
        setMyApplications(appsRes.data);
      } else {
        const [eventsRes, campsRes] = await Promise.all([
          volunteerEventsApi.getAll('VOLUNTEER'),
          volunteerEventsApi.getAll('BLOOD_CAMP'),
        ]);
        setAllEvents(eventsRes.data);
        setBloodCamps(campsRes.data);
      }
    } catch (err) {
      console.error('Error loading volunteer data:', err);
    } finally {
      setLoading(false);
    }
  };

  const hasApplied = (eventId: string) => myApplications.some(a => a.eventId === eventId || a.eventId?._id === eventId);
  const applicationStatus = (eventId: string) => {
    const app = myApplications.find(a => a.eventId === eventId || a.eventId?._id === eventId);
    return app?.status;
  };

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !applyModal) return;
    setApplyingId(applyModal._id);
    try {
      await volunteerApplicationsApi.create({
        eventId: applyModal._id,
        ngoId: applyModal.ngoId,
        userId: auth.currentUser.uid,
        userName: userName,
        userEmail: auth.currentUser.email,
        message: applyMessage,
      });
      setApplyModal(null);
      setApplyMessage('');
      await loadData();
      toast.success('Application submitted! The NGO will review and respond soon.');
    } catch (err: any) {
      if (err?.response?.status === 400) toast.info('You have already applied for this event!');
      else { console.error(err); toast.error('Failed to apply.'); }
    } finally {
      setApplyingId(null);
    }
  };

  const combined = [...allEvents, ...bloodCamps];
  const filtered = combined.filter(e => {
    if (searchTerm && !e.title.toLowerCase().includes(searchTerm.toLowerCase()) && !e.ngoName.toLowerCase().includes(searchTerm.toLowerCase())) return false;
    if (filterType !== 'ALL' && e.eventType !== filterType) return false;
    return true;
  });

  if (loading) return <div className="p-24 text-center bauhaus-header text-4xl animate-pulse">LOADING OPPORTUNITIES...</div>;

  const renderEventCard = (evt: VolunteerEvent) => {
    const applied = hasApplied(evt._id);
    const appStatus = applicationStatus(evt._id);
    const progress = Math.min(100, (evt.currentVolunteers / evt.requiredVolunteers) * 100);
    const isFull = evt.currentVolunteers >= evt.requiredVolunteers;
    const isBloodCamp = evt.eventType === 'BLOOD_CAMP';

    return (
      <motion.div key={evt._id} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
        className={`border-4 ${isBloodCamp ? 'border-bauhaus-red' : 'border-black'} bg-white flex flex-col hover:-translate-y-1 transition-transform ${isBloodCamp ? 'shadow-[8px_8px_0px_0px_#e63946]' : 'shadow-[8px_8px_0px_0px_black]'}`}>
        <div className={`p-4 border-b-4 ${isBloodCamp ? 'border-bauhaus-red bg-bauhaus-red text-white' : 'border-black bg-bauhaus-yellow'} flex justify-between items-center`}>
          <div className="flex items-center gap-2 text-[10px] font-black uppercase">
            {isBloodCamp ? <Droplets size={14} /> : <Users size={14} />}
            {isBloodCamp ? 'BLOOD DONATION CAMP' : 'VOLUNTEER EVENT'}
          </div>
          <div className={`text-[9px] font-black uppercase px-2 py-1 ${isBloodCamp ? 'bg-white text-bauhaus-red' : 'bg-black text-white'}`}>
            {evt.status}
          </div>
        </div>
        <div className="p-6 flex-grow space-y-4">
          <h3 className="text-xl font-black uppercase leading-tight">{evt.title}</h3>
          <div className="text-xs font-black uppercase text-bauhaus-blue">{evt.ngoName}</div>
          <p className="text-sm font-bold opacity-70 line-clamp-2">{evt.description}</p>
          <div className="grid grid-cols-2 gap-2 text-xs font-black uppercase">
            <div className="flex items-center gap-1 opacity-60"><MapPin size={12} />{evt.location}</div>
            <div className="flex items-center gap-1 opacity-60"><Calendar size={12} />{new Date(evt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
          </div>
          {evt.skills?.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {evt.skills.slice(0, 4).map((s, i) => (
                <span key={i} className="text-[8px] font-black uppercase bg-gray-100 border border-black px-2 py-0.5">{s}</span>
              ))}
            </div>
          )}
          <div className="space-y-1">
            <div className="flex justify-between text-[10px] font-black uppercase">
              <span>{isBloodCamp ? 'Donors Registered' : 'Volunteers'}</span>
              <span>{evt.currentVolunteers}/{evt.requiredVolunteers}</span>
            </div>
            <div className="h-2 border-2 border-black bg-gray-100 overflow-hidden">
              <motion.div initial={{ width: 0 }} whileInView={{ width: `${progress}%` }} transition={{ duration: 1 }}
                className={`h-full ${isFull ? 'bg-bauhaus-red' : isBloodCamp ? 'bg-bauhaus-red' : 'bg-bauhaus-blue'}`} />
            </div>
          </div>
        </div>
        <div className="p-4 border-t-4 border-black bg-gray-50">
          {applied && appStatus ? (
            <div className={`flex items-center justify-center gap-2 py-3 font-black uppercase text-sm ${STATUS_UI[appStatus]?.bg}`}>
              {STATUS_UI[appStatus]?.icon} {STATUS_UI[appStatus]?.label}
            </div>
          ) : isFull ? (
            <div className="py-3 font-black uppercase text-sm text-center opacity-40 border-2 border-dashed border-black">SLOTS FULL</div>
          ) : !auth.currentUser ? (
            <div className="py-3 font-black uppercase text-sm text-center opacity-40 border-2 border-dashed border-black">LOGIN TO APPLY</div>
          ) : (
            <button onClick={() => { setApplyModal(evt); setApplyMessage(''); }}
              className="w-full py-3 bg-black text-white font-black uppercase text-sm flex items-center justify-center gap-2 hover:bg-bauhaus-blue transition-colors border-2 border-black">
              {isBloodCamp ? <Droplets size={16} /> : <HeartHandshake size={16} />}
              {isBloodCamp ? 'REGISTER TO DONATE' : 'APPLY TO VOLUNTEER'}
            </button>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="space-y-16 pb-24">
      {/* Hero */}
      <div className="bg-black text-white p-12 md:p-20 border-4 border-black relative overflow-hidden">
        <div className="absolute -right-20 -bottom-20 opacity-5"><Users size={400} /></div>
        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="bg-bauhaus-yellow text-black text-[10px] font-black px-3 py-1 uppercase inline-block tracking-widest">VOLUNTEER NETWORK</div>
          <h1 className="bauhaus-header text-7xl md:text-9xl leading-none">STEP UP.<br/>SHOW UP.</h1>
          <p className="text-xl font-bold uppercase opacity-70 max-w-xl">Find NGO-led volunteer opportunities and blood donation camps. Apply, get approved, make impact.</p>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 border-4 border-black divide-x-4 divide-black">
        {[
          { val: allEvents.length, label: 'Volunteer Events' },
          { val: bloodCamps.length, label: 'Blood Camps' },
          { val: myApplications.length, label: 'My Applications' },
        ].map((s, i) => (
          <div key={i} className="p-8 text-center">
            <div className="text-5xl font-black">{s.val}</div>
            <div className="text-[10px] font-black uppercase opacity-40 mt-1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b-4 border-black">
        {[
          { id: 'all', label: `ALL OPPORTUNITIES (${combined.length})`, activeColor: 'bg-black text-white' },
          { id: 'blood_camps', label: `BLOOD CAMPS (${bloodCamps.length})`, activeColor: 'bg-bauhaus-red text-white' },
          { id: 'my_applications', label: `MY APPLICATIONS (${myApplications.length})`, activeColor: 'bg-bauhaus-blue text-white' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`flex-1 py-4 text-sm font-black uppercase transition-colors ${activeTab === tab.id ? tab.activeColor : 'bg-gray-100 hover:bg-bauhaus-yellow'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* All / Blood Camps */}
      {(activeTab === 'all' || activeTab === 'blood_camps') && (
        <div className="space-y-8">
          {/* Search & Filter */}
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-grow relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 opacity-50" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="SEARCH EVENTS OR NGOs..."
                className="w-full border-4 border-black p-4 pl-12 font-bold focus:bg-bauhaus-yellow outline-none" />
            </div>
            {activeTab === 'all' && (
              <div className="flex gap-2">
                {(['ALL', 'VOLUNTEER', 'BLOOD_CAMP'] as const).map(t => (
                  <button key={t} onClick={() => setFilterType(t)}
                    className={`px-4 py-2 font-black uppercase text-xs border-2 border-black transition-colors ${filterType === t ? 'bg-black text-white' : 'bg-white hover:bg-bauhaus-yellow'}`}>
                    {t === 'BLOOD_CAMP' ? 'BLOOD' : t}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {(activeTab === 'blood_camps' ? bloodCamps : filtered).map(evt => renderEventCard(evt))}
            {(activeTab === 'blood_camps' ? bloodCamps : filtered).length === 0 && (
              <div className="col-span-full p-16 border-4 border-dashed border-black text-center opacity-40">
                <Users size={48} className="mx-auto mb-4" />
                <div className="text-2xl font-black uppercase">No Events Found</div>
                <p className="font-bold uppercase mt-2">Check back later or adjust your search filters.</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* My Applications */}
      {activeTab === 'my_applications' && (
        <div className="space-y-6">
          {!auth.currentUser ? (
            <div className="p-16 border-4 border-dashed border-black text-center opacity-40">
              <Users size={48} className="mx-auto mb-4" />
              <div className="text-2xl font-black uppercase">Please Login to View Applications</div>
            </div>
          ) : myApplications.length === 0 ? (
            <div className="p-16 border-4 border-dashed border-black text-center opacity-40">
              <HeartHandshake size={48} className="mx-auto mb-4" />
              <div className="text-2xl font-black uppercase">No Applications Yet</div>
              <p className="font-bold uppercase mt-2">Browse events and apply to volunteer with NGOs!</p>
              <BauhausButton variant="black" className="mt-6" onClick={() => setActiveTab('all')}>
                BROWSE EVENTS →
              </BauhausButton>
            </div>
          ) : (
            <div className="space-y-0 border-t-2 border-l-2 border-black">
              {myApplications.map((app, i) => {
                const st = STATUS_UI[app.status] || STATUS_UI['PENDING'];
                const evtData = app.event;
                return (
                  <motion.div key={app._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="border-b-2 border-r-2 border-black p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    <div className="flex-grow">
                      <h3 className="font-black uppercase text-lg">{evtData?.title || 'Event'}</h3>
                      <div className="text-xs font-bold opacity-60 mt-1">{evtData?.ngoName || 'NGO'}</div>
                      {evtData && (
                        <div className="flex flex-wrap gap-4 text-[10px] font-black uppercase opacity-50 mt-2">
                          <span className="flex items-center gap-1"><MapPin size={10} />{evtData.location}</span>
                          <span className="flex items-center gap-1"><Calendar size={10} />{new Date(evtData.date).toLocaleDateString('en-IN')}</span>
                          <span className={`text-[8px] px-2 py-0.5 ${evtData.eventType === 'BLOOD_CAMP' ? 'bg-bauhaus-red text-white' : 'bg-bauhaus-yellow text-black'}`}>
                            {evtData.eventType === 'BLOOD_CAMP' ? 'BLOOD CAMP' : 'VOLUNTEER'}
                          </span>
                        </div>
                      )}
                      <div className="text-[9px] font-black uppercase opacity-30 mt-2">
                        Applied: {new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                    </div>
                     <div className="flex flex-col gap-2">
                       <div className={`flex items-center gap-2 px-4 py-2 font-black uppercase text-sm ${st.bg}`}>
                         {st.icon} {st.label}
                       </div>
                       {app.status === 'APPROVED' && app.eventId?.ngoId && (
                         <button
                           onClick={() => setChatNgo({ id: app.eventId?.ngoId || '', name: evtData?.ngoName || 'NGO Chat' })}
                           className="flex items-center gap-2 px-4 py-2 font-black uppercase text-xs bg-black text-white hover:bg-bauhaus-blue transition-colors border-2 border-black"
                         >
                           <MessageCircle size={14} /> JOIN NGO CHAT
                         </button>
                       )}
                     </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* NGO Chat Overlay */}
      <AnimatePresence>
        {chatNgo && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[200] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setChatNgo(null)}
          >
            <motion.div
              initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg h-[600px] flex flex-col relative"
              onClick={e => e.stopPropagation()}
            >
              <button
                onClick={() => setChatNgo(null)}
                className="absolute -top-10 right-0 bg-white text-black p-2 font-black uppercase text-xs flex items-center gap-1 border-2 border-white hover:bg-bauhaus-red hover:text-white transition-colors z-10"
              >
                <X size={14} /> CLOSE CHAT
              </button>
              <NGOChat
                ngoId={chatNgo.id}
                ngoName={chatNgo.name}
                userName={userName || auth.currentUser?.displayName || 'Volunteer'}
                isAdmin={false}
                onClose={() => setChatNgo(null)}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Apply Modal */}
      <AnimatePresence>
        {applyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 flex items-center justify-center p-4"
            onClick={() => setApplyModal(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-xl bg-white border-4 border-black shadow-[16px_16px_0px_0px_black]"
              onClick={e => e.stopPropagation()}>
              <div className={`p-8 border-b-4 border-black ${applyModal.eventType === 'BLOOD_CAMP' ? 'bg-bauhaus-red text-white' : 'bg-bauhaus-yellow'}`}>
                <div className="text-[10px] font-black uppercase opacity-70 mb-2">{applyModal.ngoName}</div>
                <h2 className="bauhaus-header text-4xl uppercase">{applyModal.title}</h2>
                <div className="flex flex-wrap gap-4 text-xs font-black uppercase mt-2 opacity-80">
                  <span className="flex items-center gap-1"><MapPin size={12} />{applyModal.location}</span>
                  <span className="flex items-center gap-1"><Calendar size={12} />{new Date(applyModal.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
              <form onSubmit={handleApply} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">
                    {applyModal.eventType === 'BLOOD_CAMP' ? 'MESSAGE TO ORGANIZER (OPTIONAL)' : 'WHY DO YOU WANT TO VOLUNTEER? (OPTIONAL)'}
                  </label>
                  <textarea value={applyMessage} onChange={e => setApplyMessage(e.target.value)}
                    className="w-full border-4 border-black p-4 font-bold outline-none min-h-[100px] focus:bg-gray-50 resize-none text-sm"
                    placeholder={applyModal.eventType === 'BLOOD_CAMP' ? 'Any medical conditions or notes for the organizer...' : 'Describe your motivation, relevant experience, and skills...'} />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setApplyModal(null)}
                    className="flex-1 py-3 border-4 border-black font-black uppercase hover:bg-gray-100 transition-colors">
                    CANCEL
                  </button>
                  <button type="submit" disabled={!!applyingId}
                    className={`flex-1 py-3 font-black uppercase text-white flex items-center justify-center gap-2 border-4 border-black disabled:opacity-50 transition-colors ${applyModal.eventType === 'BLOOD_CAMP' ? 'bg-bauhaus-red hover:bg-red-700' : 'bg-black hover:bg-bauhaus-blue'}`}>
                    <Send size={16} />
                    {applyingId ? 'SUBMITTING...' : applyModal.eventType === 'BLOOD_CAMP' ? 'CONFIRM REGISTRATION' : 'SUBMIT APPLICATION'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default VolunteerOpportunities;
