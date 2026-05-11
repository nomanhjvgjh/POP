import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { ArrowRight, Droplets, Wind, Star, Instagram, Twitter, Facebook, Zap, X, MapPin, Thermometer } from "lucide-react";
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, Timestamp } from "firebase/firestore";
import { db, auth } from "../lib/firebase";

enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

interface Review {
  id: string;
  name: string;
  rating: number;
  description: string;
  date: string;
}

const fadeInUp = {
  initial: { opacity: 0, y: 30 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true },
  transition: { duration: 0.8, ease: "easeOut" }
} as const;

const staggerContainer = {
  initial: {},
  whileInView: {
    transition: {
      staggerChildren: 0.1
    }
  }
} as const;

// Sub-component for individual review cards
function ReviewCard({ rev }: { rev: Review }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const truncatedThreshold = 180;
  const isLong = rev.description.length > truncatedThreshold;
  const displayText = isExpanded ? rev.description : (isLong ? rev.description.slice(0, truncatedThreshold) + "..." : rev.description);

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      layout
      className="bg-white/5 border border-white/10 p-8 rounded-3xl group hover:bg-white/10 transition-colors relative flex flex-col justify-between overflow-hidden"
    >
      <div>
        <div className="flex justify-between items-start mb-6">
          <div>
            <h4 className="font-black text-xl mb-1 tracking-tighter">{rev.name}</h4>
            <span className="text-[9px] opacity-30 font-bold tracking-[0.2em]">{rev.date}</span>
          </div>
          <div className="flex gap-1 text-strawberry">
            {[...Array(5)].map((_, i) => (
              <Star key={i} size={10} fill={i < rev.rating ? "currentColor" : "none"} />
            ))}
          </div>
        </div>
        <p className="text-sm text-white/70 italic leading-relaxed transition-all duration-300">
          "{displayText}"
        </p>
      </div>

      {isLong && (
        <motion.button
          onClick={() => setIsExpanded(!isExpanded)}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          className="mt-6 text-[10px] uppercase tracking-[0.4em] font-black text-strawberry opacity-0 group-hover:opacity-100 transition-all hover:scale-105"
        >
          {isExpanded ? "Collapse Archive" : "Read More"}
        </motion.button>
      )}
    </motion.div>
  );
}

