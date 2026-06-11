import React, { useState } from "react";
import { 
  Sprout, 
  Sparkles, 
  AlertCircle, 
  CheckCircle2, 
  Droplets, 
  ShieldAlert, 
  TrendingUp, 
  Compass, 
  Printer, 
  Heart, 
  Wrench, 
  ChevronRight, 
  RotateCcw 
} from "lucide-react";

interface RemedyResponse {
  plantName: string;
  symptoms: string;
  remedyType: string;
  title: string;
  summary: string;
  difficulty: "Easy" | "Medium" | "Advanced";
  timeRequired: string;
  isPetSafe: boolean;
  ingredients: string[];
  steps: string[];
  application: string;
  cautions: string;
  isFallback?: boolean;
}

const PRESETS = [
  { plant: "Tomato", symptoms: "Concentric brown circles on lower leaves (Blight)", icon: "🍅" },
  { plant: "Rose", symptoms: "Fringed black spots with yellowing leaf halos", icon: "🌹" },
  { plant: "Succulent", symptoms: "Mushy translucent leaves dropping from stem", icon: "🪴" },
  { plant: "Money Plant", symptoms: "Yellowing leaves and slow growth under poor lighting", icon: "🌱" },
  { plant: "Lemon Citrus", symptoms: "White powdery chalky coating on fresh shoots", icon: "🍋" }
];

interface RemedyGeneratorProps {
  isDarkMode: boolean;
  triggerToast: (msg: string) => void;
}

