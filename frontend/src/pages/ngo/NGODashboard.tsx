import React, { useState, useEffect } from 'react';
import { BauhausButton } from '../../components/BauhausUI';
import {
  Users, MapPin, Trash, X, CheckCircle2, XCircle,
  Clock, Mail, UserCheck, PlusCircle, PawPrint,
  AlertTriangle, Truck, HeartHandshake, RefreshCw,
  Droplets, MessageCircle, ShieldOff, LocateFixed, Loader2,
  UserX, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../../lib/firebase';
import { volunteerEventsApi, volunteerApplicationsApi, animalCasesApi, adoptionsApi, usersApi, reportsApi } from '../../lib/api';
import NGOChat from '../../components/NGOChat';
import { toast } from 'react-toastify';

interface VolunteerEvent {
  _id: string; title: string; description: string; location: string;
  date: string; requiredVolunteers: number; currentVolunteers: number;
  skills: string[]; status: string; eventType: string;
}

interface Application {
  _id: string; userId: string; userName: string; userEmail: string;
  status: 'PENDING' | 'APPROVED' | 'REJECTED'; appliedAt: string; message?: string;
}

interface AnimalCase {
  _id: string; animalType: string; description: string; photoUrl: string;
  status: string; ngoId?: string; ngoName?: string; rescuedAt?: string; createdAt: string;
}

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-bauhaus-yellow text-black',
  APPROVED: 'bg-green-600 text-white',
  REJECTED: 'bg-bauhaus-red text-white',
};

const ANIMAL_STATUS_STYLES: Record<string, { bg: string; label: string; icon: React.ReactNode }> = {
  OPEN:     { bg: 'bg-bauhaus-red text-white animate-pulse', label: 'OPEN ALERT', icon: <AlertTriangle size={14} /> },
  EN_ROUTE: { bg: 'bg-bauhaus-blue text-white', label: 'EN ROUTE', icon: <Truck size={14} /> },
  RESCUED:  { bg: 'bg-green-600 text-white', label: 'RESCUED', icon: <CheckCircle2 size={14} /> },
  ADOPTED:  { bg: 'bg-black text-white', label: 'ADOPTED', icon: <HeartHandshake size={14} /> },
};

type Tab = 'events' | 'blood_camps' | 'rescue' | 'chat';

