import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { BauhausButton, BauhausCard, BauhausGrid, BauhausTag } from '../components/BauhausUI';
import { GraduationCap, BookOpen, Video, FileText, CheckCircle, Award, PlayCircle, Globe } from 'lucide-react';
import { auth } from '../lib/firebase';
import { motion } from 'motion/react';
import { coursesApi, enrollmentsApi } from '../lib/api';
import { CERTIFICATION_DATA } from '../data/question.js';
import { toast } from 'react-toastify';

interface Course {
  id: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  educatorName: string;
  modules: any[];
  category?: string;
  externalUrl?: string;
  mcqTest?: { question: string, options: string[], correctAnswer: number }[];
}

const Education = () => {
  const [courses, setCourses] = useState<Course[]>([]);
  const [externalCourses, setExternalCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  
  const [takingTest, setTakingTest] = useState(false);
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [testResult, setTestResult] = useState<{ score: number; passed: boolean } | null>(null);
  const [enrollmentId, setEnrollmentId] = useState<string | null>(null);
  
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [isReviewing, setIsReviewing] = useState(false);

  useEffect(() => {
    const fetchCourses = async () => {
      try {
        const response = await coursesApi.getAll();
        setCourses(response.data.map((c: any) => {
          const isCert = c.category === 'CERTIFICATION' || Object.keys(CERTIFICATION_DATA).includes(c.title);
          return {
            ...c,
            id: c._id || c.id,
            category: isCert ? 'CERTIFICATION' : c.category,
            modules: c.modules && c.modules.length > 0 ? c.modules : (isCert ? [] : [
              { title: 'Introduction', type: 'video' },
              { title: 'Advanced Concepts', type: 'video' },
              { title: 'Final Review', type: 'notes' },
            ])
          };
        }));
      } catch (err) {
        console.error("Error fetching courses from MongoDB:", err);
      }
    };
    fetchCourses();

    // Fetch External Courses from Coursera
    const loadExternalCourses = async () => {
      try {
        const response = await fetch('https://api.coursera.org/api/courses.v1?limit=10&fields=name,description,slug');
        const data = await response.json();

        if (!data || !Array.isArray(data.elements)) {
          console.warn('Coursera API returned unexpected format:', data);
          return;
        }
        
        const formatted = data.elements.map((item: any) => ({
          id: item.id,
          title: (item.name || 'Course').toUpperCase(),
          description: item.description || 'An online learning course.',
          thumbnailUrl: `https://images.unsplash.com/photo-1516321318423-f06f85e504b3?q=80&w=800&auto=format&fit=crop`,
          educatorName: 'COURSERA PARTNER',
          modules: [],
          category: 'GLOBAL_ACADEMIC',
          externalUrl: `https://www.coursera.org/learn/${item.slug}`
        }));
        setExternalCourses(formatted);
      } catch (err) {
        console.error('Coursera Fetch Error:', err);
      }
    };

    loadExternalCourses();
  }, []);

  const handleEnroll = async (course: Course) => {
    if (!auth.currentUser) {
      toast.error("Please login to enroll.");
      return;
    }

    try {
      const res = await enrollmentsApi.enroll({
        userId: auth.currentUser.uid,
        courseId: course.id,
        userName: auth.currentUser.displayName || 'CITIZEN'
      });
      setEnrollmentId(res.data._id);
      setSelectedCourse(course);
      if (course.category === 'CERTIFICATION') {
        setTakingTest(true);
      }
      toast.success("Enrolled successfully!");
    } catch (error: any) {
      if (error.response?.status === 400) {
        toast.info("Already enrolled! Taking you to the course.");
        setSelectedCourse(course);
        if (course.category === 'CERTIFICATION') {
          setTakingTest(true);
        }
        // Try to fetch enrollment ID
        try {
           const myEnrs = await enrollmentsApi.getByUser(auth.currentUser.uid);
           const found = myEnrs.data.find((e: any) => e.courseId._id === course.id || e.courseId === course.id);
           if (found) setEnrollmentId(found._id);
        } catch(e) {}
      } else {
        console.error("Enrollment failed:", error);
        toast.error("Enrollment failed. See console.");
      }
    }
  };

  const handleTestSubmit = async () => {
    if (!selectedCourse?.mcqTest) return;
    let correct = 0;
    selectedCourse.mcqTest.forEach((q, index) => {
      if (answers[index] === q.correctAnswer) {
        correct++;
      }
    });
    const percentage = (correct / selectedCourse.mcqTest.length) * 100;
    const passed = percentage >= 65;
    setTestResult({ score: percentage, passed });

    if (passed && enrollmentId) {
      try {
        await enrollmentsApi.updateStatus(enrollmentId, 'PASSED');
      } catch (err) {
        console.error("Failed to update status", err);
      }
    }
  };

  const resetTest = () => {
    setTakingTest(false);
    setAnswers({});
    setTestResult(null);
    setCurrentQuestionIndex(0);
    setIsReviewing(false);
  };

  // Mock data for initial view if DB is empty
  const mockCourses: Course[] = [
    {
      id: '1',
      title: 'FIRST AID ESSENTIALS',
      description: 'Learn the basic life-saving techniques every citizen should know. Covers CPR, bleeding control, and choking.',
      thumbnailUrl: '',
      educatorName: 'SEWA Academy',
      category: 'MEDICAL',
      modules: [
        { title: 'Introduction to First Aid', type: 'video' },
        { title: 'CPR Techniques', type: 'video' },
        { title: 'Emergency Contact Protocol', type: 'notes' },
      ]
    },
    {
      id: '2',
      title: 'DISASTER MANAGEMENT',
      description: 'How to react during natural disasters like earthquakes, floods, and fires. Preparation and evacuation strategies.',
      thumbnailUrl: '',
      educatorName: 'SEWA Academy',
      category: 'SAFETY',
      modules: [
        { title: 'Risk Assessment', type: 'video' },
        { title: 'Evacuation Routes', type: 'video' },
        { title: 'MCQ Assessment', type: 'quiz' },
      ]
    }
  ];

  // Always merge certification data into courses from DB (or build mock courses if empty)
  const certificationCourses = Object.entries(CERTIFICATION_DATA).map(([title, mcqs], idx) => ({
    id: `cert-${idx}`,
    title: `${title.toUpperCase()} CERTIFICATION`,
    description: `Official SEWA certification test for ${title}. Pass this test to earn your volunteering badge.`,
    thumbnailUrl: '',
    educatorName: 'SEWA ACADEMY',
    category: 'CERTIFICATION',
    modules: [{ title: `Review Material for ${title}`, type: 'notes' }],
    // @ts-ignore
    mcqTest: mcqs.map((q: any) => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswerIndex
    }))
  }));

  const displayCourses: Course[] = (() => {
    if (courses.length > 0) {
      // Merge CERTIFICATION_DATA mcqTest into existing courses that match by title
      const merged = courses.map(course => {
        const certKey = Object.keys(CERTIFICATION_DATA).find(
          key => course.title.toUpperCase().includes(key.toUpperCase())
        );
        if (certKey && (!course.mcqTest || course.mcqTest.length === 0)) {
          // @ts-ignore
          const mcqs = CERTIFICATION_DATA[certKey];
          return {
            ...course,
            category: 'CERTIFICATION',
            mcqTest: mcqs.map((q: any) => ({
              question: q.question,
              options: q.options,
              correctAnswer: q.correctAnswerIndex
            }))
          };
        }
        return course;
      });
      // Also add any certification courses not already in the DB
      const existingTitles = merged.map(c => c.title.toUpperCase());
      const missingCerts = certificationCourses.filter(
        cc => !existingTitles.some(t => t.includes(cc.title.replace(' CERTIFICATION', '').toUpperCase()))
      );
      return [...merged, ...missingCerts];
    }
    // No courses in DB: show mocks + all certifications
    return [...mockCourses, ...certificationCourses];
  })();

  return (
    <div className="space-y-16 pb-24">
      {!selectedCourse ? (
        <>
          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-black pb-8">
            <div>
              <h1 className="bauhaus-header text-7xl">KNOWLEDGE GRID</h1>
              <p className="text-xl font-bold uppercase mt-2">CERTIFIED COURSES FOR SOCIAL RESPONSIBILITY</p>
            </div>
            <div className="flex gap-4">
              <Link to="/my-courses">
                <BauhausButton variant="secondary">MY COURSES</BauhausButton>
              </Link>
              <BauhausButton variant="black">BECOME EDUCATOR</BauhausButton>
            </div>
          </div>

          <BauhausGrid cols={2}>
            {displayCourses.map((course) => (
              <BauhausCard 
                key={course.id}
                title={course.title}
                category="COURSE"
                categoryColor="bg-bauhaus-blue"
                actionText="ENROLL"
                onAction={() => handleEnroll(course)}
              >
                <div className="space-y-4">
                   <p className="font-bold uppercase opacity-80">{course.description}</p>
                   <div className="flex gap-4">
                      <div className="flex items-center gap-2 font-black text-sm">
                         <Video size={18} /> {course.modules.length} LESSONS
                      </div>
                      <div className="flex items-center gap-2 font-black text-sm">
                         <Award size={18} /> CERTIFICATE
                      </div>
                   </div>
                   <div className="p-3 bg-gray-100 border-2 border-black flex items-center gap-3">
                      <div className="w-8 h-8 bg-black rounded-full text-white flex items-center justify-center font-black text-xs">S</div>
                      <span className="font-black uppercase text-xs">{course.educatorName}</span>
                   </div>
                </div>
              </BauhausCard>
            ))}
          </BauhausGrid>

          <section className="space-y-12">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 border-b-4 border-black pb-8">
              <div>
                <h2 className="bauhaus-header text-5xl uppercase">Global Learning Opportunities</h2>
                <p className="text-sm font-black uppercase opacity-60">Verified academic courses from Coursera Global Catalog</p>
              </div>
              <div className="bg-bauhaus-blue text-white px-4 py-2 font-black text-xs uppercase flex items-center gap-2">
                <Globe size={16} /> WORLDWIDE KNOWLEDGE
              </div>
            </div>

            <BauhausGrid cols={2}>
              {externalCourses.map((course) => (
                <BauhausCard 
                  key={course.id}
                  title={course.title}
                  category="EXTERNAL COURSE"
                  categoryColor="bg-black"
                  actionText="VIEW ON COURSERA"
                  onAction={() => window.open(course.externalUrl, '_blank')}
                >
                  <div className="space-y-4">
                    <p className="font-bold uppercase opacity-80 line-clamp-3">{course.description}</p>
                    <div className="flex gap-4">
                        <div className="flex items-center gap-2 font-black text-sm">
                           <Globe size={18} /> GLOBAL ACCESS
                        </div>
                        <div className="flex items-center gap-2 font-black text-sm">
                           <Award size={18} /> UNIVERSITY PARTNERS
                        </div>
                    </div>
                    <div className="p-3 bg-gray-100 border-2 border-black flex items-center gap-3">
                        <div className="w-8 h-8 bg-bauhaus-blue rounded-full text-white flex items-center justify-center font-black text-xs">C</div>
                        <span className="font-black uppercase text-xs">PLATFORM: COURSERA</span>
                    </div>
                  </div>
                </BauhausCard>
              ))}
            </BauhausGrid>
          </section>

          <section className="bg-bauhaus-yellow p-12 border-4 border-black grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
             <div className="space-y-6">
                <h2 className="bauhaus-header text-5xl">CERTIFICATION TRACK</h2>
                <p className="text-xl font-bold uppercase">Pass our comprehensive 100-question MCQ tests to earn official SEWA volunteering certifications recognized by partner NGOs.</p>
                <div className="flex gap-4">
                   <div className="w-20 h-20 bg-black flex items-center justify-center text-white border-2 border-white">
                      <Award size={48} />
                   </div>
                   <div className="w-20 h-20 bg-bauhaus-red flex items-center justify-center text-white border-2 border-black">
                      <CheckCircle size={48} />
                   </div>
                </div>
             </div>
             <div className="bauhaus-card p-8 bg-white space-y-4">
                <h3 className="font-black text-2xl uppercase">Upcoming Tests</h3>
                {[
                  'Blood Donation Protocol',
                  'Animal Rescue Basics',
                  'Civic Law for Citizens'
                ].map((test, i) => (
                  <div key={i} className="flex justify-between items-center border-b-2 border-black pb-2 last:border-0">
                     <span className="font-bold uppercase">{test}</span>
                     <BauhausButton variant="outline" className="text-xs py-1 px-2">Register</BauhausButton>
                  </div>
                ))}
             </div>
          </section>
        </>
      ) : (
        <div className="space-y-8">
           <button 
            onClick={() => { setSelectedCourse(null); resetTest(); }}
            className="bauhaus-header text-2xl border-b-4 border-black inline-block hover:bg-black hover:text-white"
           >
            ← BACK TO GRID
           </button>
           
           <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
              <div className="lg:col-span-2 space-y-8">
                 {takingTest ? (
                    <div className="bauhaus-card p-0 md:p-4 space-y-0 bg-gray-50 flex flex-col lg:flex-row gap-8 items-start">
                       {/* Left side: Questions or Results */}
                       <div className="flex-grow space-y-6 w-full p-4 md:p-8">
                           <h2 className="bauhaus-header text-5xl uppercase border-b-4 border-black pb-4">
                              {testResult ? (isReviewing ? 'Review Answers' : 'Test Result') : 'Certification Test'}
                           </h2>
                           
                           {testResult ? (
                              isReviewing ? (
                                <div className="space-y-12">
                                  {selectedCourse?.mcqTest?.map((q, qIndex) => {
                                    const isCorrect = answers[qIndex] === q.correctAnswer;
                                    return (
                                      <div key={qIndex} className="space-y-4 p-6 border-4 border-black bg-white" id={`question-${qIndex}`}>
                                         <div className="flex justify-between items-start">
                                            <p className="font-black uppercase text-xl">Q{qIndex + 1}. {q.question}</p>
                                            {isCorrect ? <CheckCircle className="text-green-600" size={32} /> : <div className="text-bauhaus-red font-black text-2xl leading-none">X</div>}
                                         </div>
                                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                            {q.options.map((opt, oIndex) => {
                                               let bgClass = "bg-gray-100 hover:bg-gray-200";
                                               let borderClass = "border-black";
                                               if (oIndex === q.correctAnswer) {
                                                  bgClass = "bg-green-600 text-white";
                                               } else if (answers[qIndex] === oIndex && !isCorrect) {
                                                  bgClass = "bg-bauhaus-red text-white";
                                               }
                                               return (
                                                 <div key={oIndex} className={`p-4 border-2 ${borderClass} font-bold uppercase text-left transition-colors ${bgClass}`}>
                                                    {opt}
                                                 </div>
                                               );
                                            })}
                                         </div>
                                      </div>
                                    );
                                  })}
                                  <BauhausButton variant="black" className="w-full text-xl py-4" onClick={() => { setIsReviewing(false); }}>BACK TO RESULT</BauhausButton>
                                </div>
                              ) : (
                                <div className={`p-8 border-4 border-black text-center ${testResult.passed ? 'bg-bauhaus-blue text-white' : 'bg-bauhaus-red text-white'}`}>
                                   <h3 className="bauhaus-header text-6xl mb-4">{testResult.passed ? 'PASSED!' : 'FAILED'}</h3>
                                   <p className="font-black text-3xl uppercase mb-8">Score: {Math.round(testResult.score)}%</p>
                                   <p className="font-bold text-xl mb-8">
                                     {testResult.passed ? 'Congratulations! You have earned your certification.' : 'You need at least 65% to pass. Review the material and try again.'}
                                   </p>
                                   <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                      <BauhausButton variant="outline" className="bg-white text-black font-black" onClick={() => setIsReviewing(true)}>
                                         REVIEW ANSWERS
                                      </BauhausButton>
                                      <BauhausButton variant={testResult.passed ? 'secondary' : 'black'} onClick={resetTest}>
                                         {testResult.passed ? 'RETURN TO COURSE' : 'RETRY TEST'}
                                      </BauhausButton>
                                   </div>
                                </div>
                              )
                           ) : (
                              <div className="space-y-8">
                                 <div className="bg-bauhaus-yellow p-4 border-2 border-black font-black uppercase text-sm flex justify-between items-center">
                                    <span>Question {currentQuestionIndex + 1} of {selectedCourse?.mcqTest?.length}</span>
                                    <span className="opacity-50">Score Requirement: 65%</span>
                                 </div>
                                 
                                 {selectedCourse?.mcqTest && (
                                   <div className="space-y-8">
                                      <p className="font-black uppercase text-3xl md:text-4xl leading-tight">
                                        {selectedCourse.mcqTest[currentQuestionIndex].question}
                                      </p>
                                      <div className="grid grid-cols-1 gap-4">
                                         {selectedCourse.mcqTest[currentQuestionIndex].options.map((opt, oIndex) => (
                                            <button
                                              key={oIndex}
                                              onClick={() => {
                                                setAnswers({...answers, [currentQuestionIndex]: oIndex});
                                                if (currentQuestionIndex < selectedCourse.mcqTest!.length - 1) {
                                                   setTimeout(() => setCurrentQuestionIndex(curr => curr + 1), 400);
                                                }
                                              }}
                                              className={`p-6 border-4 border-black font-black uppercase text-left transition-all hover:-translate-y-1 ${answers[currentQuestionIndex] === oIndex ? 'bg-black text-white shadow-[8px_8px_0px_0px_#FFD700]' : 'bg-white shadow-[8px_8px_0px_0px_black]'}`}
                                            >
                                               {opt}
                                            </button>
                                         ))}
                                      </div>
                                   </div>
                                 )}

                                 <div className="flex justify-between items-center pt-8 border-t-4 border-black">
                                    <BauhausButton 
                                      variant="outline" 
                                      className="font-black"
                                      onClick={() => setCurrentQuestionIndex(Math.max(0, currentQuestionIndex - 1))}
                                      disabled={currentQuestionIndex === 0}
                                    >
                                      ← PREVIOUS
                                    </BauhausButton>
                                    
                                    {currentQuestionIndex === (selectedCourse?.mcqTest?.length || 1) - 1 ? (
                                      <BauhausButton 
                                        variant="black" 
                                        className="font-black"
                                        onClick={handleTestSubmit}
                                      >
                                        SUBMIT TEST →
                                      </BauhausButton>
                                    ) : (
                                      <BauhausButton 
                                        variant="outline" 
                                        className="font-black"
                                        onClick={() => setCurrentQuestionIndex(Math.min((selectedCourse?.mcqTest?.length || 1) - 1, currentQuestionIndex + 1))}
                                      >
                                        SKIP / NEXT →
                                      </BauhausButton>
                                    )}
                                 </div>
                              </div>
                           )}
                       </div>

                       {/* Right side: Navigation Grid */}
                       {(!testResult || isReviewing) && selectedCourse?.mcqTest && (
                         <div className="w-full lg:w-72 shrink-0 border-t-4 lg:border-t-0 lg:border-l-4 border-black bg-white p-6 min-h-full">
                           <div className="sticky top-24">
                              <h3 className="font-black uppercase text-xl mb-6 border-b-2 border-black pb-2">Question Grid</h3>
                              <div className="grid grid-cols-5 sm:grid-cols-8 lg:grid-cols-5 gap-2">
                                {selectedCourse.mcqTest.map((_, idx) => {
                                  let bgClass = "bg-gray-100 hover:bg-gray-300 text-black";
                                  if (testResult && isReviewing) {
                                     const isCorrect = answers[idx] === selectedCourse.mcqTest![idx].correctAnswer;
                                     bgClass = isCorrect ? "bg-green-600 text-white hover:bg-green-700" : "bg-bauhaus-red text-white hover:bg-red-700";
                                  } else {
                                     if (currentQuestionIndex === idx) bgClass = "bg-bauhaus-yellow border-2 border-black font-black shadow-[2px_2px_0px_0px_black]";
                                     else if (answers[idx] !== undefined) bgClass = "bg-black text-white hover:bg-gray-800";
                                  }

                                  return (
                                    <button 
                                      key={idx}
                                      onClick={() => {
                                        if (!testResult) setCurrentQuestionIndex(idx);
                                        else {
                                          // scroll to question
                                          document.getElementById(`question-${idx}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                                        }
                                      }}
                                      className={`aspect-square flex items-center justify-center font-black text-xs transition-colors border-2 border-transparent ${bgClass}`}
                                      title={answers[idx] !== undefined ? `Answered: Option ${answers[idx] + 1}` : 'Unanswered'}
                                    >
                                      {idx + 1}
                                    </button>
                                  );
                                })}
                              </div>
                              {!testResult && (
                                <div className="mt-8 space-y-4">
                                  <div className="flex items-center gap-3 text-xs font-black uppercase"><div className="w-4 h-4 bg-black border-2 border-black"></div> Answered</div>
                                  <div className="flex items-center gap-3 text-xs font-black uppercase"><div className="w-4 h-4 bg-gray-100 border-2 border-black"></div> Unanswered</div>
                                  <div className="flex items-center gap-3 text-xs font-black uppercase"><div className="w-4 h-4 bg-bauhaus-yellow border-2 border-black shadow-[2px_2px_0px_0px_black]"></div> Current</div>
                                  <BauhausButton 
                                    variant="black" 
                                    className="w-full py-4 text-sm mt-6 shadow-[4px_4px_0px_0px_black]" 
                                    onClick={handleTestSubmit}
                                  >
                                    FINISH EXAM
                                  </BauhausButton>
                                </div>
                              )}
                           </div>
                         </div>
                       )}
                    </div>
                 ) : (
                   <>
                     <div className="aspect-video bg-black border-4 border-black flex items-center justify-center relative group">
                        <PlayCircle size={100} className="text-white opacity-40 group-hover:opacity-100 transition-opacity cursor-pointer" />
                        <div className="absolute top-4 left-4 bg-bauhaus-red text-white p-2 font-black uppercase text-sm">MODULE 1: {selectedCourse.modules[0]?.title}</div>
                     </div>
                     <div className="bauhaus-card p-8">
                        <h2 className="bauhaus-header text-5xl mb-4">{selectedCourse.title}</h2>
                        <div className="prose max-w-none font-bold uppercase text-lg">
                           {selectedCourse.description}
                        </div>
                     </div>
                   </>
                 )}
              </div>
              {selectedCourse.category !== 'CERTIFICATION' && (
                <div className="space-y-6 mt-8 lg:mt-0">
                   <h3 className="bauhaus-header text-3xl">MODULES</h3>
                   <div className="space-y-2">
                      {selectedCourse.modules.map((m: any, i: number) => (
                        <div key={i} onClick={() => setTakingTest(false)} className="bauhaus-card p-4 flex items-center gap-4 hover:bg-bauhaus-blue hover:text-white cursor-pointer group">
                           <div className="w-8 h-8 bg-black text-white flex items-center justify-center font-black">{i+1}</div>
                           <div className="flex-grow font-black uppercase">{m.title}</div>
                           {m.type === 'video' ? <Video size={20} /> : <FileText size={20} />}
                        </div>
                      ))}
                      {selectedCourse.mcqTest && selectedCourse.mcqTest.length > 0 && (
                        <div 
                          onClick={() => setTakingTest(true)}
                          className={`bauhaus-card p-4 flex items-center gap-4 border-dashed border-2 cursor-pointer transition-all ${takingTest ? 'bg-black text-white' : 'bg-bauhaus-yellow hover:bg-black hover:text-white'}`}
                        >
                             <div className={`w-8 h-8 flex items-center justify-center font-black ${takingTest ? 'bg-white text-black' : 'bg-black text-white'}`}>?</div>
                             <div className="flex-grow font-black uppercase">Final MCQ Test</div>
                             <Award size={20} />
                        </div>
                      )}
                   </div>
                   <BauhausCard title="EDUCATOR" className="bg-bauhaus-accent text-white">
                      <p className="font-black uppercase text-2xl leading-none">{selectedCourse.educatorName}</p>
                      <p className="text-sm mt-2 opacity-80">VERIFIED SEWA EDUCATORS PROVIDE HIGH-QUALITY CONTENT BACKED BY REAL-WORLD EXPERIENCE.</p>
                   </BauhausCard>
                </div>
              )}
           </div>
        </div>
      )}
    </div>
  );
};

export default Education;
