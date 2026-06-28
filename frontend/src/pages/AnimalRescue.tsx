import React, { useState, useEffect } from 'react';
import { BauhausButton, BauhausCard, BauhausGrid, BauhausTag } from '../components/BauhausUI';
import { PawPrint, Camera, MapPin, Heart, Shield, AlertTriangle, CheckCircle2, XCircle, Clock, X, Phone } from 'lucide-react';
import { auth } from '../lib/firebase';
import { animalCasesApi, adoptionsApi, adoptionApplicationsApi, usersApi } from '../lib/api';
import { motion, AnimatePresence } from 'motion/react';
import { toast } from 'react-toastify';

interface AdoptionApplication {
  _id: string; listingId: string; userId: string; userName: string;
  contactInfo: string; message?: string; status: string; appliedAt: string;
  listing?: AdoptionListing;
}

const STATUS_UI: Record<string, { bg: string; icon: React.ReactNode }> = {
  PENDING:  { bg: 'bg-bauhaus-yellow text-black', icon: <Clock size={14} /> },
  APPROVED: { bg: 'bg-green-600 text-white', icon: <CheckCircle2 size={14} /> },
  REJECTED: { bg: 'bg-bauhaus-red text-white', icon: <XCircle size={14} /> },
};

const ANIMAL_STATUS_CONFIG: Record<string, { bg: string; label: string }> = {
  OPEN:     { bg: 'bg-bauhaus-red text-white animate-pulse', label: 'OPEN ALERT' },
  EN_ROUTE: { bg: 'bg-bauhaus-blue text-white', label: 'HELP EN ROUTE' },
  RESCUED:  { bg: 'bg-green-600 text-white', label: 'RESCUE SUCCESS' },
  ADOPTED:  { bg: 'bg-black text-white', label: 'ADOPTED' },
};

interface AnimalCase {
  id: string;
  animalType: string;
  description: string;
  photoUrl: string;
  status: string;
  createdAt: any;
  rescuedBy?: string;
  location?: any;
}

interface AdoptionListing {
  _id: string;
  ngoId: string;
  ngoName: string;
  animalName: string;
  animalType: string;
  breed: string;
  age: string;
  description: string;
  photoUrl: string;
  status: string;
}