export function Overlay() {
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [rating, setRating] = useState(0);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [communityReviews, setCommunityReviews] = useState<Review[]>([]);

  useEffect(() => {
    const reviewsRef = collection(db, 'reviews');
    const q = query(reviewsRef, orderBy('createdAt', 'desc'));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const reviews = snapshot.docs.map(doc => {
        const data = doc.data();
        const createdAt = data.createdAt as Timestamp;
        return {
          id: doc.id,
          name: data.name,
          rating: data.rating,
          description: data.description,
          date: createdAt ? new Date(createdAt.toMillis()).toLocaleDateString('en-US', { month: 'short', day: '2-digit', year: 'numeric' }).toUpperCase() : 'JUST NOW'
        } as Review;
      });
      setCommunityReviews(reviews);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'reviews');
    });

    return () => unsubscribe();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (rating === 0) return alert("Please select a star rating.");
    
    const path = 'reviews';
    try {
      await addDoc(collection(db, path), {
        name: name.toUpperCase(),
        rating: rating,
        description: description,
        createdAt: serverTimestamp()
      });

      setSubmitted(true);
      
      setTimeout(() => {
        setIsReviewOpen(false);
        setSubmitted(false);
        setName("");
        setRating(0);
        setDescription("");
      }, 2000);
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, path);
    }
  };

  return (
    <div className="relative z-10 font-sans selection:bg-strawberry selection:text-white text-brand-black">
      {/* Background Texture Overlay */}
      <div className="fixed inset-0 pointer-events-none z-[999] opacity-[0.03] mix-blend-multiply bg-[url('https://grainy-gradients.vercel.app/noise.svg')] brightness-100 contrast-150"></div>

      {/* Review Modal */}
      <AnimatePresence>
        {isReviewOpen && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] flex items-center justify-center p-6"
          >
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsReviewOpen(false)}
              className="absolute inset-0 bg-brand-black/60 backdrop-blur-md"
            />
            
            <motion.div 
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              className="bg-white w-full max-w-2xl rounded-[3rem] overflow-hidden border-2 border-brand-black shadow-[24px_24px_0px_0px_rgba(0,0,0,1)] relative z-10"
            >
              <button 
                onClick={() => setIsReviewOpen(false)}
                className="absolute top-8 right-8 text-brand-black opacity-30 hover:opacity-100 transition-opacity"
              >
                <X size={24} />
              </button>

              <div className="p-12 md:p-16">
                {!submitted ? (
                  <>
                    <span className="text-strawberry font-black uppercase text-[10px] tracking-[0.4em] mb-4 block">Archive Entry</span>
                    <h3 className="text-4xl md:text-6xl font-display font-black tracking-tighter mb-8 leading-[0.9]">DOCUMENT <br /> <span className="italic font-light">YOUR CHILL.</span></h3>
                    
                    <form onSubmit={handleSubmit} className="space-y-8">
                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Archive Entry Name</label>
                        <input 
                          required 
                          type="text" 
                          value={name}
                          onChange={(e) => setName(e.target.value)}
                          placeholder="e.g. MARCUS A." 
                          className="w-full bg-brand-black/5 border-b-2 border-brand-black p-4 text-sm font-bold placeholder:opacity-20 focus:outline-none" 
                        />
                      </div>

                      <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1 text-brand-black">Experience Rating ({rating}/5)</label>
                        <div className="flex gap-4">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button 
                              key={star}
                              type="button"
                              onClick={() => setRating(star)}
                              className={`transition-colors ${rating >= star ? "text-strawberry" : "text-brand-black/20 hover:text-strawberry/50"}`}
                            >
                              <Star size={32} fill={rating >= star ? "currentColor" : "none"} />
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest opacity-40 ml-1">Archive Description</label>
                        <textarea 
                          required 
                          value={description}
                          onChange={(e) => setDescription(e.target.value)}
                          placeholder="DESCRIBE THE SENSORY JOURNEY..." 
                          className="w-full bg-brand-black/5 border-b-2 border-brand-black p-4 text-sm font-bold placeholder:opacity-20 focus:outline-none min-h-[120px] resize-none" 
                        />
                      </div>

                      <motion.button 
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        type="submit"
                        className="w-full bg-brand-black text-white py-6 rounded-full font-black uppercase text-xs tracking-[0.2em] shadow-[8px_8px_0px_0px_rgba(255,107,107,0.3)]"
                      >
                        Commit to Archive
                      </motion.button>
                    </form>
                  </>
                ) : (
                  <motion.div 
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="py-20 text-center"
                  >
                    <div className="w-24 h-24 bg-nectar-orange rounded-full flex items-center justify-center mx-auto mb-8">
                      <motion.div
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        className="text-white"
                      >
                        <Zap size={48} fill="currentColor" />
                      </motion.div>
                    </div>
                    <h3 className="text-4xl font-display font-black tracking-tighter mb-4">ARCHIVED.</h3>
                    <p className="text-[10px] uppercase tracking-[0.3em] font-black opacity-40">Your sensory data has been preserved in the frozen matrix.</p>
                  </motion.div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
      {/* Navbar */}
      <motion.nav 
        initial={{ y: -100 }}
        animate={{ y: 0 }}
        transition={{ duration: 1, ease: "easeOut" }}
        className="fixed top-0 left-0 w-full p-4 md:p-6 flex justify-between items-center z-50 bg-linear-to-b from-brand-cream/80 to-transparent backdrop-blur-md"
      >
        <div className="text-xl font-black tracking-tighter uppercase text-brand-black">NECTOR<span className="text-nectar-orange">.</span></div>
        <div className="hidden lg:flex gap-12 text-[10px] font-bold uppercase tracking-[0.2em] opacity-60 text-brand-black">
          <a href="#collection" className="hover:opacity-100 transition-opacity">Archive</a>
          <a href="#community-archive" className="hover:opacity-100 transition-opacity">Community</a>
          <a href="#story" className="hover:opacity-100 transition-opacity">Manifesto</a>
          <a href="#reviews" className="hover:opacity-100 transition-opacity">Voices</a>
        </div>
        <motion.button 
          onClick={() => setIsReviewOpen(true)}
          whileHover={{ scale: 1.05, backgroundColor: "#000", color: "#fff" }}
          whileTap={{ scale: 0.95 }}
          className="px-6 py-2 border-2 border-brand-black rounded-full text-[10px] font-black uppercase tracking-[0.15em] transition-all text-brand-black bg-white/20"
        >
          Submit Entry
        </motion.button>
      </motion.nav>

      {/* Hero Section */}
      <section className="h-screen flex flex-col items-center justify-center text-center px-4 relative overflow-hidden pointer-events-none">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 1.2, ease: "easeOut" }}
          className="max-w-5xl pointer-events-auto"
        >
          <motion.span 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 1, delay: 0.5 }}
            className="text-strawberry font-black uppercase text-[11px] tracking-[0.4em] mb-8 block"
          >
            The Frozen Archive
          </motion.span>
          <h1 className="text-7xl md:text-[10rem] font-display font-black leading-[0.8] tracking-tighter mb-12 text-brand-black">
            PURE <br /> <span className="italic font-light">NECTOR.</span>
          </h1>
          <p className="max-w-md mx-auto text-brand-black/50 text-sm leading-relaxed mb-12 font-bold uppercase tracking-[0.2em]">
            A documented sensory journey through nature's most elusive harvests. No sales. Just pure evaluation.
          </p>
          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            <motion.button 
              whileHover={{ scale: 1.05, x: 5 }}
              className="bg-brand-black text-white px-12 py-6 rounded-full font-black uppercase text-xs tracking-[0.2em] flex items-center gap-4 transition-all"
            >
              Explore the Archive <ArrowRight size={16} />
            </motion.button>
          </div>
        </motion.div>
      </section>

      {/* Story Section */}
      <section id="story" className="min-h-screen py-40 px-6 md:px-20 relative z-20">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row gap-24 items-center">
          <motion.div {...fadeInUp} className="flex-1">
            <span className="text-nectar-orange font-bold uppercase tracking-[0.3em] text-[10px] mb-6 block">Our Philosophy</span>
            <h2 className="text-6xl md:text-9xl font-display font-black tracking-tighter mb-10 leading-[0.85] text-brand-black">
              CRAFTED BY <br /> <span className="italic font-light">PATIENCE.</span>
            </h2>
            <p className="text-lg md:text-xl text-brand-black/60 mb-16 leading-relaxed max-w-xl font-medium">
              We don't just freeze fruit. We preserve a moment of peak vitality. Our mission is to document the true flavor of the sun, untainted by industry standards.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12 text-brand-black">
                <div className="space-y-4">
                    <div className="w-12 h-12 rounded-full border-2 border-brand-black flex items-center justify-center">
                        <Droplets className="text-brand-black" size={20} />
                    </div>
                    <h4 className="font-black uppercase tracking-tight text-xl">Review Standard</h4>
                    <p className="text-sm opacity-50 leading-relaxed font-bold">Every submission is verified for authenticity. We prioritize raw, unfiltered feedback.</p>
                </div>
                <div className="space-y-4">
                    <div className="w-12 h-12 rounded-full border-2 border-brand-black flex items-center justify-center">
                        <Wind className="text-brand-black" size={20} />
                    </div>
                    <h4 className="font-black uppercase tracking-tight text-xl">The 10-Point Cold Scale</h4>
                    <p className="text-sm opacity-50 leading-relaxed font-bold">Our proprietary evaluation system used by top pâtissiers to rank frozen density.</p>
                </div>
            </div>
          </motion.div>
          <motion.div 
            initial={{ opacity: 0, x: 50 }}
            whileInView={{ opacity: 1, x: 0 }}
            transition={{ duration: 1, ease: "easeOut" }}
            className="flex-1 relative"
          >
            <div className="aspect-[4/5] rounded-[2rem] overflow-hidden border-2 border-brand-black shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] relative group">
                <img 
                src="https://images.unsplash.com/photo-1543362906-acfc16c67564?q=80&w=1000&auto=format&fit=crop" 
                alt="Exquisite fruit detail" 
                className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110"
                referrerPolicy="no-referrer"
                />
            </div>
          </motion.div>
        </div>
      </section>

      {/* Video Reviews Section */}
      <section id="reviews" className="py-40 bg-brand-black/5 backdrop-blur-sm px-6 md:px-20 overflow-hidden relative">
        {/* Joint Shades */}
        <div className="absolute top-0 left-0 w-full h-40 bg-linear-to-b from-brand-cream to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-40 bg-linear-to-t from-brand-cream to-transparent pointer-events-none" />
        
        <div className="max-w-7xl mx-auto mb-24 text-center relative z-10">
          <motion.span {...fadeInUp} className="text-strawberry font-bold uppercase tracking-[0.4em] text-[10px] mb-8 block">Cinematic Testimonials</motion.span>
          <motion.h2 {...fadeInUp} className="text-5xl md:text-8xl font-display font-black tracking-tighter mb-10 leading-[0.9]">
            THE <span className="italic font-light">VOICE</span> OF COLD.
          </motion.h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 max-w-7xl mx-auto">
          {[
            { author: "Chef Marcelle", location: "LYON, FR", rating: "9.8" },
            { author: "Emi Tanaka", location: "TOKYO, JP", rating: "9.6" },
            { author: "Julian V.", location: "NYC, US", rating: "9.9" }
          ].map((vid, i) => (
            <motion.div 
              key={i}
              initial={{ opacity: 0, y: 50 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.2 }}
              className="aspect-video bg-white/5 rounded-3xl relative border border-white/10 overflow-hidden group cursor-pointer"
            >
              <div className="absolute inset-0 bg-linear-to-t from-brand-black to-transparent z-10" />
              <img 
                src={`https://images.unsplash.com/photo-1541167760496-162955ed8a9f?q=80&w=1000&auto=format&fit=crop`} 
                className="w-full h-full object-cover opacity-40 group-hover:scale-105 transition-transform duration-700" 
                alt="Reviewer context" 
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <div className="w-16 h-16 rounded-full bg-white text-brand-black flex items-center justify-center scale-90 group-hover:scale-100 transition-transform">
                   <Zap size={24} />
                </div>
              </div>
              <div className="absolute bottom-8 left-8 z-20">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-black tracking-widest bg-strawberry px-2 py-1 rounded-md">COLD SCORE: {vid.rating}</span>
                </div>
                <h4 className="font-display font-black text-xl uppercase tracking-tighter">{vid.author}</h4>
                <p className="text-[10px] opacity-40 font-bold uppercase tracking-widest mt-1">{vid.location}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* Flavor Carousel / Anthology */}
      <section id="collection" className="py-40 relative overflow-hidden">
        {/* Joint Shades */}
        <div className="absolute top-0 left-0 w-full h-60 bg-linear-to-b from-brand-cream/50 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-60 bg-linear-to-t from-brand-black/10 to-transparent pointer-events-none" />

        <div className="px-6 md:px-20 mb-24 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 relative z-10">
            <motion.div {...fadeInUp}>
                <span className="text-blueberry font-bold uppercase tracking-[0.3em] text-[10px] mb-6 block">Seasonal Anthology</span>
                <h2 className="text-6xl md:text-9xl font-display font-black tracking-tighter leading-[0.85] text-brand-black">FLAVOR <br /> <span className="italic font-light">CRITIQUES.</span></h2>
            </motion.div>
            <p className="max-w-xs text-brand-black/30 text-[10px] leading-relaxed uppercase tracking-[0.3em] font-bold">
                Read what the global connoisseurs have explored. Every popsicle has a legacy.
            </p>
        </div>
        
        <motion.div 
            variants={staggerContainer}
            initial="initial"
            whileInView="whileInView"
            viewport={{ once: true }}
            className="flex gap-8 px-6 md:px-20 overflow-x-auto pb-20 no-scrollbar"
        >
            {[
                { name: "Alphonso Mango", review: "A defiant fusion of velvet and zest." },
                { name: "Wild Dragonfruit", review: "Floral, aggressive, and undeniably summer." },
                { name: "White Nectarine", review: "The definition of crystalline sweetness." },
                { name: "Alpine Berry", review: "A deep, indigo journey into pure frost." }
            ].map((flavor, i) => (
                <motion.div 
                    key={i} 
                    variants={fadeInUp}
                    whileHover={{ scale: 1.02, y: -10 }}
                    className="min-w-[320px] md:min-w-[400px] h-[580px] rounded-[3rem] p-12 flex flex-col justify-between group cursor-pointer relative overflow-hidden border-2 border-brand-black bg-white shadow-[12px_12px_0px_0px_rgba(0,0,0,1)] hover:shadow-[20px_20px_0px_0px_rgba(0,0,0,1)] hover:border-brand-black transition-all"
                >
                    <div className="relative z-10">
                        <span className="text-[10px] uppercase tracking-[0.4em] font-bold opacity-30 text-brand-black">Critique {i+1}</span>
                        <h3 className="text-5xl font-display font-black mt-6 leading-[0.9] tracking-tighter text-brand-black">{flavor.name}</h3>
                    </div>
                    <div className="relative z-10 italic font-medium text-lg leading-relaxed text-brand-black/80">
                        "{flavor.review}"
                    </div>
                    <div className="relative z-10">
                        <div className="flex justify-between items-center">
                            <div className="flex flex-col gap-1">
                                <span className="text-[9px] font-black uppercase tracking-widest opacity-30 text-brand-black">Community Avg</span>
                                <div className="flex gap-1 text-nectar-orange">
                                  <Star size={10} fill="currentColor" />
                                  <Star size={10} fill="currentColor" />
                                  <Star size={10} fill="currentColor" />
                                  <Star size={10} fill="currentColor" />
                                  <Star size={10} fill="currentColor" />
                                </div>
                            </div>
                            <motion.div 
                                className="w-16 h-16 rounded-full bg-brand-black text-white flex items-center justify-center"
                            >
                                <ArrowRight size={24} />
                            </motion.div>
                        </div>
                    </div>
                </motion.div>
            ))}
        </motion.div>
      </section>

      {/* Submit Section */}
      <section id="submit" className="py-60 px-6 text-center relative overflow-hidden bg-white/40 backdrop-blur-md">
        {/* Joint Shades */}
        <div className="absolute top-0 left-0 w-full h-40 bg-linear-to-b from-brand-cream to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-full h-40 bg-linear-to-t from-brand-black to-transparent pointer-events-none" />
        
        <motion.div {...fadeInUp} className="relative z-10">
            <h2 className="text-5xl md:text-8xl font-display font-black max-w-6xl mx-auto tracking-tighter leading-[0.95] mb-12 uppercase text-brand-black">
                HAVE YOU FELT THE <span className="italic font-light text-strawberry">CHILL?</span>
            </h2>
            <p className="mb-12 max-w-md mx-auto text-brand-black/40 text-[10px] uppercase tracking-[0.4em] font-bold">
                Submit your documented experience to the archive.
            </p>
            <motion.button 
              onClick={() => setIsReviewOpen(true)}
              whileHover={{ 
                scale: 1.05, 
                backgroundColor: "#fff", 
                color: "#000",
                boxShadow: "10px 10px 0px 0px rgba(0,0,0,1)" 
              }}
              whileTap={{ scale: 0.95 }}
              className="bg-brand-black text-white px-16 py-8 rounded-full font-black uppercase text-sm tracking-[0.2em] border-2 border-brand-black transition-all"
            >
                Submit Review
            </motion.button>
        </motion.div>
      </section>

      {/* Community Review Archive Section */}
      <section id="community-archive" className="py-20 bg-brand-black text-white overflow-hidden relative">
        {/* Joint Shade */}
        <div className="absolute top-0 left-0 w-full h-40 bg-linear-to-b from-brand-black/50 to-transparent pointer-events-none" />
        
        <div className="px-6 md:px-20 flex flex-col md:flex-row justify-between items-start md:items-end gap-8 mb-12 relative z-10">
          <motion.div {...fadeInUp}>
              <div className="flex items-center gap-4 mb-6">
                <span className="text-strawberry font-bold uppercase tracking-[0.3em] text-[10px] block">Community Submissions</span>
                <span className="bg-white/10 px-2 py-0.5 rounded text-[8px] font-mono opacity-50 tracking-widest">{communityReviews.length.toString().padStart(4, '0')} ENTRIES</span>
              </div>
              <h2 className="text-4xl md:text-7xl font-display font-black tracking-tighter leading-[0.9]">USER <br /><span className="italic font-light">ARCHIVE.</span></h2>
          </motion.div>
          <p className="max-w-xs text-white/40 text-[10px] leading-relaxed uppercase tracking-[0.3em] font-bold">
              The latest documented experiences from our global community.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 px-6 md:px-20">
          <AnimatePresence>
            {communityReviews.map((rev) => (
              <ReviewCard key={rev.id} rev={rev} />
            ))}
          </AnimatePresence>
        </div>
      </section>

      {/* Footer */}
      <footer className="pt-40 pb-20 bg-linear-to-t from-brand-cream to-transparent px-6 md:px-20 relative z-30">
        <div className="max-w-7xl mx-auto flex flex-col lg:flex-row justify-between gap-24">
            <div className="space-y-8">
                <span className="text-4xl font-display font-black tracking-tighter text-brand-black">NECTOR<span className="text-nectar-orange">.</span></span>
                <p className="text-brand-black/40 text-xs leading-relaxed uppercase tracking-[0.3em] font-bold max-w-xs">
                    The intersection of frozen technology and natural perfection.
                </p>
                <div className="flex gap-8 text-[11px] font-black uppercase tracking-widest">
                  <a href="#">Instagram</a>
                  <a href="#">Behance</a>
                  <a href="#">Vimeo</a>
                </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-20">
                <div className="space-y-6">
                    <h5 className="text-[10px] uppercase tracking-[0.4em] font-black opacity-30">Archive</h5>
                    <ul className="space-y-4 text-[10px] font-black opacity-60 uppercase tracking-widest">
                        <li><a href="#" className="hover:opacity-100">Video Logs</a></li>
                        <li><a href="#" className="hover:opacity-100">Critical Anthologies</a></li>
                        <li><a href="#" className="hover:opacity-100">Submit Critique</a></li>
                    </ul>
                </div>
                <div className="space-y-6">
                    <h5 className="text-[10px] uppercase tracking-[0.4em] font-black opacity-30">Legal</h5>
                    <ul className="space-y-4 text-[10px] font-black opacity-60 uppercase tracking-widest">
                        <li><a href="#" className="hover:opacity-100">Privacy Policy</a></li>
                        <li><a href="#" className="hover:opacity-100">Review Guidelines</a></li>
                        <li><a href="#" className="hover:opacity-100">Cookie Protocol</a></li>
                    </ul>
                </div>
            </div>
        </div>
        <div className="max-w-7xl mx-auto mt-40 pt-10 border-t border-brand-black/10 flex justify-between text-[9px] uppercase tracking-[0.5em] font-black opacity-20">
            <span>© 2024 NECTOR ARCTIC ARCHIVE</span>
            <span>Paris / Tokyo / NYC</span>
        </div>
      </footer>
    </div>
  );
}
