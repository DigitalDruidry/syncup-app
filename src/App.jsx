import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar, 
  MapPin, 
  Plus, 
  Clock, 
  Edit2, 
  X, 
  Users, 
  Image as ImageIcon,
  Save,
  Trash2,
  MoreVertical,
  Database // Added icon for seeding
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  signInWithCustomToken, 
  signInAnonymously, 
  onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  serverTimestamp 
} from 'firebase/firestore';

// --- Firebase Configuration ---
// TO MAKE THIS WORK ON VERCEL:
// 1. Go to Firebase Console > Project Settings > General > Your Apps
// 2. Copy your config values and paste them into the object below.
const firebaseConfig = {
  apiKey: "AIzaSyB05e5GDNEA0keoQFqyRGYLIhKQmLTV_XU",
  authDomain: "syncup-app-a9d21.firebaseapp.com",
  projectId: "syncup-app-a9d21",
  storageBucket: "syncup-app-a9d21.firebasestorage.app",
  messagingSenderId: "116950162052",
  appId: "1:116950162052:web:02d15f94a1ac05ecfd80d1",
  measurementId: "G-LBGRV67W3J"
};

// Logic: Use the AI Environment config if available (so this preview works),
// otherwise use your hardcoded config (so the deployed Vercel app works).
const firebaseConfig = typeof __firebase_config !== 'undefined' 
  ? JSON.parse(__firebase_config) 
  : myFirebaseConfig;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Use a fixed App ID for your deployed version
const appId = typeof __app_id !== 'undefined' ? __app_id : 'friend-group-catchups';

// --- Constants & Utilities ---
const DEFAULT_IMAGES = [
  { name: 'Dining', url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80' },
  { name: 'Outdoors', url: 'https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=800&q=80' },
  { name: 'Party', url: 'https://images.unsplash.com/photo-1530103862676-de3c9da59af7?auto=format&fit=crop&w=800&q=80' },
  { name: 'Coffee', url: 'https://images.unsplash.com/photo-1461023058943-716d1529c1d1?auto=format&fit=crop&w=800&q=80' },
  { name: 'Drinks', url: 'https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80' },
];

const formatDate = (dateString) => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return new Intl.DateTimeFormat('en-US', { 
    weekday: 'short', 
    month: 'short', 
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit'
  }).format(date);
};

const getRelativeTime = (dateString) => {
  const date = new Date(dateString);
  const now = new Date();
  const diffTime = date - now;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); 
  
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Tomorrow';
  if (diffDays > 0) return `In ${diffDays} days`;
  if (diffDays === -1) return 'Yesterday';
  return `${Math.abs(diffDays)} days ago`;
};

// --- Components ---

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden transform transition-all scale-100">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800">{title}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        <div className="p-6 max-h-[80vh] overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

