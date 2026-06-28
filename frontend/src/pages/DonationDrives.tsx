import React, { useState, useEffect } from 'react';
import { BauhausButton, BauhausCard, BauhausGrid, BauhausTag } from '../components/BauhausUI';
import { Heart, DollarSign, Plus, X, Globe, User, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { auth } from '../lib/firebase';
import { motion, AnimatePresence } from 'motion/react';
import { donationDrivesApi, donationsApi } from '../lib/api';
import { PayPalScriptProvider, PayPalButtons } from "@paypal/react-paypal-js";
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix leaflet icon
// @ts-ignore
import icon from 'leaflet/dist/images/marker-icon.png';
// @ts-ignore
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { toast } from 'react-toastify';
let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

interface Drive {
  id: string;
  title: string;
  description: string;
  targetAmount: number;
  currentAmount: number;
  createdBy: string;
  creatorName: string;
  category: string;
  imageUrl?: string;
  status: string;
  createdAt: any;
  supporterCount?: number;
}

interface ExternalDrive {
  id: string;
  title: string;
  description: string;
  url: string;
  source: string;
  date: string;
  imageUrl?: string;
  lat?: number;
  lng?: number;
}

const DonationDrives = () => {
  const paypalClientId = process.env.VITE_PAYPAL_CLIENT_ID || 'test';
  const [drives, setDrives] = useState<Drive[]>([]);
  const [externalDrives, setExternalDrives] = useState<ExternalDrive[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [selectedDrive, setSelectedDrive] = useState<Drive | null>(null);
  const [donationAmount, setDonationAmount] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  
  const [newDrive, setNewDrive] = useState({
    title: '',
    description: '',
    targetAmount: '',
    category: 'GENERAL',
    imageUrl: ''
  });

  useEffect(() => {
    const fetchDrives = async () => {
      try {
        const response = await donationDrivesApi.getAll();
        const fetchedDrives = response.data;
        
        if (fetchedDrives.length === 0) {
          setDrives([
            {
              id: 'mock-1',
              title: 'URGENT: SUPPORT SURGERY FOR 5-MONTH OLD BABY',
              description: 'Baby Advik needs heart surgery within 10 days to survive.',
              targetAmount: 50000,
              currentAmount: 12500,
              createdBy: 'system',
              creatorName: 'Surya J',
              category: 'MEDICAL',
              imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=800&auto=format&fit=crop',
              status: 'ACTIVE',
              createdAt: { toMillis: () => Date.now() - 5 * 24 * 60 * 60 * 1000 },
              supporterCount: 45
            },
            {
              id: 'mock-2',
              title: 'REWRITING THE FUTURE OF TRIBAL EDUCATION',
              description: 'Helping 500 children in remote villages get access to digital learning tools.',
              targetAmount: 25000,
              currentAmount: 18000,
              createdBy: 'system',
              creatorName: 'Sujata Chorat',
              category: 'EDUCATION',
              imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=800&auto=format&fit=crop',
              status: 'ACTIVE',
              createdAt: { toMillis: () => Date.now() - 15 * 24 * 60 * 60 * 1000 },
              supporterCount: 212
            },
            {
              id: 'mock-3',
              title: 'RESCUE AND REHAB FOR STRAY COMPANIONS',
              description: 'Our shelter is over capacity. We need your help for food and medical bills.',
              targetAmount: 10000,
              currentAmount: 8900,
              createdBy: 'system',
              creatorName: 'Naga Saranya',
              category: 'ANIMALS',
              imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=800&auto=format&fit=crop',
              status: 'ACTIVE',
              createdAt: { toMillis: () => Date.now() - 25 * 24 * 60 * 60 * 1000 },
              supporterCount: 661
            }
          ]);
        } else {
          // Normalize standard MongoDB _id to id and handle date
          setDrives(fetchedDrives.map((d: any) => ({
            ...d,
            id: d._id || d.id,
            createdAt: { toMillis: () => new Date(d.createdAt).getTime() }
          })));
        }
      } catch (err) {
        console.error("Error fetching from MongoDB:", err);
      }
    };

    fetchDrives();

    // Fetch External Humanitarian Drives from ReliefWeb
    const loadExternalDrives = async () => {
      try {
        const response = await fetch('https://api.reliefweb.int/v1/reports?appname=sewa&limit=6&preset=latest&filter[field]=theme&filter[value]=Humanitarian Assistance');
        const data = await response.json();
        
        if (!data || !Array.isArray(data.data)) {
          console.warn('ReliefWeb API returned unexpected format:', data);
          return;
        }

        const formatted = data.data.map((item: any, i: number) => {
          const demoCoords = [
            [20.5937, 78.9629], // India
            [-1.2921, 36.8219], // Kenya
            [33.8869, 35.5131], // Lebanon
            [48.3794, 31.1656], // Ukraine
            [15.3694, 44.1910], // Yemen
            [34.5553, 69.2075]  // Afghanistan
          ];
          const coord = demoCoords[i % demoCoords.length];
          return {
            id: item.id,
            title: item.fields?.title || 'Humanitarian Update',
            description: "Global humanitarian response and urgent relief requirements for ongoing crises.",
            url: item.href?.replace('api.', '') || '#', // Simple heuristic for web URL
            source: item.fields?.source?.[0]?.name || 'ReliefWeb',
            date: item.fields?.date?.created ? new Date(item.fields.date.created).toLocaleDateString() : new Date().toLocaleDateString(),
            imageUrl: `https://images.unsplash.com/photo-1469571480357-0a8a01699b82?q=80&w=800&auto=format&fit=crop`,
            lat: coord[0],
            lng: coord[1]
          };
        });
        setExternalDrives(formatted);
      } catch (err) {
        console.error('ReliefWeb Fetch Error:', err);
      }
    };

    loadExternalDrives();
  }, []);

  const handleCreateDrive = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;

    try {
      await donationDrivesApi.create({
        ...newDrive,
        targetAmount: parseFloat(newDrive.targetAmount),
        currentAmount: 0,
        supporterCount: 0,
        createdBy: auth.currentUser.uid,
        creatorName: auth.currentUser.displayName || 'CITIZEN',
        status: 'ACTIVE'
      });
      setIsCreating(false);
      setNewDrive({ title: '', description: '', targetAmount: '', category: 'GENERAL', imageUrl: '' });
      
      // Refresh list
      const response = await donationDrivesApi.getAll();
      setDrives(response.data.map((d: any) => ({
        ...d,
        id: d._id || d.id,
        createdAt: { toMillis: () => new Date(d.createdAt).getTime() }
      })));
    } catch (error) {
      console.error("Failed to create drive in MongoDB:", error);
      toast.error("Failed to create drive. Check console for details.");
    }
  };

  const handleDonate = async (paypalOrderId?: string) => {
    if (!selectedDrive || !auth.currentUser || !donationAmount) return;
    setIsProcessing(true);

    try {
      const amount = parseFloat(donationAmount);
      
      await donationsApi.create({
        driveId: selectedDrive.id,
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || 'CITIZEN',
        amount,
        paypalOrderId
      });

      toast.success(`Thank you for donating $${amount}!`);
      setSelectedDrive(null);
      setDonationAmount('');
      
      // Refresh list to update currentAmount and supporterCount
      const response = await donationDrivesApi.getAll();
      setDrives(response.data.map((d: any) => ({
        ...d,
        id: d._id || d.id,
        createdAt: { toMillis: () => new Date(d.createdAt).getTime() }
      })));
    } catch (error) {
      console.error("Donation failed:", error);
      toast.error("Donation failed. Check console.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-16 pb-24">
      {/* Crowdfunding Hero */}
      <section className="relative h-[500px] border-[6px] border-black flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img 
            src="https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=1600&auto=format&fit=crop" 
            alt="Hero" 
            className="w-full h-full object-cover grayscale opacity-20"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="relative z-10 p-12 max-w-2xl bg-white/90 backdrop-blur-sm border-r-8 border-black h-full flex flex-col justify-center">
          <div className="bg-bauhaus-red text-white text-xs font-black px-3 py-1 uppercase inline-block w-fit mb-6 shadow-[4px_4px_0px_0px_black]">Collective Impact Lab</div>
          <h1 className="bauhaus-header text-7xl line-clamp-3 leading-[0.8] mb-8 uppercase">FUND THE FEED FOR FUTURE.</h1>
          <p className="text-lg font-black uppercase tracking-tight mb-10 leading-tight">
            Transaprent, direct, and verified funding for people and causes that matter to you.
          </p>
          <div className="flex gap-4">
            <BauhausButton variant="black" onClick={() => setIsCreating(true)}>
              START A FUNDRAISER +
            </BauhausButton>
          </div>
        </div>
      </section>

      {/* Impact Stats Ticker */}
      <div className="grid grid-cols-2 md:grid-cols-4 border-x-4 border-b-4 border-black divide-x-4 divide-black bg-white">
        {[
          ['$2.4M', 'TOTAL RAISED'],
          ['45K+', 'CITIZEN SUPPORTERS'],
          ['892', 'SUCCESSFUL DRIVES'],
          ['100%', 'VERIFIED BY SEWA']
        ].map(([val, label]) => (
          <div key={label} className="p-6 text-center">
            <div className="text-3xl font-black italic leading-none">{val}</div>
            <div className="text-[10px] font-black uppercase opacity-40">{label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4 border-b-4 border-black">
        <div>
          <h2 className="bauhaus-header text-5xl uppercase">Active Impact Collectives</h2>
          <p className="text-sm font-black uppercase opacity-60">Verified fundraisers looking for support right now</p>
        </div>
        <div className="flex gap-4">
           {/* Filters could go here */}
        </div>
      </div>

      {/* Drives Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
        {drives.map((drive) => {
          const progress = Math.min(100, (drive.currentAmount / drive.targetAmount) * 100);
          const daysLeft = drive.createdAt ? Math.max(0, 30 - Math.floor((Date.now() - drive.createdAt.toMillis()) / (1000 * 60 * 60 * 24))) : 30;

          return (
            <motion.div 
              key={drive.id}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="group bg-white border-4 border-black transition-all hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_black] flex flex-col"
            >
              {/* Card Header with Badges */}
              <div className="relative aspect-[4/3] border-b-4 border-black overflow-hidden bg-gray-200">
                <img 
                   src={drive.imageUrl || `https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=800&auto=format&fit=crop`} 
                   alt={drive.title}
                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                   referrerPolicy="no-referrer"
                />
                <div className="absolute top-4 left-4 flex flex-col gap-2">
                   <div className="bg-bauhaus-yellow border-2 border-black text-[10px] font-black px-2 py-1 uppercase shadow-[4px_4px_0px_0px_black]">
                      Tax Benefits
                   </div>
                   <div className="bg-bauhaus-red border-2 border-black text-white text-[10px] font-black px-2 py-1 uppercase shadow-[4px_4px_0px_0px_black]">
                      Urgent
                   </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-6 flex-grow space-y-4">
                <h3 className="text-xl font-black uppercase leading-tight min-h-[3rem] line-clamp-2">
                   {drive.title}
                </h3>
                
                <div className="flex items-center gap-2">
                   <div className="w-8 h-8 rounded-full border-2 border-black bg-bauhaus-blue flex items-center justify-center font-black text-white text-[10px]">
                      {drive.creatorName.charAt(0)}
                   </div>
                   <span className="text-[10px] font-black uppercase opacity-60">by {drive.creatorName}</span>
                </div>

                <div className="space-y-2 pt-2">
                   <div className="flex justify-between items-end">
                      <div className="text-2xl font-black italic">
                         ${drive.currentAmount.toLocaleString()}
                         <span className="text-[10px] not-italic opacity-40 ml-1">raised of ${drive.targetAmount.toLocaleString()}</span>
                      </div>
                      <div className="text-[10px] font-black text-bauhaus-blue">{Math.round(progress)}%</div>
                   </div>
                   <div className="h-3 border-2 border-black bg-gray-100 overflow-hidden relative">
                      <motion.div 
                        initial={{ width: 0 }}
                        whileInView={{ width: `${progress}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className="absolute inset-y-0 left-0 bg-bauhaus-blue"
                      />
                   </div>
                </div>

                <div className="flex justify-between items-center text-[10px] font-black uppercase pt-2 border-t-2 border-black/10">
                   <div className="flex items-center gap-2">
                      <Clock size={14} className="opacity-40" />
                      {daysLeft} Days Left
                   </div>
                   <div className="flex items-center gap-2">
                      <Heart size={14} className="text-bauhaus-red" />
                      {drive.supporterCount || 0} Supporters
                   </div>
                </div>
              </div>

              {/* Card Actions */}
              <div className="grid grid-cols-2 border-t-4 border-black">
                 <button
                    onClick={() => {
                      const url = `${window.location.origin}/donations`;
                      if (navigator.share) {
                        navigator.share({ title: drive.title, url }).catch(() => {});
                      } else {
                        navigator.clipboard.writeText(url).then(() => toast.info('Link copied!')).catch(() => {});
                      }
                    }}
                    className="p-4 font-black uppercase text-[10px] border-r-2 border-black hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2">
                    <Globe size={14} /> Share
                 </button>
                 <button 
                    onClick={() => setSelectedDrive(drive)}
                    className="p-4 bg-bauhaus-yellow font-black uppercase text-[10px] hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2"
                 >
                    Contribute <ArrowRight size={14} />
                 </button>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* External Global Drives */}
      <section className="space-y-12">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4 border-b-4 border-black">
          <div>
            <h2 className="bauhaus-header text-5xl uppercase">Global Humanitarian Reports</h2>
            <p className="text-sm font-black uppercase opacity-60">Sourced from ReliefWeb / United Nations OCHA</p>
          </div>
          <div className="bg-black text-white px-4 py-2 font-black text-xs uppercase flex items-center gap-2">
            <Globe size={16} /> LIVE GLOBAL FEED
          </div>
        </div>

        <div className="h-[400px] w-full border-4 border-black mb-10 z-0 relative">
          <MapContainer center={[20, 0]} zoom={2} style={{ height: '100%', width: '100%', zIndex: 1 }}>
            <TileLayer url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png" />
            {externalDrives.map(drive => (
              drive.lat && drive.lng && (
                <Marker key={`marker-${drive.id}`} position={[drive.lat, drive.lng]}>
                  <Popup>
                    <div className="font-bold uppercase text-xs">
                      <div className="mb-2 line-clamp-2">{drive.title}</div>
                      <a href={drive.url} target="_blank" rel="noopener noreferrer" className="bg-black text-white px-2 py-1 mt-2 inline-block hover:bg-bauhaus-red">VIEW APPEAL</a>
                    </div>
                  </Popup>
                </Marker>
              )
            ))}
          </MapContainer>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {externalDrives.map((drive) => (
            <motion.div 
              key={drive.id}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              className="bg-white border-4 border-black flex flex-col group relative overflow-hidden"
            >
              <div className="absolute -right-12 -top-12 w-24 h-24 bg-bauhaus-red rotate-45 z-0"></div>
              
              <div className="relative aspect-video border-b-4 border-black overflow-hidden bg-gray-200 z-10">
                <img 
                   src={drive.imageUrl} 
                   alt={drive.title}
                   className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 grayscale group-hover:grayscale-0"
                   referrerPolicy="no-referrer"
                />
                <div className="absolute bottom-2 right-2 bg-black text-white text-[8px] font-black px-2 py-1 uppercase">
                   {drive.source}
                </div>
              </div>

              <div className="p-6 flex-grow space-y-4 z-10">
                <div className="flex justify-between items-start">
                   <div className="text-[10px] font-black uppercase opacity-40">{drive.date}</div>
                   <div className="bg-bauhaus-blue text-white text-[8px] font-black px-2 py-1 uppercase">Relief Report</div>
                </div>
                <h3 className="text-lg font-black uppercase leading-tight min-h-[3rem] line-clamp-3">
                   {drive.title}
                </h3>
                <p className="text-xs font-bold uppercase opacity-60 line-clamp-2">
                   {drive.description}
                </p>
              </div>

              <div className="z-10 mt-auto bg-gray-100 border-t-4 border-black p-4">
                 <a 
                  href={drive.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 font-black uppercase text-xs hover:text-bauhaus-red transition-colors"
                 >
                   VIEW GLOBAL APPEAL <ArrowRight size={16} />
                 </a>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Create Drive Modal */}
      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-md flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-4 border-black w-full max-w-xl p-8 relative"
            >
              <button onClick={() => setIsCreating(false)} className="absolute top-4 right-4 hover:text-bauhaus-red font-black uppercase transition-colors">Close [X]</button>
              <h2 className="bauhaus-header text-4xl mb-8 uppercase">Launch Collective</h2>
              <form onSubmit={handleCreateDrive} className="space-y-6">
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest">DRIVE TITLE</label>
                  <input 
                    required
                    type="text" 
                    value={newDrive.title}
                    onChange={(e) => setNewDrive({...newDrive, title: e.target.value})}
                    className="w-full border-2 border-black p-3 font-bold focus:bg-bauhaus-yellow outline-none" 
                    placeholder="e.g. MUNICIPAL SCHOOL DESKS"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest">IMAGE URL</label>
                  <input 
                    type="url" 
                    value={newDrive.imageUrl}
                    onChange={(e) => setNewDrive({...newDrive, imageUrl: e.target.value})}
                    className="w-full border-2 border-black p-3 font-bold focus:bg-bauhaus-yellow outline-none" 
                    placeholder="https://images.unsplash.com/..."
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-black uppercase tracking-widest">MISSION DESCRIPTION</label>
                  <textarea 
                    required
                    value={newDrive.description}
                    onChange={(e) => setNewDrive({...newDrive, description: e.target.value})}
                    className="w-full border-2 border-black p-3 font-bold min-h-[100px] focus:bg-gray-100 outline-none" 
                    placeholder="DESCRIBE THE SOCIAL IMPACT..."
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest">TARGET AMOUNT ($)</label>
                    <input 
                      required
                      type="number" 
                      value={newDrive.targetAmount}
                      onChange={(e) => setNewDrive({...newDrive, targetAmount: e.target.value})}
                      className="w-full border-2 border-black p-3 font-bold focus:bg-bauhaus-blue focus:text-white outline-none" 
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-black uppercase tracking-widest">CATEGORY</label>
                    <select 
                      value={newDrive.category}
                      onChange={(e) => setNewDrive({...newDrive, category: e.target.value})}
                      className="w-full border-2 border-black p-3 font-bold uppercase focus:bg-black focus:text-white outline-none appearance-none"
                    >
                      <option value="GENERAL">GENERAL</option>
                      <option value="MEDICAL">MEDICAL</option>
                      <option value="EDUCATION">EDUCATION</option>
                      <option value="ENVIRONMENT">ENVIRONMENT</option>
                      <option value="DISASTER">DISASTER</option>
                      <option value="BOOKS">BOOK DONATION</option>
                      <option value="ANIMALS">ANIMAL WELFARE</option>
                    </select>
                  </div>
                </div>
                
                <BauhausButton type="submit" variant="black" className="w-full text-xl py-6 mt-4">DEPLOY DRIVE →</BauhausButton>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Payment Portal Modal */}
      <AnimatePresence>
        {selectedDrive && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-bauhaus-red/90 flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ x: 100, opacity: 0 }} animate={{ x: 0, opacity: 1 }} exit={{ x: 100, opacity: 0 }}
              className="bg-white border-8 border-black w-full max-w-4xl grid grid-cols-1 lg:grid-cols-2 relative shadow-[16px_16px_0px_0px_black]"
            >
              <button onClick={() => setSelectedDrive(null)} className="absolute -top-12 right-0 bg-black text-white p-2 font-black uppercase hover:bg-white hover:text-black transition-colors">Abort [ESC]</button>
              
              {/* Left: Campaign Summary */}
              <div className="p-12 space-y-8 border-b-4 lg:border-b-0 lg:border-r-4 border-black">
                <div className="text-[10px] font-black uppercase tracking-widest opacity-50">TRUSTED CONTRIBUTION GATE</div>
                <h2 className="bauhaus-header text-5xl uppercase leading-none">{selectedDrive.title}</h2>
                <div className="space-y-4">
                   <div className="flex items-center gap-4 text-xs font-black uppercase">
                      <ShieldCheck size={20} className="text-green-600" />
                      SECURE ECOSYSTEM TRANSACTION
                   </div>
                   <div className="flex items-center gap-4 text-xs font-black uppercase">
                      <Globe size={20} className="text-bauhaus-blue" />
                      100% TRANSPARENCY ON BLOCKCHAIN
                   </div>
                   <div className="flex items-center gap-4 text-xs font-black uppercase">
                      <Heart size={20} className="text-bauhaus-red" />
                      DIRECT SOCIAL IMPACT LOG
                   </div>
                </div>
                
                <div className="bg-gray-100 p-6 border-2 border-black italic font-bold">
                   "Every dollar contributed through this pipeline is tracked via the Global Impact Ledger (GIL)."
                </div>
              </div>

              {/* Right: Payment Form */}
              <div className="p-12 bg-bauhaus-yellow flex flex-col justify-center gap-8">
                <div className="space-y-4">
                  <label className="text-xs font-black uppercase tracking-widest">CONTRIBUTION AMOUNT ($)</label>
                  <div className="relative">
                    <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 scale-150" />
                    <input 
                      type="number"
                      value={donationAmount}
                      onChange={(e) => setDonationAmount(e.target.value)}
                      placeholder="0.00"
                      className="w-full bg-white border-4 border-black p-8 px-16 text-6xl font-black italic outline-none focus:bg-bauhaus-blue focus:text-white transition-colors"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                   <div className="text-[10px] font-black uppercase tracking-widest opacity-50">PAYMENT INSTRUMENT</div>
                   
                   {!donationAmount || parseFloat(donationAmount) <= 0 ? (
                     <div className="bg-black text-white p-4 font-black uppercase text-center opacity-50">
                        ENTER AMOUNT TO UNLOCK PAYMENT
                     </div>
                   ) : (
                     <div className="bg-white p-4 border-4 border-black">
                       <PayPalScriptProvider options={{ clientId: paypalClientId, currency: "USD", intent: "capture" }}>
                           <PayPalButtons 
                               style={{ layout: "vertical", color: "black", shape: "rect", label: "donate" }}
                               disabled={isProcessing}
                               createOrder={(data, actions) => {
                                   return actions.order.create({
                                       intent: "CAPTURE",
                                       purchase_units: [
                                           {
                                               amount: {
                                                   currency_code: "USD",
                                                   value: donationAmount,
                                               },
                                               description: `Donation to ${selectedDrive.title}`
                                           },
                                       ],
                                   });
                               }}
                               onApprove={(data, actions) => {
                                   if (!actions.order) return Promise.reject();
                                   return actions.order.capture().then(() => {
                                       handleDonate(data.orderID);
                                   });
                               }}
                           />
                       </PayPalScriptProvider>
                     </div>
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

export default DonationDrives;
