import React, { useState, useEffect } from 'react';
import { BauhausButton, BauhausCard } from '../../components/BauhausUI';
import { GraduationCap, Video, FileText, Plus, Trash, CheckCircle, BarChart3, Users, Award } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth, storage } from '../../lib/firebase';
import { coursesApi, usersApi, statsApi } from '../../lib/api';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { toast } from 'react-toastify';

interface MCQQuestion {
  question: string;
  options: string[];
  correctAnswer: number;
}

interface Course {
  _id: string;
  title: string;
  category: string;
  enrolledCount: number;
}

const EducatorDashboard = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [isEducator, setIsEducator] = useState(false);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState<{ totalCourses: number; totalEnrollments: number; avgCompletion: number } | null>(null);

  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Technology');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [mcqTest, setMcqTest] = useState<MCQQuestion[]>([]);

  useEffect(() => {
    checkRoleAndFetchData();
  }, []);

  const checkRoleAndFetchData = async () => {
    if (!auth.currentUser) {
      setLoading(false);
      return;
    }

    try {
      const userRes = await usersApi.get(auth.currentUser.uid);
      const roles = userRes.data?.roles || [];
      
      if (roles.includes('educator') || roles.includes('admin')) {
        setIsEducator(true);
        const coursesRes = await coursesApi.getAll();
        // Filter courses by this educator
        const myCourses = coursesRes.data.filter((c: any) => c.educatorId === auth.currentUser?.uid);
        setCourses(myCourses);

        // Fetch educator stats
        try {
          const statsRes = await statsApi.educator(auth.currentUser.uid);
          setStats(statsRes.data);
        } catch (statsErr) {
          console.warn('Stats not available, using local count:', statsErr);
          setStats({
            totalCourses: myCourses.length,
            totalEnrollments: myCourses.reduce((acc: number, c: any) => acc + (c.enrolledCount || 0), 0),
            avgCompletion: 0
          });
        }
      }
    } catch (err) {
      console.error("Error fetching educator data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddQuestion = () => {
    setMcqTest([...mcqTest, { question: '', options: ['', '', '', ''], correctAnswer: 0 }]);
  };

  const updateQuestion = (index: number, field: string, value: any) => {
    const updated = [...mcqTest];
    if (field === 'question') updated[index].question = value;
    if (field === 'correctAnswer') updated[index].correctAnswer = value;
    setMcqTest(updated);
  };

  const updateOption = (qIndex: number, optIndex: number, value: string) => {
    const updated = [...mcqTest];
    updated[qIndex].options[optIndex] = value;
    setMcqTest(updated);
  };

  const removeQuestion = (index: number) => {
    const updated = mcqTest.filter((_, i) => i !== index);
    setMcqTest(updated);
  };

  const handleCreateCourse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    
    setUploading(true);
    try {
      let thumbnailUrl = '';
      if (thumbnailFile) {
        const thumbRef = ref(storage, `courses/thumbnails/${Date.now()}_${thumbnailFile.name}`);
        const thumbUpload = await uploadBytes(thumbRef, thumbnailFile);
        thumbnailUrl = await getDownloadURL(thumbUpload.ref);
      }

      let videoUrl = '';
      if (videoFile) {
        const vidRef = ref(storage, `courses/videos/${Date.now()}_${videoFile.name}`);
        const vidUpload = await uploadBytes(vidRef, videoFile);
        videoUrl = await getDownloadURL(vidUpload.ref);
      }

      await coursesApi.create({
        title,
        description,
        category,
        educatorId: auth.currentUser.uid,
        educatorName: auth.currentUser.displayName || 'Educator',
        thumbnailUrl,
        videoUrl,
        materials: [], // Expandable later
        mcqTest
      });

      setIsCreating(false);
      // Reset form
      setTitle(''); setDescription(''); setCategory('Technology');
      setThumbnailFile(null); setVideoFile(null); setMcqTest([]);
      checkRoleAndFetchData();
    } catch (err) {
      console.error("Course creation failed:", err);
      toast.error("Failed to create course.");
    } finally {
      setUploading(false);
    }
  };

  if (loading) return <div className="p-24 text-center bauhaus-header text-4xl">LOADING EDUCATOR PORTAL...</div>;

  if (!isEducator) {
    return (
      <div className="p-24 text-center flex flex-col items-center justify-center">
        <GraduationCap size={64} className="opacity-20 mb-4" />
        <h1 className="bauhaus-header text-5xl opacity-40">EDUCATOR ACCESS ONLY</h1>
        <p className="font-bold uppercase mt-4 opacity-60">You must be registered as an educator to view this portal.</p>
      </div>
    );
  }

  return (
    <div className="space-y-12 pb-24">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-[6px] border-black pb-8">
        <div>
          <div className="bg-black text-white text-xs font-black px-3 py-1 uppercase inline-block w-fit mb-4 shadow-[4px_4px_0px_0px_#FFCC00]">TEACHING CENTER</div>
          <h1 className="bauhaus-header text-7xl uppercase">Course Studio</h1>
          <p className="text-xl font-bold uppercase mt-2 opacity-70">Upload lectures, build MCQ tests, and certify students</p>
        </div>
        <BauhausButton variant="black" onClick={() => setIsCreating(true)}>
          CREATE NEW COURSE +
        </BauhausButton>
      </div>

      {/* Analytics Metrics Banner */}
      {stats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-0 border-4 border-black overflow-hidden">
          {[
            { label: 'Total Courses', value: stats.totalCourses, icon: <GraduationCap size={24} />, color: 'bg-bauhaus-yellow' },
            { label: 'Total Enrollments', value: stats.totalEnrollments, icon: <Users size={24} />, color: 'bg-bauhaus-blue text-white' },
            { label: 'Avg Completion', value: `${stats.avgCompletion}%`, icon: <Award size={24} />, color: 'bg-black text-white' },
          ].map((m, i) => (
            <div key={i} className={`${m.color} p-8 border-r-4 last:border-r-0 border-black flex items-center gap-6`}>
              <div className="opacity-60">{m.icon}</div>
              <div>
                <div className="text-4xl font-black">{m.value}</div>
                <div className="text-[10px] font-black uppercase mt-1 opacity-70">{m.label}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {courses.map((course) => (
          <motion.div 
            key={course._id}
            initial={{ y: 20, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            className="border-[4px] border-black bg-white flex flex-col hover:-translate-y-2 transition-transform shadow-[8px_8px_0px_0px_black]"
          >
            <div className="p-6 border-b-4 border-black bg-bauhaus-yellow flex justify-between items-start">
              <div className="text-[10px] font-black uppercase tracking-widest">{course.category}</div>
            </div>
            <div className="p-6 space-y-4 flex-grow">
              <h3 className="text-2xl font-black uppercase leading-tight">{course.title}</h3>
              <div className="flex items-center gap-2 text-xs font-black uppercase opacity-60">
                <span>{course.enrolledCount} Students Enrolled</span>
              </div>
            </div>
            <div className="p-4 border-t-4 border-black bg-gray-50 flex justify-between items-center">
               <button className="text-[10px] font-black uppercase hover:text-bauhaus-blue">Edit Content →</button>
               <button className="text-[10px] font-black uppercase text-red-600 hover:underline"><Trash size={14}/></button>
            </div>
          </motion.div>
        ))}

        {courses.length === 0 && (
          <div className="lg:col-span-3 p-12 border-4 border-black border-dashed flex flex-col items-center justify-center text-center">
            <Video size={48} className="opacity-20 mb-4" />
            <div className="text-2xl font-black uppercase opacity-40">No Courses Published</div>
            <p className="font-bold opacity-60 mt-2">Start your first course to begin teaching the community.</p>
          </div>
        )}
      </div>

      <AnimatePresence>
        {isCreating && (
          <motion.div 
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/80 flex items-center justify-center p-4 overflow-y-auto"
          >
            <motion.div 
              initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
              className="bg-white border-[6px] border-black w-full max-w-4xl p-8 relative shadow-[16px_16px_0px_0px_black] my-8"
            >
              <button onClick={() => setIsCreating(false)} className="absolute top-4 right-4 hover:text-bauhaus-red font-black uppercase transition-colors bg-white px-2 py-1 border-2 border-black">Close [X]</button>
              
              <h2 className="bauhaus-header text-5xl mb-8 uppercase">Course Builder</h2>
              
              <form onSubmit={handleCreateCourse} className="space-y-8">
                {/* Basic Info */}
                <div className="space-y-6 border-b-4 border-black pb-8">
                  <h3 className="text-2xl font-black uppercase flex items-center gap-2"><FileText /> Basic Info</h3>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest">COURSE TITLE</label>
                    <input required type="text" value={title} onChange={(e) => setTitle(e.target.value)} className="w-full border-4 border-black p-4 font-bold focus:bg-bauhaus-yellow outline-none" placeholder="E.G. INTRODUCTION TO CIVIC DUTIES" />
                  </div>
                  
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest">CATEGORY</label>
                      <select value={category} onChange={(e) => setCategory(e.target.value)} className="w-full border-4 border-black p-4 font-bold uppercase focus:bg-black focus:text-white outline-none">
                        <option value="Technology">Technology</option>
                        <option value="Health">Health</option>
                        <option value="Civics">Civics</option>
                        <option value="Environment">Environment</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-widest">THUMBNAIL IMAGE</label>
                      <input type="file" accept="image/*" onChange={(e) => setThumbnailFile(e.target.files?.[0] || null)} className="w-full border-4 border-black p-3 font-bold outline-none" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest">DESCRIPTION</label>
                    <textarea required value={description} onChange={(e) => setDescription(e.target.value)} className="w-full border-4 border-black p-4 font-bold outline-none min-h-[100px]" placeholder="What will students learn?" />
                  </div>
                </div>

                {/* Media Uploads */}
                <div className="space-y-6 border-b-4 border-black pb-8">
                  <h3 className="text-2xl font-black uppercase flex items-center gap-2"><Video /> Lecture Media</h3>
                  <div className="p-8 border-4 border-black border-dashed text-center relative hover:bg-gray-50 transition-colors">
                     <input type="file" accept="video/*" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} className="absolute inset-0 opacity-0 cursor-pointer" />
                     {videoFile ? (
                        <div className="font-black uppercase text-bauhaus-blue"><CheckCircle className="mx-auto mb-2" />{videoFile.name}</div>
                     ) : (
                        <div>
                          <Video size={48} className="mx-auto mb-4 opacity-50" />
                          <div className="font-black uppercase">CLICK TO UPLOAD MASTER VIDEO FILE</div>
                          <div className="text-[10px] font-bold opacity-50 uppercase">MP4, WebM (Max 500MB)</div>
                        </div>
                     )}
                  </div>
                </div>

                {/* MCQ Test Builder */}
                <div className="space-y-6 pb-4">
                  <div className="flex justify-between items-end">
                    <h3 className="text-2xl font-black uppercase flex items-center gap-2"><CheckCircle /> MCQ Certification Test</h3>
                    <button type="button" onClick={handleAddQuestion} className="bg-black text-white font-black uppercase px-4 py-2 text-xs flex items-center gap-2 hover:bg-bauhaus-blue">
                      <Plus size={14} /> Add Question
                    </button>
                  </div>
                  
                  {mcqTest.map((q, qIndex) => (
                    <div key={qIndex} className="p-6 border-4 border-black bg-gray-50 space-y-4 relative">
                      <button type="button" onClick={() => removeQuestion(qIndex)} className="absolute top-4 right-4 text-red-600 hover:text-black">
                        <Trash size={20} />
                      </button>
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase">Question {qIndex + 1}</label>
                        <input required type="text" value={q.question} onChange={(e) => updateQuestion(qIndex, 'question', e.target.value)} className="w-full border-2 border-black p-3 font-bold" placeholder="Enter question..." />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        {q.options.map((opt, optIndex) => (
                          <div key={optIndex} className="flex items-center gap-2">
                            <input 
                              type="radio" 
                              name={`correct-${qIndex}`} 
                              checked={q.correctAnswer === optIndex} 
                              onChange={() => updateQuestion(qIndex, 'correctAnswer', optIndex)} 
                              className="w-5 h-5 accent-black"
                            />
                            <input 
                              required type="text" 
                              value={opt} 
                              onChange={(e) => updateOption(qIndex, optIndex, e.target.value)} 
                              className="w-full border-2 border-black p-2 font-bold text-sm" 
                              placeholder={`Option ${optIndex + 1}`} 
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                  
                  {mcqTest.length === 0 && (
                    <div className="text-[10px] font-black uppercase opacity-50 text-center">No certification test questions added.</div>
                  )}
                </div>
                
                <BauhausButton type="submit" variant="black" className="w-full text-2xl py-6" disabled={uploading}>
                  {uploading ? 'UPLOADING & PUBLISHING...' : 'PUBLISH COURSE →'}
                </BauhausButton>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default EducatorDashboard;
