import React, { useState, useEffect } from 'react';
import { BauhausButton, BauhausCard, BauhausGrid, BauhausTag } from '../components/BauhausUI';
import { Activity, ShieldAlert, MapPin, Bell, Search, HeartPulse, Navigation, CheckCircle2, Calendar, Droplets, LogIn } from 'lucide-react';
import { db, auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { bloodRequestsApi, volunteerEventsApi } from '../lib/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

interface BloodRequest {
  id: string;
  bloodGroup: string;
  units: number;
  urgency: string;
  locationName: string;
  hospitalId: string;
  status: string;
  createdAt: any;
}

interface BloodCamp {
  _id: string; ngoId: string; ngoName: string; title: string;
  description: string; location: string; date: string;
  requiredVolunteers: number; currentVolunteers: number; status: string;
}

const BloodDonation = () => {
  const navigate = useNavigate();
  const [requests, setRequests] = useState<BloodRequest[]>([]);
  const [bloodCamps, setBloodCamps] = useState<BloodCamp[]>([]);
  const [isRequesting, setIsRequesting] = useState(false);
  const [formData, setFormData] = useState({
    bloodGroup: 'O+',
    units: 1,
    urgency: 'URGENT',
    locationName: 'City General Hospital',
    address: '',
    lat: null as number | null,
    lng: null as number | null,
  });
  const [loading, setLoading] = useState(false);
  const [geoLoading, setGeoLoading] = useState(false);
  const [filterGroup, setFilterGroup] = useState<string>('ALL');

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await bloodRequestsApi.getAll();
        setRequests(response.data.map((r: any) => ({
          ...r, id: r._id || r.id,
          createdAt: { toDate: () => new Date(r.createdAt) }
        })));
      } catch (err) { console.error("Error fetching blood requests from MongoDB:", err); }
    };
    const fetchCamps = async () => {
      try {
        const res = await volunteerEventsApi.getAll('BLOOD_CAMP');
        setBloodCamps(res.data.filter((c: any) => c.status === 'UPCOMING'));
      } catch (err) { console.error(err); }
    };
    fetchRequests();
    fetchCamps();
  }, []);

  const handleGetLocation = () => {
    setGeoLoading(true);
    if (!navigator.geolocation) { toast.info('Geolocation not supported'); setGeoLoading(false); return; }
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setFormData(f => ({ ...f, lat: latitude, lng: longitude }));
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`);
          const data = await res.json();
          if (data.display_name) setFormData(f => ({ ...f, address: data.display_name }));
        } catch {}
        setGeoLoading(false);
      },
      () => { toast.error('Could not get location.'); setGeoLoading(false); }
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return toast.error("Please log in.");
    setLoading(true);
    try {
      await bloodRequestsApi.create({
        ...formData,
        hospitalId: auth.currentUser.uid,
        postedBy: 'user',
        postedByName: auth.currentUser.displayName || 'Citizen',
        address: formData.address || undefined,
        lat: formData.lat || undefined,
        lng: formData.lng || undefined,
        status: 'OPEN'
      });
      setIsRequesting(false);
      setFormData({ bloodGroup: 'O+', units: 1, urgency: 'URGENT', locationName: 'City General Hospital', address: '', lat: null, lng: null });
      const response = await bloodRequestsApi.getAll();
      setRequests(response.data.map((r: any) => ({ ...r, id: r._id || r.id, createdAt: { toDate: () => new Date(r.createdAt) } })));
    } catch (error) {
      console.error("Failed to submit blood request to MongoDB:", error);
      toast.error("Failed to submit request.");
    } finally {
      setLoading(false);
    }
  };

  const filteredRequests = requests.filter(r => filterGroup === 'ALL' || r.bloodGroup === filterGroup);

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'CRITICAL': return 'bg-bauhaus-red animate-pulse';
      case 'URGENT': return 'bg-bauhaus-red';
      default: return 'bg-bauhaus-yellow';
    }
  };

  return (
    <div className="space-y-12">
      {/* Alert Banner */}
      <div className="bg-bauhaus-red p-8 border-4 border-black text-white flex flex-col md:flex-row items-center justify-between gap-6">
        <div className="flex items-center gap-6">
          <div className="w-24 h-24 bg-white flex items-center justify-center border-4 border-black shrink-0">
             <Bell className="text-bauhaus-red" size={60} />
          </div>
          <div>
            <h2 className="bauhaus-header text-6xl leading-none">EMERGENCY RADAR</h2>
            <p className="text-xl font-bold uppercase">Real-time alerts for critical blood requirements in your proximity.</p>
          </div>
        </div>
        <BauhausButton variant="secondary" className="px-12 py-6 text-2xl" onClick={() => setIsRequesting(true)}>
          REQUEST BLOOD +
        </BauhausButton>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
        {/* Left: Active Requests List */}
        <div className="lg:col-span-2 space-y-8">
          <div className="flex justify-between items-center border-b-4 border-black pb-4">
             <h3 className="bauhaus-header text-4xl">LIVE REQUESTS</h3>
             <div className="flex gap-2 flex-wrap">
                {['ALL', 'O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => (
                  <button key={g} onClick={() => setFilterGroup(g)}
                    className={`border-2 border-black font-black px-2 py-1 uppercase text-xs transition-colors ${filterGroup === g ? 'bg-black text-white' : 'hover:bg-bauhaus-yellow'}`}>
                    {g}
                  </button>
                ))}
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {filteredRequests.map((request) => (
              <BauhausCard 
                key={request.id}
                title={`${request.bloodGroup} NEEDED`}
                category={request.urgency}
                categoryColor={getUrgencyColor(request.urgency)}
                actionText="I CAN DONATE"
                onAction={() => {
                  if (!auth.currentUser) {
                    toast.info('Please log in to volunteer as a blood donor.');
                    navigate('/auth');
                    return;
                  }
                  toast.success(`Your interest in donating ${request.bloodGroup} blood has been noted. The hospital will be notified.`);
                }}
              >
                <div className="space-y-4">
                   <div className="flex items-center gap-2 font-black text-xl">
                      <MapPin size={24} className="text-bauhaus-red" />
                      {request.locationName}
                   </div>
                   {(request as any).address && <div className="text-[10px] font-black uppercase opacity-40 line-clamp-1">{(request as any).address}</div>}
                   <div className="grid grid-cols-2 gap-2">
                      <div className="border-2 border-black p-2 text-center">
                         <div className="text-xs font-black uppercase opacity-50">UNITS</div>
                         <div className="text-2xl font-black">{request.units}</div>
                      </div>
                      <div className="border-2 border-black p-2 text-center">
                         <div className="text-xs font-black uppercase opacity-50">STATUS</div>
                         <div className="text-xl font-black uppercase">{request.status}</div>
                      </div>
                   </div>
                </div>
              </BauhausCard>
            ))}
          </div>
          
          {requests.length === 0 && (
             <div className="p-24 border-4 border-black border-dashed text-center opacity-30">
                <HeartPulse size={80} className="mx-auto mb-4" />
                <div className="text-4xl font-black uppercase">NO ACTIVE ALERTS</div>
             </div>
          )}
        </div>

        {/* Right: Info & Stats */}
        <div className="space-y-8">
          <div className="bauhaus-card p-6 bg-bauhaus-yellow rotate-1">
             <h3 className="bauhaus-header text-3xl mb-4">YOUR ELIGIBILITY</h3>
             <div className="space-y-4 font-bold uppercase">
                <div className="flex justify-between border-b-2 border-black pb-2">
                  <span>LAST DONATION</span><span>NEVER</span>
                </div>
                <div className="flex justify-between border-b-2 border-black pb-2">
                  <span>HEALTH STATUS</span>
                  <span className="text-green-600">VERIFIED</span>
                </div>
                <p className="text-sm opacity-70">DONATING BLOOD SAVES UP TO 3 LIVES PER PINT. JOIN THE MISSION.</p>
                <BauhausButton variant="black" className="w-full" onClick={() => navigate('/profile')}>UPDATE PROFILE</BauhausButton>
             </div>
          </div>

          {/* NGO Blood Camps Section */}
          {bloodCamps.length > 0 && (
            <div className="bauhaus-card p-0 overflow-hidden">
              <div className="bg-bauhaus-red p-4 text-white font-black uppercase text-lg border-b-4 border-black flex items-center gap-2">
                <Droplets size={20} /> NGO BLOOD CAMPS
              </div>
              <div className="divide-y-2 divide-black">
                {bloodCamps.map(camp => (
                  <div key={camp._id} className="p-4 space-y-2">
                    <div className="font-black uppercase text-sm leading-tight">{camp.title}</div>
                    <div className="text-[10px] font-black uppercase opacity-60 flex items-center gap-2">
                      <MapPin size={10} />{camp.location}
                    </div>
                    <div className="text-[10px] font-black uppercase opacity-60 flex items-center gap-2">
                      <Calendar size={10} />{new Date(camp.date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </div>
                    <div className="text-[9px] font-black uppercase opacity-40">BY {camp.ngoName}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Request Modal */}
      {isRequesting && (
        <div className="fixed inset-0 z-[100] bg-white/90 flex items-center justify-center p-4">
           <div className="bauhaus-card w-full max-w-xl bg-white relative">
              <button 
                onClick={() => setIsRequesting(false)}
                className="absolute top-4 right-4 bg-black text-white p-2"
              >
                CLOSE [X]
              </button>
              <form onSubmit={handleSubmit} className="p-8 space-y-6">
                 <h2 className="bauhaus-header text-4xl">BLOOD REQUEST</h2>
                 <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="font-black uppercase">Blood Group</label>
                      <select 
                        value={formData.bloodGroup}
                        onChange={(e) => setFormData({...formData, bloodGroup: e.target.value})}
                        className="w-full border-3 border-black p-3 font-bold bg-bauhaus-red text-white"
                      >
                        {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map(g => (
                          <option key={g} value={g}>{g}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="font-black uppercase">Units Required</label>
                      <input 
                        type="number"
                        min="1"
                        value={formData.units}
                        onChange={(e) => setFormData({...formData, units: parseInt(e.target.value)})}
                        className="w-full border-3 border-black p-3 font-bold"
                      />
                    </div>
                 </div>
                 <div className="space-y-2">
                    <label className="font-black uppercase">Urgency</label>
                    <select 
                        value={formData.urgency}
                        onChange={(e) => setFormData({...formData, urgency: e.target.value})}
                        className="w-full border-3 border-black p-3 font-bold uppercase"
                      >
                        <option value="NORMAL">NORMAL</option>
                        <option value="URGENT">URGENT</option>
                        <option value="CRITICAL">CRITICAL</option>
                      </select>
                 </div>
                 <div className="space-y-2">
                    <label className="font-black uppercase">Hospital / Location Name</label>
                    <input 
                        type="text"
                        required
                        value={formData.locationName}
                        onChange={(e) => setFormData({...formData, locationName: e.target.value})}
                        className="w-full border-3 border-black p-3 font-bold"
                      />
                 </div>
                 <div className="space-y-2">
                     <label className="font-black uppercase flex items-center gap-2"><MapPin size={14} />Full Address (Optional)</label>
                     <div className="flex gap-2">
                       <input type="text" value={formData.address}
                         onChange={e => setFormData({ ...formData, address: e.target.value })}
                         placeholder="ENTER FULL ADDRESS OR USE GPS"
                         className="flex-grow border-3 border-black p-3 font-bold uppercase focus:bg-bauhaus-yellow outline-none" />
                       <button type="button" onClick={handleGetLocation} disabled={geoLoading}
                         className="bg-bauhaus-blue text-white px-3 font-black uppercase text-xs flex items-center gap-1 border-3 border-black hover:bg-black transition-colors disabled:opacity-50">
                         <Navigation size={14} />{geoLoading ? '...' : 'GPS'}
                       </button>
                     </div>
                     {formData.lat && formData.lng && (
                       <div className="text-[10px] font-black uppercase text-green-600 flex items-center gap-1">
                         <CheckCircle2 size={12} />GPS: {formData.lat.toFixed(4)}°N, {formData.lng.toFixed(4)}°E
                       </div>
                     )}
                 </div>
                 <BauhausButton type="submit" variant="black" className="w-full text-2xl py-6">
                    BROADCAST ALERT →
                 </BauhausButton>
              </form>
           </div>
        </div>
      )}
    </div>
  );
};

export default BloodDonation;
