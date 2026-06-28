import React, { useState, useEffect } from 'react';
import { BauhausCard, BauhausGrid, BauhausButton } from '../components/BauhausUI';
import { ShieldAlert, Activity, PawPrint, GraduationCap, ArrowRight, DollarSign, Heart, Clock, Globe } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';
import { db } from '../lib/firebase';
import { motion } from 'motion/react';
import { donationDrivesApi } from '../lib/api';

const homeImages = [
  'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=800&auto=format&fit=crop',
  'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=800&auto=format&fit=crop'
];

const HomeView = () => {
  const navigate = useNavigate();
  const [trendingDrives, setTrendingDrives] = useState<any[]>([]);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const response = await donationDrivesApi.getAll();
        const fetchedDrives = response.data.slice(0, 3);
        
        if (fetchedDrives.length === 0) {
          setTrendingDrives([
            {
              id: 'mock-1',
              title: '22-YEAR-OLD SAKSHI IS FIGHTING FOR HER LIFE AGAINST ACUTE LIVER FAILURE',
              targetAmount: 5000000,
              currentAmount: 3040797,
              creatorName: 'Nitin Subhash Bhoir',
              imageUrl: 'https://images.unsplash.com/photo-1593113598332-cd288d649433?q=80&w=800&auto=format&fit=crop',
              createdAt: { toMillis: () => Date.now() - 1 * 24 * 60 * 60 * 1000 },
              supporterCount: 1893
            },
            {
              id: 'mock-2',
              title: 'REWRITE SANSKRITI SHRIVASTAVA\'S CANCER DIAGNOSIS INTO A SURVIVOR STORY',
              targetAmount: 5000000,
              currentAmount: 2497399,
              creatorName: 'Sanskriti Shrivastava',
              imageUrl: 'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?q=80&w=800&auto=format&fit=crop',
              createdAt: { toMillis: () => Date.now() - 16 * 24 * 60 * 60 * 1000 },
              supporterCount: 992
            },
            {
              id: 'mock-3',
              title: 'URGENT SUPPORT NEEDED FOR OUR PREMATURE TWIN BABY GIRL',
              targetAmount: 3000000,
              currentAmount: 2549174,
              creatorName: 'Naga Saranya Koduru',
              imageUrl: 'https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=800&auto=format&fit=crop',
              createdAt: { toMillis: () => Date.now() - 7 * 24 * 60 * 60 * 1000 },
              supporterCount: 661
            }
          ]);
        } else {
          setTrendingDrives(fetchedDrives.map((d: any) => ({
            ...d,
            id: d._id || d.id,
            createdAt: { toMillis: () => new Date(d.createdAt).getTime() }
          })));
        }
      } catch (err) {
        console.error("Error fetching trending drives from MongoDB:", err);
      }
    };
    fetchTrending();
  }, []);

  const scrollToActions = () => {
    document.getElementById('trending')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="space-y-24 pb-24">
      {/* Hub Hero Section */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-0 border-[6px] border-black">
        <div className="bg-bauhaus-red p-12 flex flex-col justify-center text-white border-b-[4px] lg:border-b-0 lg:border-r-[4px] border-black">

          <h1 className="text-8xl font-black uppercase tracking-tighter leading-[0.85] mb-6">
            SOCIAL<br />WELFARE<br />ECOSYSTEM
          </h1>
          <p className="text-xl font-bold uppercase mb-8 max-w-md leading-tight">
            Connecting NGOs, volunteers, and citizens for immediate, verified social impact.
          </p>
          <div className="flex gap-4">
            <BauhausButton variant="black" onClick={() => navigate('/donations')}>Explore Impact</BauhausButton>
            <BauhausButton 
              variant="outline" 
              className="border-white text-white hover:bg-white hover:text-black"
              onClick={scrollToActions}
            >
              Urgent Needs ↓
            </BauhausButton>
          </div>
        </div>
        <div className="bg-bauhaus-yellow hidden lg:flex items-center justify-center relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-bauhaus-blue -mr-32 -mt-32 border-4 border-black rotate-45 animate-pulse"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-black -ml-24 -mb-24 border-4 border-white rounded-full"></div>
          <div className="z-10 text-center">
             <div className="text-[200px] font-black leading-none select-none opacity-20">SEWA</div>
          </div>
        </div>
      </section>

      {/* Simplified Trending Preview */}
      <section id="trending">
        <div className="flex justify-between items-end mb-12 border-b-4 border-black pb-4">
          <div>

            <h2 className="bauhaus-header text-6xl">LATEST FUNDRAISERS</h2>
          </div>
          <Link to="/donations" className="font-black uppercase flex items-center gap-2 border-b-4 border-black hover:bg-black hover:text-white px-2">
            STAY INVOLVED <ArrowRight size={16} />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
          {trendingDrives.length > 0 ? (
            trendingDrives.map((drive) => {
              const progress = Math.min(100, (drive.currentAmount / drive.targetAmount) * 100);
              const daysLeft = drive.createdAt ? Math.max(0, 30 - Math.floor((Date.now() - drive.createdAt.toMillis()) / (1000 * 60 * 60 * 24))) : 30;
              
              return (
                <motion.div 
                  key={drive.id}
                  initial={{ y: 20, opacity: 0 }}
                  whileInView={{ y: 0, opacity: 1 }}
                  viewport={{ once: true }}
                  className="group bg-white border-4 border-black transition-all hover:-translate-y-2 hover:shadow-[12px_12px_0px_0px_black] flex flex-col cursor-pointer"
                  onClick={() => navigate('/donations')}
                >
                  <div className="relative aspect-video border-b-4 border-black overflow-hidden bg-gray-200">
                    <img 
                      src={drive.imageUrl || homeImages[Math.floor(Math.random()*3)]} 
                      alt={drive.title}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                      referrerPolicy="no-referrer"
                    />
                    <div className="absolute top-4 left-4 flex flex-col gap-2">
                       <div className="bg-white border-2 border-black text-[8px] font-black px-2 py-0.5 uppercase shadow-[2px_2px_0px_0px_black]">
                          Tax Benefit
                       </div>
                       <div className="bg-bauhaus-red border-2 border-black text-white text-[8px] font-black px-2 py-0.5 uppercase shadow-[2px_2px_0px_0px_black]">
                          Urgent
                       </div>
                    </div>
                  </div>
                  <div className="p-6 flex-grow space-y-4">
                    <h3 className="text-lg font-black uppercase leading-tight line-clamp-2 min-h-[2.5rem] tracking-tight">{drive.title}</h3>
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full border-2 border-black bg-bauhaus-blue flex items-center justify-center font-black text-white text-[10px]">
                        {drive.creatorName?.charAt(0) || 'C'}
                      </div>
                      <span className="text-[10px] font-black uppercase opacity-60">by {drive.creatorName}</span>
                    </div>
                    <div className="space-y-2 pt-2">
                      <div className="flex justify-between items-end">
                        <div className="text-xl font-black italic">
                          ${drive.currentAmount.toLocaleString()}
                          <span className="text-[8px] not-italic opacity-40 ml-1 font-normal">raised of ${drive.targetAmount.toLocaleString()}</span>
                        </div>
                        <div className="text-[10px] font-black text-bauhaus-blue">{Math.round(progress)}%</div>
                      </div>
                      <div className="h-3 border-2 border-black bg-gray-100 overflow-hidden relative">
                        <div className="absolute inset-y-0 left-0 bg-bauhaus-blue" style={{ width: `${progress}%` }} />
                      </div>
                    </div>
                    <div className="flex justify-between items-center text-[10px] font-black uppercase pt-4 border-t-2 border-black/10">
                      <div className="flex items-center gap-1">
                        <Clock size={14} className="opacity-40" /> {daysLeft} Days Left
                      </div>
                      <div className="flex items-center gap-1">
                        <Heart size={14} className="text-bauhaus-red" /> {drive.supporterCount || 0} Supporters
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 border-t-4 border-black group-hover:bg-black transition-colors">
                     <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (navigator.share) {
                            navigator.share({ title: drive.title, url: window.location.origin + '/donations' }).catch(() => {});
                          } else {
                            navigator.clipboard.writeText(window.location.origin + '/donations');
                            // toast handled by parent — just navigate
                          }
                        }}
                        className="p-4 font-black uppercase text-[10px] border-r-2 border-black hover:bg-white transition-colors flex items-center justify-center gap-2 group-hover:text-white group-hover:hover:text-black"
                     >
                        <Globe size={14} /> Share
                     </button>
                     <button 
                        onClick={(e) => { e.stopPropagation(); navigate('/donations'); }}
                        className="p-4 bg-bauhaus-yellow font-black uppercase text-[10px] hover:bg-black hover:text-white transition-colors flex items-center justify-center gap-2"
                     >
                        Contribute <ArrowRight size={14} />
                     </button>
                  </div>
                </motion.div>
              );
            })
          ) : (
            [1, 2, 3].map((i) => (
              <div key={i} className="border-4 border-black bg-gray-50 aspect-[4/5] animate-pulse p-8 flex flex-col justify-end">
                <div className="h-8 bg-gray-200 w-3/4 mb-4"></div>
                <div className="h-4 bg-gray-200 w-1/2"></div>
              </div>
            ))
          )}
        </div>
      </section>

      {/* Quick Action Grid */}
      <section id="urgent-actions">

        <h2 className="bauhaus-header text-5xl mb-8">URGENT ACTIONS</h2>
        <BauhausGrid cols={2} md={4}>
          <BauhausCard 
            title="BLOOD NEEDED" 
            category="URGENT" 
            categoryColor="bg-bauhaus-red"
            actionText="RESPOND"
            onAction={() => navigate('/blood')}
          >
            <div className="flex items-center gap-4 mb-4">
              <Activity className="text-bauhaus-red" size={48} />
              <div className="text-2xl font-black">O+ REQUIRED</div>
            </div>
            <p className="text-xs font-bold uppercase">Emergency blood requirement for surgery nearby.</p>
          </BauhausCard>

          <BauhausCard 
            title="FUNDRAISING" 
            category="DONATE" 
            categoryColor="bg-bauhaus-yellow"
            actionText="GIVE"
            onAction={() => navigate('/donations')}
          >
            <div className="flex items-center gap-4 mb-4">
              <DollarSign className="text-bauhaus-black" size={48} />
              <div className="text-2xl font-black">IMPACT GRID</div>
            </div>
            <p className="text-xs font-bold uppercase">Contribute to active donation drives for social impact.</p>
          </BauhausCard>

          <BauhausCard 
            title="REPORT BOX" 
            category="CITIZEN" 
            categoryColor="bg-black"
            actionText="REPORT"
            onAction={() => navigate('/civic')}
          >
            <div className="flex items-center gap-4 mb-4">
              <ShieldAlert className="text-bauhaus-yellow" size={48} />
              <div className="text-2xl font-black text-black">ISSUE TRACKER</div>
            </div>
            <p className="text-xs font-bold uppercase">Spotted a pothole or litter? Report it directly to officials.</p>
          </BauhausCard>

          <BauhausCard 
            title="ANIMAL SOS" 
            category="RESCUE" 
            categoryColor="bg-bauhaus-blue"
            actionText="SOS"
            onAction={() => navigate('/animal')}
          >
            <div className="flex items-center gap-4 mb-4">
              <PawPrint className="text-bauhaus-blue" size={48} />
              <div className="text-2xl font-black">RESCUE CASE</div>
            </div>
            <p className="text-xs font-bold uppercase">Browse local adoptions or report a stray animal in distress.</p>
          </BauhausCard>
        </BauhausGrid>
      </section>

      {/* Featured NGO Section */}
      <section className="border-[6px] border-black p-12 bg-bauhaus-blue text-white flex flex-col md:flex-row items-center justify-between gap-8 relative overflow-hidden">
        <div className="absolute top-0 left-0 text-[200px] font-black opacity-10 leading-none select-none -mt-12 -ml-12">NGO</div>
        <div className="max-w-2xl z-10">

          <h2 className="bauhaus-header text-6xl mb-4">ACTIVE DRIVES</h2>
          <p className="text-xl font-bold uppercase">Work with verified organizations to make a difference in your community. Join 500+ active volunteer drives today.</p>
        </div>
        <BauhausButton variant="secondary" className="text-3xl py-6" onClick={() => navigate('/auth')}>
          JOIN NOW
        </BauhausButton>
      </section>

      {/* Education Section */}
      <section>

        <div className="flex justify-between items-end mb-8">
           <h2 className="bauhaus-header text-5xl">KNOWLEDGE BLOCKS</h2>
           <Link to="/edu" className="font-black uppercase flex items-center gap-2 border-b-4 border-black hover:bg-black hover:text-white px-2">View All <ArrowRight/></Link>
        </div>
        <BauhausGrid cols={2}>
           <div className="bauhaus-card p-0 flex h-64">
              <div className="w-1/3 bg-bauhaus-yellow border-r-4 border-black flex items-center justify-center">
                 <GraduationCap size={80} />
              </div>
              <div className="w-2/3 p-8 flex flex-col justify-center">
                 <h3 className="text-3xl font-black mb-2 uppercase">First Aid Basic</h3>
                 <p className="mb-4 font-medium uppercase opacity-70">12 Modules • Certification Included</p>
                 <button onClick={() => navigate('/edu')} className="bg-black text-white px-6 py-2 font-black uppercase self-start hover:bg-bauhaus-blue">Start Course</button>
              </div>
           </div>
           <div className="bauhaus-card p-0 flex h-64">
              <div className="w-1/3 bg-bauhaus-red border-r-4 border-black flex items-center justify-center">
                 <Activity size={80} />
              </div>
              <div className="w-2/3 p-8 flex flex-col justify-center">
                 <h3 className="text-3xl font-black mb-2 uppercase">Disaster Relief</h3>
                 <p className="mb-4 font-medium uppercase opacity-70">8 Modules • 100 MCQ Test</p>
                 <button onClick={() => navigate('/edu')} className="bg-black text-white px-6 py-2 font-black uppercase self-start hover:bg-bauhaus-red">Enroll</button>
              </div>
           </div>
        </BauhausGrid>
      </section>

      {/* Partners / Stats */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4 border-4 border-black p-8 bg-black text-white text-center">
        <div>
           <div className="text-6xl font-black mb-2">50+</div>
           <div className="font-bold uppercase opacity-60">Verified NGOs</div>
        </div>
        <div>
           <div className="text-6xl font-black mb-2">10k+</div>
           <div className="font-bold uppercase opacity-60">Volunteers</div>
        </div>
        <div>
           <div className="text-6xl font-black mb-2">2k+</div>
           <div className="font-bold uppercase opacity-60">Animals Saved</div>
        </div>
        <div>
           <div className="text-6xl font-black mb-2">500+</div>
           <div className="font-bold uppercase opacity-60">Issues Resolved</div>
        </div>
      </section>
    </div>
  );
};

export default HomeView;
