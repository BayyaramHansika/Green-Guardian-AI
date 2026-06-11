import React, { useEffect, useState } from "react";
import { jsPDF } from "jspdf";
import { AnalysisResult } from "../types";

interface PrintableReportProps {
  result: AnalysisResult;
  onClose: () => void;
}

export const PrintableReport: React.FC<PrintableReportProps> = ({ result, onClose }) => {
  const [downloading, setDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const generateAndDownloadPDFInternal = (res: AnalysisResult) => {
    setDownloading(true);
    setDownloadSuccess(false);

    try {
      const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
      });

      // Page layout variables
      const margin = 20;
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const contentWidth = pageWidth - (margin * 2);

      let currentY = 20;

      const drawPageFooter = () => {
        doc.setFont("helvetica", "normal");
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          "Page " + doc.getCurrentPageInfo().pageNumber,
          pageWidth / 2,
          pageHeight - 10,
          { align: "center" }
        );
      };

      // Helper for adding lines & testing page breaks
      const checkPageBreak = (neededHeight: number) => {
        if (currentY + neededHeight > pageHeight - 20) {
          drawPageFooter();
          doc.addPage();
          currentY = 20;
        }
      };

      // Header Title
      doc.setFont("helvetica", "bold");
      doc.setFontSize(22);
      doc.setTextColor(4, 120, 87); // Emerald 700
      doc.text("GREEN GUARDIAN AI", margin, currentY);
      currentY += 8;

      // Subtitle
      doc.setFont("helvetica", "normal");
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139); // Slate 500
      doc.text("Plant Health Diagnosis & Custom Treatment Report", margin, currentY);

      // Date and ID
      const dateStr = `Date: ${new Date().toLocaleDateString()}`;
      const idStr = `Report ID: ${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
      doc.setFontSize(9);
      doc.text(dateStr, pageWidth - margin, 20, { align: "right" });
      doc.text(idStr, pageWidth - margin, 25, { align: "right" });

      currentY += 8;

      // Line Spacer
      doc.setDrawColor(4, 120, 87);
      doc.setLineWidth(0.8);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 10;

      // Primary Diagnosis Box
      checkPageBreak(38);
      doc.setFillColor(240, 253, 250); // Mint background
      doc.rect(margin, currentY, contentWidth, 34, "F");

      // Title inside Box
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.setTextColor(15, 23, 42); // Slate 900
      doc.text("PRIMARY DIAGNOSIS", margin + 5, currentY + 7);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(15);
      doc.setTextColor(15, 23, 42);
      doc.text(res.disease, margin + 5, currentY + 15);

      doc.setFont("helvetica", "italic");
      doc.setFontSize(10.5);
      doc.setTextColor(71, 85, 105); // Slate 600
      doc.text(res.scientific, margin + 5, currentY + 21);

      // Indicators: Severity / Confidence / Spread Risk
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(5, 150, 105); // Teal 600
      doc.text(`Severity: ${res.severity}`, margin + 5, currentY + 28);
      doc.text(`Confidence Score: ${res.confidence}%`, margin + 55, currentY + 28);
      doc.text(`Spreading Risk: ${res.spread_risk}%`, margin + 110, currentY + 28);

      currentY += 42;

      // Observable symptoms
      checkPageBreak(25);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(4, 120, 87);
      doc.text("OBSERVABLE SYMPTOMS DETECTED", margin, currentY);
      currentY += 5;

      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 7;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(9.5);
      doc.setTextColor(51, 65, 85);

      res.symptoms.forEach((symptom) => {
        checkPageBreak(12);
        // Draw bullet dot
        doc.setFillColor(4, 120, 87);
        doc.circle(margin + 2, currentY - 1, 0.8, "F");
        
        const lines = doc.splitTextToSize(symptom, contentWidth - 8);
        doc.text(lines, margin + 6, currentY);
        currentY += (lines.length * 5.5) + 1.5;
      });

      currentY += 4;

      // Recommended Treatments Heading
      checkPageBreak(20);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.setTextColor(4, 120, 87);
      doc.text("RECOMMENDED TREATMENTS & TIMELINES", margin, currentY);
      currentY += 5;
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 8;

      // Loop through Treatment Tabs
      const treatmentKeys: Array<keyof typeof res.treatment> = ["immediate", "organic", "chemical", "prevention"];
      const displayNames = {
        immediate: "1. IMMEDIATE ACTION STEPS",
        organic: "2. ORGANIC / BIOLOGICAL CONTROLS",
        chemical: "3. CHEMICAL / THERAPEUTIC TREATMENTS",
        prevention: "4. LONG-TERM PREVENTION & HYGIENE"
      };

      treatmentKeys.forEach((key) => {
        const steps = res.treatment[key];
        if (steps && steps.length > 0) {
          checkPageBreak(15);
          doc.setFont("helvetica", "bold");
          doc.setFontSize(10.5);
          doc.setTextColor(30, 41, 59); // Slate 800
          doc.text(displayNames[key], margin, currentY);
          currentY += 6;

          steps.forEach((stepText, stepIdx) => {
            // Parse step text and potential bracketed recovery text
            const match = stepText.match(/(.*)\[Recovery:\s*(.*)\]/);
            const displayStep = match ? match[1].trim() : stepText;
            const recoveryText = match ? match[2].trim() : "";

            // Wrap step text
            const wrappedStep = doc.splitTextToSize(`${stepIdx + 1}. ${displayStep}`, contentWidth - 4);
            const stepHeight = wrappedStep.length * 5;
            
            let wrappedRecovery: string[] = [];
            if (recoveryText) {
              wrappedRecovery = doc.splitTextToSize(`Expected Recovery: ${recoveryText}`, contentWidth - 10);
            }

            checkPageBreak(stepHeight + (recoveryText ? (wrappedRecovery.length * 4.5 + 5) : 0) + 4);

            // Draw main step instruction text
            doc.setFont("helvetica", "normal");
            doc.setFontSize(9);
            doc.setTextColor(51, 65, 85);
            doc.text(wrappedStep, margin, currentY);
            currentY += stepHeight + 1.5;

            // Draw beautiful recovery text info box if present
            if (recoveryText) {
              doc.setFillColor(243, 252, 243); // Subtle mint accent bg
              doc.rect(margin + 4, currentY, contentWidth - 8, wrappedRecovery.length * 4.5 + 2, "F");
              
              doc.setFont("helvetica", "bold");
              doc.setFontSize(8);
              doc.setTextColor(4, 120, 87); // Emerald 700
              doc.text(wrappedRecovery, margin + 7, currentY + 3.5);
              currentY += (wrappedRecovery.length * 4.5) + 4.5;
            } else {
              currentY += 1.5;
            }
          });
          currentY += 3;
        }
      });

      // Disclaimer and Signature Footer
      checkPageBreak(25);
      currentY = Math.max(currentY, pageHeight - 35);
      
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.3);
      doc.line(margin, currentY, pageWidth - margin, currentY);
      currentY += 6;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184); // Slate 400
      doc.text("This document is generated by Green Guardian AI for plant care and general academic guidance.", pageWidth / 2, currentY, { align: "center" });
      currentY += 3.5;
      doc.text("© 2026 Green Guardian AI. All rights reserved.", pageWidth / 2, currentY, { align: "center" });

      drawPageFooter();

      // Save/Download PDF Trigger
      const safeFilename = res.disease.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      doc.save(`green-guardian-disease-report-${safeFilename}.pdf`);

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 5000);
    } catch (err) {
      console.error("PDF download generation failed: ", err);
    } finally {
      setDownloading(false);
    }
  };

  useEffect(() => {
    // Automatically trigger direct PDF download when mounted or requested
    const timer = setTimeout(() => {
      generateAndDownloadPDFInternal(result);
    }, 600);
    return () => clearTimeout(timer);
  }, [result]);

  return (
    <div className="fixed inset-0 bg-stone-100 dark:bg-stone-950 text-stone-900 print:bg-white z-[9999] p-4 sm:p-10 overflow-y-auto print-report font-sans">
      {/* Control Bar (hidden during printing) */}
      <div className="max-w-4xl mx-auto mb-6 flex flex-col md:flex-row gap-4 justify-between items-center print:hidden bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-2xl p-4.5 shadow-xl">
        <div className="text-center md:text-left">
          <h2 className="text-sm font-bold text-stone-800 dark:text-stone-150 flex items-center justify-center md:justify-start gap-1.5">
            📋 Plant Inspection Report PDF
          </h2>
          <p className="text-[11px] text-stone-500 dark:text-stone-400 mt-0.5 font-medium">
            Your file download starts automatically. Use the direct action buttons to download again or print hard copies.
          </p>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2.5 shrink-0">
          {/* Direct Download Button */}
          <button
            id="direct_download_pdf_btn"
            onClick={() => generateAndDownloadPDFInternal(result)}
            disabled={downloading}
            className={`px-4 py-2.5 text-xs font-bold text-white rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer ${
              downloadSuccess 
                ? "bg-teal-600 hover:bg-teal-700" 
                : "bg-emerald-700 hover:bg-emerald-800"
            }`}
          >
            {downloading ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                Generating file...
              </>
            ) : downloadSuccess ? (
              "✓ Report Downloaded"
            ) : (
              "📥 Save PDF to Downloads"
            )}
          </button>

          {/* Fallback browser print button */}
          <button
            id="print_again_btn"
            onClick={() => window.print()}
            className="px-3.5 py-2.5 text-xs font-semibold text-stone-700 dark:text-stone-300 bg-stone-100 hover:bg-stone-200 dark:bg-stone-800 dark:hover:bg-stone-700 border border-stone-300 dark:border-stone-700 rounded-xl transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            🖨️ Browser Print Window
          </button>

          {/* Close report view */}
          <button
            id="return_site_btn"
            onClick={onClose}
            className="px-4 py-2.5 text-xs font-bold text-white bg-stone-800 hover:bg-stone-900 dark:bg-stone-700 dark:hover:bg-stone-600 rounded-xl shadow-sm transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            ← Close Report
          </button>
        </div>
      </div>

      {/* Auto-Downloading notice banner if active */}
      {downloading && (
        <div className="max-w-4xl mx-auto mb-6 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl p-4 text-center print:hidden">
          <p className="text-xs font-semibold text-emerald-800 dark:text-emerald-400 flex items-center justify-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping"></span>
            Assembling highly detailed botanical PDF. Your download will initiate in moments...
          </p>
        </div>
      )}

      {downloadSuccess && (
        <div className="max-w-4xl mx-auto mb-6 bg-teal-500/10 border border-teal-500/20 rounded-2xl p-4 text-center print:hidden">
          <p className="text-xs font-semibold text-teal-850 dark:text-teal-400">
            🎉 Success! Your inspection report has been saved directly to your Downloads folder as <strong>green-guardian-disease-report-{result.disease.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.pdf</strong>.
          </p>
        </div>
      )}

      {/* Main Report Body for browser print compatibility */}
      <div className="max-w-4xl mx-auto bg-white border border-stone-200 rounded-2xl p-8 shadow-sm print:shadow-none print:border-none print:p-0">
        {/* Header */}
        <div className="border-b-2 border-emerald-800 pb-4 mb-6 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-serif text-emerald-800 font-bold mb-1">
              Green Guardian AI
            </h1>
            <p className="text-sm text-stone-500 font-medium">
              Plant Disease Health Inspection & Diagnosis Report
            </p>
          </div>
          <div className="text-right">
            <p className="text-sm font-semibold text-emerald-800">Date: {new Date().toLocaleDateString()}</p>
            <p className="text-xs text-stone-400">ID: {Math.random().toString(36).substring(2, 9).toUpperCase()}</p>
          </div>
        </div>

        {/* Diagnosis overview */}
        <div className="mb-6 bg-emerald-50 p-6 rounded-xl border border-emerald-200">
          <span className="text-xs font-black uppercase tracking-wider text-emerald-800 block mb-1">
            Primary Diagnosis
          </span>
          <h2 className="text-2xl font-serif text-stone-900 font-bold mb-1">
            {result.disease}
          </h2>
          <p className="text-sm italic text-stone-600 mb-3 font-semibold">{result.scientific}</p>
          <div className="flex flex-wrap gap-3 text-xs mt-2">
            <span className="bg-emerald-100 text-emerald-850 px-3 py-1.5 rounded-lg font-bold">
              Severity: {result.severity}
            </span>
            <span className="bg-emerald-100 text-emerald-855 px-3 py-1.5 rounded-lg font-bold">
              Confidence Score: {result.confidence}%
            </span>
            <span className="bg-emerald-100 text-emerald-855 px-3 py-1.5 rounded-lg font-bold">
              Spreading Risk: {result.spread_risk}%
            </span>
          </div>
        </div>

        {/* Symptoms */}
        <div className="mb-6">
          <h3 className="text-lg font-serif text-emerald-800 border-b border-stone-200 pb-1 mb-2 font-bold">
            Observable Symptoms Detected
          </h3>
          <ul className="list-disc pl-5 text-sm space-y-2 text-stone-700 font-medium">
            {result.symptoms.map((symptom, idx) => (
              <li key={idx}>{symptom}</li>
            ))}
          </ul>
        </div>

        {/* Treatment Actions */}
        <div className="mb-6">
          <h3 className="text-lg font-serif text-emerald-800 border-b border-stone-200 pb-1 mb-4 font-bold">
            Recommended Treatment & Interventions
          </h3>
          
          <div className="space-y-5">
            <div>
              <h4 className="text-sm font-black text-stone-800 uppercase tracking-wider">
                Immediate Action Steps
              </h4>
              <ul className="list-decimal pl-5 text-sm mt-2 text-stone-600 space-y-3 font-medium">
                {result.treatment.immediate.map((step, idx) => {
                  const match = step.match(/(.*)\[Recovery:\s*(.*)\]/);
                  const displayStep = match ? match[1].trim() : step;
                  const recoveryText = match ? match[2].trim() : "";
                  return (
                    <li key={idx} className="space-y-1">
                      <div>{displayStep}</div>
                      {recoveryText && (
                        <div className="text-xs text-emerald-700 font-bold bg-emerald-50/50 px-2 py-1 rounded inline-block">
                          ⏱️ Expected Recovery: {recoveryText}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-2">
              <div className="border border-stone-100 rounded-xl p-4 bg-stone-50/30">
                <h4 className="text-sm font-black text-stone-800 uppercase tracking-wider">
                  Organic Controls
                </h4>
                <ul className="list-disc pl-5 text-xs mt-2 text-stone-600 space-y-3 font-medium">
                  {result.treatment.organic.map((step, idx) => {
                    const match = step.match(/(.*)\[Recovery:\s*(.*)\]/);
                    const displayStep = match ? match[1].trim() : step;
                    const recoveryText = match ? match[2].trim() : "";
                    return (
                      <li key={idx} className="space-y-1">
                        <div>{displayStep}</div>
                        {recoveryText && (
                          <div className="text-[10px] text-emerald-700 font-black bg-emerald-50/50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            ⏱️ Expected: {recoveryText}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <div className="border border-stone-100 rounded-xl p-4 bg-stone-50/30">
                <h4 className="text-sm font-black text-stone-800 uppercase tracking-wider">
                  Chemical Treatments
                </h4>
                <ul className="list-disc pl-5 text-xs mt-2 text-stone-600 space-y-3 font-medium">
                  {result.treatment.chemical.map((step, idx) => {
                    const match = step.match(/(.*)\[Recovery:\s*(.*)\]/);
                    const displayStep = match ? match[1].trim() : step;
                    const recoveryText = match ? match[2].trim() : "";
                    return (
                      <li key={idx} className="space-y-1">
                        <div>{displayStep}</div>
                        {recoveryText && (
                          <div className="text-[10px] text-emerald-700 font-black bg-emerald-50/50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            ⏱️ Expected: {recoveryText}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div className="mt-2">
              <h4 className="text-sm font-black text-stone-800 uppercase tracking-wider">
                Long-Term Prevention & Garden Hygiene
              </h4>
              <ul className="list-disc pl-5 text-sm mt-2 text-stone-600 space-y-3 font-medium font-sans">
                {result.treatment.prevention.map((step, idx) => {
                  const match = step.match(/(.*)\[Recovery:\s*(.*)\]/);
                  const displayStep = match ? match[1].trim() : step;
                  const recoveryText = match ? match[2].trim() : "";
                  return (
                    <li key={idx} className="space-y-1">
                      <div>{displayStep}</div>
                      {recoveryText && (
                        <div className="text-xs text-emerald-700 font-bold bg-emerald-50/50 px-2 py-1 rounded inline-block">
                          ⏱️ Expected Recovery: {recoveryText}
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-stone-200 pt-4 mt-8 text-center text-xs text-stone-400 font-medium">
          <p>This document is generated by Green Guardian AI for plant care and academic purposes.</p>
          <p>© 2026 Green Guardian AI. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
};