const CatchupCard = ({ catchup, onEdit, isFirst }) => {
  const isPast = new Date(catchup.date) < new Date();
  
  return (
    <div className={`relative pl-8 pb-12 last:pb-0 group`}>
      {/* Timeline Line */}
      <div className="absolute left-[11px] top-8 bottom-0 w-0.5 bg-gray-200 group-last:bg-transparent"></div>
      
      {/* Timeline Dot */}
      <div className={`absolute left-0 top-8 w-6 h-6 rounded-full border-4 border-white shadow-sm z-10 
        ${isPast ? 'bg-gray-400' : 'bg-rose-500'}`}>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow duration-300">
        <div className="relative h-48 overflow-hidden">
          <img 
            src={catchup.photoUrl || DEFAULT_IMAGES[0].url} 
            alt={catchup.title}
            className={`w-full h-full object-cover transition-transform duration-700 hover:scale-105 ${isPast ? 'grayscale-[50%]' : ''}`}
            onError={(e) => {
              e.target.src = DEFAULT_IMAGES[0].url;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
          
          <div className="absolute top-3 right-3 flex gap-2">
             <button 
              onClick={() => onEdit(catchup)}
              className="p-2 bg-white/90 hover:bg-white text-gray-700 rounded-full shadow-lg backdrop-blur-sm transition-all transform hover:scale-105"
            >
              <Edit2 size={16} />
            </button>
          </div>

          <div className="absolute bottom-4 left-4 text-white">
            <h3 className="text-xl font-bold leading-tight mb-1">{catchup.title}</h3>
            <div className="flex items-center text-white/90 text-sm font-medium">
              <Calendar size={14} className="mr-1.5" />
              {formatDate(catchup.date)}
            </div>
          </div>
        </div>

        <div className="p-5">
          <div className="flex items-start justify-between mb-4">
             <div className="flex items-center text-rose-600 font-medium bg-rose-50 px-3 py-1 rounded-full text-xs">
                <Clock size={12} className="mr-1.5" />
                {getRelativeTime(catchup.date)}
             </div>
          </div>

          {catchup.location && (
            <div className="flex items-start text-gray-600 mb-3 text-sm">
              <MapPin size={16} className="mr-2 mt-0.5 shrink-0 text-gray-400" />
              {catchup.location}
            </div>
          )}
          
          {catchup.description && (
            <p className="text-gray-600 text-sm leading-relaxed pl-6">
              {catchup.description}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default function App() {
  const [user, setUser] = useState(null);
  const [catchups, setCatchups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCatchup, setEditingCatchup] = useState(null);

  // Form State
  const [formData, setFormData] = useState({
    title: '',
    date: '',
    location: '',
    description: '',
    photoUrl: ''
  });

  // --- Auth & Data Fetching ---
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error("Auth failed:", err);
      }
    };
    initAuth();
    
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    if (!user) return;

    // RULE 1: Strict Path for public shared data
    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'catchups');
    
    // RULE 2: No complex queries, sort in memory
    const unsubscribe = onSnapshot(collectionRef, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      // Sort in memory: Descending by date (Newest at top)
      data.sort((a, b) => new Date(b.date) - new Date(a.date));
      
      setCatchups(data);
      setLoading(false);
    }, (error) => {
      console.error("Firestore error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  // --- Handlers ---
  const handleOpenModal = (catchup = null) => {
    if (catchup) {
      setEditingCatchup(catchup);
      setFormData({
        title: catchup.title,
        date: catchup.date,
        location: catchup.location,
        description: catchup.description,
        photoUrl: catchup.photoUrl
      });
    } else {
      setEditingCatchup(null);
      // Default date to today at 7pm
      const today = new Date();
      today.setHours(19, 0, 0, 0);
      
      // Handle timezone offset for correct datetime-local input
      const offset = today.getTimezoneOffset() * 60000;
      const localISOTime = (new Date(today - offset)).toISOString().slice(0, 16);

      setFormData({
        title: '',
        date: localISOTime,
        location: '',
        description: '',
        photoUrl: ''
      });
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!user) return;

    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'catchups');

    try {
      if (editingCatchup) {
        const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'catchups', editingCatchup.id);
        await updateDoc(docRef, {
          ...formData,
          updatedAt: serverTimestamp()
        });
      } else {
        await addDoc(collectionRef, {
          ...formData,
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error saving:", error);
      alert("Failed to save changes. Please try again.");
    }
  };

  const handleDelete = async () => {
    if (!editingCatchup || !user) return;
    if (!window.confirm("Are you sure you want to delete this catchup?")) return;

    try {
      const docRef = doc(db, 'artifacts', appId, 'public', 'data', 'catchups', editingCatchup.id);
      await deleteDoc(docRef);
      setIsModalOpen(false);
    } catch (error) {
      console.error("Error deleting:", error);
    }
  };

  const handleSeedData = async () => {
    if (!user) return;
    
    const now = new Date();
    // Helper to add days
    const addDays = (days) => {
      const d = new Date(now);
      d.setDate(d.getDate() + days);
      d.setHours(19, 0, 0, 0);
      return d.toISOString();
    };

    const samples = [
      {
        title: "Summer Beach Trip",
        date: addDays(14), // 2 weeks from now
        location: "Gold Coast",
        description: "Weekend getaway! Don't forget sunscreen and snacks. We're meeting at Ben's house at 9am.",
        photoUrl: "https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Christmas Dinner",
        date: addDays(4), // 4 days from now
        location: "Sarah's Place",
        description: "Potluck style. I'm making the roast! Dress code: Ugly Sweaters.",
        photoUrl: "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Quick Coffee",
        date: addDays(1), // Tomorrow
        location: "The Roasted Bean",
        description: "Just a quick catchup before work. 8am sharp.",
        photoUrl: "https://images.unsplash.com/photo-1461023058943-716d1529c1d1?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Halloween Movie Night",
        date: addDays(-20), // 20 days ago
        location: "Mike's Basement",
        description: "Watched 5 scary movies. Regretted it immediately. Popcorn was good though.",
        photoUrl: "https://images.unsplash.com/photo-1530103862676-de3c9da59af7?auto=format&fit=crop&w=800&q=80"
      },
      {
        title: "Sunday Brunch",
        date: addDays(-7), // 1 week ago
        location: "Bluebird Cafe",
        description: "The pancakes were amazing. We need to go back for the waffles.",
        photoUrl: "https://images.unsplash.com/photo-1514362545857-3bc16c4c7d1b?auto=format&fit=crop&w=800&q=80"
      }
    ];

    setLoading(true);
    const collectionRef = collection(db, 'artifacts', appId, 'public', 'data', 'catchups');
    
    try {
      // Add sequentially to prevent UI jitter
      for (const sample of samples) {
        await addDoc(collectionRef, {
          ...sample,
          createdAt: serverTimestamp(),
          createdBy: user.uid
        });
      }
    } catch (error) {
      console.error("Error seeding data:", error);
      alert("Could not load sample data.");
    }
  };

  // Split into Upcoming and Past for display
  const now = new Date();
  const upcomingCatchups = catchups.filter(c => new Date(c.date) >= now).sort((a,b) => new Date(a.date) - new Date(b.date)); // Closest future first
  const pastCatchups = catchups.filter(c => new Date(c.date) < now).sort((a,b) => new Date(b.date) - new Date(a.date)); // Most recent past first

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-rose-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-200">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="bg-rose-500 p-2 rounded-lg text-white">
              <Users size={20} />
            </div>
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-rose-600 to-purple-600">
              Friend Group
            </h1>
          </div>
          <button 
            onClick={() => handleOpenModal()}
            className="flex items-center gap-2 bg-gray-900 text-white px-4 py-2 rounded-full font-medium text-sm hover:bg-gray-800 transition-all shadow-lg hover:shadow-xl active:scale-95"
          >
            <Plus size={16} />
            <span className="hidden sm:inline">Add Catchup</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-2xl mx-auto px-4 py-8">
        
        {/* Empty State */}
        {catchups.length === 0 && (
          <div className="text-center py-20 px-6">
            <div className="w-20 h-20 bg-rose-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Calendar size={32} className="text-rose-500" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">No catchups yet</h2>
            <p className="text-gray-500 mb-8 max-w-sm mx-auto">Start planning your next adventure! Add your first catchup to start the timeline.</p>
            
            <div className="flex flex-col items-center gap-4">
              <button 
                onClick={() => handleOpenModal()}
                className="text-rose-600 font-medium hover:text-rose-700 underline text-lg"
              >
                Plan something now
              </button>
              
              <div className="text-gray-300 text-sm">or</div>

              <button 
                onClick={handleSeedData}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 shadow-sm rounded-full text-sm text-gray-600 hover:bg-gray-50 hover:text-gray-900 transition-all"
              >
                <Database size={14} />
                Load Sample Data
              </button>
            </div>
          </div>
        )}

        {/* Timeline */}
        <div className="space-y-8">
          
          {upcomingCatchups.length > 0 && (
            <div className="mb-12">
               <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 ml-11">Upcoming</h2>
               <div className="space-y-0">
                 {upcomingCatchups.map((catchup) => (
                   <CatchupCard 
                     key={catchup.id} 
                     catchup={catchup} 
                     onEdit={handleOpenModal}
                   />
                 ))}
               </div>
            </div>
          )}

          {pastCatchups.length > 0 && (
            <div>
               <h2 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-6 ml-11">History</h2>
               <div className="space-y-0">
                 {pastCatchups.map((catchup) => (
                   <CatchupCard 
                     key={catchup.id} 
                     catchup={catchup} 
                     onEdit={handleOpenModal}
                   />
                 ))}
               </div>
            </div>
          )}

        </div>
      </main>

      {/* Add/Edit Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingCatchup ? 'Edit Details' : 'New Catchup'}
      >
        <form onSubmit={handleSave} className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input
              type="text"
              required
              placeholder="e.g., Birthday Dinner, Beach Day"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
              value={formData.title}
              onChange={e => setFormData({...formData, title: e.target.value})}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                required
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                value={formData.date}
                onChange={e => setFormData({...formData, date: e.target.value})}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
              <input
                type="text"
                placeholder="e.g. Mario's Pizza"
                className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                value={formData.location}
                onChange={e => setFormData({...formData, location: e.target.value})}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Photo URL</label>
            <div className="flex gap-2">
              <input
                type="url"
                placeholder="https://..."
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all"
                value={formData.photoUrl}
                onChange={e => setFormData({...formData, photoUrl: e.target.value})}
              />
              <div className="relative group">
                <button type="button" className="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                  <ImageIcon size={20} className="text-gray-600" />
                </button>
                {/* Quick select tooltip */}
                <div className="absolute right-0 bottom-full mb-2 w-48 bg-white shadow-xl rounded-lg p-2 hidden group-hover:block z-50 border border-gray-100">
                  <p className="text-xs text-gray-400 mb-2 px-1">Quick Select:</p>
                  <div className="grid grid-cols-2 gap-1">
                    {DEFAULT_IMAGES.map((img) => (
                      <button
                        key={img.name}
                        type="button"
                        onClick={() => setFormData({...formData, photoUrl: img.url})}
                        className="text-xs text-left px-2 py-1.5 hover:bg-rose-50 hover:text-rose-600 rounded"
                      >
                        {img.name}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              rows="3"
              placeholder="What's the plan? Who is bringing what?"
              className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-rose-500 focus:ring-2 focus:ring-rose-200 outline-none transition-all resize-none"
              value={formData.description}
              onChange={e => setFormData({...formData, description: e.target.value})}
            />
          </div>

          <div className="flex items-center justify-between pt-4 border-t border-gray-50">
            {editingCatchup ? (
              <button
                type="button"
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium"
              >
                <Trash2 size={16} /> Delete
              </button>
            ) : <div></div>}
            
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-5 py-2 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors font-medium"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium shadow-lg shadow-gray-200 flex items-center gap-2"
              >
                <Save size={16} /> Save
              </button>
            </div>
          </div>
        </form>
      </Modal>
    </div>
  );
}