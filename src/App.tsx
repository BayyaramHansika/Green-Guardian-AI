import React, { useState, useEffect } from "react";
import { 
  Leaf, 
  UploadCloud, 
  CheckCircle, 
  X, 
  Sparkles, 
  Clipboard, 
  BarChart3, 
  Mail, 
  Lock, 
  History, 
  User, 
  LogOut, 
  Sun, 
  Moon, 
  Download, 
  Check, 
  CloudSun, 
  FileText,
  Clock,
  Heart,
  Droplet,
  Compass,
  AlertTriangle,
  Flame,
  Info,
  Trash2
} from "lucide-react";
import { auth, db } from "./lib/firebase";
import { 
  onAuthStateChanged, 
  signOut, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  User as FirebaseUser
} from "firebase/auth";
import { 
  collection, 
  addDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  Timestamp,
  deleteDoc,
  doc
} from "firebase/firestore";
import { PlantProfile, AnalysisResult, ScanRecord } from "./types";
import { Chatbot } from "./components/Chatbot";
import { PrintableReport } from "./components/PrintableReport";
import { RemedyGenerator } from "./components/RemedyGenerator";
import { RecoveryTracker } from "./components/RecoveryTracker";

export default function App() {
  // Navigation State
  const [currentPage, setCurrentPage] = useState<string>("home");
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Theme State (Forced Light Mode - No Dark Mode needed)
  const isDarkMode = false;

  // Auth States
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authName, setAuthName] = useState("");
  const [authError, setAuthError] = useState("");

  // Scan & Upload States
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>("");
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState<string>("");
  const [scanResult, setScanResult] = useState<AnalysisResult | null>(null);
  const [historyRecords, setHistoryRecords] = useState<ScanRecord[]>([]);

  // Plant Profile State
  const [plantProfile, setPlantProfile] = useState<PlantProfile>({
    name: "Roma Tomato — Pot B",
    species: "Solanum lycopersicum",
    variety: "Roma",
    location: "Balcony",
    plantedDate: "2026-03-15",
    growthStage: "Vegetative",
    sunlight: "Partial",
    watering: "Daily",
    soilType: "Well-draining Mix",
    lastFertilized: "2026-04-10",
    symptoms: "Spotted browning on lower leaves since last week. Increased watering frequency after dry spell.",
    healthScore: 68
  });

  // active treatment panel tab
  const [treatmentTab, setTreatmentTab] = useState<"immediate" | "organic" | "chemical" | "prevention">("immediate");

  // toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // PDF download trigger
  const [showPrintable, setShowPrintable] = useState(false);

  // Forcing light mode layout on launch
  useEffect(() => {
    document.documentElement.classList.remove("dark");
    localStorage.setItem("theme", "light");

    // Load local offline copy on first load
    try {
      const saved = localStorage.getItem("gg_local_scans");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!auth.currentUser) {
          setHistoryRecords(parsed);
        }
      }
    } catch (e) {
      console.error("Local history load error:", e);
    }
  }, []);

  // Auth Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        fetchHistory(currentUser.uid);
      } else {
        // Fallback to local storage for guests
        try {
          const saved = localStorage.getItem("gg_local_scans");
          if (saved) {
            setHistoryRecords(JSON.parse(saved));
          } else {
            setHistoryRecords([]);
          }
        } catch (e) {
          setHistoryRecords([]);
        }
      }
    });
    return () => unsubscribe();
  }, []);

  const triggerToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Fetch Scan History from Firestore
  const fetchHistory = async (userId: string) => {
    try {
      const q = query(
        collection(db, "scans"),
        where("userId", "==", userId),
        orderBy("date", "desc")
      );
      const querySnapshot = await getDocs(q);
      const records: ScanRecord[] = [];
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        records.push({
          id: doc.id,
          userId: data.userId,
          plantName: data.plantName,
          result: data.result as AnalysisResult,
          date: data.date,
          imageData: data.imageData
        });
      });
      setHistoryRecords(records);
    } catch (err) {
      console.error("Error fetching history:", err);
    }
  };

  // Delete Scan History Item (either from Cloud Firestore or LocalStorage)
  const handleDeleteScan = async (record: ScanRecord, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent opening the report modal/view
    
    const confirmDelete = window.confirm(`Are you sure you want to delete the diagnostic report for "${record.result.disease || 'this plant'}"?`);
    if (!confirmDelete) return;

    try {
      // 1. If we are logged in & have a valid cloud document ID, delete from Firestore
      if (user && record.id && !record.id.startsWith("local-")) {
        await deleteDoc(doc(db, "scans", record.id));
      }

      // 2. Regardless of state, filter it out from the current UI state
      const updatedRecords = historyRecords.filter((rec) => rec.id !== record.id);
      setHistoryRecords(updatedRecords);

      // 3. Keep local storage synced for guest / fallback records
      const stored = localStorage.getItem("gg_local_scans");
      if (stored) {
        const parsed = JSON.parse(stored) as ScanRecord[];
        const updatedLocal = parsed.filter((rec) => rec.id !== record.id);
        localStorage.setItem("gg_local_scans", JSON.stringify(updatedLocal));
      }

      triggerToast("Inspection record successfully deleted.");
    } catch (err: any) {
      console.error("Error deleting scan:", err);
      triggerToast("Failed to delete the inspection record.");
    }
  };

  // Login / Signup Handlers
  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    if (!authEmail || !authPassword) {
      setAuthError("All fields are required.");
      return;
    }

    try {
      if (authMode === "login") {
        await signInWithEmailAndPassword(auth, authEmail, authPassword);
        triggerToast("Login successful ✓");
      } else {
        if (!authName) {
          setAuthError("Name is required for registration.");
          return;
        }
        await createUserWithEmailAndPassword(auth, authEmail, authPassword);
        triggerToast("Registration completed successfully ✓");
      }
      setShowAuthModal(false);
      setAuthEmail("");
      setAuthPassword("");
      setAuthName("");
    } catch (err: any) {
      console.error(err);
      setAuthError(err.message || "Authentication failed.");
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      triggerToast("Logged out successfully");
      setCurrentPage("home");
    } catch (err) {
      console.error(err);
    }
  };

  // Image Upload / Drag and Drop
  const processImageFile = (file: File) => {
    if (!file.type.startsWith("image/")) {
      triggerToast("Please upload an image file of your plant leaf.");
      return;
    }
    setSelectedFile(file);
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processImageFile(files[0]);
    }
  };

  const startAnalysis = async () => {
    if (!selectedFile) return;

    setIsAnalyzing(true);
    setAnalysisProgress(5);
    setAnalysisStep("Preprocessing and compressing image");

    // progress simulation timer - smooth, realistic curve to prevent hanging at 99%
    const progressTimer = setInterval(() => {
      setAnalysisProgress((prev) => {
        let next = prev;
        if (prev < 40) {
          next = prev + Math.floor(Math.random() * 4) + 2; // steady snappy start
        } else if (prev < 70) {
          next = prev + (Math.random() > 0.4 ? 1 : 0); // slower crawl
        } else if (prev < 90) {
          next = prev + (Math.random() > 0.7 ? 1 : 0); // very slow crawl
        } else if (prev < 98) {
          next = prev + (Math.random() > 0.9 ? 1 : 0); // micro-crawl to keep it moving without getting stuck
        }
        
        if (next > 20 && next < 50) {
          setAnalysisStep("Isolating plant anomalies");
        } else if (next >= 50 && next < 75) {
          setAnalysisStep("Classifying leaf pathogen markers");
        } else if (next >= 75 && next < 95) {
          setAnalysisStep("Assembling treatment guidelines");
        } else if (next >= 95) {
          setAnalysisStep("Optimizing diagnostic report");
        }
        return next;
      });
    }, 180);

    try {
      // Compress and resize image client-side to be smaller (512px max, 0.65 quality)
      // This produces extremely lightweight JPEG payloads that transfer and analyze 3-4x faster.
      const base64Image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(selectedFile);
        reader.onload = (event) => {
          const img = new Image();
          img.src = event.target?.result as string;
          img.onload = () => {
            const canvas = document.createElement("canvas");
            const MAX_WIDTH = 512;
            const MAX_HEIGHT = 512;
            let width = img.width;
            let height = img.height;

            if (width > height) {
              if (width > MAX_WIDTH) {
                height *= MAX_WIDTH / width;
                width = MAX_WIDTH;
              }
            } else {
              if (height > MAX_HEIGHT) {
                width *= MAX_HEIGHT / height;
                height = MAX_HEIGHT;
              }
            }

            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              const dataUrl = canvas.toDataURL("image/jpeg", 0.65);
              resolve(dataUrl.split(",")[1]);
            } else {
              reject(new Error("Canvas context is unavailable"));
            }
          };
          img.onerror = () => reject(new Error("Failed to load image into buffer"));
        };
        reader.onerror = () => reject(new Error("File reader failed"));
      });

      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: base64Image,
          mimeType: "image/jpeg",
          plantProfile: plantProfile
        })
      });

      if (!res.ok) {
        throw new Error("Unable to complete analysis. Please verify your internet connection.");
      }

      const report: AnalysisResult = await res.json();
      
      clearInterval(progressTimer);
      setAnalysisProgress(100);
      setAnalysisStep("Report ready!");

      setTimeout(async () => {
        setScanResult(report);
        setIsAnalyzing(false);
        setAnalysisProgress(0);
        setCurrentPage("result");

        const timestampStr = new Date().toISOString();
        const base64Prefix = `data:image/jpeg;base64,${base64Image}`;

        // Save to Local History anyway (or if Guest)
        const newLocalRecord: ScanRecord = {
          id: `local-${Date.now()}`,
          userId: auth.currentUser?.uid || "guest",
          plantName: plantProfile.name,
          result: report,
          date: timestampStr,
          imageData: base64Prefix
        };

        // If not logged in, update state and persist locally
        if (!auth.currentUser) {
          try {
            const saved = localStorage.getItem("gg_local_scans");
            const localList = saved ? JSON.parse(saved) : [];
            const updated = [newLocalRecord, ...localList];
            localStorage.setItem("gg_local_scans", JSON.stringify(updated));
            setHistoryRecords(updated);
            triggerToast("Scan saved to offline device history!");
          } catch (localErr) {
            console.error("Failed to save local history:", localErr);
          }
        } else {
          // If logged in, save to Firebase Firestore
          try {
            await addDoc(collection(db, "scans"), {
              userId: auth.currentUser.uid,
              plantName: plantProfile.name,
              result: report,
              date: timestampStr,
              imageData: base64Prefix
            });
            fetchHistory(auth.currentUser.uid);
            triggerToast("Scan logged to secure Cloud History!");
          } catch (fireErr) {
            console.error("Failed to save history to cloud:", fireErr);
            // Fallback to local storage even for logged-in user if Firestore has issues
            try {
              const saved = localStorage.getItem("gg_local_scans");
              const localList = saved ? JSON.parse(saved) : [];
              const updated = [newLocalRecord, ...localList];
              localStorage.setItem("gg_local_scans", JSON.stringify(updated));
              setHistoryRecords(updated);
            } catch (ignore) {}
          }
        }
      }, 500);

    } catch (err: any) {
      clearInterval(progressTimer);
      setIsAnalyzing(false);
      setAnalysisProgress(0);
      triggerToast(err.message || "Analysis failed. Please try again.");
    }
  };

  const selectHistoryScan = (record: ScanRecord) => {
    setScanResult(record.result);
    if (record.imageData) {
      setPreviewUrl(record.imageData);
    } else {
      setPreviewUrl("");
    }
    setCurrentPage("result");
    triggerToast("Loaded diagnostic report of " + record.plantName);
  };

  const totalDetections = historyRecords.length;

  return (
    <div className={`min-h-screen flex flex-col transition-colors duration-300 font-sans antialiased relative overflow-x-hidden ${
      isDarkMode 
        ? "bg-[#0A0D0A] text-slate-100" 
        : "bg-[#F3F5F3] text-slate-800"
    }`}>
      {/* Decorative Background Elements */}
      <div className={`absolute top-0 right-0 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-opacity duration-300 ${
        isDarkMode ? "bg-emerald-600/10" : "bg-emerald-500/15"
      }`}></div>
      <div className={`absolute bottom-0 left-0 w-96 h-96 rounded-full blur-[120px] pointer-events-none transition-opacity duration-300 ${
        isDarkMode ? "bg-emerald-900/20" : "bg-emerald-700/10"
      }`}></div>

      {/* Printable PDF container is rendered hidden unless triggered */}
      {showPrintable && scanResult && (
        <PrintableReport result={scanResult} onClose={() => setShowPrintable(false)} />
      )}

      {/* Nav */}
      <nav className={`sticky top-0 z-50 backdrop-blur-md border-b px-6 py-4 flex items-center justify-between shadow-lg transition-colors duration-300 ${
        isDarkMode 
          ? "bg-black/40 border-white/10 text-slate-100" 
          : "bg-white/40 border-black/10 text-slate-800"
      }`}>
        <a 
          href="#" 
          onClick={(e) => { e.preventDefault(); setCurrentPage("home"); }} 
          className="flex items-center gap-3 decoration-0"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center shadow-md">
            <Leaf className="w-5 h-5 nav-logo text-emerald-800 dark:text-emerald-400" />
          </div>
          <span className="font-sans text-lg font-bold tracking-tight text-emerald-800 dark:text-emerald-400">
            Green Guardian AI
          </span>
        </a>

        {/* Desktop Links */}
        <div className="hidden md:flex items-center gap-2">
          {[
            { id: "home", label: "Home" },
            { id: "upload", label: "Analyze Plant" },
            { id: "result", label: "Results", disabled: !scanResult },
            { id: "remedies", label: "Remedy Generator" },
            { id: "tracker", label: "Recovery Tracker" },
            { id: "dashboard", label: "Dashboard" },
            { id: "history", label: "History" }
          ].map((item) => {
            const isActive = currentPage === item.id;
            return (
              <button 
                key={item.id}
                disabled={item.disabled}
                onClick={() => {
                  if (item.disabled) {
                    triggerToast("Please run a plant scan first");
                  } else {
                    setCurrentPage(item.id);
                  }
                }} 
                className={`px-4 py-2 text-sm font-medium rounded-lg cursor-pointer transition-all duration-150 ${
                  item.disabled 
                    ? "opacity-30 cursor-not-allowed text-slate-500" 
                    : isActive 
                      ? isDarkMode
                        ? "text-emerald-400 bg-white/10 border border-white/10 shadow-sm"
                        : "text-emerald-700 bg-white/60 border border-black/5 shadow-sm"
                      : isDarkMode
                        ? "text-slate-400 hover:text-slate-100 hover:bg-white/5"
                        : "text-slate-600 hover:text-slate-900 hover:bg-black/5"
                }`}
              >
                {item.label}
              </button>
            );
          })}
        </div>

        {/* Global Controls */}
        <div className="flex items-center gap-3">
          {/* User Section */}
          {user ? (
            <div className="flex items-center gap-3">
              <span className="hidden lg:inline text-xs text-slate-400">
                Hi, <strong>{user.email?.split("@")[0]}</strong>
              </span>
              <button 
                onClick={handleLogout} 
                className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-xl hover:bg-rose-500/20 cursor-pointer transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" /> Logout
              </button>
            </div>
          ) : (
            <button 
              onClick={() => { setAuthMode("login"); setShowAuthModal(true); }} 
              className={`flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-xl cursor-pointer transition-all shadow-md ${
                isDarkMode 
                  ? "bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30" 
                  : "bg-emerald-600/20 hover:bg-emerald-600/35 text-emerald-800 border border-emerald-600/30"
              }`}
            >
              <User className="w-4 h-4" /> Account
            </button>
          )}

          {/* Mobile Menu Btn */}
          <button 
            className={`md:hidden p-2 rounded-xl border transition-colors ${
              isDarkMode ? "border-white/10 hover:bg-white/5" : "border-black/10 hover:bg-black/5"
            }`} 
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <div className="space-y-1.5 w-6">
              <span className={`block h-0.5 bg-current transition-transform duration-150 ${mobileMenuOpen ? "transform rotate-45 translate-y-2" : ""}`}></span>
              <span className={`block h-0.5 bg-current transition-opacity duration-150 ${mobileMenuOpen ? "opacity-0" : ""}`}></span>
              <span className={`block h-0.5 bg-current transition-transform duration-150 ${mobileMenuOpen ? "transform -rotate-45 -translate-y-2" : ""}`}></span>
            </div>
          </button>
        </div>
      </nav>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className={`md:hidden border-b p-4 space-y-1 flex flex-col shadow-lg animate-fadeIn transition-colors ${
          isDarkMode ? "bg-black/80 backdrop-blur-md border-white/10" : "bg-white/90 backdrop-blur-md border-black/10"
        }`}>
          {["home", "upload", "remedies", "tracker", "dashboard", "history"].map((page) => (
            <button 
              key={page}
              onClick={() => { setCurrentPage(page); setMobileMenuOpen(false); }} 
              className={`w-full text-left px-4 py-3 rounded-lg text-sm capitalize transition-colors ${
                currentPage === page 
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-extrabold" 
                  : isDarkMode 
                    ? "text-slate-300 hover:bg-white/5" 
                    : "text-slate-700 hover:bg-black/5"
              }`}
            >
              {page === "upload" ? "Analyze Plant" : page === "remedies" ? "Remedy Generator" : page === "tracker" ? "Recovery Tracker" : page}
            </button>
          ))}
          {scanResult && (
            <button 
              onClick={() => { setCurrentPage("result"); setMobileMenuOpen(false); }} 
              className={`w-full text-left px-4 py-3 rounded-lg text-sm transition-colors ${
                currentPage === "result" 
                  ? "bg-emerald-500/10 text-emerald-800 dark:text-emerald-400 font-extrabold" 
                  : isDarkMode 
                    ? "text-slate-300 hover:bg-white/5" 
                    : "text-slate-700 hover:bg-black/5"
              }`}
            >
              Results
            </button>
          )}
        </div>
      )}

      {/* Page Content */}
      <main className="flex-1">
        
        {/* ===================== HOME PAGE ===================== */}
        {currentPage === "home" && (
          <div className="animate-fadeIn">
            {/* Hero */}
            <div className={`py-24 px-6 md:px-12 relative overflow-hidden flex flex-col lg:flex-row gap-12 items-center border-b ${
              isDarkMode ? "border-white/5" : "border-black/5"
            }`}>
              <div className="absolute inset-0 bg-radial-gradient from-emerald-500/10 to-transparent pointer-events-none"></div>
              
              <div className="flex-1 z-10">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 mb-6 backdrop-blur-sm">
                  <Sparkles className="w-3.5 h-3.5" /> AI-Powered crop health protection
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-6xl font-serif leading-[1.1] mb-6">
                  Green Guardian AI <br />
                  <em className="text-emerald-700 dark:text-emerald-400 italic font-normal font-sans">Protect your plants,</em> <br />
                  effortlessly.
                </h1>
                <p className="text-slate-600 dark:text-slate-400 text-base max-w-lg mb-8 leading-relaxed">
                  Upload plant foliage images to recognize key plant disease markers instantly, assess spreading risk, and access comprehensive organic treatment logs built for modern growers.
                </p>
                <div className="flex flex-wrap gap-4">
                  <button 
                    onClick={() => setCurrentPage("upload")} 
                    className="px-6 py-3.5 rounded-xl text-sm font-semibold bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5 transition-all duration-150 cursor-pointer backdrop-blur-md font-bold"
                  >
                    Start Plant Analysis →
                  </button>
                  <button 
                    onClick={() => setCurrentPage("dashboard")} 
                    className={`px-6 py-3.5 rounded-xl text-sm font-semibold border transition-all cursor-pointer backdrop-blur-sm ${
                      isDarkMode 
                        ? "border-white/10 bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white" 
                        : "border-black/10 bg-black/5 hover:bg-black/10 text-slate-700 hover:text-slate-900"
                    }`}
                  >
                    Explore Dashboard
                  </button>
                </div>
              </div>

              {/* Hero Image */}
              <div className={`flex-1 max-w-xl w-full h-[400px] border shadow-2xl relative rounded-2xl overflow-hidden z-10 group transition-all ${
                isDarkMode ? "border-white/10" : "border-black/10"
              }`}>
                <img 
                  src="https://images.unsplash.com/photo-1530836369250-ef72a3f5cda8?q=80&w=800&auto=format&fit=crop" 
                  alt="Lush Greenhouse Field" 
                  className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-500"
                />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-5">
                  <p className="text-xs text-emerald-500 font-semibold tracking-wide uppercase mb-1">Interactive Diagnostic Hub</p>
                  <p className="text-sm text-slate-300 leading-snug">Continuous tracking of field leaf samples using neural diagnostic schemas.</p>
                </div>
              </div>
            </div>

            {/* Stats Panel */}
            <div className={`backdrop-blur-md border-y py-10 px-8 transition-colors duration-300 ${
              isDarkMode ? "bg-black/30 border-white/10" : "bg-white/40 border-black/10"
            }`}>
              <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8">
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-emerald-800 dark:text-emerald-400 mb-1">98.4%</div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Detection accuracy</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-emerald-800 dark:text-emerald-400 mb-1">50K+</div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Plants analyzed</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-emerald-800 dark:text-emerald-400 mb-1">120+</div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">Disease classes</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-extrabold text-emerald-800 dark:text-emerald-400 mb-1">24/7</div>
                  <div className="text-xs text-slate-500 font-bold uppercase tracking-wider">AI plant care support</div>
                </div>
              </div>
            </div>

            {/* Workflow steps */}
            <div className="py-20 px-8 max-w-6xl mx-auto">
              <div className="text-center max-w-xl mx-auto mb-16">
                <span className="text-xs font-bold text-emerald-800 dark:text-emerald-400 uppercase tracking-widest block mb-3">Workflow</span>
                <h2 className="text-3xl font-serif font-bold mb-2">How Integrated Plant Care Works</h2>
                <p className="text-slate-600 dark:text-slate-400 text-sm">Transform leaf details into structured actionable protection strategies.</p>
              </div>

              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                  {
                    step: "1",
                    title: "Upload foliage",
                    desc: "Submit a crisp photo focused on the diseased portion of your plant leaf."
                  },
                  {
                    step: "2",
                    title: "Provide Context",
                    desc: "Include optional crop details and environments for highly customized results."
                  },
                  {
                    step: "3",
                    title: "AI Diagnostics",
                    desc: "Our advanced neural systems classify anomalies and rank likely diseases."
                  },
                  {
                    step: "4",
                    title: "Get Recipe Log",
                    desc: "Follow structured instant organic, chemical, and preventative remedies."
                  }
                ].map((item, idx) => (
                  <div 
                    key={idx}
                    className={`p-6 rounded-2xl flex flex-col hover:shadow-xl transition-all duration-300 border backdrop-blur-md ${
                      isDarkMode 
                        ? "bg-white/5 border-white/10 text-slate-100 hover:bg-white/10" 
                        : "bg-white/70 border-black/10 text-slate-800 hover:bg-white/80"
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-800 dark:text-emerald-400 flex items-center justify-center text-sm font-bold mb-6">
                      {item.step}
                    </div>
                    <h3 className="font-semibold text-base mb-2 select-none text-emerald-800 dark:text-emerald-400">{item.title}</h3>
                    <p className="text-slate-600 dark:text-slate-400 text-xs leading-relaxed">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Bottom CTA Block */}
            <div className={`py-16 px-6 text-center rounded-3xl border backdrop-blur-lg max-w-5xl mx-auto my-12 transition-all ${
              isDarkMode 
                ? "bg-gradient-to-br from-emerald-950/40 to-transparent border-emerald-500/20" 
                : "bg-gradient-to-br from-emerald-500/5 to-transparent border-emerald-500/10"
            }`}>
              <h2 className="text-3xl font-serif font-bold mb-3">Begin Protecting Your Crops Today</h2>
              <p className="text-emerald-850 dark:text-emerald-300 text-sm max-w-xl mx-auto mb-8 font-semibold">Access your personalized metrics console, logging diagnostics and treating pathogens effortlessly.</p>
              <button 
                onClick={() => setCurrentPage("upload")} 
                className="px-6 py-3.5 bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-800 dark:text-emerald-300 text-sm font-bold rounded-xl cursor-pointer shadow-lg backdrop-blur-md transition-all hover:scale-[1.02]"
              >
                Analyze Leaf Now
              </button>
            </div>
          </div>
        )}

        {/* ===================== UPLOAD PAGE ===================== */}
        {currentPage === "upload" && (
          <div className={`animate-fadeIn mx-auto py-12 px-6 transition-all duration-300 ${previewUrl && !isAnalyzing ? 'max-w-6xl' : 'max-w-4xl'}`}>
            <div className="text-center mb-10">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-widest block mb-2">Image analysis</span>
              <h2 className="text-3xl font-serif font-bold text-stone-900 dark:text-white mb-2">Plant Disease Audit</h2>
              <p className="text-stone-500 text-sm">Drop an image of affected garden foliage to instantly flag diseases and print care-sheets.</p>
            </div>

            {/* Drop / Select Zone */}
            {!previewUrl && (
              <div 
                onDragOver={(e) => { e.preventDefault(); }}
                onDrop={(e) => { e.preventDefault(); if (e.dataTransfer.files[0]) processImageFile(e.dataTransfer.files[0]); }}
                className="border-2 border-dashed border-stone-300 dark:border-stone-700 hover:border-emerald-500 hover:bg-emerald-50/10 dark:hover:bg-emerald-950/10 rounded-2xl p-16 text-center cursor-pointer transition-all duration-150 relative group"
              >
                <input 
                  type="file" 
                  accept="image/*" 
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-20" 
                />
                <div className="flex flex-col items-center z-10">
                  <UploadCloud className="w-12 h-12 text-stone-400 group-hover:text-emerald-500 transition-colors mb-4" />
                  <h3 className="font-serif text-lg font-medium text-stone-800 dark:text-stone-200 mb-1">
                    Drag and drop your plant photo here
                  </h3>
                  <p className="text-xs text-stone-400 dark:text-stone-500">or click to browse from device folder</p>
                  <span className="mt-4 px-3 py-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-full text-[10px] text-stone-400">
                    Supports JPG, PNG, WEBP • Max 10MB
                  </span>
                </div>
              </div>
            )}

            {/* Selected Preview panel */}
            {previewUrl && !isAnalyzing && (
              <div className="grid md:grid-cols-12 gap-8 items-start animate-fadeIn">
                
                {/* Left Column: Image Card & Action triggers */}
                <div className="md:col-span-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col items-center">
                  <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 mb-3 bg-emerald-500/10 px-2.5 py-1 rounded">
                    Selected Leaf Specimen
                  </span>
                  
                  <div className="w-full aspect-square relative rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 bg-stone-100 dark:bg-stone-950 mb-4">
                    <img 
                      src={previewUrl} 
                      alt="Awaiting Diagnostic Scan" 
                      className="w-full h-full object-cover"
                    />
                  </div>

                  <h3 className="font-serif text-sm font-semibold text-stone-800 dark:text-stone-200 truncate max-w-full text-center mb-1">
                    {selectedFile?.name || "Leaf Image Selected"}
                  </h3>
                  <p className="text-[11px] text-stone-400 dark:text-stone-500 mb-6 text-center">
                    {(selectedFile ? (selectedFile.size/1024/1024).toFixed(2) : "0")} MB • Ready for Verification
                  </p>

                  <div className="flex flex-col gap-2 w-full">
                    <button 
                      onClick={startAnalysis}
                      className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Sparkles className="w-4 h-4 animate-pulse" /> Run AI Analysis →
                    </button>
                    <button 
                      onClick={() => { setSelectedFile(null); setPreviewUrl(""); }}
                      className="w-full py-2.5 border border-stone-200 hover:bg-stone-50 dark:border-stone-800 dark:hover:bg-stone-800 text-stone-600 dark:text-stone-300 rounded-xl text-xs font-semibold cursor-pointer transition-colors"
                    >
                      Choose Different Leaf
                    </button>
                  </div>
                </div>

                {/* Right Column: Plant Metadata & Environmental Context form */}
                <div className="md:col-span-8 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
                  <div className="border-b border-stone-100 dark:border-stone-800 pb-3 mb-5">
                    <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-stone-100">Foliage Context & Symptoms</h3>
                    <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">
                      Aide the AI diagnostic engine with specific crop variety and symptom details. Providing this optional context yields superior, highly-targeted treatments!
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Plant Name or Label</label>
                      <input 
                        type="text" 
                        value={plantProfile.name}
                        onChange={(e) => setPlantProfile({ ...plantProfile, name: e.target.value })}
                        placeholder="e.g. Roma Tomato — Pot B"
                        className="w-full text-xs px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-stone-900 dark:text-white transition-all"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Species</label>
                        <input 
                          type="text" 
                          value={plantProfile.species}
                          onChange={(e) => setPlantProfile({ ...plantProfile, species: e.target.value })}
                          placeholder="e.g. Solanum lycopersicum"
                          className="w-full text-xs px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-stone-900 dark:text-white transition-all"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Variety</label>
                        <input 
                          type="text" 
                          value={plantProfile.variety}
                          onChange={(e) => setPlantProfile({ ...plantProfile, variety: e.target.value })}
                          placeholder="e.g. Roma"
                          className="w-full text-xs px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-stone-900 dark:text-white transition-all"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Location</label>
                        <select
                          value={plantProfile.location}
                          onChange={(e) => setPlantProfile({ ...plantProfile, location: e.target.value })}
                          className="w-full text-xs px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-teal-600 focus:bg-white dark:focus:bg-stone-900 dark:text-white transition-all text-teal-900 dark:text-teal-400 font-semibold"
                        >
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Balcony</option>
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Indoor Pot</option>
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Outdoor Garden</option>
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Greenhouse</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Growth Stage</label>
                        <select
                          value={plantProfile.growthStage}
                          onChange={(e) => setPlantProfile({ ...plantProfile, growthStage: e.target.value })}
                          className="w-full text-xs px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-teal-600 focus:bg-white dark:focus:bg-stone-900 dark:text-white transition-all text-teal-900 dark:text-teal-400 font-semibold"
                        >
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Seedling</option>
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Vegetative</option>
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Flowering</option>
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Fruiting</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Watering Routine</label>
                        <select
                          value={plantProfile.watering}
                          onChange={(e) => setPlantProfile({ ...plantProfile, watering: e.target.value as any })}
                          className="w-full text-xs px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-teal-600 focus:bg-white dark:focus:bg-stone-900 dark:text-white transition-all text-teal-900 dark:text-teal-400 font-semibold"
                        >
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Daily</option>
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Every 2 Days</option>
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Weekly</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Sunlight Exposure</label>
                        <select
                          value={plantProfile.sunlight}
                          onChange={(e) => setPlantProfile({ ...plantProfile, sunlight: e.target.value as any })}
                          className="w-full text-xs px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-teal-600 focus:bg-white dark:focus:bg-stone-900 dark:text-white transition-all text-teal-900 dark:text-teal-400 font-semibold"
                        >
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Full</option>
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Partial</option>
                          <option className="text-teal-950 bg-white dark:bg-stone-900">Shade</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-bold uppercase tracking-wider text-stone-500 mb-1.5">Foliage Symptoms / Disease Visuals</label>
                      <textarea
                        value={plantProfile.symptoms}
                        onChange={(e) => setPlantProfile({ ...plantProfile, symptoms: e.target.value })}
                        placeholder="Describe what you see (e.g. yellow spots with dark circles, brown powder dust on lower stems, leaf curling)"
                        className="w-full text-xs px-3.5 py-2.5 h-20 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-stone-900 dark:text-white transition-all resize-none"
                      />
                    </div>
                  </div>
                </div>

              </div>
            )}

            {/* Analysis progress tracker */}
            {isAnalyzing && (
              <div className="p-6 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-sm space-y-4 animate-fadeIn">
                <div className="flex justify-between items-center text-xs">
                  <h4 className="font-semibold text-stone-800 dark:text-stone-200">{analysisStep}</h4>
                  <span className="font-bold text-emerald-700 dark:text-emerald-500">{analysisProgress}%</span>
                </div>
                <div className="w-full bg-stone-100 dark:bg-stone-800 rounded-full h-2 overflow-hidden">
                  <div className="bg-emerald-700 h-full rounded-full transition-all duration-150" style={{ width: `${analysisProgress}%` }}></div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2 text-[10px]">
                  <span className={`px-2 py-1 rounded text-center ${analysisProgress >= 15 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium" : "text-stone-400"}`}>
                    ⬤ Preprocessing Image
                  </span>
                  <span className={`px-2 py-1 rounded text-center ${analysisProgress >= 45 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium" : "text-stone-400"}`}>
                    ⬤ Feature Extraction
                  </span>
                  <span className={`px-2 py-1 rounded text-center ${analysisProgress >= 78 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium" : "text-stone-400"}`}>
                    ⬤ Disease Classification
                  </span>
                  <span className={`px-2 py-1 rounded text-center ${analysisProgress >= 100 ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium" : "text-stone-400"}`}>
                    ⬤ Report Compilation
                  </span>
                </div>
              </div>
            )}

            {/* Tips/instructions row */}
            <div className="grid md:grid-cols-3 gap-4 mt-8">
              <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl">
                <span className="text-xl mb-1 block">☀️</span>
                <h4 className="text-xs font-semibold mb-1">Clear natural light</h4>
                <p className="text-stone-400 text-[10px] leading-relaxed">Bright, glare-free daylight produces highly precise anomaly isolation results.</p>
              </div>
              <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl">
                <span className="text-xl mb-1 block">🔍</span>
                <h4 className="text-xs font-semibold mb-1">Macro crop</h4>
                <p className="text-stone-400 text-[10px] leading-relaxed">Aim at the specific spots, lesions, or foliage dust for accurate classification.</p>
              </div>
              <div className="p-4 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-xl">
                <span className="text-xl mb-1 block">📏</span>
                <h4 className="text-xs font-semibold mb-1">Clean angles</h4>
                <p className="text-stone-400 text-[10px] leading-relaxed">Avoid extreme shadows and other background obstructions like fingers or mesh.</p>
              </div>
            </div>
          </div>
        )}

        {/* ===================== RESULTS PAGE ===================== */}
        {currentPage === "result" && scanResult && (
          <div className="animate-fadeIn max-w-6xl mx-auto py-12 px-6">
            
            {/* Upper Diagnostic controls */}
            <div className="flex flex-wrap gap-4 items-center justify-between border-b border-stone-200 dark:border-stone-800 pb-6 mb-8">
              <div className="flex items-center gap-4">
                <button 
                  onClick={() => setCurrentPage("upload")} 
                  className="px-4 py-2 border border-stone-200 dark:border-stone-800 hover:bg-stone-100 dark:hover:bg-stone-800 rounded-xl text-xs font-medium cursor-pointer"
                >
                  ← New Scan
                </button>
                <div>
                  <h2 className="font-serif text-xl font-bold">Diagnostic Report</h2>
                  <p className="text-[10px] text-stone-400">Completed via Gemini Analysis</p>
                </div>
              </div>
              
              {/* PDF Print Download Button */}
              <button 
                onClick={() => setShowPrintable(true)}
                className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer transition-colors"
              >
                <Download className="w-4 h-4" /> Save PDF Report / Print
              </button>
            </div>

            {scanResult.isFallback && (
              <div className="mb-8 p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
                <div className="flex gap-3 items-start">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 shrink-0 mt-0.5 sm:mt-0">
                    <Sparkles className="w-5 h-5 animate-pulse" />
                  </div>
                  <div>
                    <h4 className="text-sm font-semibold text-amber-800 dark:text-amber-300">Demo/Simulation Mode Active</h4>
                    <p className="text-xs text-amber-700/80 dark:text-amber-400/85 mt-1 max-w-3xl leading-relaxed">
                      We processed your photograph via our dynamic, local botanical model because a custom <strong>GEMINI_API_KEY</strong> is not yet defined in your system secrets. Set your actual Gemini key in the Google AI Studio settings to unlock standard real-time neural vision diagnostics!
                    </p>
                  </div>
                </div>
                <div className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-1 rounded bg-amber-500/20 text-amber-800 dark:text-amber-200 shrink-0 self-start sm:self-center">
                  Sandbox Active
                </div>
              </div>
            )}

            {/* Results main grid */}
            <div className="grid lg:grid-cols-12 gap-8">
              
              {/* Image & Confidence Card */}
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden shadow-sm">
                  <div className="h-64 bg-stone-100 dark:bg-stone-950 flex items-center justify-center overflow-hidden">
                    {previewUrl ? (
                      <img 
                        src={previewUrl} 
                        alt="Diagnosis Subject leaf" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Leaf className="w-16 h-16 text-emerald-600 animate-pulse" />
                    )}
                  </div>
                  <div className="p-6">
                    <h4 className="text-xs font-semibold uppercase tracking-wider text-stone-400 mb-4">Model confidence breakdown</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1.5">
                          <span>{scanResult.disease}</span>
                          <span className="text-emerald-700 dark:text-emerald-400">{scanResult.confidence}%</span>
                        </div>
                        <div className="h-2 bg-stone-100 dark:bg-stone-950 rounded-full overflow-hidden">
                          <div className="bg-emerald-700 h-full rounded-full" style={{ width: `${scanResult.confidence}%` }}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-xs font-medium mb-1.5 text-stone-500">
                          <span>Other fungal anomaly</span>
                          <span>{Math.max(0, 100 - scanResult.confidence - 5)}%</span>
                        </div>
                        <div className="h-2 bg-stone-100 dark:bg-stone-950 rounded-full overflow-hidden">
                          <div className="bg-stone-300 dark:bg-stone-700 h-full rounded-full" style={{ width: `${Math.max(0, 100 - scanResult.confidence - 5)}%` }}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Disease properties */}
              <div className="lg:col-span-7 flex flex-col gap-6">
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
                  {/* Alert */}
                  {scanResult.disease.toLowerCase().includes("aging") || scanResult.disease.toLowerCase().includes("development") || scanResult.disease.toLowerCase().includes("healthy") || scanResult.disease.toLowerCase().includes("senescence") || scanResult.disease.toLowerCase().includes("normal shedding") ? (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-400/20 text-emerald-600 dark:text-emerald-400 mb-4 uppercase tracking-wider">
                      <Check className="w-3.5 h-3.5" /> Healthy / Natural Process
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 border border-rose-400/20 text-rose-600 dark:text-rose-400 mb-4 uppercase tracking-wider">
                      <AlertTriangle className="w-3.5 h-3.5" /> Disease Detected
                    </span>
                  )}

                  <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-white mb-1">{scanResult.disease}</h1>
                  <p className="text-sm italic text-stone-500 dark:text-stone-400 mb-6">{scanResult.scientific}</p>

                  <div className="flex flex-wrap gap-2 mb-6">
                    <span className="px-3 py-1 bg-stone-100 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 rounded-lg text-xs text-stone-700 dark:text-stone-200 font-medium">
                      🪴 {plantProfile.variety} {plantProfile.name.includes("Tomato") ? "Tomato" : ""}
                    </span>
                    <span className={`px-3 py-1 border rounded-lg text-xs font-medium ${
                      scanResult.severity === "Severe" 
                        ? "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/20 dark:border-rose-950/40 dark:text-rose-400"
                        : scanResult.severity === "Moderate"
                        ? "bg-amber-50 border-amber-200 text-amber-700 dark:bg-amber-950/20 dark:border-amber-950/40 dark:text-amber-400"
                        : "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/20 dark:border-emerald-950/40 dark:text-emerald-400"
                    }`}>
                      ⚡ Severity: {scanResult.severity}
                    </span>
                    <span className="px-3 py-1 bg-stone-100 border border-stone-200 dark:bg-stone-800 dark:border-stone-700 rounded-lg text-xs text-stone-700 dark:text-stone-200 font-medium">
                      🍂 Localized spots
                    </span>
                  </div>

                  {/* Symptoms */}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-3">Observable Symptoms</h4>
                  <ul className="space-y-2 mb-6">
                    {scanResult.symptoms.map((symptom, idx) => (
                      <li key={idx} className="flex items-start gap-2.5 text-xs text-stone-700 dark:text-stone-300">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mt-1.5 shrink-0"></span>
                        <span>{symptom}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Spread Risk */}
                  <h4 className="text-xs font-bold uppercase tracking-wider text-stone-400 mb-2">Spreading Risk Factor</h4>
                  <div className="flex gap-4 items-center">
                    <div className="flex-1 h-3 bg-stone-100 dark:bg-stone-950 rounded-full overflow-hidden">
                      <div className="bg-amber-500 h-full rounded-full" style={{ width: `${scanResult.spread_risk}%` }}></div>
                    </div>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-500">{scanResult.spread_risk}%</span>
                  </div>
                </div>

                {/* Treatment Tab Card */}
                <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-serif text-xl font-bold mb-4">Treatment Plan & Remedies</h3>
                  
                  {/* Tabs */}
                  <div className="flex gap-1.5 p-1 bg-stone-100 dark:bg-stone-950 rounded-xl mb-6">
                    {(["immediate", "chemical", "organic", "prevention"] as const).map((tab) => (
                      <button
                        key={tab}
                        onClick={() => setTreatmentTab(tab)}
                        className={`flex-1 text-center py-2 text-xs font-semibold rounded-lg capitalize cursor-pointer transition-all ${
                          treatmentTab === tab 
                            ? "bg-white dark:bg-stone-900 text-emerald-700 dark:text-emerald-400 shadow-sm" 
                            : "text-stone-500 hover:text-stone-800 dark:text-stone-400 dark:hover:text-stone-200"
                        }`}
                      >
                        {tab}
                      </button>
                    ))}
                  </div>

                  {/* Panel */}
                  <div className="space-y-4">
                    {scanResult.treatment[treatmentTab].map((step, idx) => {
                      const match = step.match(/(.*)\[Recovery:\s*(.*)\]/);
                      const displayStep = match ? match[1].trim() : step;
                      const recoveryText = match ? match[2].trim() : "";

                      return (
                        <div key={idx} className="flex gap-4 items-start animate-fadeIn">
                          <div className="w-7 h-7 rounded-lg bg-emerald-50 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-400 font-bold text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-xs font-semibold text-stone-800 dark:text-stone-200 mb-0.5">Instruction Step</h4>
                            <p className="text-xs text-stone-600 dark:text-stone-300 leading-relaxed font-semibold">{displayStep}</p>
                            {recoveryText && (
                              <div className="mt-2 p-2 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 rounded-lg max-w-lg">
                                <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                  Expected Recovery
                                </span>
                                <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 mt-0.5 font-bold font-sans">
                                  {recoveryText}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

            </div>
          </div>
        )}

        {/* ===================== DASHBOARD PAGE ===================== */}
        {currentPage === "dashboard" && (() => {
          // Dynamic calculation combining user history data with base simulation values
          const defaultDiagnoses = [
            {
              id: "def-1",
              plantName: "Roma Tomato Pot B",
              disease: "Early Blight",
              scientific: "Alternaria solani",
              severity: "Moderate",
              status: "Resolving",
              date: "2026-05-22T10:00:00Z"
            },
            {
              id: "def-2",
              plantName: "Jalapeno Pepper Root 1",
              disease: "Anthracnose spots",
              scientific: "Colletotrichum coccodes",
              severity: "Severe",
              status: "Treating",
              date: "2026-05-15T14:30:00Z"
            },
            {
              id: "def-3",
              plantName: "Sweet Basil Pot 3",
              disease: "Downy Mildew pathogens",
              scientific: "Peronospora belbahrii",
              severity: "Mild",
              status: "Complete",
              date: "2026-05-08T09:15:00Z"
            }
          ];

          const scannedDiagnoses = historyRecords.map((rec) => ({
            id: rec.id,
            plantName: rec.plantName,
            disease: rec.result.disease,
            scientific: rec.result.scientific ?? "",
            severity: rec.result.severity,
            status: rec.result.severity === "Severe" ? "Treating" : rec.result.severity === "Moderate" ? "Resolving" : "Complete",
            date: rec.date,
            record: rec
          }));

          const combinedDiagnoses = [...scannedDiagnoses, ...defaultDiagnoses].sort(
            (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
          );

          // Calculate counters 
          const uniqueScannedPlants = Array.from(new Set(historyRecords.map(r => r.plantName.trim().toLowerCase()))).filter(Boolean).length;
          const totalBotanicalCount = 24 + uniqueScannedPlants;
          const fullyHealthyCount = 18;
          const healthyRating = Math.round((fullyHealthyCount / totalBotanicalCount) * 100);
          const activeSurveillanceCount = 4 + historyRecords.filter(r => r.result.severity === "Severe" || r.result.severity === "Moderate").length;
          const cloudScansCount = 12 + historyRecords.length;

          // Categorization taxonomy proportions
          let fungalAdd = 0;
          let bacterialAdd = 0;
          let viralAdd = 0;

          historyRecords.forEach(rec => {
            const d = rec.result.disease.toLowerCase();
            if (d.includes("mildew") || d.includes("spot") || d.includes("blight") || d.includes("rust") || d.includes("necrosis")) {
              fungalAdd++;
            } else if (d.includes("mite") || d.includes("infestation") || d.includes("damage")) {
              bacterialAdd++;
            } else {
              viralAdd++;
            }
          });

          const totalFungal = 6 + fungalAdd;
          const totalBacterial = 3 + bacterialAdd;
          const totalViral = 2 + viralAdd;
          const overallTotal = totalFungal + totalBacterial + totalViral;

          const fungalPct = Math.round((totalFungal / overallTotal) * 100);
          const bacterialPct = Math.round((totalBacterial / overallTotal) * 100);
          const viralPct = 100 - fungalPct - bacterialPct;

          // Weekly logs grouping (May 2026)
          let week1Add = 0; // May 1 - 7
          let week2Add = 0; // May 8 - 14
          let week3Add = 0; // May 15 - 21
          let week4Add = 0; // May 22 - 28
          let week5Add = 0; // May 29+

          historyRecords.forEach(rec => {
            const dateObj = new Date(rec.date);
            if (dateObj.getFullYear() === 2026 && dateObj.getMonth() === 4) { // May
              const day = dateObj.getDate();
              if (day <= 7) week1Add++;
              else if (day <= 14) week2Add++;
              else if (day <= 21) week3Add++;
              else if (day <= 28) week4Add++;
              else week5Add++;
            } else {
              week4Add++; 
            }
          });

          const m1Count = 2 + week1Add;
          const m8Count = 4 + week2Add;
          const m15Count = 1 + week3Add;
          const m22Count = 6 + week4Add;
          const m29Count = 3 + week5Add;

          // Activity logs feeds
          const defaultActivities = [
            {
              id: "act-1",
              title: "Weekly diagnosis clean",
              desc: "No new viral vectors detected",
              time: "2026-05-28T12:00:00Z",
              type: "success"
            },
            {
              id: "act-2",
              title: "Tomato B Early Blight spotted",
              desc: "Copper-spraying initiated",
              time: "2026-05-22T10:00:00Z",
              type: "warning"
            },
            {
              id: "act-3",
              title: "Soil irrigation altered",
              desc: "Drip-feed setup complete",
              time: "2026-05-08T09:15:00Z",
              type: "success"
            }
          ];

          const scannedActivities = historyRecords.map(rec => ({
            id: `act-${rec.id}`,
            title: `${rec.plantName} analyzed`,
            desc: `${rec.result.disease} identified (${rec.result.confidence}% Match)`,
            time: rec.date,
            type: rec.result.severity === "Severe" || rec.result.severity === "Moderate" ? "warning" : "success"
          }));

          const combinedActivities = [...scannedActivities, ...defaultActivities].sort(
            (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
          );

          // Circumference for Donut Chart
          const fungalDashStr = `${(314 * fungalPct) / 100} 314`;
          const bacterialDashStr = `${(314 * bacterialPct) / 100} 314`;
          const bacterialOffsetStr = `${-(314 * fungalPct) / 100}`;
          const viralDashStr = `${(314 * viralPct) / 100} 314`;
          const viralOffsetStr = `${-((314 * (fungalPct + bacterialPct)) / 100)}`;

          return (
            <div className="animate-fadeIn max-w-6xl mx-auto py-12 px-6">
              <div className="flex justify-between items-center border-b border-stone-200 dark:border-stone-800 pb-6 mb-8">
                <div>
                  <h1 className="font-serif text-3xl font-bold text-stone-900 dark:text-white">Garden Console</h1>
                  <p className="text-stone-500 text-sm">Visualize health diagnostics, recent AI alerts, and past scans in one place.</p>
                </div>
                <span className="text-xs px-3.5 py-1.5 rounded-xl border border-stone-200 dark:border-stone-800 bg-white dark:bg-stone-900 font-semibold text-stone-500">
                  May 2026
                </span>
              </div>

              {/* Metrics cards */}
              <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <div className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl">
                  <div className="flex justify-between text-stone-400 text-xs mb-3 font-semibold">
                    <span>Total botanical count</span>
                    <span className="text-emerald-700 dark:text-emerald-400">🪴 Active</span>
                  </div>
                  <div className="font-serif text-4xl font-bold text-stone-900 dark:text-white mb-0.5">{totalBotanicalCount}</div>
                  <span className="text-[10px] text-stone-400">Across 4 unique micro-zones</span>
                </div>

                <div className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl">
                  <div className="flex justify-between text-stone-400 text-xs mb-3 font-semibold">
                    <span>Fully Healthy</span>
                    <span className="text-emerald-600 font-bold">{healthyRating}% rating</span>
                  </div>
                  <div className="font-serif text-4xl font-bold text-stone-900 dark:text-white mb-0.5">{fullyHealthyCount}</div>
                  <span className="text-[10px] text-stone-400">Zero active symptoms logged</span>
                </div>

                <div className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl">
                  <div className="flex justify-between text-stone-400 text-xs mb-3 font-semibold">
                    <span>Under active surveillance</span>
                    <span className="text-rose-600 font-bold">↑ {activeSurveillanceCount - 4} new</span>
                  </div>
                  <div className="font-serif text-4xl font-bold text-stone-900 dark:text-white mb-0.5">{activeSurveillanceCount}</div>
                  <span className="text-[10px] text-stone-400">Subject to localized treatments</span>
                </div>

                <div className="p-5 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl">
                  <div className="flex justify-between text-stone-400 text-xs mb-3 font-semibold">
                    <span>Cloud AI scans</span>
                    <span className="text-emerald-700 dark:text-emerald-400">↑ 12% vs last month</span>
                  </div>
                  <div className="font-serif text-4xl font-bold text-stone-900 dark:text-white mb-0.5">{cloudScansCount}</div>
                  <span className="text-[10px] text-stone-400">Fully logged in database</span>
                </div>
              </div>

              {/* Charts layout */}
              <div className="grid lg:grid-cols-3 gap-8 mb-8">
                
                {/* Custom SVG Columns chart */}
                <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-serif text-lg font-bold mb-1">Weekly diagnostic logs</h3>
                  <p className="text-stone-400 text-xs mb-8">Weekly distribution of verified fungal anomalies</p>
                  
                  {/* Columns */}
                  <div className="flex items-end justify-between gap-4 h-48 border-b border-stone-100 dark:border-stone-800 pb-1 mb-2">
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-500 font-bold mb-1">{m1Count}</span>
                      <div className="w-full bg-emerald-700/80 rounded-t" style={{ height: `${Math.min(100, Math.max(8, m1Count * 12))}%` }}></div>
                      <span className="text-[10px] text-stone-400 mt-2 font-medium">May 1</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-500 font-bold mb-1">{m8Count}</span>
                      <div className="w-full bg-emerald-700/80 rounded-t" style={{ height: `${Math.min(100, Math.max(8, m8Count * 12))}%` }}></div>
                      <span className="text-[10px] text-stone-400 mt-2 font-medium">May 8</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-500 font-bold mb-1">{m15Count}</span>
                      <div className="w-full bg-emerald-700/80 rounded-t" style={{ height: `${Math.min(100, Math.max(8, m15Count * 12))}%` }}></div>
                      <span className="text-[10px] text-stone-400 mt-2 font-medium">May 15</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-500 font-bold mb-1">{m22Count}</span>
                      <div className="w-full bg-emerald-700/80 rounded-t" style={{ height: `${Math.min(100, Math.max(8, m22Count * 12))}%` }}></div>
                      <span className="text-[10px] text-stone-400 mt-2 font-medium">May 22</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-[10px] text-emerald-800 dark:text-emerald-500 font-bold mb-1">{m29Count}</span>
                      <div className="w-full bg-emerald-700/80 rounded-t" style={{ height: `${Math.min(100, Math.max(8, m29Count * 12))}%` }}></div>
                      <span className="text-[10px] text-stone-400 mt-2 font-medium">May 29</span>
                    </div>
                  </div>
                </div>

                {/* Custom SVG Donut Chart */}
                <div className="lg:col-span-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm flex flex-col">
                  <h3 className="font-serif text-lg font-bold mb-1">General taxonomy breakdown</h3>
                  <p className="text-stone-400 text-xs mb-6">Aggregate disease classifications</p>

                  <div className="flex-1 flex items-center justify-center p-4">
                    <svg width="140" height="140" viewBox="0 0 140 140" className="rotate-270">
                      <circle cx="70" cy="70" r="50" fill="none" stroke="#e7e5e4" strokeWidth="16" className="dark:stroke-stone-800" />
                      {/* Fungal % of circumference */}
                      <circle cx="70" cy="70" r="50" fill="none" stroke="#047857" strokeWidth="16" strokeDasharray={fungalDashStr} />
                      {/* Bacterial % of circumference */}
                      <circle cx="70" cy="70" r="50" fill="none" stroke="#d97706" strokeWidth="16" strokeDasharray={bacterialDashStr} strokeDashoffset={bacterialOffsetStr} />
                      {/* Viral % of circumference */}
                      <circle cx="70" cy="70" r="50" fill="none" stroke="#f43f5e" strokeWidth="16" strokeDasharray={viralDashStr} strokeDashoffset={viralOffsetStr} />
                    </svg>
                  </div>

                  <div className="space-y-2 mt-4 text-xs">
                    <div className="flex justify-between items-center"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-emerald-700"></span>Fungal Blight</div><span className="font-bold">{fungalPct}%</span></div>
                    <div className="flex justify-between items-center"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-amber-600"></span>Bacterial Mildew</div><span className="font-bold">{bacterialPct}%</span></div>
                    <div className="flex justify-between items-center"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>Viral Mosaics</div><span className="font-bold">{viralPct}%</span></div>
                  </div>
                </div>

              </div>

              {/* Custom high-contrast table & timeline logs */}
              <div className="grid lg:grid-cols-3 gap-8">
                
                <div className="lg:col-span-2 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm overflow-x-auto">
                  <h3 className="font-serif text-lg font-bold mb-4">Past Diagnoses Overview</h3>
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-stone-200 dark:border-stone-800 text-stone-400 uppercase tracking-wider">
                        <th className="pb-3 font-semibold">Plant Context</th>
                        <th className="pb-3 font-semibold">Diagnosis</th>
                        <th className="pb-3 font-semibold">Severity</th>
                        <th className="pb-3 font-semibold">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-stone-100 dark:divide-stone-800">
                      {combinedDiagnoses.map((diag) => (
                        <tr 
                          key={diag.id} 
                          className={`text-stone-700 dark:text-stone-300 transition-colors ${diag.record ? "hover:bg-emerald-500/5 cursor-pointer font-medium" : ""}`}
                          onClick={() => {
                            if (diag.record) {
                              selectHistoryScan(diag.record);
                            } else {
                              triggerToast(`Sample record: ${diag.plantName}`);
                            }
                          }}
                        >
                          <td className="py-3.5 flex items-center gap-1.5">
                            {diag.record && <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0 animate-pulse" />}
                            {diag.plantName}
                          </td>
                          <td>{diag.disease}</td>
                          <td>
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              diag.severity === "Severe" 
                                ? "bg-rose-100 dark:bg-rose-950/40 text-rose-800 dark:text-rose-400" 
                                : diag.severity === "Moderate"
                                  ? "bg-amber-100 dark:bg-amber-950/40 text-amber-800 dark:text-amber-400"
                                  : "bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-400"
                            }`}>
                              {diag.severity}
                            </span>
                          </td>
                          <td className="text-emerald-700 dark:text-emerald-400 font-semibold">
                            {diag.record ? "Review Report →" : diag.status}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Feed logs */}
                <div className="lg:col-span-1 bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-6 shadow-sm">
                  <h3 className="font-serif text-lg font-bold mb-4">Historical Activity Logs</h3>
                  <div className="space-y-4 text-xs">
                    {combinedActivities.slice(0, 7).map((act) => (
                      <div key={act.id} className="flex gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm shrink-0 ${
                          act.type === "warning" 
                            ? "bg-amber-500/10 text-amber-600" 
                            : "bg-emerald-500/10 text-emerald-600"
                        }`}>
                          {act.type === "warning" ? "⚠" : "✓"}
                        </div>
                        <div>
                          <h4 className="font-semibold text-stone-800 dark:text-stone-200">{act.title}</h4>
                          <p className="text-stone-400 text-[10px] leading-relaxed">{act.desc}</p>
                          <span className="text-[9px] text-stone-400/80 block mt-0.5">
                            {new Date(act.time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

              </div>

            </div>
          );
        })()}

        {/* ===================== HISTORY PAGE ===================== */}
        {currentPage === "history" && (
          <div className="animate-fadeIn max-w-5xl mx-auto py-12 px-6">
            <div className="mb-10 text-center">
              <span className="text-xs font-bold text-emerald-700 dark:text-emerald-500 uppercase tracking-widest block mb-2">Saved reports</span>
              <h1 className="text-3xl font-serif font-bold text-stone-900 dark:text-white mb-2">Disease History Catalog</h1>
              <p className="text-stone-500 text-sm">Review your earlier diagnostic images, confidence ratings, and custom-generated treatments logs.</p>
            </div>

            {historyRecords.length === 0 ? (
              <div className="text-center p-16 border border-stone-200 dark:border-stone-800 rounded-2xl bg-white dark:bg-stone-900">
                <Clock className="w-12 h-12 text-stone-300 dark:text-stone-700 mx-auto mb-4" />
                <h3 className="font-serif text-lg font-medium text-stone-800 dark:text-stone-200">No scanned plant records found</h3>
                <p className="text-xs text-stone-400 mt-1 max-w-md mx-auto leading-relaxed">
                  Scanned foliage results are archived here on your device, and synced to your secure online account once logged in.
                </p>
                <button 
                  onClick={() => setCurrentPage("upload")}
                  className="mt-6 px-5 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer"
                >
                  Create Your First Scan
                </button>
              </div>
            ) : (
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {historyRecords.map((record) => (
                  <div 
                    key={record.id}
                    onClick={() => selectHistoryScan(record)}
                    className="group bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden hover:shadow-lg hover:border-emerald-500/20 transition-all duration-200 cursor-pointer flex flex-col relative"
                  >
                    <div className="h-40 bg-stone-100 dark:bg-stone-950 flex items-center justify-center overflow-hidden relative">
                      {record.imageData ? (
                        <img 
                          src={record.imageData} 
                          alt={record.result.disease} 
                          className="w-full h-full object-cover group-hover:scale-102 transition-transform duration-300"
                        />
                      ) : (
                        <Leaf className="w-12 h-12 text-stone-300" />
                      )}
                      
                      {/* Delete History Button */}
                      <button
                        id={`delete_record_${record.id}`}
                        title="Delete inspection record"
                        onClick={(e) => handleDeleteScan(record, e)}
                        className="absolute top-3 left-3 p-1.5 bg-white/95 hover:bg-red-50 border border-stone-200 rounded-lg shadow-sm text-stone-400 hover:text-red-600 transition-all duration-150 z-25 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>

                      <div className="absolute top-3 right-3 px-2.5 py-1 bg-white/90 dark:bg-stone-900/90 text-[10px] font-bold rounded-lg text-emerald-800 dark:text-emerald-500 border border-stone-200 dark:border-stone-800 shadow-sm z-25">
                        {record.result.confidence}% Match
                      </div>
                    </div>
                    <div className="p-5 flex-1 flex flex-col justify-between">
                      <div>
                        <span className="text-[10px] text-stone-400 font-semibold block mb-1">
                          {new Date(record.date).toLocaleDateString()}
                        </span>
                        <h3 className="font-serif text-base font-bold text-stone-900 dark:text-white group-hover:text-emerald-700 dark:group-hover:text-emerald-400 transition-colors mb-1">
                          {record.result.disease}
                        </h3>
                        <p className="text-xs text-stone-500 dark:text-stone-400 italic mb-4">{record.result.scientific}</p>
                      </div>
                      <div className="flex justify-between items-center text-xs mt-auto pt-4 border-t border-stone-100 dark:border-stone-800">
                        <span className="text-[10px] uppercase font-bold tracking-wider text-stone-400">{record.result.severity} Severity</span>
                        <span className="text-emerald-700 dark:text-emerald-400 font-semibold group-hover:translate-x-0.5 transition-transform">
                          Review Report →
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ===================== REMEDIES PAGE ===================== */}
        {currentPage === "remedies" && (
          <div className="animate-fadeIn">
            <RemedyGenerator isDarkMode={isDarkMode} triggerToast={triggerToast} />
          </div>
        )}

        {/* ===================== RECOVERY TRACKER ===================== */}
        {currentPage === "tracker" && (
          <div className="animate-fadeIn">
            <RecoveryTracker isDarkMode={isDarkMode} triggerToast={triggerToast} />
          </div>
        )}



      </main>

      {/* Floating Chatbot Bubble component */}
      <Chatbot />

      {/* Footer */}
      <footer className="bg-stone-900 text-stone-500 pt-16 pb-8 px-8 border-t border-stone-800 font-sans mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6 border-b border-stone-800 pb-8 mb-8">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-emerald-800/10 text-emerald-500 flex items-center justify-center">
              <Leaf className="w-4 h-4 text-emerald-500" />
            </div>
            <span className="font-serif text-base font-bold text-white leading-none">Green Guardian AI</span>
          </div>
          <p className="text-stone-400 text-xs max-w-sm text-center md:text-right leading-relaxed">
            Protecting crop yields with deep-learning horticultural analysis.
          </p>
        </div>
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between text-[11px] text-stone-600">
          <p>© 2026 Green Guardian AI. All rights reserved.</p>
          <div className="flex gap-4">
            <a href="#" className="hover:text-stone-400 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-stone-400 transition-colors">Terms of Service</a>
          </div>
        </div>
      </footer>

      {/* Toast popup */}
      {toastMessage && (
        <div className="fixed bottom-6 left-6 z-[9999] px-5 py-3 rounded-xl bg-emerald-800 text-white text-xs font-semibold shadow-2xl animate-slideUp">
          {toastMessage}
        </div>
      )}

      {/* Auth Login/Signup Modal */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-stone-950/60 backdrop-blur-sm z-[99999] flex items-center justify-center p-6 animate-fadeIn">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl w-full max-w-md overflow-hidden shadow-2xl">
            {/* Header */}
            <div className="p-6 pb-0 flex justify-between items-center">
              <div>
                <h3 className="font-serif text-lg font-bold text-stone-900 dark:text-white">
                  {authMode === "login" ? "Welcome Back" : "Create Account"}
                </h3>
                <p className="text-xs text-stone-400">
                  {authMode === "login" ? "Sign in to access saved audits" : "Join to log plant history & charts"}
                </p>
              </div>
              <button 
                onClick={() => setShowAuthModal(false)}
                className="p-1 text-stone-400 hover:text-stone-700 dark:hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Error message */}
            {authError && (
              <div className="mx-6 mt-4 p-3 bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 rounded-lg text-xs">
                {authError}
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleAuthSubmit} className="p-6 space-y-4">
              {authMode === "signup" && (
                <div>
                  <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Full Name</label>
                  <input 
                    type="text"
                    value={authName}
                    onChange={(e) => setAuthName(e.target.value)}
                    placeholder="e.g. John Doe"
                    className="w-full text-xs px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-stone-900 dark:text-white"
                  />
                </div>
              )}
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Email address</label>
                <input 
                  type="email"
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full text-xs px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-stone-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold uppercase tracking-wider text-stone-400 mb-1">Password</label>
                <input 
                  type="password"
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="Your secure password"
                  className="w-full text-xs px-3.5 py-2.5 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl outline-none focus:border-emerald-600 focus:bg-white dark:focus:bg-stone-900 dark:text-white"
                />
              </div>

              <button 
                type="submit"
                className="w-full py-3 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-semibold shadow-md cursor-pointer transition-colors mt-2"
              >
                {authMode === "login" ? "Login to Console" : "Register Now"}
              </button>

              <div className="text-center pt-2 text-xs text-stone-400">
                {authMode === "login" ? (
                  <p>
                    Don't have an account?{" "}
                    <button 
                      type="button" 
                      onClick={() => { setAuthMode("signup"); setAuthError(""); }}
                      className="text-emerald-700 dark:text-emerald-500 font-semibold hover:underline cursor-pointer"
                    >
                      Sign Up free
                    </button>
                  </p>
                ) : (
                  <p>
                    Already registered?{" "}
                    <button 
                      type="button" 
                      onClick={() => { setAuthMode("login"); setAuthError(""); }}
                      className="text-emerald-700 dark:text-emerald-500 font-semibold hover:underline cursor-pointer"
                    >
                      Sign In
                    </button>
                  </p>
                )}
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