export const RemedyGenerator: React.FC<RemedyGeneratorProps> = ({ isDarkMode, triggerToast }) => {
  const [plantName, setPlantName] = useState("");
  const [symptoms, setSymptoms] = useState("");
  const [remedyType, setRemedyType] = useState("organic");
  const [loading, setLoading] = useState(false);
  const [prescription, setPrescription] = useState<RemedyResponse | null>(null);
  const [checkedSteps, setCheckedSteps] = useState<boolean[]>([]);

  const handlePresetSelect = (preset: typeof PRESETS[0]) => {
    setPlantName(preset.plant);
    setSymptoms(preset.symptoms);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!plantName.trim()) {
      triggerToast("Please enter a plant name");
      return;
    }
    if (!symptoms.trim()) {
      triggerToast("Please describe the plant symptoms");
      return;
    }

    setLoading(true);
    setPrescription(null);
    setCheckedSteps([]);

    try {
      const res = await fetch("/api/remedies", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          plantName: plantName.trim(),
          symptoms: symptoms.trim(),
          remedyType: remedyType
        })
      });

      if (!res.ok) {
        throw new Error("Server responded with error status");
      }

      const data = await res.json();
      setPrescription(data);
      if (data.steps && Array.isArray(data.steps)) {
        setCheckedSteps(new Array(data.steps.length).fill(false));
      }

      triggerToast(data.isFallback 
        ? "Remedy compiled using biological database guidelines!" 
        : "AI Remedy Prescription generated successfully!"
      );
    } catch (err: any) {
      console.error(err);
      triggerToast("Error connecting to remedy generator. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const toggleStep = (idx: number) => {
    const updated = [...checkedSteps];
    updated[idx] = !updated[idx];
    setCheckedSteps(updated);
  };

  const handlePrint = () => {
    if (!prescription) return;
    const printWindow = window.open("", "_blank");
    if (!printWindow) {
      triggerToast("Please allow popups to print the prescription sheet");
      return;
    }

    const htmlContent = `
      <html>
        <head>
          <title>${prescription.title}</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; padding: 40px; color: #1c1917; background-color: white; line-height: 1.6; }
            .header { border-bottom: 3px solid #047857; padding-bottom: 20px; margin-bottom: 30px; }
            .title { font-size: 28px; font-weight: bold; color: #065f46; margin: 0; }
            .subtitle { font-size: 14px; color: #78716c; margin-top: 5px; }
            .meta-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 15px; margin-bottom: 30px; background: #f0fdf4; padding: 15px; border-radius: 8px; border: 1px solid #d1fae5; }
            .meta-item { font-size: 14px; }
            .meta-item strong { color: #065f46; }
            .section { margin-bottom: 30px; }
            .section-title { font-size: 18px; font-weight: bold; color: #1c1917; border-bottom: 1px solid #e7e5e4; padding-bottom: 8px; margin-bottom: 15px; }
            .ingredients-list { display: flex; flex-wrap: wrap; gap: 8px; list-style: none; padding: 0; margin: 0; }
            .ingredient-tag { background: #f5f5f4; border: 1px solid #e7e5e4; padding: 6px 12px; border-radius: 6px; font-size: 13px; font-weight: 500; }
            .steps { margin: 0; padding-left: 20px; }
            .steps li { margin-bottom: 10px; font-size: 14px; }
            .cautions { background: #fffbeb; border: 1px solid #fef3c7; padding: 15px; border-radius: 8px; font-size: 13px; color: #92400e; }
            .footer { margin-top: 50px; border-top: 1px dashed #e7e5e4; padding-top: 15px; text-align: center; font-size: 12px; color: #a8a29e; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1 class="title">${prescription.title}</h1>
            <div class="subtitle">Botanical Treatment Plan for ${prescription.plantName}</div>
          </div>
          
          <div class="meta-grid">
            <div class="meta-item"><strong>Plant Species:</strong> ${prescription.plantName}</div>
            <div class="meta-item"><strong>Diagnosed Issues:</strong> ${prescription.symptoms}</div>
            <div class="meta-item"><strong>Remedy Spectrum:</strong> ${prescription.remedyType.toUpperCase()}</div>
            <div class="meta-item"><strong>Prep/Duration:</strong> ${prescription.timeRequired}</div>
            <div class="meta-item"><strong>Prep Difficulty:</strong> ${prescription.difficulty}</div>
            <div class="meta-item"><strong>Pet Safety:</strong> ${prescription.isPetSafe ? "🟢 Certified Pet & Home Safe" : "⚠️ Keep pets away from foliage"}</div>
          </div>

          <div class="section">
            <div class="section-title">Diagnostic Description & Strategy</div>
            <p style="font-size: 14.5px; margin: 0;">${prescription.summary}</p>
          </div>

          <div class="section">
            <div class="section-title">Required Materials / Ingredients</div>
            <ul class="ingredients-list">
              ${prescription.ingredients.map(ing => `<li class="ingredient-tag">${ing}</li>`).join("")}
            </ul>
          </div>

          <div class="section">
            <div class="section-title">Application Guidelines</div>
            <p style="font-size: 14.5px; margin: 0;">${prescription.application}</p>
          </div>

          <div class="section">
            <div class="section-title">Step-by-Step Preparation & Care Instructions</div>
            <ol class="steps">
              ${prescription.steps.map(step => {
                const match = step.match(/(.*)\[Recovery:\s*(.*)\]/);
                const displayStep = match ? match[1].trim() : step;
                const recoveryText = match ? match[2].trim() : "";
                return `
                  <li style="margin-bottom: 12px;">
                    <div>${displayStep}</div>
                    ${recoveryText ? `<div style="font-size: 11.5px; color: #047857; margin-top: 4px; font-weight: 500;">⏱️ <strong>Expected Recovery:</strong> ${recoveryText}</div>` : ""}
                  </li>
                `;
              }).join("")}
            </ol>
          </div>

          ${prescription.cautions ? `
          <div class="section">
            <div class="section-title">Important Care Cautions</div>
            <div class="cautions">
              <strong>Caution Notice:</strong> ${prescription.cautions}
            </div>
          </div>
          ` : ""}

          <div class="footer">
            Generated via Green Guardian AI © ${new Date().getFullYear()} — Cultivating healthy, thriving domestic flora.
          </div>
          <script>
            window.onload = function() {
              window.print();
            }
          </script>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 font-sans">
      {/* Page Header */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-500/10 dark:bg-emerald-500/20 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold rounded-full mb-3">
          <Sparkles className="w-3.5 h-3.5 text-emerald-500 animate-pulse" />
          Smart Plant Pharmacy Engine
        </div>
        <h1 className="text-2xl sm:text-3.5xl font-extrabold tracking-tight text-stone-900 dark:text-stone-100">
          Tailored Botanist Remedy Generator
        </h1>
        <p className="max-w-lg mx-auto text-stone-500 dark:text-stone-400 text-xs sm:text-sm mt-2">
          Describe the symptoms of any diseased houseplant or yard crop to generate biological DIY cures, organic bio-fungicides, and plant-safe recovery sprays.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left Column: Form Setup */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-4">
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <Sprout className="w-4 h-4 text-emerald-600" />
              1. Presets / Short-cuts
            </h2>
            <div className="flex flex-wrap gap-2">
              {PRESETS.map((preset, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handlePresetSelect(preset)}
                  className="px-2.5 py-1.5 text-[11px] font-medium bg-stone-50 hover:bg-stone-100 dark:bg-stone-950 dark:hover:bg-stone-900 border border-stone-200 dark:border-stone-800 text-stone-600 dark:text-stone-400 rounded-xl transition-all flex items-center gap-1 cursor-pointer"
                >
                  <span>{preset.icon}</span>
                  <span>{preset.plant}</span>
                </button>
              ))}
            </div>
          </div>

          <form onSubmit={handleGenerate} className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-5 shadow-sm space-y-5">
            <h2 className="text-sm font-bold text-stone-800 dark:text-stone-200 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-emerald-600" />
              2. Plant Diagnostics
            </h2>

            {/* Input Plant Name */}
            <div className="space-y-1.5">
              <label htmlFor="plant_name_remedy" className="block text-xs font-semibold text-stone-500 dark:text-stone-400">
                Plant Name or Variety
              </label>
              <input
                id="plant_name_remedy"
                type="text"
                placeholder="e.g., Tomato Rose Bush, Jade Plant, Monstera"
                value={plantName}
                onChange={(e) => setPlantName(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-800 dark:text-stone-100 focus:outline-none focus:border-emerald-600 transition-colors"
                required
              />
            </div>

            {/* Symptoms Input */}
            <div className="space-y-1.5">
              <label htmlFor="plant_symptoms_remedy" className="block text-xs font-semibold text-stone-500 dark:text-stone-400">
                Observed Leaf Symptoms
              </label>
              <textarea
                id="plant_symptoms_remedy"
                rows={3}
                placeholder="e.g., black circles surrounded by fuzzy spots, yellowing along lower stalks, thin sticky white spiderweb spiderwebs..."
                value={symptoms}
                onChange={(e) => setSymptoms(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs sm:text-sm bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-stone-800 dark:text-stone-100 focus:outline-none focus:border-emerald-600 transition-colors resize-none"
                required
              />
            </div>

            {/* Select Treatment Focus */}
            <div className="space-y-1.5">
              <label htmlFor="remedy_spectrum_select" className="block text-xs font-semibold text-stone-500 dark:text-stone-400">
                Preferred Remedy Spectrum
              </label>
              <select
                id="remedy_spectrum_select"
                value={remedyType}
                onChange={(e) => setRemedyType(e.target.value)}
                className="w-full px-3.5 py-2.5 text-xs bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-xl text-teal-900 dark:text-teal-400 font-semibold focus:outline-none focus:border-emerald-600 transition-colors"
              >
                <option value="organic" className="text-teal-950 bg-white dark:bg-stone-900 font-semibold">Organic Cures & DIY Remedies (Non-toxic)</option>
                <option value="bio-fungicides" className="text-teal-950 bg-white dark:bg-stone-900 font-semibold">Professional Bio-fungicides (Bacillus based)</option>
                <option value="chemical" className="text-teal-950 bg-white dark:bg-stone-900 font-semibold">Systemic Chemical Treatment (Conventional)</option>
                <option value="prevention" className="text-teal-950 bg-white dark:bg-stone-900 font-semibold">Mechanical & Agricultural Prevention (Pruning / Mulch)</option>
              </select>
            </div>

            {/* Trigger Button */}
            <button
              id="remedy_generate_trigger"
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs sm:text-sm rounded-xl transition-all shadow-md hover:shadow-emerald-600/10 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? "Diagnosing & Mixing Recipe..." : "Draft Care Prescription"}
            </button>
          </form>
        </div>

        {/* Right Column: Output displays */}
        <div className="lg:col-span-7">
          {prescription ? (
            <div className="space-y-6">
              {/* Main Prescription Card */}
              <div id="remedy_prescription_box" className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl shadow-md overflow-hidden p-6 relative">
                {prescription.isFallback && (
                  <div className="absolute top-0 right-0 bg-amber-500/10 border-b border-l border-amber-500/20 text-amber-800 dark:text-amber-400 text-[10px] font-bold px-3 py-1 rounded-bl-xl flex items-center gap-1">
                    <ShieldAlert className="w-3 h-3" /> Offline Bio-Ref Library
                  </div>
                )}

                {/* Prescription Header */}
                <div className="border-b border-stone-100 dark:border-stone-800 pb-5 mb-5">
                  <span className="text-[10px] uppercase tracking-wider font-extrabold text-emerald-600 bg-emerald-500/10 dark:bg-emerald-500/20 px-2.5 py-1 rounded-md">
                    Botanist Prescription Form
                  </span>
                  <h3 className="text-xl sm:text-2xl font-black mt-2 text-stone-900 dark:text-stone-100 uppercase tracking-tight">
                    {prescription.title}
                  </h3>
                  <p className="text-xs text-stone-400 mt-1 dark:text-stone-500">
                    Specifically assembled for <strong className="text-stone-600 dark:text-stone-300">{prescription.plantName}</strong> suffering from <em>"{prescription.symptoms}"</em>.
                  </p>
                </div>

                {/* Quick Indicators Bar */}
                <div className="grid grid-cols-3 gap-2 py-3 px-4 bg-stone-50 dark:bg-stone-950/40 border border-stone-100 dark:border-stone-800 rounded-xl text-stone-600 dark:text-stone-400 text-[11px] mb-5">
                  <div className="flex flex-col">
                    <span className="text-[9px] text-stone-400 uppercase font-bold">Safe for Pets?</span>
                    <span className="font-extrabold flex items-center gap-1 mt-0.5">
                      {prescription.isPetSafe ? (
                        <>
                          <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" /> Yes, Home-Safe
                        </>
                      ) : (
                        <>
                          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" /> Caution
                        </>
                      )}
                    </span>
                  </div>
                  <div className="flex flex-col border-l border-stone-200 dark:border-stone-800 pl-3">
                    <span className="text-[9px] text-stone-400 uppercase font-bold">Difficulty</span>
                    <span className="font-extrabold mt-0.5 text-stone-800 dark:text-stone-200">
                      {prescription.difficulty}
                    </span>
                  </div>
                  <div className="flex flex-col border-l border-stone-200 dark:border-stone-800 pl-3">
                    <span className="text-[9px] text-stone-400 uppercase font-bold">Timeline</span>
                    <span className="font-extrabold mt-0.5">
                      {prescription.timeRequired}
                    </span>
                  </div>
                </div>

                {/* Remedy Objective Summary */}
                <div className="space-y-2 mb-5">
                  <h4 className="text-xs font-extrabold text-stone-800 dark:text-stone-100 flex items-center gap-1">
                    <Compass className="w-3.5 h-3.5 text-emerald-600" /> Prescription Strategy
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed bg-emerald-500/[0.02] border border-emerald-500/[0.08] p-3.5 rounded-xl">
                    {prescription.summary}
                  </p>
                </div>

                {/* Ingredients tag items */}
                <div className="space-y-2 mb-5">
                  <h4 className="text-xs font-extrabold text-stone-800 dark:text-stone-100 flex items-center gap-1">
                    <Droplets className="w-3.5 h-3.5 text-emerald-600" /> Material & Solution Ingredients
                  </h4>
                  <div className="flex flex-wrap gap-1.5">
                    {prescription.ingredients.map((ing, i) => (
                      <span key={i} className="px-2.5 py-1 text-[11px] font-semibold bg-stone-100 dark:bg-stone-800/80 border border-stone-200 dark:border-stone-700/60 rounded-lg text-stone-700 dark:text-stone-300">
                        🥛 {ing}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Application Guidelines */}
                <div className="space-y-2 mb-6">
                  <h4 className="text-xs font-extrabold text-stone-800 dark:text-stone-100 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-emerald-600" /> Dosage & Application Frequency
                  </h4>
                  <p className="text-xs text-stone-600 dark:text-stone-400 leading-relaxed italic bg-emerald-500/[0.03] p-3 rounded-xl border border-dashed border-emerald-500/20">
                    {prescription.application}
                  </p>
                </div>

                {/* Step-by-Step interactive checkpoints */}
                <div className="space-y-3.5 mb-5">
                  <h4 className="text-xs font-extrabold text-stone-800 dark:text-stone-100">
                    Step-by-step Execution Checkpoints ({checkedSteps.filter(Boolean).length} / {prescription.steps.length})
                  </h4>
                  <div className="space-y-2.5">
                    {prescription.steps.map((step, idx) => {
                      const match = step.match(/(.*)\[Recovery:\s*(.*)\]/);
                      const displayStep = match ? match[1].trim() : step;
                      const recoveryText = match ? match[2].trim() : "";

                      return (
                        <div 
                          key={idx}
                          onClick={() => toggleStep(idx)}
                          className={`flex flex-col p-3 border rounded-xl cursor-pointer transition-all duration-150 ${
                            checkedSteps[idx] 
                              ? "bg-emerald-500/5 border-emerald-500/30 text-stone-400 dark:text-stone-500 line-through select-none" 
                              : "bg-white dark:bg-stone-900 border-stone-200 dark:border-stone-800 text-stone-700 dark:text-stone-300 hover:border-emerald-500/40 select-none"
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <div className={`mt-0.5 shrink-0 w-4 h-4 rounded-full border flex items-center justify-center transition-colors ${
                              checkedSteps[idx] 
                                ? "bg-emerald-500 border-emerald-500 text-white" 
                                : "border-stone-300 dark:border-stone-700"
                            }`}>
                              {checkedSteps[idx] && <CheckCircle2 className="w-3 h-3" />}
                            </div>
                            <span className="text-xs leading-relaxed font-semibold flex-1">
                              {displayStep}
                            </span>
                          </div>
                          {recoveryText && (
                            <div className="mt-2 ml-7 p-2 bg-emerald-500/5 dark:bg-emerald-500/10 border border-emerald-500/10 dark:border-emerald-500/20 rounded-lg">
                              <span className="text-[10px] font-black uppercase text-emerald-800 dark:text-emerald-400 tracking-wider flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                                Expected Recovery Time
                              </span>
                              <p className="text-[11px] text-emerald-700/90 dark:text-emerald-300/80 mt-0.5 font-semibold leading-relaxed font-sans">
                                {recoveryText}
                              </p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Cautions Warn Section */}
                {prescription.cautions && (
                  <div className="bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-400 p-3.5 rounded-xl text-xs flex items-start gap-2.5 mb-6">
                    <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                    <div>
                      <strong className="font-extrabold uppercase text-[10px] tracking-wider block mb-0.5">Critical Precautions:</strong>
                      {prescription.cautions}
                    </div>
                  </div>
                )}

                {/* Prescription print/reset controls */}
                <div className="flex gap-3 pt-4 border-t border-stone-100 dark:border-stone-800">
                  <button
                    id="print_prescription_btn"
                    onClick={handlePrint}
                    className="flex-1 py-2.5 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-750 text-stone-800 dark:text-stone-150 rounded-xl text-xs font-extrabold transition-colors flex items-center justify-center gap-2 cursor-pointer border border-stone-300 dark:border-stone-700"
                  >
                    <Printer className="w-4 h-4" /> Print Remedy sheet
                  </button>
                  <button
                    id="reset_preset_remedies"
                    onClick={() => setPrescription(null)}
                    type="button"
                    className="p-2.5 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded-xl hover:text-stone-800 dark:bg-stone-950 dark:hover:bg-stone-900 dark:border-stone-800 transition-colors cursor-pointer text-stone-400"
                    title="Start New Prescription Draft"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-8 text-center space-y-4 shadow-sm h-full flex flex-col justify-center items-center py-16">
              <div className="w-16 h-16 rounded-2xl bg-stone-50 dark:bg-stone-950 flex items-center justify-center text-stone-300 dark:text-stone-700 border border-stone-200/50 dark:border-stone-850">
                <Compass className="w-8 h-8 font-light" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-stone-700 dark:text-stone-350">
                  No Prescription Drafted Yet
                </h3>
                <p className="text-xs text-stone-400 max-w-xs mx-auto mt-1 leading-relaxed">
                  Fill out the Leaf Diagnostics form or select one of our popular plant presets to generate a detailed treatment care layout.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
