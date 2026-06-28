import React, { useState, useEffect } from 'react';
import { BauhausButton, BauhausGrid, BauhausCard, BauhausTag } from '../components/BauhausUI';
import { User, Mail, MapPin, Calendar, Heart, Shield, Activity, Edit3, Save, X, Phone, AlertTriangle } from 'lucide-react';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { usersApi } from '../lib/api';
import { toast } from 'react-toastify';

const Profile = () => {
  const [userData, setUserData] = useState<any>(null);
  const [donations, setDonations] = useState<any[]>([]);
  const [monetaryDonations, setMonetaryDonations] = useState<any[]>([]);
  const [volunteering, setVolunteering] = useState<any[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    displayName: '',
    location: '',
    bio: '',
    bloodGroup: '',
    phone: ''
  });
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      if (!auth.currentUser) return;
      
      try {
        const response = await usersApi.get(auth.currentUser.uid);
        const data = response.data;
        setUserData(data);
        setEditForm({
          displayName: data.name || auth.currentUser.displayName || '',
          location: data.location || '',
          bio: data.bio || '',
          bloodGroup: data.bloodGroup || '',
          phone: data.phone || ''
        });

        // Fetch donations (Physical)
        const dResponse = await usersApi.getPhysicalDonations(auth.currentUser.uid);
        setDonations(dResponse.data);

        // Fetch monetary donations
        const mResponse = await usersApi.getMonetaryDonations(auth.currentUser.uid);
        setMonetaryDonations(mResponse.data);

        // Fetch volunteering
        const vResponse = await usersApi.getVolunteering(auth.currentUser.uid);
        setVolunteering(vResponse.data);
      } catch (error: any) {
        console.error("Error fetching data from MongoDB:", error);
        if (error.response?.status === 404) {
           setUserData({ name: auth.currentUser.displayName || 'CITIZEN', roles: ['volunteer'] });
        }
      }

      setLoading(false);
    };
    fetchUser();
  }, []);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    // ── Validate ────────────────────────────────────────────────────────────
    const errors: Record<string, string> = {};
    const trimmedName = editForm.displayName.trim();
    if (!trimmedName || trimmedName.length < 2) {
      errors.displayName = 'Name must be at least 2 characters.';
    }
    if (editForm.phone) {
      // Accept: +91XXXXXXXXXX, 91XXXXXXXXXX, or plain 10-digit
      const phoneRegex = /^(\+91|91)?[6-9]\d{9}$/;
      if (!phoneRegex.test(editForm.phone.replace(/\s/g, ''))) {
        errors.phone = 'Enter a valid Indian phone number (10 digits).';
      }
    }
    if (editForm.bio && editForm.bio.length > 300) {
      errors.bio = 'Bio must be 300 characters or fewer.';
    }

    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors);
      return;
    }
    setProfileErrors({});

    try {
      await usersApi.save({
        uid: auth.currentUser.uid,
        name: trimmedName,
        email: auth.currentUser.email || '',
        roles: userData?.roles || ['volunteer'],
        bio: editForm.bio,
        address: editForm.location,
        bloodGroup: editForm.bloodGroup || undefined,
        phone: editForm.phone || undefined,
      });
      setUserData({ ...userData, name: trimmedName, bio: editForm.bio, location: editForm.location, bloodGroup: editForm.bloodGroup, phone: editForm.phone });
      setIsEditing(false);
      toast.success('Profile updated successfully!');
    } catch (error) {
      console.error('Error updating profile in MongoDB:', error);
      toast.error('Failed to update profile.');
    }
  };

  if (loading) return <div className="p-24 text-center bauhaus-header text-4xl">DECRYPTING IDENTITY...</div>;

  return (
    <div className="space-y-12 pb-24">
      {/* Profile Header */}
      <div className="border-4 border-black p-8 bg-black text-white relative">
        <div className="flex flex-col lg:flex-row items-center gap-8">
           <div className="w-32 h-32 bg-bauhaus-yellow border-4 border-white flex items-center justify-center shrink-0">
              <User size={80} className="text-black" />
           </div>
            <div className="flex-grow space-y-2 text-center lg:text-left">
              <h1 className="bauhaus-header text-6xl leading-none uppercase">{userData?.name || 'CITIZEN'}</h1>
              <div className="flex flex-wrap justify-center lg:justify-start gap-4">
                 <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-60">
                    <Mail size={14} /> {auth.currentUser?.email}
                 </div>
                 <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-60">
                    <MapPin size={14} /> {userData?.location || userData?.address || 'LOCATION NOT SET'}
                 </div>
                 <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-60">
                    <Calendar size={14} /> JOINED {auth.currentUser?.metadata.creationTime ? new Date(auth.currentUser.metadata.creationTime).toLocaleDateString() : 'N/A'}
                 </div>
                 {userData?.bloodGroup && (
                   <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest bg-bauhaus-red px-2 py-0.5">
                     <Heart size={12} /> BLOOD: {userData.bloodGroup}
                   </div>
                 )}
                 {userData?.phone && (
                   <div className="flex items-center gap-2 text-xs font-black uppercase tracking-widest opacity-60">
                     📞 {userData.phone}
                   </div>
                 )}
              </div>
           </div>
           <BauhausButton 
            variant="outline" 
            className="border-white text-white hover:bg-white hover:text-black"
            onClick={() => setIsEditing(true)}
           >
              EDIT PROFILE [✍️]
           </BauhausButton>
        </div>
        
        {/* Role Badge Floating */}
        <div className="absolute top-0 right-8 -translate-y-1/2 bg-bauhaus-red border-4 border-black px-4 py-1 text-white font-black uppercase text-xl shadow-[4px_4px_0px_0px_black]">
           {(userData?.roles?.[0] || 'VOLUNTEER').toUpperCase()}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Bio & Core Info */}
        <div className="lg:col-span-1 space-y-8">
           <div className="border-4 border-black p-6 bg-bauhaus-blue text-white">
              <div className="text-[10px] font-black uppercase mb-4 tracking-widest opacity-50 text-white">CITIZEN BRIEF</div>
              <p className="font-bold text-lg leading-tight uppercase italic whitespace-pre-wrap">
                 {userData?.bio || "No profile brief provided. Update your bio to let the ecosystem know your mission goals."}
              </p>
           </div>

           <div className="border-4 border-black p-6 space-y-6 bg-white">
              <div className="text-[10px] font-black uppercase tracking-widest opacity-50">TRUST RATINGS</div>
              <div className="space-y-4 text-xs font-black uppercase">
                 <div className="flex justify-between border-b-2 border-black pb-1">
                    <span>Identity Verified</span>
                    <span className="text-green-600">YES</span>
                 </div>
                 <div className="flex justify-between border-b-2 border-black pb-1">
                    <span>SEWA Score</span>
                    <span>840/1000</span>
                 </div>
                 <div className="flex justify-between border-b-2 border-black pb-1">
                    <span>Certificates</span>
                    <span>02</span>
                 </div>
              </div>
           </div>
        </div>

        {/* Right Column: History Grid */}
        <div className="lg:col-span-2 space-y-8">
           {/* Donation History */}
           <section className="space-y-4">
              <div className="text-xs font-black uppercase tracking-widest opacity-50">HISTORY.LOG / DONATIONS</div>
              <div className="border-4 border-black grid grid-cols-1 divide-y-4 divide-black overflow-hidden bg-white">
                 {donations.map((d, i) => (
                   <div key={d.id || i} className="p-4 flex items-center justify-between hover:bg-bauhaus-yellow transition-colors group">
                      <div className="flex items-center gap-6">
                         <div className="w-12 h-12 bg-black text-white shrink-0 flex flex-col items-center justify-center font-black leading-none">
                            <span className="text-[10px]">{new Date(d.date?.toDate?.() || d.date).getMonth() + 1}</span>
                            <span className="text-xl">{new Date(d.date?.toDate?.() || d.date).getDate()}</span>
                         </div>
                         <div>
                            <div className="font-black uppercase">{d.description || d.type}</div>
                            <div className="text-[10px] font-bold uppercase opacity-50">{d.value}</div>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-2xl font-black italic">{d.value}</div>
                         <div className="text-[8px] font-black uppercase text-green-600 font-black">{d.status || 'CONFIRMED'} ✓</div>
                      </div>
                   </div>
                 ))}
                 {donations.length === 0 && (
                   <div className="p-8 text-center text-xs font-black uppercase opacity-20">NO RECENT DONATION RECORDS DETECTED</div>
                 )}
              </div>
           </section>

           {/* Volunteering History */}
           <section className="space-y-4">
              <div className="text-xs font-black uppercase tracking-widest opacity-50">HISTORY.LOG / VOLUNTEERING</div>
              <div className="border-4 border-black grid grid-cols-1 divide-y-4 divide-black overflow-hidden bg-white">
                 {volunteering.map((v, i) => (
                   <div key={v.id || i} className="p-4 flex items-center justify-between hover:bg-bauhaus-blue hover:text-white transition-colors group">
                      <div className="flex items-center gap-6">
                         <div className="w-12 h-12 border-2 border-black shrink-0 flex flex-col items-center justify-center font-black leading-none group-hover:border-white">
                            <span className="text-[10px]">{new Date(v.date?.toDate?.() || v.date).getMonth() + 1}</span>
                            <span className="text-xl">{new Date(v.date?.toDate?.() || v.date).getDate()}</span>
                         </div>
                         <div>
                            <div className="font-black uppercase">{v.activity}</div>
                            <div className="text-[10px] font-bold uppercase opacity-50 group-hover:text-white">{v.role}</div>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-2xl font-black italic">{v.hours}H</div>
                         <div className="text-[8px] font-black uppercase group-hover:text-white font-black">{v.status || 'APPROVED'}</div>
                      </div>
                   </div>
                 ))}
                 {volunteering.length === 0 && (
                   <div className="p-8 text-center text-xs font-black uppercase opacity-20">NO RECENT VOLUNTEERING RECORDS DETECTED</div>
                 )}
              </div>
           </section>

           {/* Monetary Donation History */}
           <section className="space-y-4">
              <div className="text-xs font-black uppercase tracking-widest opacity-50">HISTORY.LOG / FINANCIAL DONATIONS</div>
              <div className="border-4 border-black grid grid-cols-1 divide-y-4 divide-black overflow-hidden bg-white">
                 {monetaryDonations.map((m, i) => (
                   <div key={m.id || i} className="p-4 flex items-center justify-between hover:bg-black hover:text-white transition-colors group">
                      <div className="flex items-center gap-6">
                         <div className="w-12 h-12 bg-bauhaus-yellow text-black shrink-0 flex flex-col items-center justify-center font-black leading-none group-hover:bg-white">
                            <span className="text-[10px]">{new Date(m.timestamp?.toDate?.() || m.timestamp).getMonth() + 1}</span>
                            <span className="text-xl">{new Date(m.timestamp?.toDate?.() || m.timestamp).getDate()}</span>
                         </div>
                         <div>
                            <div className="font-black uppercase">{m.driveTitle || 'DIRECT IMPACT'}</div>
                            <div className="text-[10px] font-bold uppercase opacity-50 group-hover:text-white">VIA {m.paymentMethod}</div>
                         </div>
                      </div>
                      <div className="text-right">
                         <div className="text-2xl font-black italic">${m.amount}</div>
                         <div className="text-[8px] font-black uppercase text-green-600 font-black group-hover:text-green-400">SUCCESS ✓</div>
                      </div>
                   </div>
                 ))}
                 {monetaryDonations.length === 0 && (
                   <div className="p-8 text-center text-xs font-black uppercase opacity-20">NO FINANCIAL CONTRIBUTIONS DETECTED</div>
                 )}
              </div>
           </section>
        </div>
      </div>

      {/* Edit Modal */}
      <AnimatePresence>
        {isEditing && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-4 border-black w-full max-w-xl p-8 relative shadow-[16px_16px_0px_0px_black]"
            >
              <button onClick={() => setIsEditing(false)} className="absolute top-4 right-4 hover:text-bauhaus-red transition-colors font-black uppercase">Close [X]</button>
              <h2 className="bauhaus-header text-4xl mb-8 uppercase">Update Identity</h2>
              <form onSubmit={handleUpdateProfile} className="space-y-6">
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-widest">Full Name / Callsign</label>
                  <input 
                    type="text" 
                    value={editForm.displayName}
                    onChange={(e) => { setEditForm({...editForm, displayName: e.target.value}); setProfileErrors(pe => ({...pe, displayName: ''})); }}
                    className={`w-full border-2 p-3 font-bold focus:bg-bauhaus-yellow outline-none transition-colors ${profileErrors.displayName ? 'border-bauhaus-red bg-red-50' : 'border-black'}`}
                  />
                  {profileErrors.displayName && <p className="text-bauhaus-red text-[11px] font-black uppercase mt-1">▲ {profileErrors.displayName}</p>}
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-widest">Operating Sector (Location)</label>
                  <input 
                    type="text" 
                    value={editForm.location}
                    onChange={(e) => setEditForm({...editForm, location: e.target.value})}
                    placeholder="e.g. BANDRA WEST, MUMBAI"
                    className="w-full border-2 border-black p-3 font-bold focus:bg-bauhaus-blue focus:text-white outline-none" 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-black uppercase tracking-widest">Mission Bio <span className="opacity-40">({editForm.bio.length}/300)</span></label>
                  <textarea 
                    value={editForm.bio}
                    onChange={(e) => { setEditForm({...editForm, bio: e.target.value}); setProfileErrors(pe => ({...pe, bio: ''})); }}
                    className={`w-full border-2 p-3 font-bold min-h-[100px] outline-none transition-colors ${profileErrors.bio ? 'border-bauhaus-red bg-red-50' : 'border-black focus:bg-gray-100'}`}
                    placeholder="DESCRIBE YOUR OBJECTIVES... (MAX 300 CHARS)"
                    maxLength={300}
                  />
                  {profileErrors.bio && <p className="text-bauhaus-red text-[11px] font-black uppercase mt-1">▲ {profileErrors.bio}</p>}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-widest">Blood Group</label>
                    <select
                      value={editForm.bloodGroup}
                      onChange={(e) => setEditForm({...editForm, bloodGroup: e.target.value})}
                      className="w-full border-2 border-black p-3 font-bold uppercase focus:bg-bauhaus-red focus:text-white outline-none"
                    >
                      <option value="">NOT SET</option>
                      {['A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'].map(g => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-black uppercase tracking-widest">Phone Number</label>
                    <input
                      type="tel"
                      value={editForm.phone}
                      onChange={(e) => { setEditForm({...editForm, phone: e.target.value}); setProfileErrors(pe => ({...pe, phone: ''})); }}
                      placeholder="+91 98765 43210"
                      className={`w-full border-2 p-3 font-bold outline-none transition-colors ${profileErrors.phone ? 'border-bauhaus-red bg-red-50' : 'border-black focus:bg-bauhaus-yellow'}`}
                    />
                    {profileErrors.phone && <p className="text-bauhaus-red text-[11px] font-black uppercase mt-1">▲ {profileErrors.phone}</p>}
                  </div>
                </div>
                
                <div className="flex gap-4 pt-4">
                   <BauhausButton type="submit" variant="black" className="flex-grow text-xl py-4">DEPLOY CHANGES [SAVE]</BauhausButton>
                   <BauhausButton type="button" variant="outline" onClick={() => { setIsEditing(false); setProfileErrors({}); }} className="px-8">CANCEL</BauhausButton>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Profile;