const NGODashboard = () => {
  const [activeTab, setActiveTab] = useState<Tab>('events');
  const [events, setEvents] = useState<VolunteerEvent[]>([]);
  const [bloodCamps, setBloodCamps] = useState<VolunteerEvent[]>([]);
  const [animalCases, setAnimalCases] = useState<AnimalCase[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [creatingType, setCreatingType] = useState<'VOLUNTEER' | 'BLOOD_CAMP'>('VOLUNTEER');
  const [loading, setLoading] = useState(true);
  const [rescueLoading, setRescueLoading] = useState(false);
  const [updatingCaseId, setUpdatingCaseId] = useState<string | null>(null);
  const [isNgo, setIsNgo] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [ngoName, setNgoName] = useState('');
  const [ngoId, setNgoId] = useState('');
  const [blockedUsers, setBlockedUsers] = useState<string[]>([]);
  const [selectedUserUid, setSelectedUserUid] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [selectedUserLoading, setSelectedUserLoading] = useState(false);
  const [userCases, setUserCases] = useState<AnimalCase[]>([]);
  const [userReports, setUserReports] = useState<any[]>([]);
  const [userPostsLoading, setUserPostsLoading] = useState(false);

  // Application modal
  const [selectedEvent, setSelectedEvent] = useState<VolunteerEvent | null>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [appsLoading, setAppsLoading] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // Adopt listing modal
  const [rescuedCase, setRescuedCase] = useState<AnimalCase | null>(null);
  const [adoptForm, setAdoptForm] = useState({ animalName: '', breed: '', age: '', description: '' });
  const [adoptLoading, setAdoptLoading] = useState(false);

  const [newEvent, setNewEvent] = useState({
    title: '', description: '', location: '', date: '',
    requiredVolunteers: 10, skills: '',
    capacity: 50, // For blood camps
    lat: undefined as number | undefined,
    lng: undefined as number | undefined,
  });
  const [geoLoading, setGeoLoading] = useState(false);

  useEffect(() => { checkRoleAndLoad(); }, []);

  const checkRoleAndLoad = async () => {
    if (!auth.currentUser) { setLoading(false); return; }
    try {
      const userRes = await usersApi.get(auth.currentUser.uid);
      const roles: string[] = userRes.data?.roles || [];
      const name = userRes.data?.name || auth.currentUser.displayName || 'Verified NGO';
      const verified = userRes.data?.isVerified || false;
      setNgoName(name);
      setIsVerified(verified || roles.includes('admin'));
      setNgoId(auth.currentUser.uid);
      setBlockedUsers(userRes.data?.blockedUsers || []);
      if (roles.includes('ngo') || roles.includes('admin')) {
        setIsNgo(true);
        if (verified || roles.includes('admin')) {
          fetchEvents();
          fetchBloodCamps();
          fetchAnimalCases();
        }
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('Error checking NGO role:', err);
      setLoading(false);
    }
  };

  const fetchEvents = async () => {
    try {
      const res = await volunteerEventsApi.getAll('VOLUNTEER');
      if (auth.currentUser)
        setEvents(res.data.filter((e: any) => e.ngoId === auth.currentUser?.uid));
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const fetchBloodCamps = async () => {
    try {
      const res = await volunteerEventsApi.getAll('BLOOD_CAMP');
      if (auth.currentUser)
        setBloodCamps(res.data.filter((e: any) => e.ngoId === auth.currentUser?.uid));
    } catch (err) { console.error(err); }
  };

  const fetchAnimalCases = async () => {
    setRescueLoading(true);
    try {
      const res = await animalCasesApi.getAll();
      setAnimalCases(res.data.map((c: any) => ({ ...c, id: c._id || c.id })));
    } catch (err) { console.error(err); }
    finally { setRescueLoading(false); }
  };

  const handleCaseStatus = async (caseId: string, status: string) => {
    setUpdatingCaseId(caseId);
    try {
      await animalCasesApi.updateStatus(caseId, {
        status,
        ngoId: auth.currentUser?.uid,
        ngoName: ngoName || 'NGO Partner',
      });
      await fetchAnimalCases();
      // If we are viewing a user's details, refresh their cases list too!
      if (selectedUserUid) {
        const casesRes = await animalCasesApi.getByUser(selectedUserUid);
        setUserCases(casesRes.data.map((c: any) => ({ ...c, id: c._id || c.id })));
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to update case status.');
    } finally {
      setUpdatingCaseId(null);
    }
  };

  const handlePostAdoption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !rescuedCase) return;
    setAdoptLoading(true);
    try {
      await adoptionsApi.create({
        ngoId: auth.currentUser.uid,
        ngoName: ngoName || 'Verified NGO',
        animalName: adoptForm.animalName,
        animalType: rescuedCase.animalType,
        breed: adoptForm.breed,
        age: adoptForm.age,
        description: adoptForm.description,
        photoUrl: rescuedCase.photoUrl,
        status: 'AVAILABLE',
      });
      await animalCasesApi.updateStatus(rescuedCase._id, {
        status: 'ADOPTED',
        ngoId: auth.currentUser.uid,
        ngoName: ngoName || 'NGO Partner',
      });
      setRescuedCase(null);
      setAdoptForm({ animalName: '', breed: '', age: '', description: '' });
      fetchAnimalCases();
      toast.success('Adoption listing published!');
    } catch (err) {
      console.error(err);
      toast.error('Failed to create adoption listing.');
    } finally {
      setAdoptLoading(false);
    }
  };

  const openApplications = async (evt: VolunteerEvent) => {
    setSelectedEvent(evt);
    setAppsLoading(true);
    try {
      const res = await volunteerApplicationsApi.getByEvent(evt._id);
      setApplications(res.data);
    } catch (err) { console.error(err); toast.error('Failed to load applications.'); }
    finally { setAppsLoading(false); }
  };

  const handleUpdateAppStatus = async (appId: string, status: 'APPROVED' | 'REJECTED' | 'PENDING') => {
    setUpdatingId(appId);
    try {
      await volunteerApplicationsApi.updateStatus(appId, status);
      setApplications(prev => prev.map(a => a._id === appId ? { ...a, status } : a));
      fetchEvents();
    } catch (err) { console.error(err); toast.error('Failed to update application status.'); }
    finally { setUpdatingId(null); }
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return toast.error('You must be logged in as an NGO.');
    try {
      await volunteerEventsApi.create({
        ngoId: auth.currentUser.uid,
        ngoName: ngoName || 'Verified NGO',
        ...newEvent,
        eventType: creatingType,
        skills: newEvent.skills.split(',').map(s => s.trim()).filter(Boolean),
        requiredVolunteers: creatingType === 'BLOOD_CAMP' ? newEvent.capacity : newEvent.requiredVolunteers,
      });
      setIsCreating(false);
      setNewEvent({ title: '', description: '', location: '', date: '', requiredVolunteers: 10, skills: '', capacity: 50, lat: undefined, lng: undefined });
      if (creatingType === 'VOLUNTEER') fetchEvents();
      else fetchBloodCamps();
      toast.success(creatingType === 'BLOOD_CAMP' ? 'Blood camp scheduled!' : 'Event published!');
    } catch (err) { console.error(err); toast.error('Failed to create event.'); }
  };

  const handleDeleteEvent = async (eventId: string, eventType: 'VOLUNTEER' | 'BLOOD_CAMP') => {
    if (!window.confirm('Are you sure you want to delete this event? This cannot be undone.')) return;
    try {
      await volunteerEventsApi.delete(eventId);
      toast.success('Event deleted.');
      if (eventType === 'VOLUNTEER') fetchEvents();
      else fetchBloodCamps();
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete event.');
    }
  };

  const useMyLocation = () => {
    if (!navigator.geolocation) return toast.error('Geolocation not supported by your browser.');
    setGeoLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const address = data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setNewEvent(prev => ({ ...prev, location: address, lat: latitude, lng: longitude }));
          toast.success('Location detected!');
        } catch {
          // Fallback to raw coordinates if reverse-geocode fails
          setNewEvent(prev => ({
            ...prev,
            location: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
            lat: latitude, lng: longitude
          }));
          toast.success('Coordinates captured (address lookup failed).');
        } finally { setGeoLoading(false); }
      },
      (err) => {
        setGeoLoading(false);
        toast.error(err.code === 1 ? 'Location access denied. Please allow location access.' : 'Could not detect location.');
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
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
      setUserCases(casesRes.data.map((c: any) => ({ ...c, id: c._id || c.id })));
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

  const openCases = animalCases.filter(c => c.status === 'OPEN');
  const myCases = animalCases.filter(c => c.ngoId === auth.currentUser?.uid && c.status !== 'OPEN');
  const pendingCount = applications.filter(a => a.status === 'PENDING').length;
  const approvedCount = applications.filter(a => a.status === 'APPROVED').length;

  if (loading) return <div className="p-24 text-center bauhaus-header text-4xl animate-pulse">LOADING NGO DASHBOARD...</div>;

  if (!isNgo) {
    return (
      <div className="p-24 text-center flex flex-col items-center justify-center">
        <AlertTriangle size={64} className="text-bauhaus-red mb-4" />
        <h1 className="bauhaus-header text-5xl text-bauhaus-red">NGO ACCESS ONLY</h1>
        <p className="font-bold uppercase mt-4 opacity-60">You must be registered as an NGO to access this command center.</p>
      </div>
    );
  }

  // Pending approval screen
  if (!isVerified) {
    return (
      <div className="max-w-2xl mx-auto p-12 border-4 border-black text-center space-y-6 mt-12">
        <div className="w-24 h-24 mx-auto bg-bauhaus-yellow border-4 border-black flex items-center justify-center">
          <ShieldOff size={56} />
        </div>
        <div className="bg-bauhaus-yellow text-black text-xs font-black px-3 py-1 uppercase inline-block">PENDING APPROVAL</div>
        <h1 className="bauhaus-header text-5xl uppercase">Awaiting Admin Verification</h1>
        <p className="font-bold uppercase opacity-70 text-lg leading-relaxed">
          Your NGO account is registered and under review by our admin team. You will receive full access to the NGO portal once your account is verified. This typically takes 1–2 business days.
        </p>
        <div className="bg-black text-white p-6 border-2 border-black text-left space-y-2">
          <div className="text-[10px] font-black uppercase opacity-50">YOUR NGO DETAILS</div>
          <div className="font-black uppercase text-xl">{ngoName}</div>
          <div className="text-sm font-bold opacity-60">{auth.currentUser?.email}</div>
          <div className="text-[10px] font-black uppercase text-bauhaus-yellow mt-2">STATUS: PENDING REVIEW</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-[6px] border-black pb-8">
        <div>
          <div className="bg-bauhaus-red text-white text-xs font-black px-3 py-1 uppercase inline-block w-fit mb-4 shadow-[4px_4px_0px_0px_black]">NGO PORTAL</div>
          <h1 className="bauhaus-header text-7xl uppercase">Command Center</h1>
          <p className="text-xl font-bold uppercase mt-2 opacity-70">Manage drives, recruitment, rescue, and team chat</p>
        </div>
        {(activeTab === 'events' || activeTab === 'blood_camps') && (
          <BauhausButton variant="black" onClick={() => { setCreatingType(activeTab === 'events' ? 'VOLUNTEER' : 'BLOOD_CAMP'); setIsCreating(true); }}>
            {activeTab === 'events' ? 'POST VOLUNTEER EVENT +' : 'POST BLOOD CAMP +'}
          </BauhausButton>
        )}
        {activeTab === 'rescue' && (
          <button onClick={fetchAnimalCases} className="flex items-center gap-2 border-4 border-black px-6 py-3 font-black uppercase text-sm hover:bg-black hover:text-white transition-colors">
            <RefreshCw size={16} /> REFRESH ALERTS
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b-4 border-black overflow-x-auto">
        {[
          { id: 'events', label: 'VOLUNTEER EVENTS', icon: <Users size={18} />, count: events.length, activeColor: 'bg-black text-white' },
          { id: 'blood_camps', label: 'BLOOD CAMPS', icon: <Droplets size={18} />, count: bloodCamps.length, activeColor: 'bg-bauhaus-red text-white' },
          { id: 'rescue', label: 'ANIMAL RESCUE', icon: <PawPrint size={18} />, count: openCases.length, activeColor: 'bg-bauhaus-red text-white' },
          { id: 'chat', label: 'NGO CHAT', icon: <MessageCircle size={18} />, count: 0, activeColor: 'bg-bauhaus-blue text-white' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as Tab)}
            className={`flex-1 min-w-[140px] py-4 text-sm font-black uppercase flex items-center justify-center gap-2 transition-colors whitespace-nowrap px-2 ${activeTab === tab.id ? tab.activeColor : 'bg-gray-100 hover:bg-bauhaus-yellow'}`}
          >
            {tab.icon} {tab.label}
            {tab.count > 0 && (
              <span className={`ml-1 text-xs font-black px-2 py-0.5 ${activeTab === tab.id ? 'bg-white/20' : 'bg-black text-white'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── VOLUNTEER EVENTS TAB ─────────────────────────── */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {events.map((evt) => {
            const progress = Math.min(100, (evt.currentVolunteers / evt.requiredVolunteers) * 100);
            return (
              <motion.div key={evt._id} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
                className="border-[4px] border-black bg-white flex flex-col hover:-translate-y-1 transition-transform shadow-[8px_8px_0px_0px_black]">
                <div className="p-6 border-b-4 border-black bg-bauhaus-yellow flex justify-between items-start">
                  <div className="text-[10px] font-black uppercase tracking-widest">{new Date(evt.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
                  <div className="bg-black text-white text-[10px] font-black px-2 py-1 uppercase">{evt.status}</div>
                </div>
                <div className="p-6 space-y-4 flex-grow">
                  <h3 className="text-2xl font-black uppercase leading-tight">{evt.title}</h3>
                  <div className="flex items-center gap-2 text-xs font-black uppercase opacity-60"><MapPin size={14} />{evt.location}</div>
                  <p className="text-sm font-bold opacity-80 line-clamp-2">{evt.description}</p>
                  {evt.skills?.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {evt.skills.slice(0, 3).map((s, i) => (
                        <span key={i} className="text-[9px] font-black uppercase bg-gray-100 border border-black px-2 py-0.5">{s}</span>
                      ))}
                    </div>
                  )}
                  <div className="pt-2 space-y-2">
                    <div className="flex justify-between items-end">
                      <span className="text-xs font-black uppercase"><Users size={14} className="inline mr-1" />Recruited</span>
                      <span className="text-xl font-black italic">{evt.currentVolunteers}/{evt.requiredVolunteers}</span>
                    </div>
                    <div className="h-3 border-2 border-black bg-gray-100 overflow-hidden relative">
                      <motion.div initial={{ width: 0 }} whileInView={{ width: `${progress}%` }} transition={{ duration: 1 }}
                        className={`absolute inset-y-0 left-0 ${progress >= 100 ? 'bg-bauhaus-red' : 'bg-bauhaus-blue'}`} />
                    </div>
                  </div>
                </div>
                <div className="p-4 border-t-4 border-black bg-gray-50 flex justify-between items-center">
                  <button onClick={() => openApplications(evt)} className="text-[10px] font-black uppercase hover:text-bauhaus-blue flex items-center gap-1 transition-colors">
                    <UserCheck size={14} /> VIEW APPLICATIONS →
                  </button>
                  <button
                    onClick={() => handleDeleteEvent(evt._id, 'VOLUNTEER')}
                    title="Delete event"
                    className="text-[10px] font-black uppercase text-bauhaus-red hover:opacity-60 hover:scale-110 transition-all"
                  >
                    <Trash size={14} />
                  </button>
                </div>
              </motion.div>
            );
          })}
          {events.length === 0 && (
            <div className="lg:col-span-3 p-16 border-4 border-black border-dashed flex flex-col items-center justify-center text-center">
              <Users size={48} className="opacity-20 mb-4" />
              <div className="text-2xl font-black uppercase opacity-40">No Events Posted</div>
              <BauhausButton variant="black" className="mt-6" onClick={() => { setCreatingType('VOLUNTEER'); setIsCreating(true); }}>
                <PlusCircle size={16} className="inline mr-2" />POST FIRST EVENT
              </BauhausButton>
            </div>
          )}
        </div>
      )}

      {/* ── BLOOD CAMPS TAB ─────────────────────────────── */}
      {activeTab === 'blood_camps' && (
        <div className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {bloodCamps.map((camp) => {
              const progress = Math.min(100, (camp.currentVolunteers / camp.requiredVolunteers) * 100);
              return (
                <motion.div key={camp._id} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
                  className="border-[4px] border-bauhaus-red bg-white flex flex-col hover:-translate-y-1 transition-transform shadow-[8px_8px_0px_0px_#e63946]">
                  <div className="p-6 border-b-4 border-bauhaus-red bg-bauhaus-red text-white flex justify-between items-start">
                    <div className="flex items-center gap-2 text-sm font-black uppercase"><Droplets size={16} /> BLOOD DONATION CAMP</div>
                    <div className="bg-white text-bauhaus-red text-[10px] font-black px-2 py-1 uppercase">{camp.status}</div>
                  </div>
                  <div className="p-6 space-y-4 flex-grow">
                    <h3 className="text-2xl font-black uppercase leading-tight">{camp.title}</h3>
                    <div className="flex items-center gap-2 text-xs font-black uppercase opacity-60"><MapPin size={14} />{camp.location}</div>
                    <div className="text-xs font-black uppercase opacity-60"><Clock size={12} className="inline mr-1" />{new Date(camp.date).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
                    <p className="text-sm font-bold opacity-80 line-clamp-2">{camp.description}</p>
                    <div className="pt-2 space-y-2">
                      <div className="flex justify-between text-xs font-black uppercase">
                        <span>Donors Registered</span>
                        <span>{camp.currentVolunteers}/{camp.requiredVolunteers}</span>
                      </div>
                      <div className="h-3 border-2 border-black bg-gray-100 overflow-hidden relative">
                        <motion.div initial={{ width: 0 }} whileInView={{ width: `${progress}%` }} transition={{ duration: 1 }}
                          className="absolute inset-y-0 left-0 bg-bauhaus-red" />
                      </div>
                    </div>
                  </div>
                  <div className="p-4 border-t-4 border-bauhaus-red bg-gray-50 flex justify-between items-center">
                    <button onClick={() => openApplications(camp)} className="text-[10px] font-black uppercase hover:text-bauhaus-red flex items-center gap-1 transition-colors">
                      <UserCheck size={14} /> VIEW REGISTRATIONS →
                    </button>
                    <button
                      onClick={() => handleDeleteEvent(camp._id, 'BLOOD_CAMP')}
                      title="Delete blood camp"
                      className="text-[10px] font-black uppercase text-bauhaus-red hover:opacity-60 hover:scale-110 transition-all"
                    >
                      <Trash size={14} />
                    </button>
                  </div>
                </motion.div>
              );
            })}
            {bloodCamps.length === 0 && (
              <div className="lg:col-span-3 p-16 border-4 border-bauhaus-red border-dashed flex flex-col items-center justify-center text-center">
                <Droplets size={48} className="opacity-20 mb-4 text-bauhaus-red" />
                <div className="text-2xl font-black uppercase opacity-40">No Blood Camps Scheduled</div>
                <BauhausButton variant="black" className="mt-6" onClick={() => { setCreatingType('BLOOD_CAMP'); setIsCreating(true); }}>
                  <PlusCircle size={16} className="inline mr-2" />SCHEDULE BLOOD CAMP
                </BauhausButton>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── ANIMAL RESCUE TAB ─────────────────────────────── */}
      {activeTab === 'rescue' && (
        <div className="space-y-12">
          <div className="space-y-6">
            <h2 className="bauhaus-header text-4xl border-b-4 border-black pb-4 flex items-center gap-4 text-bauhaus-red">
              <AlertTriangle size={32} /> OPEN ALERTS
              <span className="bg-bauhaus-red text-white px-3 py-1 text-2xl">{openCases.length}</span>
            </h2>

            {rescueLoading ? (
              <div className="p-16 text-center font-black uppercase text-2xl animate-pulse opacity-40">Loading Cases...</div>
            ) : openCases.length === 0 ? (
              <div className="p-16 border-4 border-black border-dashed text-center opacity-40">
                <PawPrint size={48} className="mx-auto mb-4" />
                <div className="text-2xl font-black uppercase">No Open Rescue Alerts</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {openCases.map((c) => (
                  <motion.div key={c._id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                    className="border-4 border-bauhaus-red bg-white flex flex-col shadow-[8px_8px_0px_0px_#e63946]">
                    <div className="aspect-video bg-black overflow-hidden border-b-4 border-bauhaus-red relative">
                      <img src={c.photoUrl} alt={c.animalType} className="w-full h-full object-cover" />
                      <div className="absolute top-2 left-2 bg-bauhaus-red text-white text-[10px] font-black px-2 py-1 uppercase flex items-center gap-1 animate-pulse">
                        <AlertTriangle size={10} /> NEEDS RESCUE
                      </div>
                    </div>
                    <div className="p-5 flex-grow space-y-2">
                      <div className="flex justify-between items-start">
                        <div className="text-2xl font-black uppercase">{c.animalType}</div>
                        <div className="text-[10px] font-black uppercase opacity-50">{new Date(c.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</div>
                      </div>
                      <p className="text-sm font-bold opacity-80 line-clamp-2">{c.description}</p>
                    </div>
                    <div className="p-4 border-t-4 border-bauhaus-red">
                      <button disabled={updatingCaseId === c._id} onClick={() => handleCaseStatus(c._id, 'EN_ROUTE')}
                        className="w-full py-3 bg-bauhaus-blue text-white font-black uppercase text-sm flex items-center justify-center gap-2 hover:bg-black transition-colors disabled:opacity-50 border-2 border-black">
                        <Truck size={16} />{updatingCaseId === c._id ? 'UPDATING...' : 'WE ARE EN ROUTE'}
                      </button>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>

          {myCases.length > 0 && (
            <div className="space-y-6">
              <h2 className="bauhaus-header text-4xl border-b-4 border-black pb-4 flex items-center gap-4">
                <PawPrint size={32} /> MY ACTIVE CASES
                <span className="bg-black text-white px-3 py-1 text-2xl">{myCases.length}</span>
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                {myCases.map((c) => {
                  const st = ANIMAL_STATUS_STYLES[c.status] || ANIMAL_STATUS_STYLES['OPEN'];
                  return (
                    <motion.div key={c._id} initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                      className="border-4 border-black bg-white flex flex-col shadow-[8px_8px_0px_0px_black]">
                      <div className="aspect-video bg-black overflow-hidden border-b-4 border-black relative">
                        <img src={c.photoUrl} alt={c.animalType} className="w-full h-full object-cover grayscale" />
                        <div className={`absolute top-2 left-2 text-[10px] font-black px-2 py-1 uppercase flex items-center gap-1 ${st.bg}`}>
                          {st.icon} {st.label}
                        </div>
                      </div>
                      <div className="p-5 flex-grow space-y-2">
                        <div className="text-2xl font-black uppercase">{c.animalType}</div>
                        <p className="text-sm font-bold opacity-80 line-clamp-2">{c.description}</p>
                        {c.rescuedAt && <div className="text-[9px] font-black uppercase opacity-50">Rescued: {new Date(c.rescuedAt).toLocaleString('en-IN')}</div>}
                      </div>
                      <div className="p-4 border-t-4 border-black space-y-2">
                        {c.status === 'EN_ROUTE' && (
                          <button disabled={updatingCaseId === c._id} onClick={() => handleCaseStatus(c._id, 'RESCUED')}
                            className="w-full py-3 bg-green-600 text-white font-black uppercase text-sm flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-colors border-2 border-black">
                            <CheckCircle2 size={16} />{updatingCaseId === c._id ? 'SAVING...' : 'MARK AS RESCUED'}
                          </button>
                        )}
                        {c.status === 'RESCUED' && (
                          <button onClick={() => setRescuedCase(c)}
                            className="w-full py-3 bg-black text-white font-black uppercase text-sm flex items-center justify-center gap-2 hover:bg-bauhaus-red transition-colors border-2 border-black">
                            <HeartHandshake size={16} /> POST TO ADOPTION BOARD
                          </button>
                        )}
                        {c.status === 'ADOPTED' && (
                          <div className="text-center text-[10px] font-black uppercase text-green-600 py-2">✓ Listed on Adoption Board</div>
                        )}
                        <button disabled={updatingCaseId === c._id} onClick={() => handleCaseStatus(c._id, 'OPEN')}
                          className="w-full py-1 text-[10px] font-black uppercase opacity-40 hover:opacity-100 border border-black transition-opacity">
                          RELEASE CASE
                        </button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── NGO CHAT TAB ────────────────────────────────────── */}
      {activeTab === 'chat' && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 border-b-4 border-black pb-6">
            <MessageCircle size={32} />
            <div>
              <h2 className="bauhaus-header text-4xl uppercase">NGO Group Chat</h2>
              <p className="text-sm font-bold uppercase opacity-60">Communicate with your approved volunteer team</p>
            </div>
          </div>
          <div style={{ height: '600px' }}>
            <NGOChat
              ngoId={ngoId}
              ngoName={ngoName}
              userName={ngoName}
              isAdmin={true}
              onUserClick={(uid) => setSelectedUserUid(uid)}
            />
          </div>
        </div>
      )}

      <AnimatePresence>
        {/* ── Applications Modal ─────────────────────── */}
        {selectedEvent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setSelectedEvent(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-3xl bg-white border-4 border-black relative my-8 shadow-[16px_16px_0px_0px_black]"
              onClick={e => e.stopPropagation()}>
              <div className="bg-black text-white p-8 flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-black uppercase tracking-widest opacity-50 mb-2">
                    {selectedEvent.eventType === 'BLOOD_CAMP' ? 'BLOOD CAMP REGISTRATIONS' : 'VOLUNTEER APPLICATIONS'}
                  </div>
                  <h2 className="bauhaus-header text-4xl uppercase leading-tight">{selectedEvent.title}</h2>
                  <div className="flex gap-4 mt-3">
                    <span className="text-[10px] font-black uppercase bg-bauhaus-yellow text-black px-2 py-1">{pendingCount} PENDING</span>
                    <span className="text-[10px] font-black uppercase bg-green-600 px-2 py-1">{approvedCount} APPROVED</span>
                    <span className="text-[10px] font-black uppercase opacity-60">{applications.length} TOTAL</span>
                  </div>
                </div>
                <button onClick={() => setSelectedEvent(null)} className="bg-white text-black p-2 hover:bg-bauhaus-red hover:text-white transition-colors"><X size={20} /></button>
              </div>
              <div className="divide-y-2 divide-black max-h-[60vh] overflow-y-auto">
                {appsLoading ? (
                  <div className="p-16 text-center font-black uppercase text-xl animate-pulse">Loading Applications...</div>
                ) : applications.length === 0 ? (
                  <div className="p-16 text-center opacity-40">
                    <Users size={48} className="mx-auto mb-4" />
                    <div className="text-2xl font-black uppercase">No Applications Yet</div>
                  </div>
                ) : applications.map((app, i) => (
                  <motion.div key={app._id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                    className={`p-6 flex flex-col md:flex-row gap-4 items-start md:items-center justify-between ${app.status === 'APPROVED' ? 'bg-green-50' : app.status === 'REJECTED' ? 'bg-red-50' : 'bg-white'}`}>
                    <div className="flex items-center gap-4 flex-grow">
                      <div className="w-12 h-12 bg-black text-white font-black flex items-center justify-center text-lg shrink-0">
                        {app.userName?.[0]?.toUpperCase() || '?'}
                      </div>
                      <div>
                        <div 
                          onClick={() => setSelectedUserUid(app.userId)}
                          className="font-black uppercase text-lg leading-none cursor-pointer hover:text-bauhaus-blue hover:underline"
                        >
                          {app.userName}
                        </div>
                        {app.userEmail && <div className="text-xs font-bold opacity-60 flex items-center gap-1 mt-1"><Mail size={10} />{app.userEmail}</div>}
                        {app.message && <div className="text-xs font-bold opacity-60 mt-1 italic">"{app.message}"</div>}
                        <div className="text-[9px] font-black uppercase opacity-40 mt-1 flex items-center gap-1">
                          <Clock size={9} />Applied: {new Date(app.appliedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-[10px] font-black uppercase px-3 py-1.5 ${STATUS_STYLES[app.status]}`}>{app.status}</span>
                      {app.status !== 'APPROVED' && (
                        <button disabled={updatingId === app._id} onClick={() => handleUpdateAppStatus(app._id, 'APPROVED')}
                          className="flex items-center gap-1 bg-green-600 text-white px-3 py-1.5 font-black uppercase text-[10px] hover:bg-green-700 disabled:opacity-50 transition-colors border-2 border-black">
                          <CheckCircle2 size={14} />APPROVE
                        </button>
                      )}
                      {app.status !== 'REJECTED' && (
                        <button disabled={updatingId === app._id} onClick={() => handleUpdateAppStatus(app._id, 'REJECTED')}
                          className="flex items-center gap-1 bg-white text-bauhaus-red px-3 py-1.5 font-black uppercase text-[10px] hover:bg-bauhaus-red hover:text-white disabled:opacity-50 transition-colors border-2 border-black">
                          <XCircle size={14} />REJECT
                        </button>
                      )}
                      {blockedUsers.includes(app.userId) ? (
                        <button onClick={() => handleBlockUnblock(app.userId, 'unblock')}
                          className="flex items-center gap-1 bg-bauhaus-yellow text-black px-3 py-1.5 font-black uppercase text-[10px] hover:bg-black hover:text-white transition-colors border-2 border-black">
                          UNBLOCK
                        </button>
                      ) : (
                        <button onClick={() => handleBlockUnblock(app.userId, 'block')}
                          className="flex items-center gap-1 bg-black text-white px-3 py-1.5 font-black uppercase text-[10px] hover:bg-bauhaus-red transition-colors border-2 border-black">
                          BLOCK
                        </button>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
              <div className="p-6 border-t-4 border-black bg-gray-50 flex justify-end">
                <BauhausButton variant="black" onClick={() => setSelectedEvent(null)}>CLOSE</BauhausButton>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Adoption Listing Modal ──────────────────── */}
        {rescuedCase && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
            onClick={() => setRescuedCase(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-2xl bg-white border-4 border-black relative my-8 shadow-[16px_16px_0px_0px_black]"
              onClick={e => e.stopPropagation()}>
              <button onClick={() => setRescuedCase(null)} className="absolute top-4 right-4 bg-black text-white p-2 hover:bg-bauhaus-red z-10"><X size={20} /></button>
              <div className="p-8 space-y-6">
                <div>
                  <div className="bg-green-600 text-white text-[10px] font-black px-3 py-1 uppercase inline-block mb-4">POST TO ADOPTION BOARD</div>
                  <h2 className="bauhaus-header text-5xl uppercase">Create Listing</h2>
                  <p className="font-bold uppercase opacity-60 mt-1">For rescued {rescuedCase.animalType}</p>
                </div>
                <form onSubmit={handlePostAdoption} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase">Animal Name</label>
                      <input required value={adoptForm.animalName} onChange={e => setAdoptForm({ ...adoptForm, animalName: e.target.value })}
                        className="w-full border-4 border-black p-3 font-bold focus:bg-bauhaus-yellow outline-none" placeholder="E.G. TOMMY" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black uppercase">Breed</label>
                      <input value={adoptForm.breed} onChange={e => setAdoptForm({ ...adoptForm, breed: e.target.value })}
                        className="w-full border-4 border-black p-3 font-bold focus:bg-bauhaus-yellow outline-none" placeholder="E.G. LABRADOR" />
                    </div>
                    <div className="col-span-2 space-y-1">
                      <label className="text-[10px] font-black uppercase">Estimated Age</label>
                      <input value={adoptForm.age} onChange={e => setAdoptForm({ ...adoptForm, age: e.target.value })}
                        className="w-full border-4 border-black p-3 font-bold focus:bg-bauhaus-yellow outline-none" placeholder="E.G. 6 MONTHS" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black uppercase">Personality & Description</label>
                    <textarea required value={adoptForm.description} onChange={e => setAdoptForm({ ...adoptForm, description: e.target.value })}
                      className="w-full border-4 border-black p-3 font-bold outline-none min-h-[80px]" placeholder="Describe the animal's condition, temperament..." />
                  </div>
                  <BauhausButton type="submit" variant="black" className="w-full text-xl py-5" disabled={adoptLoading}>
                    {adoptLoading ? 'PUBLISHING...' : '→ PUBLISH ADOPTION LISTING'}
                  </BauhausButton>
                </form>
              </div>
            </motion.div>
          </motion.div>
        )}

        {/* ── Create Event Modal ──────────────────────── */}
        {isCreating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <motion.div initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-[6px] border-black w-full max-w-2xl p-8 relative shadow-[16px_16px_0px_0px_black] my-8">
              <button onClick={() => setIsCreating(false)} className="absolute top-4 right-4 hover:text-bauhaus-red font-black uppercase">Close [X]</button>
              <div className={`text-[10px] font-black uppercase px-3 py-1 inline-block mb-4 ${creatingType === 'BLOOD_CAMP' ? 'bg-bauhaus-red text-white' : 'bg-bauhaus-yellow text-black'}`}>
                {creatingType === 'BLOOD_CAMP' ? 'BLOOD DONATION CAMP' : 'VOLUNTEER EVENT'}
              </div>
              <h2 className="bauhaus-header text-5xl mb-8 uppercase">{creatingType === 'BLOOD_CAMP' ? 'Schedule Camp' : 'Post Event'}</h2>
              <form onSubmit={handleCreateEvent} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">
                    {creatingType === 'BLOOD_CAMP' ? 'CAMP NAME' : 'EVENT TITLE'}
                  </label>
                  <input required type="text" value={newEvent.title} onChange={e => setNewEvent({ ...newEvent, title: e.target.value })}
                    className="w-full border-4 border-black p-4 font-bold focus:bg-bauhaus-yellow outline-none"
                    placeholder={creatingType === 'BLOOD_CAMP' ? 'E.G. COMMUNITY BLOOD CAMP 2026' : 'E.G. BEACH CLEANUP DRIVE'} />
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest">DATE & TIME</label>
                    <input required type="datetime-local" value={newEvent.date} onChange={e => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full border-4 border-black p-4 font-bold focus:bg-bauhaus-blue focus:text-white outline-none" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2">
                      <MapPin size={12} /> LOCATION / VENUE
                    </label>
                    <div className="flex gap-2">
                      <input
                        required
                        type="text"
                        value={newEvent.location}
                        onChange={e => setNewEvent({ ...newEvent, location: e.target.value, lat: undefined, lng: undefined })}
                        className="flex-grow border-4 border-black p-4 font-bold focus:bg-bauhaus-yellow outline-none min-w-0"
                        placeholder="ADDRESS OR ZONE"
                      />
                      <button
                        type="button"
                        onClick={useMyLocation}
                        disabled={geoLoading}
                        title="Use my current location"
                        className={`shrink-0 border-4 border-black px-3 flex items-center justify-center transition-colors ${
                          newEvent.lat ? 'bg-green-500 text-white border-green-500' : 'hover:bg-bauhaus-yellow'
                        } disabled:opacity-50`}
                      >
                        {geoLoading ? <Loader2 size={18} className="animate-spin" /> : <LocateFixed size={18} />}
                      </button>
                    </div>
                    {newEvent.lat && (
                      <div className="text-[9px] font-black uppercase text-green-600 flex items-center gap-1">
                        <MapPin size={9} /> {newEvent.lat.toFixed(4)}, {newEvent.lng?.toFixed(4)}
                      </div>
                    )}
                  </div>
                </div>
                {creatingType === 'BLOOD_CAMP' ? (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest">MAX DONOR CAPACITY</label>
                    <input required type="number" min="1" value={newEvent.capacity} onChange={e => setNewEvent({ ...newEvent, capacity: parseInt(e.target.value) })}
                      className="w-full border-4 border-black p-4 font-bold text-center focus:bg-black focus:text-white outline-none" />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest">VOLUNTEER COUNT & SKILLS NEEDED</label>
                    <div className="flex gap-4">
                      <input required type="number" min="1" value={newEvent.requiredVolunteers} onChange={e => setNewEvent({ ...newEvent, requiredVolunteers: parseInt(e.target.value) })}
                        className="w-1/3 border-4 border-black p-4 font-bold text-center focus:bg-black focus:text-white outline-none" />
                      <input type="text" value={newEvent.skills} onChange={e => setNewEvent({ ...newEvent, skills: e.target.value })}
                        className="w-2/3 border-4 border-black p-4 font-bold focus:bg-bauhaus-yellow outline-none" placeholder="SKILLS (COMMA SEPARATED)" />
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">DESCRIPTION</label>
                  <textarea required value={newEvent.description} onChange={e => setNewEvent({ ...newEvent, description: e.target.value })}
                    className="w-full border-4 border-black p-4 font-bold min-h-[100px] focus:bg-gray-100 outline-none" />
                </div>
                <BauhausButton type="submit" variant="black" className="w-full text-2xl py-6 mt-4">
                  {creatingType === 'BLOOD_CAMP' ? 'SCHEDULE CAMP →' : 'PUBLISH EVENT →'}
                </BauhausButton>
              </form>
            </motion.div>
          </motion.div>
        )}

        {/* ── User Details Modal ─────────────────────── */}
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
                    User Control Profile
                  </span>
                  <h2 className="bauhaus-header text-5xl uppercase leading-none">
                    {selectedUserLoading ? 'Loading User...' : selectedUser?.name || 'Unknown User'}
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
                  Fetching user profile database...
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
                          UNBLOCK USER
                        </button>
                      ) : (
                        <button 
                          type="button"
                          onClick={() => handleBlockUnblock(selectedUserUid, 'block')}
                          className="w-full py-4 bg-bauhaus-red text-white font-black uppercase text-sm border-4 border-black shadow-[4px_4px_0px_0px_black] hover:bg-black transition-colors"
                        >
                          BLOCK VOLUNTEER
                        </button>
                      )}
                      <p className="text-[9px] font-bold text-center opacity-50 uppercase">
                        Blocked volunteers cannot apply for events/adoptions or join chat.
                      </p>
                    </div>
                  </div>

                  {/* Middle & Right: User's Posts / Activities */}
                  <div className="lg:col-span-2 p-6 space-y-8 max-h-[60vh] overflow-y-auto">
                    
                    {/* Animal Cases Reported by user */}
                    <div className="space-y-4">
                      <h3 className="font-black uppercase text-xl border-b-2 border-black pb-2 flex items-center gap-2">
                        <PawPrint size={18} /> Reported Animal Cases ({userCases.length})
                      </h3>
                      {userPostsLoading ? (
                        <div className="text-xs font-bold uppercase animate-pulse opacity-50">Loading cases...</div>
                      ) : userCases.length === 0 ? (
                        <div className="text-xs font-bold opacity-40 uppercase py-2">No animal cases filed by this user.</div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {userCases.map(c => {
                            const activeStyles = ANIMAL_STATUS_STYLES[c.status] || ANIMAL_STATUS_STYLES['OPEN'];
                            return (
                              <div key={c._id} className="border-2 border-black p-3 bg-white space-y-2 flex flex-col justify-between">
                                <div className="space-y-2">
                                  <div className="aspect-video bg-black overflow-hidden border-2 border-black">
                                    <img src={c.photoUrl} alt={c.animalType} className="w-full h-full object-cover" />
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <span className="font-black uppercase text-sm">{c.animalType}</span>
                                    <span className={`text-[8px] font-black uppercase px-2 py-0.5 ${activeStyles.bg}`}>{c.status}</span>
                                  </div>
                                  <p className="text-xs font-bold opacity-70 line-clamp-2">{c.description}</p>
                                </div>
                                <div className="space-y-1 pt-2 border-t border-black/10">
                                  {c.status === 'OPEN' && (
                                    <button type="button" disabled={updatingCaseId === c._id} onClick={() => handleCaseStatus(c._id, 'EN_ROUTE')}
                                      className="w-full py-1.5 bg-bauhaus-blue text-white font-black uppercase text-[10px] hover:bg-black transition-colors border-2 border-black">
                                      WE ARE EN ROUTE
                                    </button>
                                  )}
                                  {c.status === 'EN_ROUTE' && (
                                    <button type="button" disabled={updatingCaseId === c._id} onClick={() => handleCaseStatus(c._id, 'RESCUED')}
                                      className="w-full py-1.5 bg-green-600 text-white font-black uppercase text-[10px] hover:bg-green-700 transition-colors border-2 border-black">
                                      MARK RESCUED
                                    </button>
                                  )}
                                  {c.status === 'RESCUED' && (
                                    <button type="button" onClick={() => { setSelectedUserUid(null); setRescuedCase(c); }}
                                      className="w-full py-1.5 bg-black text-white font-black uppercase text-[10px] hover:bg-bauhaus-red transition-colors border-2 border-black">
                                      POST TO ADOPTION BOARD
                                    </button>
                                  )}
                                  {c.status !== 'OPEN' && (
                                    <button type="button" disabled={updatingCaseId === c._id} onClick={() => handleCaseStatus(c._id, 'OPEN')}
                                      className="w-full py-1 text-[9px] font-black uppercase opacity-50 hover:opacity-100 border border-black transition-opacity">
                                      RELEASE CASE
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    {/* Civic Reports Submitted by user (Read Only for NGO) */}
                    <div className="space-y-4">
                      <h3 className="font-black uppercase text-xl border-b-2 border-black pb-2 flex items-center gap-2">
                        <FileText size={18} /> Filed Civic Reports ({userReports.length})
                      </h3>
                      {userPostsLoading ? (
                        <div className="text-xs font-bold uppercase animate-pulse opacity-50">Loading reports...</div>
                      ) : userReports.length === 0 ? (
                        <div className="text-xs font-bold opacity-40 uppercase py-2">No civic reports filed by this user.</div>
                      ) : (
                        <div className="space-y-3">
                          {userReports.map(r => (
                            <div key={r._id} className="border-2 border-black p-3 bg-white flex gap-3 items-center">
                              <img src={r.photoUrl} alt={r.category} className="w-12 h-12 object-cover border border-black shrink-0" />
                              <div className="flex-grow min-w-0">
                                <div className="flex justify-between items-center">
                                  <span className="font-black uppercase text-xs">{r.category}</span>
                                  <span className="text-[8px] font-black uppercase opacity-60 bg-gray-100 border border-black px-1.5 py-0.5">{r.status}</span>
                                </div>
                                <p className="text-xs font-bold opacity-70 line-clamp-1 truncate">{r.description}</p>
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

export default NGODashboard;
