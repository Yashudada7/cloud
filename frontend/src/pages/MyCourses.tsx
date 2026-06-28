import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { BauhausButton, BauhausGrid, BauhausCard, BauhausTag } from '../components/BauhausUI';
import { Award, BookOpen, Clock, Activity, ArrowRight } from 'lucide-react';
import { motion } from 'motion/react';
import { auth } from '../lib/firebase';
import { enrollmentsApi } from '../lib/api';

interface EnrolledCourse {
  id: string;
  title: string;
  progress: number;
  totalModules: number;
  completedModules: number;
  lastAccessed: any;
  category: string;
}

const MyCourses = () => {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<EnrolledCourse[]>([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchEnrollments = async () => {
      if (!auth.currentUser) return;
      try {
        const response = await enrollmentsApi.getByUser(auth.currentUser.uid);
        
        // Map the MongoDB enrollments to the frontend format
        // Course data is populated in courseId
        const formatted = response.data.map((e: any) => ({
          id: e._id,
          title: e.courseId?.title || 'Unknown Course',
          progress: e.status === 'COMPLETED' ? 100 : 0, // Mock progress for now
          totalModules: 3, // Mock modules
          completedModules: e.status === 'COMPLETED' ? 3 : 0,
          lastAccessed: { toDate: () => new Date(e.enrolledAt) },
          category: e.courseId?.category || 'EDUCATION'
        }));
        
        setCourses(formatted);
      } catch (error) {
        console.error("Failed to fetch enrollments from MongoDB:", error);
      }
      setLoading(false);
    };
    fetchEnrollments();
  }, []);

  const overallProgress = courses.length > 0 
    ? Math.round(courses.reduce((acc, c) => acc + c.progress, 0) / courses.length) 
    : 0;

  if (loading) return <div className="p-24 text-center bauhaus-header text-4xl">LINKING ACADEMIC RECORDS...</div>;

  return (
    <div className="space-y-12 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-black pb-8">
        <div>
          <button 
            onClick={() => navigate('/edu')}
            className="text-xs font-black uppercase mb-2 hover:bg-black hover:text-white px-2 transition-colors inline-block"
          >
            ← BACK TO CATALOG
          </button>
          <h1 className="bauhaus-header text-7xl uppercase">Academic Log</h1>
          <p className="text-xl font-bold uppercase mt-2">Personal skill acquisition pipeline</p>
        </div>
        <BauhausButton variant="black" onClick={() => navigate('/edu')}>ENROLL IN NEW +</BauhausButton>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* Sidebar Stats */}
        <div className="lg:col-span-1 space-y-6">
          <div className="border-4 border-black p-6 bg-bauhaus-yellow shadow-[8px_8px_0px_0px_black]">
            <div className="text-[10px] font-black uppercase mb-4 tracking-widest opacity-50">OVERALL PROGRESS</div>
            <div className="text-6xl font-black italic">{overallProgress}%</div>
            <div className="h-4 border-2 border-black mt-4 relative bg-white">
               <div className="absolute inset-0 bg-black" style={{ width: `${overallProgress}%` }}></div>
            </div>
            <p className="text-[10px] font-black uppercase mt-2 text-xs">{courses.filter(c => c.progress === 100).length}/{courses.length} CERTIFICATES EARNED</p>
          </div>

          <div className="border-4 border-black p-6 bg-white space-y-4">
            <div className="text-[10px] font-black uppercase tracking-widest opacity-50">LEARNING METRICS</div>
            <div className="space-y-4">
              <div className="flex justify-between items-end border-b-2 border-black pb-1">
                 <span className="text-[10px] font-black uppercase">Active Courses</span>
                 <span className="font-black">{courses.filter(c => c.progress < 100).length}</span>
              </div>
              <div className="flex justify-between items-end border-b-2 border-black pb-1">
                 <span className="text-[10px] font-black uppercase">Completed</span>
                 <span className="font-black">{courses.filter(c => c.progress === 100).length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main Course List */}
        <div className="lg:col-span-3 space-y-4">
           {courses.map((course) => (
             <motion.div 
               key={course.id}
               initial={{ x: 20, opacity: 0 }}
               whileInView={{ x: 0, opacity: 1 }}
               viewport={{ once: true }}
               className="border-4 border-black bg-white group hover:bg-gray-50 transition-colors"
             >
                <div className="grid grid-cols-1 md:grid-cols-12 items-center">
                  <div className={`md:col-span-1 h-full min-h-[40px] flex items-center justify-center border-b-4 md:border-b-0 md:border-r-4 border-black ${course.progress === 100 ? 'bg-bauhaus-red' : 'bg-bauhaus-blue'}`}>
                     {course.progress === 100 ? <Award className="text-white" /> : <Activity className="text-white" />}
                  </div>
                  <div className="md:col-span-6 p-6">
                     <div className="text-[10px] font-black uppercase opacity-40 mb-1">{course.category} • LAST ACTIVITY: {course.lastAccessed?.toDate?.().toLocaleDateString() || 'JUST NOW'}</div>
                     <h3 className="text-3xl font-black uppercase leading-none">{course.title}</h3>
                     <div className="mt-4 flex items-center gap-4">
                        <div className="flex-grow h-2 bg-gray-200 border border-black">
                           <div className="h-full bg-black" style={{ width: `${course.progress}%` }}></div>
                        </div>
                        <span className="text-xs font-black italic">{course.progress}%</span>
                     </div>
                  </div>
                  <div className="md:col-span-3 p-6 md:border-l-4 border-black bg-gray-50 flex flex-col items-center justify-center text-center">
                     <span className="text-[10px] font-black uppercase opacity-40">MODULES</span>
                     <span className="text-2xl font-black italic">{course.completedModules}/{course.totalModules}</span>
                  </div>
                  <button 
                    onClick={() => navigate('/edu')}
                    className="md:col-span-2 h-full p-6 flex flex-col items-center justify-center border-t-4 md:border-t-0 md:border-l-4 border-black bg-black text-white hover:bg-bauhaus-blue transition-colors group"
                  >
                     <ArrowRight size={32} className="group-hover:translate-x-2 transition-transform" />
                     <span className="text-[10px] font-black mt-2">{course.progress === 100 ? 'REVIEW' : 'CONTINUE'}</span>
                  </button>
                </div>
             </motion.div>
           ))}

           {courses.length === 0 && (
              <div className="p-12 border-4 border-black border-dashed flex flex-col items-center justify-center text-center space-y-4">
                <BookOpen size={48} className="opacity-20" />
                <div className="text-2xl font-black uppercase opacity-40 tracking-widest leading-none">Expansion slot available</div>
                <p className="text-xs font-black uppercase italic opacity-60">You are not enrolled in any courses yet</p>
                <BauhausButton variant="outline" onClick={() => navigate('/edu')}>BROWSE CATALOG</BauhausButton>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default MyCourses;
