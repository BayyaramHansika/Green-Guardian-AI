import React, { useState, useEffect } from "react";
import { 
  Camera, 
  Upload, 
  ArrowLeftRight, 
  Sparkles, 
  TrendingUp, 
  Check, 
  Calendar, 
  Trash2, 
  Info, 
  Activity, 
  Leaf, 
  RefreshCw, 
  Heart,
  ChevronRight,
  ShieldCheck
} from "lucide-react";

interface ComparisonReport {
  id: string;
  date: string;
  plantName: string;
  beforeImage: string;
  afterImage: string;
  recoveryPercentage: number;
  improvementStatus: string;
  summary: string;
  observations: string[];
  recommendation: string;
  isFallback?: boolean;
}

interface RecoveryTrackerProps {
  isDarkMode: boolean;
  triggerToast: (msg: string) => void;
}

export const RecoveryTracker: React.FC<RecoveryTrackerProps> = ({ isDarkMode, triggerToast }) => {
  // Input fields
  const [plantName, setPlantName] = useState("");
  const [beforeImage, setBeforeImage] = useState<string | null>(null);
  const [beforeMimeType, setBeforeMimeType] = useState<string>("image/jpeg");
  const [afterImage, setAfterImage] = useState<string | null>(null);
  const [afterMimeType, setAfterMimeType] = useState<string>("image/jpeg");
  
  // App UI State
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);
  const [currentReport, setCurrentReport] = useState<ComparisonReport | null>(null);
  const [savedComparisons, setSavedComparisons] = useState<ComparisonReport[]>([]);

  // Drag over states
  const [dragBeforeActive, setDragBeforeActive] = useState(false);
  const [dragAfterActive, setDragAfterActive] = useState(false);

  // Loading quotes or steps for pleasant visual engagement
  const loadingSteps = [
    "Uploading foliage captures & validating image telemetry...",
    "Scanning chlorophyll density levels across leaf veins...",
    "Comparing necrotized surface tissue areas count...",
    "Drafting horticultural improvement reports..."
  ];

  useEffect(() => {
    // Rotation of loading steps when loading is active
    let interval: any;
    if (loading) {
      interval = setInterval(() => {
        setLoadingStep((prev) => (prev + 1) % loadingSteps.length);
      }, 3000);
    } else {
      setLoadingStep(0);
    }
    return () => clearInterval(interval);
  }, [loading]);

  useEffect(() => {
    // Load existing history from local storage
    try {
      const stored = localStorage.getItem("gg_recovery_comparisons");
      if (stored) {
        setSavedComparisons(JSON.parse(stored));
      }
    } catch (ignore) {}
  }, []);

  const handleImageUpload = (
    e: React.ChangeEvent<HTMLInputElement>, 
    target: "before" | "after"
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(",")[1];
      
      if (target === "before") {
        setBeforeImage(base64Data);
        setBeforeMimeType(file.type);
        triggerToast("Before state photo uploaded matches successfully!");
      } else {
        setAfterImage(base64Data);
        setAfterMimeType(file.type);
        triggerToast("Next week's progress photo uploaded matches successfully!");
      }
    };
    reader.readAsDataURL(file);
  };

  // Drag and drop handlers
  const handleDrag = (e: React.DragEvent, target: "before" | "after", active: boolean) => {
    e.preventDefault();
    e.stopPropagation();
    if (target === "before") setDragBeforeActive(active);
    else setDragAfterActive(active);
  };

  const handleDrop = (e: React.DragEvent, target: "before" | "after") => {
    e.preventDefault();
    e.stopPropagation();
    if (target === "before") setDragBeforeActive(false);
    else setDragAfterActive(false);

    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      triggerToast("Please drop absolute valid image files only.");
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      const base64String = reader.result as string;
      const base64Data = base64String.split(",")[1];
      
      if (target === "before") {
        setBeforeImage(base64Data);
        setBeforeMimeType(file.type);
        triggerToast("Before state photo loaded!");
      } else {
        setAfterImage(base64Data);
        setAfterMimeType(file.type);
        triggerToast("Follow-up progress photo loaded!");
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCompareSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!beforeImage) {
      triggerToast("Please select the 'Before' state image first");
      return;
    }
    if (!afterImage) {
      triggerToast("Please select the 'After/Next Week' progress image first");
      return;
    }

    setLoading(true);
    setCurrentReport(null);

    try {
      const res = await fetch("/api/compare", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantName: plantName.trim() || undefined,
          beforeImage: beforeImage,
          beforeMimeType: beforeMimeType,
          afterImage: afterImage,
          afterMimeType: afterMimeType
        })
      });

      if (!res.ok) {
        throw new Error("Compare server error status");
      }

      const data = await res.json();
      
      const newReport: ComparisonReport = {
        id: `comp-${Date.now()}`,
        date: new Date().toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }),
        plantName: data.plantName || plantName.trim() || "Domestic Crop",
        beforeImage: beforeImage,
        afterImage: afterImage,
        recoveryPercentage: data.recoveryPercentage,
        improvementStatus: data.improvementStatus,
        summary: data.summary,
        observations: data.observations,
        recommendation: data.recommendation,
        isFallback: data.isFallback
      };

      setCurrentReport(newReport);
      
      // Persist in LocalStorage
      const updatedHistory = [newReport, ...savedComparisons];
      setSavedComparisons(updatedHistory);
      localStorage.setItem("gg_recovery_comparisons", JSON.stringify(updatedHistory));

      triggerToast("Inspection progression compiled successfully!");
    } catch (err) {
      console.error(err);
      triggerToast("Failed to compile before/after comparison.");
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteComparison = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const filtered = savedComparisons.filter(rep => rep.id !== id);
    setSavedComparisons(filtered);
    localStorage.setItem("gg_recovery_comparisons", JSON.stringify(filtered));
    if (currentReport?.id === id) {
      setCurrentReport(null);
    }
    triggerToast("Recovery telemetry deleted successfully.");
  };

  const resetTracker = () => {
    setPlantName("");
    setBeforeImage(null);
    setAfterImage(null);
    setCurrentReport(null);
  };

  const getPercentageColor = (percent: number) => {
    if (percent >= 80) return "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20";
    if (percent >= 55) return "text-amber-600 dark:text-amber-400 bg-amber-500/10 border-amber-500/20";
    return "text-rose-600 dark:text-rose-400 bg-rose-500/10 border-rose-500/20";
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 font-sans">
      {/* Tracker Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/10 dark:bg-teal-500/20 border border-teal-500/20 text-teal-700 dark:text-teal-300 text-xs font-bold rounded-full mb-3">
          <Activity className="w-3.5 h-3.5 text-teal-500 animate-pulse" />
          Foliage Recovery Tracker
        </div>
        <h1 className="text-2xl sm:text-3.5xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
          Before vs After progress Analyzer
        </h1>
        <p className="max-w-xl mx-auto text-stone-500 dark:text-stone-400 text-xs sm:text-sm mt-2">
          Compare today's symptomatic leaves against follow-up samples next week to view chlorophyll density gains, pathogen regression curves, and custom visual diagnostics.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Input Configuration (lg:col-span-5) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <Leaf className="w-4 h-4 text-teal-600" />
              1. Setup Compare Metadata
            </h2>

            {/* Input Plant Name */}
            <div className="space-y-1.5">
              <label htmlFor="tracker_plant_name" className="block text-xs font-semibold text-stone-500 dark:text-stone-400">
                Plant Nickname or Species (e.g. Garden Heirloom Tomato)
              </label>
              <input
                id="tracker_plant_name"
                type="text"
                placeholder="e.g., Fiddle Leaf Fig, Patio Rose"
                value={plantName}
                onChange={(e) => setPlantName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-800 dark:text-stone-100 focus:outline-none focus:border-teal-600 transition-colors"
              />
            </div>
          </div>

          {/* Dual Drop Zones Box */}
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <Camera className="w-4 h-4 text-teal-600" />
              2. Upload Comparison Photos
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Before Slot */}
              <div 
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all relative flex flex-col justify-center items-center h-48 ${
                  beforeImage 
                    ? "border-teal-500 bg-teal-50/10 dark:bg-teal-950/5" 
                    : dragBeforeActive
                    ? "border-teal-400 bg-teal-500/5"
                    : "border-stone-200 dark:border-stone-800 hover:border-teal-500/60"
                }`}
                onDragOver={(e) => handleDrag(e, "before", true)}
                onDragLeave={(e) => handleDrag(e, "before", false)}
                onDrop={(e) => handleDrop(e, "before")}
                onClick={() => document.getElementById("file_before")?.click()}
              >
                <input
                  id="file_before"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "before")}
                  className="hidden"
                />
                
                {beforeImage ? (
                  <div className="absolute inset-0 rounded-2xl overflow-hidden group">
                    <img
                      src={`data:${beforeMimeType};base64,${beforeImage}`}
                      alt="Before state"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-150 transition-opacity flex flex-col items-center justify-center text-white p-2">
                      <RefreshCw className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">Replace Before</span>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 bg-black/50 text-[10px] text-stone-100 py-1 px-2 rounded-lg text-center font-bold">
                      🔴 TODAY (BEFORE)
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pointer-events-none">
                    <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-center mx-auto text-stone-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <div className="text-[11px] font-extrabold text-stone-700 dark:text-stone-300">TODAY'S STATE</div>
                      <div className="text-[9px] text-stone-400 mt-0.5">Drag or click to load</div>
                    </div>
                  </div>
                )}
              </div>

              {/* After Slot */}
              <div 
                className={`border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all relative flex flex-col justify-center items-center h-48 ${
                  afterImage 
                    ? "border-teal-500 bg-teal-50/10 dark:bg-teal-950/5" 
                    : dragAfterActive
                    ? "border-teal-400 bg-teal-500/5"
                    : "border-stone-200 dark:border-stone-800 hover:border-teal-500/60"
                }`}
                onDragOver={(e) => handleDrag(e, "after", true)}
                onDragLeave={(e) => handleDrag(e, "after", false)}
                onDrop={(e) => handleDrop(e, "after")}
                onClick={() => document.getElementById("file_after")?.click()}
              >
                <input
                  id="file_after"
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleImageUpload(e, "after")}
                  className="hidden"
                />
                
                {afterImage ? (
                  <div className="absolute inset-0 rounded-2xl overflow-hidden group">
                    <img
                      src={`data:${afterMimeType};base64,${afterImage}`}
                      alt="After state"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-150 transition-opacity flex flex-col items-center justify-center text-white p-2">
                      <RefreshCw className="w-5 h-5 mb-1" />
                      <span className="text-[10px] font-bold">Replace After</span>
                    </div>
                    <div className="absolute bottom-2 left-2 right-2 bg-black/50 text-[10px] text-stone-100 py-1 px-2 rounded-lg text-center font-bold">
                      🟢 NEXT WEEK (AFTER)
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 pointer-events-none">
                    <div className="w-10 h-10 rounded-xl bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 flex items-center justify-center mx-auto text-stone-400">
                      <Upload className="w-5 h-5" />
                    </div>
                    <div className="text-center">
                      <div className="text-[11px] font-extrabold text-stone-700 dark:text-stone-300">FOLLOW-UP PROGRESS</div>
                      <div className="text-[9px] text-stone-400 mt-0.5">Drag or click to load</div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Run Button wrapper */}
            <div className="pt-2">
              <button
                id="compare_trigger_btn"
                onClick={handleCompareSubmit}
                disabled={loading || !beforeImage || !afterImage}
                className="w-full py-3 bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-teal-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeftRight className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                {loading ? "Aligning Foliage Timelines..." : "Compare Foliage Health Now"}
              </button>
            </div>
          </div>

          {/* Historical Comparatives List */}
          {savedComparisons.length > 0 && (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-3">
              <h3 className="text-xs font-extrabold uppercase text-stone-400 tracking-wider">
                Saved Telemetry comparisons ({savedComparisons.length})
              </h3>
              <div className="space-y-2 max-h-56 overflow-y-auto">
                {savedComparisons.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => setCurrentReport(item)}
                    className={`p-3 border rounded-xl flex items-center justify-between cursor-pointer hover:border-teal-500/40 transition-colors ${
                      currentReport?.id === item.id 
                        ? "bg-teal-500/5 border-teal-500/30" 
                        : "bg-stone-50 dark:bg-stone-950 border-stone-200 dark:border-stone-800"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-teal-500/15 border border-teal-500/10 flex items-center justify-center text-[10px] font-black text-teal-600 dark:text-teal-400">
                        {item.recoveryPercentage}%
                      </div>
                      <div>
                        <div className="text-xs font-bold text-stone-800 dark:text-stone-200 max-w-[140px] truncate">
                          {item.plantName}
                        </div>
                        <div className="text-[10px] text-stone-400 flex items-center gap-1 mt-0.5">
                          <Calendar className="w-3 h-3" /> {item.date}
                        </div>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={(e) => handleDeleteComparison(item.id, e)}
                      className="p-1 hover:text-red-550 text-stone-400 transition-colors"
                      title="Delete log"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Output Dashboard (lg:col-span-7) */}
        <div className="lg:col-span-7">
          {loading ? (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-12 text-center py-20 space-y-6 shadow-sm flex flex-col items-center justify-center min-h-[400px]">
              <div className="relative">
                <div className="w-14 h-14 rounded-full border-4 border-stone-100 border-t-teal-600 animate-spin dark:border-stone-850"></div>
                <div className="absolute inset-0 flex items-center justify-center text-teal-600">
                  <Activity className="w-5 h-5 animate-pulse" />
                </div>
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-sm font-bold text-stone-800 dark:text-stone-200 animate-pulse">
                  Horticulture Progression Matrix
                </h3>
                <p className="text-xs text-stone-400 leading-relaxed font-mono">
                  {loadingSteps[loadingStep]}
                </p>
              </div>
            </div>
          ) : currentReport ? (
            <div className="space-y-6">
              {/* Report Canvas */}
              <div id="comparison_result_box" className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-md overflow-hidden p-6 relative">
                
                {/* Header Information */}
                <div className="border-b border-stone-100 dark:border-stone-800 pb-5 mb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] uppercase tracking-wider font-extrabold text-teal-600 bg-teal-500/10 px-2.5 py-1 rounded-md">
                      Botanical Comparison Telemetry
                    </span>
                    <h3 className="text-xl sm:text-2xl font-black mt-2 text-stone-900 dark:text-stone-100 tracking-tight uppercase">
                      {currentReport.plantName}
                    </h3>
                    <p className="text-xs text-stone-400 mt-1 dark:text-stone-500 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" /> Calculated progress logged on <strong>{currentReport.date}</strong>
                    </p>
                  </div>
                  
                  {/* Big Percentage Gauge Card */}
                  <div className={`p-4 rounded-2xl border text-center flex flex-col justify-center items-center min-w-[120px] ${getPercentageColor(currentReport.recoveryPercentage)}`}>
                    <div className="text-3xl font-black tracking-tighter">
                      {currentReport.recoveryPercentage}%
                    </div>
                    <div className="text-[9px] uppercase tracking-wider font-extrabold mt-0.5">
                      Foliage Recovery
                    </div>
                  </div>
                </div>

                {/* Progress Indicators Tag Row */}
                <div className="grid grid-cols-2 gap-3 py-3 px-4 bg-stone-50 dark:bg-stone-950/40 border border-stone-100 dark:border-stone-800 rounded-xl text-stone-600 dark:text-stone-400 text-xs mb-5">
                  <div>
                    <span className="text-[9px] text-stone-400 uppercase font-black">Pathology Verdict</span>
                    <span className="font-extrabold text-stone-850 dark:text-stone-250 block mt-0.5 text-teal-600">
                      {currentReport.improvementStatus}
                    </span>
                  </div>
                  <div className="border-l border-stone-200 dark:border-stone-800 pl-4">
                    <span className="text-[9px] text-stone-400 uppercase font-black">Accuracy Standard</span>
                    <span className="font-extrabold text-stone-850 dark:text-stone-250 block mt-0.5 flex items-center gap-1">
                      {currentReport.isFallback ? (
                        <>
                          <Info className="w-3.5 h-3.5 text-amber-500" /> Offline Metric
                        </>
                      ) : (
                        <>
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" /> 100% Neural Check
                        </>
                      )}
                    </span>
                  </div>
                </div>

                {/* Picture Comparison Row */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                  <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 h-44 relative bg-stone-50 dark:bg-stone-950">
                    <img
                      src={`data:image/jpeg;base64,${currentReport.beforeImage}`}
                      alt="Before"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/60 text-[9px] text-white font-extrabold px-2.5 py-1 rounded-md">
                      🔴 BEFORE
                    </div>
                  </div>
                  <div className="rounded-xl overflow-hidden border border-stone-200 dark:border-stone-800 h-44 relative bg-stone-50 dark:bg-stone-950">
                    <img
                      src={`data:image/jpeg;base64,${currentReport.afterImage}`}
                      alt="After"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-2 left-2 bg-black/60 text-[9px] text-white font-extrabold px-2.5 py-1 rounded-md">
                      🟢 AFTER (PROGRESS)
                    </div>
                  </div>
                </div>

                {/* Summary Text block */}
                <div className="space-y-2 mb-5">
                  <h4 className="text-xs font-extrabold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                    <TrendingUp className="w-4 h-4 text-teal-600" /> Growth Engine Analysis Summary
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed bg-teal-500/[0.02] border border-teal-500/[0.08] p-3.5 rounded-xl">
                    {currentReport.summary}
                  </p>
                </div>

                {/* Diagnostic observations bullets */}
                <div className="space-y-3 mb-5">
                  <h4 className="text-xs font-extrabold text-stone-800 dark:text-stone-100 uppercase tracking-wide">
                    Leaf Anatomy Observations
                  </h4>
                  <div className="space-y-2">
                    {currentReport.observations.map((obs, idx) => (
                      <div 
                        key={idx}
                        className="flex items-start gap-3 p-3 bg-stone-50 dark:bg-stone-950/40 border border-stone-200 dark:border-stone-800 rounded-xl"
                      >
                        <div className="w-5 h-5 shrink-0 rounded-full bg-teal-500/10 text-teal-700 dark:text-teal-400 flex items-center justify-center text-xs font-bold mt-0.5">
                          <Check className="w-3 h-3" />
                        </div>
                        <span className="text-xs text-stone-750 dark:text-stone-300 leading-relaxed font-medium">
                          {obs}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                <div className="space-y-2 mb-6">
                  <h4 className="text-xs font-extrabold text-stone-800 dark:text-stone-100 flex items-center gap-1.5">
                    <Heart className="w-4 h-4 text-teal-600" /> Pathologist Next-Care Protocols
                  </h4>
                  <p className="text-xs text-emerald-800 dark:text-emerald-400 bg-emerald-500/5 border border-dashed border-emerald-500/20 p-3.5 rounded-xl leading-relaxed font-semibold">
                    {currentReport.recommendation}
                  </p>
                </div>

                {/* Reset or Clear comparison */}
                <div className="pt-4 border-t border-stone-100 dark:border-stone-800 text-center">
                  <button
                    id="reset_compare_tracker"
                    onClick={resetTracker}
                    className="px-6 py-2 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 border border-stone-250 dark:border-stone-700 text-stone-750 dark:text-stone-200 text-xs font-bold rounded-xl transition-all cursor-pointer"
                  >
                    Load New Comparison Pair
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center space-y-4 shadow-sm h-full flex flex-col justify-center items-center py-20 min-h-[400px]">
              <div className="w-16 h-16 rounded-2xl bg-stone-50 dark:bg-stone-950 flex items-center justify-center text-teal-500/40 border border-stone-200/50 dark:border-stone-850">
                <ArrowLeftRight className="w-8 h-8 font-light text-teal-600" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-700 dark:text-stone-350">
                  No Telemetry Comparison Loaded
                </h3>
                <p className="text-xs text-stone-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Provide your plant detail, drag or upload the **Today (Before)** photo and **Next Week (After)** progress photo on the left configuration column to map the chlorophyll recovery percentage.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