const AnimalRescue = () => {
  const [activeTab, setActiveTab] = useState<'rescue' | 'adopt' | 'my_applications'>('rescue');
  
  const [cases, setCases] = useState<AnimalCase[]>([]);
  const [adoptions, setAdoptions] = useState<AdoptionListing[]>([]);
  
  const [myAdoptionApps, setMyAdoptionApps] = useState<AdoptionApplication[]>([]);
  const [applyModal, setApplyModal] = useState<AdoptionListing | null>(null);
  const [applyForm, setApplyForm] = useState({ contactInfo: '', message: '' });
  const [applyLoading, setApplyLoading] = useState(false);
  const [isReporting, setIsReporting] = useState(false);
  const [isPostingAdoption, setIsPostingAdoption] = useState(false);
  
  const [formData, setFormData] = useState({
    animalType: 'Dog',
    description: '',
    photo: null as File | null,
  });

  const [adoptionData, setAdoptionData] = useState({
    animalName: '',
    animalType: 'Dog',
    breed: '',
    age: '',
    description: '',
    photo: null as File | null,
  });

  const [loading, setLoading] = useState(false);
  const [userRoles, setUserRoles] = useState<string[]>([]);

  useEffect(() => {
    fetchCases();
    fetchAdoptions();
  }, []);

  useEffect(() => {
    if (auth.currentUser) {
      fetchMyApplications();
      usersApi.get(auth.currentUser.uid)
        .then(res => {
          setUserRoles(res.data?.roles || []);
        })
        .catch(err => {
          console.error("Error fetching user roles:", err);
          setUserRoles([]);
        });
    } else {
      setUserRoles([]);
    }
  }, [auth.currentUser]);

  const fetchMyApplications = async () => {
    if (!auth.currentUser) return;
    try {
      const res = await adoptionApplicationsApi.getByUser(auth.currentUser.uid);
      setMyAdoptionApps(res.data);
    } catch (err) { console.error(err); }
  };

  const handleMarkAsRescued = async (caseId: string) => {
    if (!auth.currentUser) return toast.info("Log in first.");
    try {
      await animalCasesApi.updateStatus(caseId, {
        status: 'RESCUED',
        ngoId: auth.currentUser.uid,
        ngoName: auth.currentUser.displayName || 'Verified NGO'
      });
      toast.success("Successfully marked case as Rescued!");
      fetchCases();
    } catch (err: any) {
      console.error("Error marking case as rescued:", err);
      toast.error("Failed to update status: " + (err.response?.data?.error || err.message));
    }
  };

  const fetchCases = async () => {
    try {
      const response = await animalCasesApi.getAll();
      setCases(response.data.map((c: any) => ({
        ...c,
        id: c._id || c.id,
        createdAt: { toDate: () => new Date(c.createdAt) }
      })));
    } catch (err) {
      console.error("Error fetching animal cases from MongoDB:", err);
    }
  };

  const fetchAdoptions = async () => {
    try {
      const response = await adoptionsApi.getAll();
      setAdoptions(response.data);
    } catch (err) {
      console.error("Error fetching adoptions from MongoDB:", err);
    }
  };

  const getBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
  });

  const handleSubmitCase = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return toast.info("Log in first.");

    setLoading(true);
    try {
      let photoUrl = 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=800&auto=format&fit=crop';
      if (formData.photo) {
        try {
          photoUrl = await getBase64(formData.photo);
        } catch (e) {
          console.warn("Base64 conversion failed, using fallback", e);
        }
      }

      await animalCasesApi.create({
        reportedBy: auth.currentUser.uid,
        animalType: formData.animalType,
        description: formData.description,
        photoUrl,
        status: 'OPEN'
      });
      setIsReporting(false);
      setFormData({ animalType: 'Dog', description: '', photo: null });
      fetchCases();
    } catch (error) {
      console.error(error);
      toast.error("Failed to submit animal rescue case.");
    } finally {
      setLoading(false);
    }
  };

  const handlePostAdoption = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return toast.info("Log in first.");
    if (!adoptionData.photo) return toast.error("Photo required.");

    setLoading(true);
    try {
      let photoUrl = 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?q=80&w=800&auto=format&fit=crop';
      try {
        photoUrl = await getBase64(adoptionData.photo);
      } catch (e) {
        console.warn("Base64 conversion failed, using fallback", e);
      }

      await adoptionsApi.create({
        ngoId: auth.currentUser.uid,
        ngoName: auth.currentUser.displayName || 'Verified NGO',
        animalName: adoptionData.animalName,
        animalType: adoptionData.animalType,
        breed: adoptionData.breed,
        age: adoptionData.age,
        description: adoptionData.description,
        photoUrl,
        status: 'AVAILABLE'
      });
      setIsPostingAdoption(false);
      setAdoptionData({ animalName: '', animalType: 'Dog', breed: '', age: '', description: '', photo: null });
      fetchAdoptions();
    } catch (error) {
      console.error(error);
      toast.error("Failed to post adoption listing.");
    } finally {
      setLoading(false);
    }
  };

  const hasApplied = (listingId: string) => myAdoptionApps.some(a => a.listingId === listingId || (a.listing as any)?._id === listingId);
  const getAppStatus = (listingId: string) => myAdoptionApps.find(a => a.listingId === listingId || (a.listing as any)?._id === listingId)?.status;

  const handleApplyAdopt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser || !applyModal) return;
    setApplyLoading(true);
    try {
      await adoptionApplicationsApi.create({
        listingId: applyModal._id,
        ngoId: applyModal.ngoId,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'Citizen',
        contactInfo: applyForm.contactInfo,
        message: applyForm.message,
      });
      setApplyModal(null);
      setApplyForm({ contactInfo: '', message: '' });
      fetchMyApplications();
      toast.success('Application submitted! The NGO will review and contact you.');
    } catch (err: any) {
      if (err?.response?.status === 400) toast.info('You have already applied for this animal!');
      else { console.error(err); toast.error('Failed to submit application.'); }
    } finally {
      setApplyLoading(false);
    }
  };

  return (
    <div className="space-y-12 pb-24">
      {/* Hero Section */}
      <div className="bg-bauhaus-blue p-12 border-4 border-black text-white flex flex-col md:flex-row items-center gap-12 overflow-hidden relative">
        <div className="absolute right-0 top-0 opacity-10 -mr-20 -mt-20 pointer-events-none">
           <PawPrint size={400} />
        </div>
        <div className="z-10 flex-grow">
          <h1 className="bauhaus-header text-8xl leading-none mb-4">ANIMAL WELFARE</h1>
          <p className="text-2xl font-bold uppercase max-w-2xl">Report animals in distress or find your new forever companion.</p>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b-4 border-black">
        <button onClick={() => setActiveTab('rescue')}
          className={`flex-1 py-4 text-xl font-black uppercase transition-colors ${activeTab === 'rescue' ? 'bg-black text-white' : 'bg-gray-100 hover:bg-gray-200 text-black'}`}>
          Rescue Alerts
        </button>
        <button onClick={() => setActiveTab('adopt')}
          className={`flex-1 py-4 text-xl font-black uppercase transition-colors ${activeTab === 'adopt' ? 'bg-bauhaus-red text-white' : 'bg-gray-100 hover:bg-gray-200 text-black'}`}>
          Adoption Center
        </button>
        <button onClick={() => setActiveTab('my_applications')}
          className={`flex-1 py-4 text-xl font-black uppercase transition-colors ${activeTab === 'my_applications' ? 'bg-bauhaus-blue text-white' : 'bg-gray-100 hover:bg-gray-200 text-black'}`}>
          MY APPLICATIONS{myAdoptionApps.length > 0 ? ` (${myAdoptionApps.length})` : ''}
        </button>
      </div>

      {/* Tab Content: RESCUE */}
      {activeTab === 'rescue' && (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-12">
          <div className="lg:col-span-3 space-y-12">
            <div className="flex justify-between items-end border-b-4 border-black pb-4">
               <h2 className="bauhaus-header text-5xl">ACTIVE CASES</h2>
               <BauhausButton variant="black" onClick={() => setIsReporting(true)}>REPORT CASE +</BauhausButton>
            </div>
            
            <BauhausGrid cols={2}>
              {cases.map((c) => {
                const statusConf = ANIMAL_STATUS_CONFIG[c.status] || { bg: 'bg-gray-200 text-black', label: c.status };
                const isNgo = userRoles.includes('ngo') || userRoles.includes('admin');
                
                let actionLabel = '';
                if (c.status === 'RESCUED') {
                  actionLabel = 'RESCUE SUCCESS';
                } else if (c.status === 'ADOPTED') {
                  actionLabel = 'ADOPTED';
                } else if (isNgo) {
                  actionLabel = 'MARK AS RESCUE COMPLETED';
                } else {
                  actionLabel = c.status === 'OPEN' ? 'OFFER HELP' : 'NGO EN ROUTE';
                }

                const handleAction = async () => {
                  if (isNgo && (c.status === 'OPEN' || c.status === 'EN_ROUTE')) {
                    await handleMarkAsRescued(c.id);
                  } else {
                    const toastMsg = c.status === 'OPEN' ? "Thank you for offering help! The reporter will be notified." :
                                    c.status === 'EN_ROUTE' ? "NGO is currently en route to rescue this animal." :
                                    c.status === 'RESCUED' ? "This animal was successfully rescued! Thank you." :
                                    "This animal has been adopted.";
                    toast.success(toastMsg);
                  }
                };

                return (
                  <BauhausCard 
                    key={c.id}
                    title={c.animalType.toUpperCase()}
                    category={statusConf.label}
                    categoryColor={statusConf.bg}
                    actionText={actionLabel}
                    onAction={handleAction}
                  >
                    <div className="aspect-square bg-gray-100 border-2 border-black mb-4 overflow-hidden">
                       <img src={c.photoUrl} alt={c.animalType} className="w-full h-full object-cover" />
                    </div>
                    <p className="font-bold uppercase text-lg mb-4">{c.description}</p>
                    <div className="flex items-center gap-2 font-black">
                       <MapPin size={20} className="text-bauhaus-blue" /> NEARBY
                    </div>
                  </BauhausCard>
                );
              })}
            </BauhausGrid>
            
            {cases.length === 0 && (
              <div className="text-center py-24 bg-gray-50 border-4 border-black border-dashed">
                 <AlertTriangle size={64} className="mx-auto mb-4 opacity-20" />
                 <h3 className="bauhaus-header text-3xl opacity-20">NO CASES REPORTED</h3>
              </div>
            )}
          </div>

          <div className="space-y-8">
             <div className="bauhaus-card bg-bauhaus-yellow p-6">
                <h3 className="bauhaus-header text-3xl mb-4">NGO PARTNERS</h3>
                <div className="space-y-4">
                   {['HAPPY PAWS', 'ANIMAL AID', 'RESCUE RELIEF'].map(ngo => (
                     <div key={ngo} className="flex items-center gap-3 border-b-2 border-black pb-2">
                        <div className="w-4 h-4 bg-black"></div>
                        <span className="font-black uppercase">{ngo}</span>
                     </div>
                   ))}
                   <BauhausButton variant="black" className="w-full mt-4">VIEW ALL NGOs</BauhausButton>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Tab Content: ADOPT */}
      {activeTab === 'adopt' && (
        <div className="space-y-12">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-black pb-4">
             <div>
                <h2 className="bauhaus-header text-5xl">FOREVER HOMES</h2>
                <p className="font-bold uppercase opacity-60">Verified NGO Adoption Listings</p>
             </div>
             <BauhausButton variant="black" onClick={() => setIsPostingAdoption(true)}>POST ADOPTION LISTING +</BauhausButton>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
             {adoptions.map((listing) => (
                <div key={listing._id} className="border-4 border-black bg-white flex flex-col hover:-translate-y-2 transition-transform shadow-[8px_8px_0px_0px_black]">
                   <div className="aspect-[4/3] bg-gray-100 border-b-4 border-black overflow-hidden relative">
                      <img src={listing.photoUrl} alt={listing.animalName} className="w-full h-full object-cover" />
                      <div className="absolute top-2 right-2 bg-bauhaus-yellow border-2 border-black font-black text-[10px] uppercase px-2 py-1">
                         {listing.status}
                      </div>
                   </div>
                   <div className="p-6 flex-grow space-y-4">
                      <div className="flex justify-between items-start">
                         <h3 className="bauhaus-header text-4xl">{listing.animalName}</h3>
                         <div className="bg-black text-white px-2 py-1 text-[10px] font-black uppercase">{listing.animalType}</div>
                      </div>
                      <div className="text-xs font-black uppercase opacity-60 flex gap-4">
                         <span>BREED: {listing.breed || 'UNKNOWN'}</span>
                         <span>AGE: {listing.age || 'UNKNOWN'}</span>
                      </div>
                      <p className="text-sm font-bold opacity-80">{listing.description}</p>
                      <div className="text-[10px] font-black uppercase pt-4 border-t-2 border-black/10">
                         POSTED BY: {listing.ngoName}
                      </div>
                   </div>
                   {hasApplied(listing._id) ? (
                     <div className={`w-full p-4 border-t-4 border-black flex items-center justify-center gap-2 font-black uppercase text-sm ${STATUS_UI[getAppStatus(listing._id) || 'PENDING']?.bg}`}>
                       {STATUS_UI[getAppStatus(listing._id) || 'PENDING']?.icon} {getAppStatus(listing._id)}
                     </div>
                   ) : listing.status === 'ADOPTED' ? (
                     <div className="w-full p-4 border-t-4 border-black flex items-center justify-center gap-2 font-black uppercase text-sm bg-gray-200 opacity-60">
                       ALREADY ADOPTED
                     </div>
                   ) : (
                     <button
                        onClick={() => { setApplyModal(listing); setApplyForm({ contactInfo: '', message: '' }); }}
                        className="w-full p-4 border-t-4 border-black bg-black text-white font-black uppercase hover:bg-bauhaus-red transition-colors flex items-center justify-center gap-2">
                       <Heart size={16} /> APPLY TO ADOPT
                     </button>
                   )}
                </div>
             ))}
             
             {adoptions.length === 0 && (
                <div className="lg:col-span-3 p-12 border-4 border-black border-dashed flex flex-col items-center justify-center text-center">
                  <PawPrint size={48} className="opacity-20 mb-4" />
                  <div className="text-2xl font-black uppercase opacity-40">No Adoptions Listed</div>
                </div>
             )}
          </div>
        </div>
      )}

      {/* My Applications Tab */}
      {activeTab === 'my_applications' && (
        <div className="space-y-8">
          <h2 className="bauhaus-header text-5xl border-b-4 border-black pb-4">MY ADOPTION APPLICATIONS</h2>
          {!auth.currentUser ? (
            <div className="p-16 border-4 border-dashed border-black text-center opacity-40">
              <PawPrint size={48} className="mx-auto mb-4" />
              <div className="text-2xl font-black uppercase">Login to view your applications</div>
            </div>
          ) : myAdoptionApps.length === 0 ? (
            <div className="p-16 border-4 border-dashed border-black text-center opacity-40">
              <Heart size={48} className="mx-auto mb-4" />
              <div className="text-2xl font-black uppercase">No adoption applications yet</div>
              <BauhausButton variant="black" className="mt-6" onClick={() => setActiveTab('adopt')}>BROWSE ADOPTIONS →</BauhausButton>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {myAdoptionApps.map((app) => {
                const st = STATUS_UI[app.status] || STATUS_UI['PENDING'];
                const listing = app.listing;
                return (
                  <motion.div key={app._id} initial={{ y: 20, opacity: 0 }} whileInView={{ y: 0, opacity: 1 }} viewport={{ once: true }}
                    className="border-4 border-black bg-white flex flex-col shadow-[8px_8px_0px_0px_black]">
                    {listing?.photoUrl && (
                      <div className="aspect-[4/3] bg-gray-100 border-b-4 border-black overflow-hidden">
                        <img src={listing.photoUrl} alt={listing.animalName} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-6 flex-grow space-y-3">
                      <h3 className="bauhaus-header text-3xl">{listing?.animalName || 'Animal'}</h3>
                      <div className="text-xs font-bold opacity-60">{listing?.animalType} • {listing?.breed || 'Unknown'}</div>
                      <div className="text-[10px] font-black uppercase opacity-40">NGO: {listing?.ngoName}</div>
                      <div className="text-[10px] font-black uppercase opacity-30">Applied: {new Date(app.appliedAt).toLocaleDateString('en-IN')}</div>
                    </div>
                    <div className={`p-4 border-t-4 border-black flex items-center justify-center gap-2 font-black uppercase text-sm ${st.bg}`}>
                      {st.icon} {app.status}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Adoption Apply Modal */}
      <AnimatePresence>
        {applyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
            onClick={() => setApplyModal(null)}>
            <motion.div initial={{ scale: 0.95, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.95, y: 20 }}
              className="w-full max-w-lg bg-white border-4 border-black shadow-[16px_16px_0px_0px_black]"
              onClick={e => e.stopPropagation()}>
              <div className="p-8 border-b-4 border-black bg-bauhaus-red text-white flex justify-between items-start">
                <div>
                  <div className="text-[10px] font-black uppercase opacity-70 mb-2">ADOPTION APPLICATION</div>
                  <h2 className="bauhaus-header text-4xl uppercase">{applyModal.animalName}</h2>
                  <div className="text-sm font-bold opacity-80 mt-1">{applyModal.animalType} • {applyModal.ngoName}</div>
                </div>
                <button onClick={() => setApplyModal(null)} className="p-2 hover:bg-black transition-colors"><X size={20} /></button>
              </div>
              <form onSubmit={handleApplyAdopt} className="p-8 space-y-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest flex items-center gap-2"><Phone size={12} />CONTACT NUMBER *</label>
                  <input required value={applyForm.contactInfo} onChange={e => setApplyForm({ ...applyForm, contactInfo: e.target.value })}
                    className="w-full border-4 border-black p-4 font-bold outline-none focus:bg-bauhaus-yellow"
                    placeholder="YOUR PHONE NUMBER" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-widest">WHY DO YOU WANT TO ADOPT? (OPTIONAL)</label>
                  <textarea value={applyForm.message} onChange={e => setApplyForm({ ...applyForm, message: e.target.value })}
                    className="w-full border-4 border-black p-4 font-bold outline-none min-h-[80px] text-sm resize-none"
                    placeholder="Tell the NGO about yourself, your home environment, and why you want to adopt..." />
                </div>
                <div className="flex gap-4">
                  <button type="button" onClick={() => setApplyModal(null)}
                    className="flex-1 py-3 border-4 border-black font-black uppercase hover:bg-gray-100">CANCEL</button>
                  <button type="submit" disabled={applyLoading}
                    className="flex-1 py-3 bg-black text-white font-black uppercase flex items-center justify-center gap-2 border-4 border-black hover:bg-bauhaus-red disabled:opacity-50 transition-colors">
                    <Heart size={16} />{applyLoading ? 'SUBMITTING...' : 'APPLY TO ADOPT'}
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Modals */}
      <AnimatePresence>
        {isReporting && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4"
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="bauhaus-card w-full max-w-xl bg-white relative">
               <button onClick={() => setIsReporting(false)} className="absolute top-4 right-4 bg-black text-white p-2 text-xs font-black uppercase hover:bg-bauhaus-red">CLOSE [X]</button>
               <form onSubmit={handleSubmitCase} className="p-8 space-y-6">
                  <h2 className="bauhaus-header text-4xl">ANIMAL CASE REPORT</h2>
                  <div className="space-y-2">
                     <label className="font-black uppercase text-xs">Animal Type</label>
                     <select value={formData.animalType} onChange={(e) => setFormData({...formData, animalType: e.target.value})} className="w-full border-3 border-black p-3 font-bold uppercase bg-bauhaus-blue text-white outline-none">
                       <option value="Dog">Dog</option><option value="Cat">Cat</option><option value="Bird">Bird</option><option value="Cow">Cow</option><option value="Other">Other</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="font-black uppercase text-xs">Description / Location Details</label>
                     <textarea required value={formData.description} onChange={(e) => setFormData({...formData, description: e.target.value})} className="w-full border-3 border-black p-3 font-bold outline-none min-h-[100px]" />
                  </div>
                  <div className="space-y-2">
                     <label className="font-black uppercase text-xs">Upload Photo</label>
                     <div className="border-3 border-black border-dashed p-6 text-center relative hover:bg-gray-50 transition-colors">
                        <input type="file" accept="image/*" onChange={(e) => setFormData({...formData, photo: e.target.files?.[0] || null})} className="absolute inset-0 opacity-0 cursor-pointer" />
                        {formData.photo ? <div className="font-black uppercase text-xs">{formData.photo.name}</div> : <Camera size={48} className="mx-auto" />}
                     </div>
                  </div>
                  <BauhausButton type="submit" variant="black" className="w-full text-2xl py-6" disabled={loading}>{loading ? 'UPLOADING...' : 'DEPLOY RESCUE ALERT'}</BauhausButton>
               </form>
            </motion.div>
          </motion.div>
        )}

        {isPostingAdoption && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-bauhaus-red/90 flex items-center justify-center p-4"
          >
            <motion.div initial={{ scale: 0.9 }} animate={{ scale: 1 }} exit={{ scale: 0.9 }} className="border-8 border-black w-full max-w-2xl bg-white relative shadow-[16px_16px_0px_0px_black]">
               <button onClick={() => setIsPostingAdoption(false)} className="absolute top-4 right-4 bg-black text-white p-2 text-xs font-black uppercase hover:bg-white hover:text-black">ABORT [X]</button>
               <form onSubmit={handlePostAdoption} className="p-8 space-y-6">
                  <h2 className="bauhaus-header text-5xl uppercase">List Adoption</h2>
                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-2">
                        <label className="font-black uppercase text-[10px]">Animal Name</label>
                        <input required type="text" value={adoptionData.animalName} onChange={(e) => setAdoptionData({...adoptionData, animalName: e.target.value})} className="w-full border-4 border-black p-3 font-bold outline-none focus:bg-bauhaus-yellow" />
                     </div>
                     <div className="space-y-2">
                        <label className="font-black uppercase text-[10px]">Species</label>
                        <select value={adoptionData.animalType} onChange={(e) => setAdoptionData({...adoptionData, animalType: e.target.value})} className="w-full border-4 border-black p-3 font-bold uppercase outline-none focus:bg-black focus:text-white">
                          <option value="Dog">Dog</option><option value="Cat">Cat</option><option value="Other">Other</option>
                        </select>
                     </div>
                     <div className="space-y-2">
                        <label className="font-black uppercase text-[10px]">Breed</label>
                        <input type="text" value={adoptionData.breed} onChange={(e) => setAdoptionData({...adoptionData, breed: e.target.value})} className="w-full border-4 border-black p-3 font-bold outline-none focus:bg-bauhaus-yellow" />
                     </div>
                     <div className="space-y-2">
                        <label className="font-black uppercase text-[10px]">Age</label>
                        <input type="text" value={adoptionData.age} onChange={(e) => setAdoptionData({...adoptionData, age: e.target.value})} className="w-full border-4 border-black p-3 font-bold outline-none focus:bg-bauhaus-yellow" placeholder="e.g. 2 Months" />
                     </div>
                  </div>
                  <div className="space-y-2">
                     <label className="font-black uppercase text-[10px]">Personality & Description</label>
                     <textarea required value={adoptionData.description} onChange={(e) => setAdoptionData({...adoptionData, description: e.target.value})} className="w-full border-4 border-black p-3 font-bold outline-none min-h-[100px]" />
                  </div>
                  <div className="space-y-2">
                     <label className="font-black uppercase text-[10px]">Upload Photo</label>
                     <div className="border-4 border-black border-dashed p-4 text-center relative hover:bg-gray-50 transition-colors">
                        <input type="file" accept="image/*" onChange={(e) => setAdoptionData({...adoptionData, photo: e.target.files?.[0] || null})} className="absolute inset-0 opacity-0 cursor-pointer" />
                        {adoptionData.photo ? <div className="font-black uppercase text-xs">{adoptionData.photo.name}</div> : <Camera size={32} className="mx-auto" />}
                     </div>
                  </div>
                  <BauhausButton type="submit" variant="black" className="w-full text-2xl py-6" disabled={loading}>{loading ? 'UPLOADING...' : 'PUBLISH LISTING →'}</BauhausButton>
               </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AnimalRescue;
