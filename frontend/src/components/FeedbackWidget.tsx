import React, { useState } from 'react';
import { MessageSquare, X, Send, CheckCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../lib/firebase';
import { feedbackApi } from '../lib/api';
import { toast } from 'react-toastify';

const FeedbackWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [type, setType] = useState<'feedback' | 'complaint' | 'report'>('feedback');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!auth.currentUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth.currentUser) return;
    setSubmitting(true);
    try {
      await feedbackApi.create({
        userId: auth.currentUser.uid,
        userName: auth.currentUser.displayName || auth.currentUser.email || 'User',
        type,
        subject,
        message,
      });
      setSubmitted(true);
      setTimeout(() => {
        setIsOpen(false);
        setSubmitted(false);
        setSubject('');
        setMessage('');
        setType('feedback');
      }, 2000);
    } catch (err) {
      console.error('Feedback submission failed:', err);
      toast.error('Failed to submit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      {/* Floating Trigger Button */}
      <motion.button
        onClick={() => setIsOpen(true)}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        className="fixed bottom-6 right-6 z-[150] bg-black text-white w-14 h-14 flex items-center justify-center border-2 border-white shadow-[4px_4px_0px_0px_#FFCC00] hover:bg-bauhaus-blue transition-colors"
        title="Send Feedback or Report"
      >
        <MessageSquare size={22} />
      </motion.button>

      {/* Feedback Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="fixed bottom-24 right-6 z-[150] w-full max-w-sm bg-white border-4 border-black shadow-[8px_8px_0px_0px_black]"
          >
            {/* Header */}
            <div className="bg-black text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquare size={18} />
                <div>
                  <div className="font-black uppercase text-sm leading-none">PLATFORM FEEDBACK</div>
                  <div className="text-[9px] font-bold uppercase opacity-50 mt-0.5">Your voice matters</div>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-bauhaus-red transition-colors"
              >
                <X size={16} />
              </button>
            </div>

            {submitted ? (
              <div className="p-8 flex flex-col items-center justify-center text-center space-y-4">
                <CheckCircle size={48} className="text-green-600" />
                <div className="font-black uppercase text-xl">RECEIVED!</div>
                <p className="font-bold uppercase text-xs opacity-60">Our admin team will review your submission.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="p-5 space-y-4">
                {/* Type selector */}
                <div className="flex gap-2">
                  {(['feedback', 'complaint', 'report'] as const).map(t => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setType(t)}
                      className={`flex-1 py-1.5 text-[9px] font-black uppercase border-2 border-black transition-colors ${
                        type === t ? 'bg-black text-white' : 'bg-white hover:bg-bauhaus-yellow'
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest">Subject</label>
                  <input
                    required
                    type="text"
                    value={subject}
                    onChange={e => setSubject(e.target.value)}
                    className="w-full border-2 border-black p-2.5 font-bold text-sm focus:bg-bauhaus-yellow outline-none"
                    placeholder="Brief subject..."
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[9px] font-black uppercase tracking-widest">Message</label>
                  <textarea
                    required
                    value={message}
                    onChange={e => setMessage(e.target.value)}
                    className="w-full border-2 border-black p-2.5 font-bold text-sm focus:bg-gray-50 outline-none resize-none min-h-[80px]"
                    placeholder="Describe your feedback or issue..."
                  />
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 bg-black text-white font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-bauhaus-blue transition-colors disabled:opacity-50 border-2 border-black"
                >
                  <Send size={14} />
                  {submitting ? 'SENDING...' : 'SUBMIT FEEDBACK →'}
                </button>
              </form>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default FeedbackWidget;
