"use client";

import { useDataProvider, useNotify, RaRecord } from "react-admin";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Input,
  Tabs,
  Tab,
  IconButton,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  CircularProgress,
  TextareaAutosize,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Paper,
  Divider,
  Tooltip,
  Chip,
  Card,
  CardContent,
  Collapse,
  Badge,
  useTheme,
  useMediaQuery,
  Container,
  Avatar,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import TextsmsIcon from "@mui/icons-material/Textsms";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import PersonIcon from "@mui/icons-material/Person";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import ImageIcon from "@mui/icons-material/Image";
import MedicationIcon from "@mui/icons-material/Medication";
import AssignmentIcon from "@mui/icons-material/Assignment";
import jsPDF from "jspdf";
import Grid from '@mui/material/GridLegacy';

// -------- Types --------
interface MMTAction {
  action: string;
  grade: string;
}
interface MMT {
  joint: string;
  right: { actions: MMTAction[] };
  left: { actions: MMTAction[] };
}
interface AdditionalNote {
  heading: string;
  description: string;
}
interface Note {
  noteDate: string;
  history?: string;
  chiefComplaint?: string;
  onExamination?: string;
  medications?: string;
  onObservation?: string;
  onPalpation?: string;
  painAssessmentNPRS?: string;
  mmt: MMT[];
  treatment?: string;
  additionalNotes?: AdditionalNote[];
  images: string[];
}
interface Patient extends RaRecord {
  name: string;
  age?: number;
  gender?: string;
  phoneNumber?: string;
  alternatePhoneNumber?: string;
  emergencyContact?: {
    name: string;
    relation: string;
    contactNumber: string;
  };
  email?: string;
  condition?: string;
  occupation?: string;
  chiefComplaint?: string;
  address?: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  notes: Note[];
}

// -------- Clinic constants --------
const CLINIC_NAME = "Medivue Health and Wellness";
const CLINIC_ADDRESS =
  "Ward 21, No 98, Vettiyara P.O, Navaikulam, Thiruvananthapuram, Kerala - 695603";
const CLINIC_PHONE = "+91 8089180303";
const CLINIC_EMAIL = "info@medivue.life";
const YOUR_LOGO_PATH = "/medivueLogo.jpeg";

// -------- Component --------
const PatientNotes: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const [record, setRecord] = useState<Patient | null>(null);
  const [viewMode, setViewMode] = useState<"notes" | "editor">("notes");
  const [tabIndex, setTabIndex] = useState(0);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    patientInfo: false,
    mmt: false,
  });

  // editor state
  const [noteDate, setNoteDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [history, setHistory] = useState<string>("");
  const [medications, setMedications] = useState<string>("");
  const [onObservation, setOnObservation] = useState<string>("");
  const [onPalpation, setOnPalpation] = useState<string>("");
  const [painAssessmentNPRS, setPainAssessmentNPRS] = useState<string>("");
  const [mmt, setMmt] = useState<MMT[]>([]);
  const [treatment, setTreatment] = useState<string>("");
  const [additionalNotes, setAdditionalNotes] = useState<AdditionalNote[]>([]);
  const [newNoteHeading, setNewNoteHeading] = useState<string>("");
  const [newNoteDescription, setNewNoteDescription] = useState<string>("");
  const [chiefComplaint, setChiefComplaint] = useState<string>("");
  const [onExamination, setOnExamination] = useState<string>("");
  const [images, setImages] = useState<File[]>([]);
  const [existingImagesToDisplay, setExistingImagesToDisplay] = useState<string[]>([]);
  const [gradesSelection, setGradesSelection] = useState<Record<string, string>>({});

  const [loading, setLoading] = useState<boolean>(false);
  const [pdfLoading, setPdfLoading] = useState<boolean>(false);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState<boolean>(false);
  const [noteToDeleteIndex, setNoteToDeleteIndex] = useState<number | null>(null);
  const [openImageDialog, setOpenImageDialog] = useState<boolean>(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  const formRef = useRef<HTMLDivElement | null>(null);

  // fetch patient
  useEffect(() => {
    if (!id) return;
    dataProvider
      .getOne<Patient>("patients", { id })
      .then(({ data }) => setRecord(data))
      .catch(() => notify("Failed to load patient data", { type: "error" }));
  }, [id, dataProvider, notify]);

  const sortedNotes: Note[] =
    record?.notes?.length
      ? [...record.notes].sort((a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime())
      : [];

  useEffect(() => {
    if (sortedNotes.length > 0 && tabIndex >= sortedNotes.length) setTabIndex(0);
    if (sortedNotes.length === 0 && tabIndex !== 0) setTabIndex(0);
  }, [sortedNotes.length, tabIndex]);

  // -------- UI helpers --------
  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const goToEditor = () => {
    resetFormFields();
    setViewMode("editor");
    setEditingNoteIndex(null);
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };
  const backToNotes = () => {
    resetFormFields();
    setViewMode("notes");
  };

  const resetFormFields = () => {
    setNoteDate(new Date().toISOString().slice(0, 10));
    setHistory("");
    setMedications("");
    setOnObservation("");
    setOnPalpation("");
    setPainAssessmentNPRS("");
    setChiefComplaint("");
    setOnExamination("");
    setMmt([]);
    setTreatment("");
    setAdditionalNotes([]);
    setNewNoteHeading("");
    setNewNoteDescription("");
    setImages([]);
    setExistingImagesToDisplay([]);
    setEditingNoteIndex(null);
    setGradesSelection({});
  };

  // -------- Additional notes handlers --------
  const handleAddAdditionalNote = () => {
    setAdditionalNotes((prev) => [
      ...prev,
      { heading: newNoteHeading.trim(), description: newNoteDescription.trim() },
    ]);
    setNewNoteHeading("");
    setNewNoteDescription("");
  };
  const handleDeleteAdditionalNote = (indexToDelete: number) => {
    setAdditionalNotes((prev) => prev.filter((_, idx) => idx !== indexToDelete));
  };

  // -------- MMT handlers --------
  const grades = ["0", "1", "1+", "2-", "2", "2+", "3-", "3", "3+", "4-", "4", "4+", "5-", "5"];
  const mmtActions: { joint: string; actions: string[] }[] = [
    { joint: "Shoulder", actions: ["Flexion", "Extension", "Abduction", "Adduction", "Internal Rotation", "External Rotation"] },
    { joint: "Elbow", actions: ["Flexion", "Extension"] },
    { joint: "Wrist", actions: ["Flexion", "Extension", "Radial Deviation", "Ulnar Deviation"] },
    { joint: "Hip", actions: ["Flexion", "Extension", "Abduction", "Adduction", "Internal Rotation", "External Rotation"] },
    { joint: "Knee", actions: ["Flexion", "Extension"] },
    { joint: "Ankle", actions: ["Plantarflexion", "Dorsiflexion"] },
    { joint: "Foot", actions: ["Inversion", "Eversion"] },
  ];

  const handleGradeChange = (joint: string, action: string, side: "right" | "left", grade: string) => {
    const key = `${joint}-${action}-${side}`;
    setGradesSelection((p) => ({ ...p, [key]: grade }));

    setMmt((prev) => {
      const next = [...prev];
      const jIdx = next.findIndex((j) => j.joint === joint);
      if (jIdx === -1) {
        next.push({
          joint,
          right: side === "right" ? { actions: [{ action, grade }] } : { actions: [] },
          left: side === "left" ? { actions: [{ action, grade }] } : { actions: [] },
        });
        return next;
      }
      const list = next[jIdx][side].actions;
      const aIdx = list.findIndex((a) => a.action === action);
      if (aIdx === -1) list.push({ action, grade });
      else list[aIdx].grade = grade;
      return next;
    });
  };

  // -------- Image handlers --------
  const handleImageClick = (imageSrc: string, index: number | null) => {
    setSelectedImage(imageSrc);
    setSelectedImageIndex(index);
    setOpenImageDialog(true);
  };
  const handleImageDialogClose = () => {
    setOpenImageDialog(false);
    setSelectedImage(null);
    setSelectedImageIndex(null);
  };
  const handleDeleteExistingImage = () => {
    if (selectedImageIndex !== null) {
      setExistingImagesToDisplay((prev) => prev.filter((_, i) => i !== selectedImageIndex));
      notify("Image removed from current note (save to confirm).", { type: "info" });
      handleImageDialogClose();
    }
  };

  const handleDownloadImage = (base64: string, noteDt: string, idx: number) => {
    const mime = base64.match(/^data:(.*?);base64,/);
    const ext = (mime ? mime[1] : "image/png").split("/")[1] || "png";
    const a = document.createElement("a");
    a.href = base64;
    a.download = `patient_image_${(record?.name ?? "patient").replace(/\s/g, "_")}_${noteDt}_${idx}.${ext}`;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  // -------- Save / Edit / Delete Notes --------
  const handleNoteSubmit = async () => {
    if (!record) return;

    const empty =
      !history.trim() &&
      !chiefComplaint.trim() &&
      !onExamination.trim() &&
      !medications.trim() &&
      !onObservation.trim() &&
      !onPalpation.trim() &&
      !painAssessmentNPRS.trim() &&
      mmt.length === 0 &&
      !treatment.trim() &&
      additionalNotes.length === 0 &&
      images.length === 0 &&
      existingImagesToDisplay.length === 0;

    if (empty) {
      notify("Please fill at least one field or attach an image.", { type: "warning" });
      return;
    }

    setLoading(true);
    try {
      const newBase64Images = await Promise.all(
        images.map(
          (file) =>
            new Promise<string>((resolve, reject) => {
              const reader = new FileReader();
              reader.onloadend = () => resolve(reader.result as string);
              reader.onerror = reject;
              reader.readAsDataURL(file);
            })
        )
      );
      const allImages = [...existingImagesToDisplay, ...newBase64Images];

      const updatedOrNew: Note = {
        noteDate,
        history: history.trim() || undefined,
        chiefComplaint: chiefComplaint.trim() || undefined,
        onExamination: onExamination.trim() || undefined,
        medications: medications.trim() || undefined,
        onObservation: onObservation.trim() || undefined,
        onPalpation: onPalpation.trim() || undefined,
        painAssessmentNPRS: painAssessmentNPRS.trim() || undefined,
        mmt,
        treatment: treatment.trim() || undefined,
        additionalNotes:
          additionalNotes.length > 0
            ? additionalNotes.map((n) => ({ heading: n.heading.trim(), description: n.description.trim() }))
            : undefined,
        images: allImages,
      };

      let nextNotes: Note[];
      if (editingNoteIndex !== null) {
        const target = sortedNotes[editingNoteIndex];
        const originalIndex = record.notes.findIndex(
          (n) => n.noteDate === target.noteDate && (n.history ?? "") === (target.history ?? "")
        );
        nextNotes = [...record.notes];
        if (originalIndex !== -1) nextNotes[originalIndex] = updatedOrNew;
        else nextNotes.push(updatedOrNew);
      } else {
        nextNotes = [...(record.notes || []), updatedOrNew];
      }

      await dataProvider.update("patients", {
        id: record.id,
        data: { notes: nextNotes },
        previousData: record,
      });

      notify(editingNoteIndex !== null ? "Note updated" : "Note added", { type: "success" });

      const { data } = await dataProvider.getOne<Patient>("patients", { id: record.id });
      setRecord(data);
      setViewMode("notes");
      resetFormFields();
    } catch {
      notify("Failed to save note", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleEditNote = (index: number) => {
    const note = sortedNotes[index];
    setEditingNoteIndex(index);

    setNoteDate(note.noteDate);
    setHistory(note.history ?? "");
    setChiefComplaint(note.chiefComplaint ?? "");
    setOnExamination(note.onExamination ?? "");
    setMedications(note.medications ?? "");
    setOnObservation(note.onObservation ?? "");
    setOnPalpation(note.onPalpation ?? "");
    setPainAssessmentNPRS(note.painAssessmentNPRS ?? "");
    setMmt(
      Array.isArray(note.mmt)
        ? note.mmt.map((j) => ({
            joint: j.joint,
            right: { actions: j.right?.actions?.map((a) => ({ action: a.action, grade: a.grade })) ?? [] },
            left: { actions: j.left?.actions?.map((a) => ({ action: a.action, grade: a.grade })) ?? [] },
          }))
        : []
    );

    const initGrades: Record<string, string> = {};
    note.mmt?.forEach((j) => {
      j.right?.actions?.forEach((a) => (initGrades[`${j.joint}-${a.action}-right`] = a.grade));
      j.left?.actions?.forEach((a) => (initGrades[`${j.joint}-${a.action}-left`] = a.grade));
    });
    setGradesSelection(initGrades);

    setTreatment(note.treatment ?? "");
    setAdditionalNotes(note.additionalNotes ?? []);
    setImages([]);
    setExistingImagesToDisplay(note.images ?? []);

    setViewMode("editor");
    setTimeout(() => formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 50);
  };

  const handleDeleteClick = (index: number) => {
    setNoteToDeleteIndex(index);
    setOpenDeleteDialog(true);
  };
  const handleDeleteNoteConfirm = async () => {
    setOpenDeleteDialog(false);
    if (noteToDeleteIndex === null || !record) return;

    setLoading(true);
    try {
      const target = sortedNotes[noteToDeleteIndex];
      const originalIndex = record.notes.findIndex(
        (n) => n.noteDate === target.noteDate && (n.history ?? "") === (target.history ?? "")
      );
      if (originalIndex === -1) {
        notify("Note not found", { type: "warning" });
        return;
      }
      const next = [...record.notes];
      next.splice(originalIndex, 1);

      await dataProvider.update("patients", {
        id: record.id,
        data: { notes: next },
        previousData: record,
      });

      notify("Note deleted", { type: "success" });

      const { data } = await dataProvider.getOne<Patient>("patients", { id: record.id });
      setRecord(data);
      resetFormFields();
      setViewMode("notes");
    } catch {
      notify("Failed to delete note", { type: "error" });
    } finally {
      setLoading(false);
      setNoteToDeleteIndex(null);
    }
  };

  // -------- PDF --------
  const handleDownloadPdf = async () => {
    if (!record) return notify("No patient data to export", { type: "warning" });
    setPdfLoading(true);
    try {
      const doc = new jsPDF("p", "mm", "a4");
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      const margin = 20;
      const contentWidth = pageWidth - 2 * margin;
      let y = margin;

      // Header with logo and clinic info
      if (YOUR_LOGO_PATH) {
        const img = new Image();
        img.src = YOUR_LOGO_PATH;
        await new Promise<void>((res) => {
          img.onload = () => res();
          img.onerror = () => res();
        });
        if (img.complete && img.naturalWidth) {
          const logoWidth = 35;
          const logoHeight = (img.height * logoWidth) / img.width;
          doc.addImage(img, "JPEG", margin, y, logoWidth, logoHeight);
          y = Math.max(y + logoHeight + 3, y + 25);
        }
      }

      // Clinic Header
      doc.setFillColor(41, 128, 185);
      doc.rect(margin, y, contentWidth, 0.5, "F");
      y += 3;

      doc.setFontSize(20).setFont("helvetica", "bold").setTextColor(41, 128, 185);
      doc.text(CLINIC_NAME, pageWidth / 2, y, { align: "center" });
      y += 6;

      doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(70, 70, 70);
      const addressLines = doc.splitTextToSize(CLINIC_ADDRESS, contentWidth);
      doc.text(addressLines, pageWidth / 2, y, { align: "center" });
      y += addressLines.length * 4 + 2;

      doc.setFontSize(9);
      doc.text(`Phone: ${CLINIC_PHONE} | Email: ${CLINIC_EMAIL}`, pageWidth / 2, y, { align: "center" });
      y += 3;

      doc.setFillColor(41, 128, 185);
      doc.rect(margin, y, contentWidth, 0.5, "F");
      y += 8;

      // Patient Information Section
      if (y > pageHeight - margin - 60) {
        doc.addPage();
        y = margin;
      }
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 2, contentWidth, 8, "F");
      doc.setFontSize(13).setFont("helvetica", "bold").setTextColor(41, 128, 185);
      doc.text("PATIENT INFORMATION", margin + 3, y + 3);
      y += 10;

      doc.setFontSize(10).setFont("helvetica", "normal").setTextColor(0, 0, 0);

      const patientInfo = [
        { label: "Patient Name", value: record.name },
        { label: "Age", value: record.age ?? "N/A" },
        { label: "Gender", value: record.gender ?? "N/A" },
        { label: "Phone Number", value: record.phoneNumber ?? "N/A" },
        { label: "Condition", value: record.condition ?? "N/A" },
      ];

      for (const info of patientInfo) {
        if (y > pageHeight - margin - 15) {
          doc.addPage();
          y = margin;
        }
        doc.setFont("helvetica", "bold");
        doc.text(`${info.label}:`, margin + 5, y);
        doc.setFont("helvetica", "normal");
        doc.text(String(info.value), margin + 50, y);
        y += 6;
      }

      // Additional contact info
      if (record.alternatePhoneNumber) {
        if (y > pageHeight - margin - 15) {
          doc.addPage();
          y = margin;
        }
        doc.setFont("helvetica", "bold");
        doc.text("Alternate Phone:", margin + 5, y);
        doc.setFont("helvetica", "normal");
        doc.text(record.alternatePhoneNumber, margin + 50, y);
        y += 6;
      }

      if (record.email) {
        if (y > pageHeight - margin - 15) {
          doc.addPage();
          y = margin;
        }
        doc.setFont("helvetica", "bold");
        doc.text("Email:", margin + 5, y);
        doc.setFont("helvetica", "normal");
        doc.text(record.email, margin + 50, y);
        y += 6;
      }

      // Address
      if (record.address) {
        if (y > pageHeight - margin - 15) {
          doc.addPage();
          y = margin;
        }
        const fullAddress = `${record.address.street || ""}, ${record.address.city || ""}, ${record.address.state || ""} ${record.address.postalCode || ""}`;
        doc.setFont("helvetica", "bold");
        doc.text("Address:", margin + 5, y);
        doc.setFont("helvetica", "normal");
        const addressLines = doc.splitTextToSize(fullAddress, contentWidth - 50);
        doc.text(addressLines, margin + 50, y);
        y += addressLines.length * 6;
      }

      // Patient Notes Section
      y += 5;
      if (y > pageHeight - margin - 60) {
        doc.addPage();
        y = margin;
      }
      doc.setFillColor(240, 240, 240);
      doc.rect(margin, y - 2, contentWidth, 8, "F");
      doc.setFontSize(13).setFont("helvetica", "bold").setTextColor(41, 128, 185);
      doc.text("CLINICAL NOTES", margin + 3, y + 3);
      y += 10;

      if (!sortedNotes.length) {
        doc.setFontSize(10).setFont("helvetica", "italic").setTextColor(100, 100, 100);
        doc.text("No clinical notes available.", margin + 5, y);
        y += 7;
      } else {
        const list = [...sortedNotes].sort(
          (a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
        );

        for (let idx = 0; idx < list.length; idx++) {
          const note = list[idx];

          // Check if we need a new page
          if (y > pageHeight - margin - 30) {
            doc.addPage();
            y = margin;
          }

          // Note date header
          doc.setFillColor(230, 240, 250);
          doc.rect(margin, y - 2, contentWidth, 7, "F");
          doc.setFontSize(11).setFont("helvetica", "bold").setTextColor(0, 0, 0);
          doc.text(
            `Visit ${idx + 1} - ${new Date(note.noteDate).toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric"
            })}`,
            margin + 3,
            y + 3
          );
          y += 9;

          doc.setFontSize(9).setFont("helvetica", "normal").setTextColor(0, 0, 0);

          const fields: Array<{ label: string; value?: string | string[] }> = [
            { label: "Chief Complaint", value: note.chiefComplaint },
            { label: "History", value: note.history },
            { label: "Medications", value: note.medications },
            { label: "On Observation", value: note.onObservation },
            { label: "On Palpation", value: note.onPalpation },
            { label: "Pain Assessment (NPRS)", value: note.painAssessmentNPRS },
            { label: "On Examination", value: note.onExamination },
            {
              label: "MMT (Manual Muscle Testing)",
              value: note.mmt?.length
                ? note.mmt.map((j) => {
                    const parts: string[] = [];
                    if (j.right?.actions?.length) {
                      parts.push(`Right: ${j.right.actions.map((a) => `${a.action}: ${a.grade}`).join(", ")}`);
                    }
                    if (j.left?.actions?.length) {
                      parts.push(`Left: ${j.left.actions.map((a) => `${a.action}: ${a.grade}`).join(", ")}`);
                    }
                    return `  • ${j.joint}: ${parts.length ? parts.join(" | ") : "N/A"}`;
                  })
                : undefined,
            },
            { label: "Treatment", value: note.treatment },
            {
              label: "Additional Notes",
              value: note.additionalNotes?.length
                ? note.additionalNotes.map((n) => `  • ${n.heading}: ${n.description}`)
                : undefined,
            },
          ];

          for (const field of fields) {
            if (!field.value) continue;

            // Check page space
            if (y > pageHeight - margin - 20) {
              doc.addPage();
              y = margin;
            }

            // Field label
            doc.setFont("helvetica", "bold");
            doc.text(`${field.label}:`, margin + 5, y);
            y += 5;

            // Field value
            doc.setFont("helvetica", "normal");
            const valueText = Array.isArray(field.value)
              ? field.value.join("\n")
              : String(field.value);
            const wrappedText = doc.splitTextToSize(valueText, contentWidth - 10);

            // Check if wrapped text fits
            if (y + wrappedText.length * 4 > pageHeight - margin - 10) {
              doc.addPage();
              y = margin;
            }

            doc.text(wrappedText, margin + 8, y);
            y += wrappedText.length * 4 + 3;
          }

          // Spacing between notes (no divider line)
          if (idx < list.length - 1) {
            y += 8; // Add spacing between notes
          }
        }
      }

      // Footer with page numbers and generation date
      const pages = doc.getNumberOfPages();
      const currentDate = new Date().toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "short",
        year: "numeric"
      });

      for (let i = 1; i <= pages; i++) {
        doc.setPage(i);
        doc.setFontSize(8).setTextColor(120, 120, 120);
        doc.setDrawColor(200, 200, 200);
        doc.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
        doc.text(
          `Generated on ${currentDate}`,
          margin,
          pageHeight - 10
        );
        doc.text(
          `Page ${i} of ${pages}`,
          pageWidth - margin,
          pageHeight - 10,
          { align: "right" }
        );
      }

      doc.save(`${CLINIC_NAME.replace(/\s/g, "_")}_PatientReport_${record.name.replace(/\s/g, "_")}_${new Date().toISOString().split('T')[0]}.pdf`);
      notify("PDF generated successfully", { type: "success" });
    } catch {
      notify("Failed to generate PDF", { type: "error" });
    } finally {
      setPdfLoading(false);
    }
  };

  if (!record) {
    return (
      <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", height: "70vh", gap: 2 }}>
        <CircularProgress size={48} />
        <Typography color="text.secondary">Loading patient data...</Typography>
      </Box>
    );
  }

  // -------- UI --------
  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, md: 4 } }}>
      {/* Header */}
      <Card sx={{ mb: 3, background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white' }}>
        <CardContent sx={{ py: { xs: 2, md: 3 } }}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'flex-start', md: 'center' }} justifyContent="space-between">
            <Stack direction="row" spacing={2} alignItems="center">
              <Avatar sx={{ bgcolor: 'rgba(255,255,255,0.2)', width: 56, height: 56 }}>
                <PersonIcon sx={{ fontSize: 32 }} />
              </Avatar>
              <Box>
                <Typography variant={isMobile ? "h6" : "h5"} fontWeight={700}>
                  {record.name}
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  <Chip 
                    label={`${record.age ?? 'N/A'} yrs`} 
                    size="small" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
                  />
                  <Chip 
                    label={record.gender ?? 'N/A'} 
                    size="small" 
                    sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', fontWeight: 600 }}
                  />
                 
                </Stack>
              </Box>
            </Stack>
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              width={{ xs: '100%', sm: 'auto' }}
              alignItems="stretch"
            >
              {viewMode === "notes" ? (
                <Button
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={goToEditor}
                  fullWidth={isMobile}
                  sx={{
                    bgcolor: 'white',
                    color: 'primary.main',
                    minWidth: { sm: '140px' },
                    '&:hover': { bgcolor: 'rgba(255,255,255,0.9)' }
                  }}
                >
                  Add Note
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  startIcon={<ArrowBackIcon />}
                  onClick={backToNotes}
                  fullWidth={isMobile}
                  sx={{
                    borderColor: 'white',
                    color: 'white',
                    minWidth: { sm: '140px' },
                    '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                  }}
                >
                  Back
                </Button>
              )}
              <Button
                variant="outlined"
                startIcon={pdfLoading ? <CircularProgress size={18} sx={{ color: 'white' }} /> : <PictureAsPdfIcon />}
                onClick={handleDownloadPdf}
                disabled={pdfLoading}
                fullWidth={isMobile}
                sx={{
                  borderColor: 'white',
                  color: 'white',
                  minWidth: { sm: '140px' },
                  '&:hover': { borderColor: 'white', bgcolor: 'rgba(255,255,255,0.1)' }
                }}
              >
                {pdfLoading ? "Generating..." : "Download PDF"}
              </Button>
            </Stack>
          </Stack>
        </CardContent>
      </Card>

      {/* Patient info card - Collapsible */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Stack direction="row" justifyContent="space-between" alignItems="center" onClick={() => toggleSection('patientInfo')} sx={{ cursor: 'pointer' }}>
            <Typography variant="h6" fontWeight={700}>Personal Information</Typography>
            <IconButton size="small">
              {expandedSections.patientInfo ? <ExpandLessIcon /> : <ExpandMoreIcon />}
            </IconButton>
          </Stack>
          <Collapse in={expandedSections.patientInfo}>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <InfoCard icon={<PersonIcon />} label="Phone" value={record.phoneNumber} />
              <InfoCard icon={<PersonIcon />} label="Email" value={record.email} />
              <InfoCard icon={<PersonIcon />} label="Alt. Phone" value={record.alternatePhoneNumber} />
              <InfoCard 
                icon={<PersonIcon />} 
                label="Address" 
                value={
                  record.address
                    ? `${record.address.street}, ${record.address.city}, ${record.address.state} ${record.address.postalCode}`
                    : undefined
                }
                fullWidth
              />
            </Grid>
          </Collapse>
        </CardContent>
      </Card>

      {/* View Mode Switch */}
      {viewMode === "notes" ? (
        // ----- PREVIOUS NOTES -----
        <Card sx={{ boxShadow: 3 }}>
          <CardContent>
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
              <Stack direction="row" spacing={1} alignItems="center">
                <AssignmentIcon color="primary" />
                <Typography variant="h6" fontWeight={700}>
                  Clinical Notes
                </Typography>
              </Stack>
              <Badge badgeContent={sortedNotes.length} color="primary" max={99}>
                <Chip label="Total" variant="outlined" />
              </Badge>
            </Stack>
            {!sortedNotes.length ? (
              <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
                <AssignmentIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                <Typography color="text.secondary" variant="h6" gutterBottom>
                  No clinical notes yet
                </Typography>
                <Typography color="text.secondary" sx={{ mb: 3 }}>
                  Start documenting patient progress by adding your first note
                </Typography>
                <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={goToEditor} size="large">
                  Create First Note
                </Button>
              </Box>
            ) : (
              <>
                <Tabs
                  value={tabIndex}
                  onChange={(_, v: number) => setTabIndex(v)}
                  variant="scrollable"
                  scrollButtons="auto"
                  allowScrollButtonsMobile
                  sx={{ 
                    mb: 3,
                    '& .MuiTab-root': { 
                      textTransform: 'none',
                      fontWeight: 600,
                      minHeight: { xs: 48, md: 64 },
                      px: { xs: 2, md: 3 }
                    },
                    '& .Mui-selected': {
                      color: 'primary.main'
                    }
                  }}
                >
                  {sortedNotes.map((n, i) => (
                    <Tab
                      key={`tab-${i}`}
                      icon={<CalendarTodayIcon fontSize="small" />}
                      iconPosition="start"
                      label={new Date(n.noteDate).toLocaleDateString('en-US', { 
                        month: 'short', 
                        day: 'numeric', 
                        year: 'numeric' 
                      })}
                    />
                  ))}
                </Tabs>

                {sortedNotes[tabIndex] && (
                  <Paper elevation={2} sx={{ p: { xs: 2, md: 3 }, borderRadius: 2, bgcolor: 'grey.50' }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <CalendarTodayIcon color="primary" fontSize="small" />
                        <Typography variant="h6" fontWeight={700}>
                          {new Date(sortedNotes[tabIndex].noteDate).toDateString()}
                        </Typography>
                      </Stack>
                      <Stack direction="row" spacing={1}>
                        <Tooltip title="Edit this note">
                          <IconButton 
                            color="primary" 
                            size="small" 
                            onClick={() => handleEditNote(tabIndex)}
                            sx={{ bgcolor: 'primary.lighter' }}
                          >
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete this note">
                          <IconButton 
                            color="error" 
                            size="small" 
                            onClick={() => handleDeleteClick(tabIndex)}
                            sx={{ bgcolor: 'error.lighter' }}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Stack>
                    </Stack>
                    <Divider sx={{ mb: 3 }} />

                    <Stack spacing={2}>
                      <NoteSection label="Chief Complaint" value={sortedNotes[tabIndex].chiefComplaint} />
                      <NoteSection label="History" value={sortedNotes[tabIndex].history} />
                      <NoteSection label="Medications" value={sortedNotes[tabIndex].medications} icon={<MedicationIcon />} />
                      <NoteSection label="On Observation" value={sortedNotes[tabIndex].onObservation} />
                      <NoteSection label="On Palpation" value={sortedNotes[tabIndex].onPalpation} />
                      <NoteSection label="Pain Assessment (NPRS)" value={sortedNotes[tabIndex].painAssessmentNPRS} />
                      <NoteSection label="On Examination" value={sortedNotes[tabIndex].onExamination} />

                      {/* MMT */}
                      {sortedNotes[tabIndex].mmt?.length > 0 && (
                        <Paper sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
                          <Typography variant="subtitle1" fontWeight={700} gutterBottom color="primary">
                            Manual Muscle Testing (MMT)
                          </Typography>
                          <Stack spacing={1.5}>
                            {sortedNotes[tabIndex].mmt.map((j) => (
                              <Box key={j.joint}>
                                <Typography fontWeight={700} sx={{ mb: 0.5 }}>{j.joint}</Typography>
                                <Grid container spacing={1}>
                                  {j.right?.actions?.length > 0 && (
                                    <Grid item xs={12} sm={6}>
                                      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                                          RIGHT SIDE
                                        </Typography>
                                        <Stack spacing={0.5} mt={0.5}>
                                          {j.right.actions.map((a, idx) => (
                                            <Stack key={idx} direction="row" justifyContent="space-between">
                                              <Typography variant="body2">{a.action}</Typography>
                                              <Chip label={a.grade} size="small" color="primary" />
                                            </Stack>
                                          ))}
                                        </Stack>
                                      </Paper>
                                    </Grid>
                                  )}
                                  {j.left?.actions?.length > 0 && (
                                    <Grid item xs={12} sm={6}>
                                      <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.50' }}>
                                        <Typography variant="caption" fontWeight={700} color="text.secondary">
                                          LEFT SIDE
                                        </Typography>
                                        <Stack spacing={0.5} mt={0.5}>
                                          {j.left.actions.map((a, idx) => (
                                            <Stack key={idx} direction="row" justifyContent="space-between">
                                              <Typography variant="body2">{a.action}</Typography>
                                              <Chip label={a.grade} size="small" color="primary" />
                                            </Stack>
                                          ))}
                                        </Stack>
                                      </Paper>
                                    </Grid>
                                  )}
                                </Grid>
                              </Box>
                            ))}
                          </Stack>
                        </Paper>
                      )}

                      <NoteSection label="Treatment" value={sortedNotes[tabIndex].treatment} />

                      {/* Additional Notes */}
                      {(sortedNotes[tabIndex].additionalNotes ?? []).length > 0 && (
                        <Paper sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
                          <Typography variant="subtitle1" fontWeight={700} gutterBottom color="primary">
                            Additional Notes
                          </Typography>
                          <Stack spacing={1.5}>
                            {sortedNotes[tabIndex].additionalNotes!.map((n, i) => (
                              <Paper key={`an-${i}`} variant="outlined" sx={{ p: 2, bgcolor: 'grey.50' }}>
                                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                                  <TextsmsIcon color="action" fontSize="small" />
                                  <Box flex={1}>
                                    <Typography fontWeight={700} gutterBottom>{n.heading}</Typography>
                                    <Typography variant="body2" color="text.secondary">{n.description}</Typography>
                                  </Box>
                                </Stack>
                              </Paper>
                            ))}
                          </Stack>
                        </Paper>
                      )}

                      {/* Images */}
                      {!!sortedNotes[tabIndex].images?.length && (
                        <Paper sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
                          <Stack direction="row" spacing={1} alignItems="center" mb={2}>
                            <ImageIcon color="primary" />
                            <Typography variant="subtitle1" fontWeight={700} color="primary">
                              Attached Images ({sortedNotes[tabIndex].images.length})
                            </Typography>
                          </Stack>
                          <Grid container spacing={2}>
                            {sortedNotes[tabIndex].images.map((img, idx) => (
                              <Grid item xs={6} sm={4} md={3} key={`img-${idx}`}>
                                <Paper
                                  elevation={3}
                                  sx={{
                                    position: 'relative',
                                    paddingTop: '100%',
                                    borderRadius: 2,
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    transition: 'transform 0.2s',
                                    '&:hover': {
                                      transform: 'scale(1.05)',
                                      boxShadow: 6
                                    }
                                  }}
                                  onClick={() => handleImageClick(img, idx)}
                                >
                                  <Box
                                    component="img"
                                    src={img}
                                    alt={`Note-${idx}`}
                                    sx={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover'
                                    }}
                                  />
                                  <IconButton
                                    size="small"
                                    sx={{ 
                                      position: 'absolute', 
                                      bottom: 8, 
                                      right: 8, 
                                      bgcolor: 'rgba(0,0,0,0.7)', 
                                      color: '#fff',
                                      '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' }
                                    }}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadImage(img, sortedNotes[tabIndex].noteDate, idx);
                                    }}
                                  >
                                    <FileDownloadIcon fontSize="small" />
                                  </IconButton>
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Paper>
                      )}
                    </Stack>
                  </Paper>
                )}
              </>
            )}
          </CardContent>
        </Card>
      ) : (
        // ----- EDITOR -----
        <Card ref={formRef} sx={{ boxShadow: 3 }}>
          <CardContent sx={{ p: { xs: 2, md: 3 } }}>
            <Stack direction="row" spacing={1} alignItems="center" mb={3}>
              <EditIcon color="primary" />
              <Typography variant="h6" fontWeight={700}>
                {editingNoteIndex !== null ? "Edit Clinical Note" : "Add New Clinical Note"}
              </Typography>
            </Stack>
            <Divider sx={{ mb: 3 }} />

            <Stack spacing={3}>
              <TextField
                label="Note Date"
                type="date"
                value={noteDate}
                onChange={(e) => setNoteDate(e.target.value)}
                InputLabelProps={{ shrink: true }}
                fullWidth
                variant="outlined"
              />

              <ModernTextarea label="Chief Complaint" value={chiefComplaint} onChange={setChiefComplaint} rows={2} />
              <ModernTextarea label="History" value={history} onChange={setHistory} rows={3} />
              <ModernTextarea label="Medications" value={medications} onChange={setMedications} rows={2} />
              <ModernTextarea label="On Observation" value={onObservation} onChange={setOnObservation} rows={3} />
              <ModernTextarea label="On Palpation" value={onPalpation} onChange={setOnPalpation} rows={3} />
              <ModernTextarea label="Pain Assessment (NPRS)" value={painAssessmentNPRS} onChange={setPainAssessmentNPRS} rows={1} />
              <ModernTextarea label="On Examination" value={onExamination} onChange={setOnExamination} rows={3} />

              {/* MMT */}
              <Paper sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Stack direction="row" justifyContent="space-between" alignItems="center" onClick={() => toggleSection('mmt')} sx={{ cursor: 'pointer', mb: expandedSections.mmt ? 2 : 0 }}>
                  <Typography variant="h6" fontWeight={700} color="primary">
                    Manual Muscle Testing (MMT)
                  </Typography>
                  <IconButton size="small">
                    {expandedSections.mmt ? <ExpandLessIcon /> : <ExpandMoreIcon />}
                  </IconButton>
                </Stack>
                <Collapse in={expandedSections.mmt}>
                  <Stack spacing={3}>
                    {mmtActions.map((jg) => (
                      <Box key={jg.joint}>
                        <Typography fontWeight={700} sx={{ mb: 2, color: 'primary.main' }}>
                          {jg.joint}
                        </Typography>
                        <Stack spacing={1.5}>
                          {jg.actions.map((action) => (
                            <Paper
                              key={action}
                              elevation={1}
                              sx={{
                                p: 2,
                                bgcolor: 'white',
                                borderRadius: 2
                              }}
                            >
                              <Grid container spacing={2} alignItems="center">
                                <Grid item xs={12} sm={4}>
                                  <Typography fontWeight={600}>{action}</Typography>
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                  <FormControl fullWidth size="small">
                                    <InputLabel>Left</InputLabel>
                                    <Select
                                      label="Left"
                                      value={gradesSelection[`${jg.joint}-${action}-left`] ?? ""}
                                      onChange={(e) => handleGradeChange(jg.joint, action, "left", String(e.target.value))}
                                    >
                                      {grades.map((g) => (
                                        <MenuItem key={g} value={g}>
                                          {g}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </Grid>
                                <Grid item xs={6} sm={4}>
                                  <FormControl fullWidth size="small">
                                    <InputLabel>Right</InputLabel>
                                    <Select
                                      label="Right"
                                      value={gradesSelection[`${jg.joint}-${action}-right`] ?? ""}
                                      onChange={(e) => handleGradeChange(jg.joint, action, "right", String(e.target.value))}
                                    >
                                      {grades.map((g) => (
                                        <MenuItem key={g} value={g}>
                                          {g}
                                        </MenuItem>
                                      ))}
                                    </Select>
                                  </FormControl>
                                </Grid>
                              </Grid>
                            </Paper>
                          ))}
                        </Stack>
                      </Box>
                    ))}
                  </Stack>
                </Collapse>
              </Paper>

              {/* Additional notes */}
              <Paper sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                  Additional Notes
                </Typography>
                {(additionalNotes ?? []).length > 0 && (
                  <Stack spacing={1.5} mb={2}>
                    {additionalNotes.map((n, i) => (
                      <Paper key={`ad-${i}`} elevation={1} sx={{ p: 2, bgcolor: 'white' }}>
                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                          <Stack direction="row" spacing={1.5} flex={1}>
                            <TextsmsIcon color="action" fontSize="small" />
                            <Box flex={1}>
                              <Typography fontWeight={700}>{n.heading}</Typography>
                              <Typography variant="body2" color="text.secondary">{n.description}</Typography>
                            </Box>
                          </Stack>
                          <IconButton edge="end" onClick={() => handleDeleteAdditionalNote(i)} size="small" color="error">
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Stack>
                      </Paper>
                    ))}
                  </Stack>
                )}

                <Stack spacing={2}>
                  <ModernTextarea placeholder="Heading" value={newNoteHeading} onChange={setNewNoteHeading} rows={1} />
                  <ModernTextarea placeholder="Description" value={newNoteDescription} onChange={setNewNoteDescription} rows={2} />
                  <Button
                    variant="contained"
                    startIcon={<AddCircleOutlineIcon />}
                    onClick={handleAddAdditionalNote}
                    disabled={!newNoteHeading.trim() || !newNoteDescription.trim()}
                    fullWidth={isMobile}
                  >
                    Add Additional Note
                  </Button>
                </Stack>
              </Paper>

              <ModernTextarea label="Treatment" value={treatment} onChange={setTreatment} rows={4} />

              {/* existing images */}
              {!!existingImagesToDisplay.length && (
                <Paper sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                  <Typography variant="h6" fontWeight={700} gutterBottom color="primary">
                    Existing Images
                  </Typography>
                  <Grid container spacing={2}>
                    {existingImagesToDisplay.map((img, idx) => (
                      <Grid item xs={6} sm={4} md={3} key={`ex-${idx}`}>
                        <Paper
                          elevation={3}
                          sx={{
                            position: 'relative',
                            paddingTop: '100%',
                            borderRadius: 2,
                            overflow: 'hidden',
                            cursor: 'pointer'
                          }}
                          onClick={() => handleImageClick(img, idx)}
                        >
                          <Box
                            component="img"
                            src={img}
                            alt={`Existing-${idx}`}
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover'
                            }}
                          />
                          <IconButton
                            size="small"
                            sx={{ position: 'absolute', top: 8, right: 8, bgcolor: 'error.main', color: '#fff' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm("Remove this image from the note?")) {
                                setExistingImagesToDisplay((prev) => prev.filter((_, i) => i !== idx));
                                notify("Image removed (save to confirm).", { type: "info" });
                              }
                            }}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                          <IconButton
                            size="small"
                            sx={{ position: 'absolute', bottom: 8, right: 8, bgcolor: 'rgba(0,0,0,0.7)', color: '#fff' }}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDownloadImage(img, noteDate, idx);
                            }}
                          >
                            <FileDownloadIcon fontSize="small" />
                          </IconButton>
                        </Paper>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              )}

              {/* new images */}
              <Paper sx={{ p: 3, bgcolor: 'grey.50', borderRadius: 2 }}>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Upload New Images
                </Typography>
                <Input
                  type="file"
                  inputProps={{ multiple: true, accept: "image/*" }}
                  onChange={(e) => setImages(Array.from((e.target as HTMLInputElement).files ?? []))}
                  fullWidth
                />
                {!!images.length && (
                  <Typography variant="body2" color="primary" sx={{ mt: 1, fontWeight: 600 }}>
                    ✓ {images.length} new image(s) selected
                  </Typography>
                )}
              </Paper>

              <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
                <Button 
                  variant="contained" 
                  onClick={handleNoteSubmit} 
                  disabled={loading} 
                  fullWidth
                  size="large"
                  sx={{ py: 1.5 }}
                >
                  {loading ? <CircularProgress size={24} /> : (editingNoteIndex !== null ? "Update Note" : "Save Note")}
                </Button>
                <Button 
                  variant="outlined" 
                  onClick={backToNotes} 
                  disabled={loading} 
                  fullWidth
                  size="large"
                  sx={{ py: 1.5 }}
                >
                  Cancel
                </Button>
              </Stack>
            </Stack>
          </CardContent>
        </Card>
      )}

      {/* Delete dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Confirm Deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Are you sure you want to delete this clinical note? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenDeleteDialog(false)} variant="outlined">
            Cancel
          </Button>
          <Button onClick={handleDeleteNoteConfirm} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image dialog */}
      <Dialog open={openImageDialog} onClose={handleImageDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontWeight: 700 }}>
          <Typography variant="h6">Image Preview</Typography>
          <IconButton onClick={handleImageDialogClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", justifyContent: "center", bgcolor: 'grey.100', p: 3 }}>
          {selectedImage && <img src={selectedImage} alt="Note" style={{ maxWidth: "100%", height: "auto", borderRadius: 8 }} />}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          {selectedImage && (
            <Button 
              onClick={() => handleDownloadImage(selectedImage, noteDate, selectedImageIndex ?? 0)} 
              startIcon={<FileDownloadIcon />}
              variant="outlined"
            >
              Download
            </Button>
          )}
          {selectedImageIndex !== null && viewMode === "editor" && (
            <Button onClick={handleDeleteExistingImage} color="error" startIcon={<DeleteIcon />} variant="outlined">
              Remove
            </Button>
          )}
          <Button onClick={handleImageDialogClose} variant="contained">Close</Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

// -------- Helper Components --------
const InfoCard: React.FC<{ icon: React.ReactNode; label: string; value?: string | number; fullWidth?: boolean }> = ({ 
  icon, 
  label, 
  value,
  fullWidth = false 
}) => (
  <Grid item xs={12} sm={fullWidth ? 12 : 6} md={fullWidth ? 12 : 4}>
    <Paper variant="outlined" sx={{ p: 2, height: '100%', borderRadius: 2 }}>
      <Stack direction="row" spacing={1.5} alignItems="flex-start">
        <Box sx={{ color: 'primary.main', mt: 0.5 }}>{icon}</Box>
        <Box flex={1}>
          <Typography variant="caption" color="text.secondary" fontWeight={600}>
            {label}
          </Typography>
          <Typography variant="body1" fontWeight={600} sx={{ wordBreak: 'break-word' }}>
            {value ?? "N/A"}
          </Typography>
        </Box>
      </Stack>
    </Paper>
  </Grid>
);

const NoteSection: React.FC<{ label: string; value?: string; icon?: React.ReactNode }> = ({ label, value, icon }) =>
  value ? (
    <Paper sx={{ p: 2, bgcolor: 'white', borderRadius: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" mb={1}>
        {icon}
        <Typography variant="subtitle1" fontWeight={700} color="primary">
          {label}
        </Typography>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
        {value}
      </Typography>
    </Paper>
  ) : null;

const ModernTextarea: React.FC<{ 
  label?: string; 
  value: string; 
  onChange: (v: string) => void; 
  rows: number; 
  placeholder?: string 
}> = ({ label, value, onChange, rows, placeholder }) => (
  <Box>
    {label && (
      <Typography variant="subtitle1" fontWeight={700} sx={{ mb: 1 }} color="primary">
        {label}
      </Typography>
    )}
    <Paper variant="outlined" sx={{ p: 0, borderRadius: 2, overflow: 'hidden' }}>
      <TextareaAutosize
        minRows={rows}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? label ?? ""}
        style={{
          width: "100%",
          padding: "12px 16px",
          border: "none",
          fontSize: 16,
          background: "#fff",
          fontFamily: 'inherit',
          resize: 'vertical',
          outline: 'none'
        }}
      />
    </Paper>
  </Box>
);

export default PatientNotes;