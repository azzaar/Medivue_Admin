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
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  TextareaAutosize,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Paper,
  Divider,
  Tooltip,
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

// PDF
import jsPDF from "jspdf";

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

  const [record, setRecord] = useState<Patient | null>(null);
  const [viewMode, setViewMode] = useState<"notes" | "editor">("notes"); // <<< show either notes or editor
  const [tabIndex, setTabIndex] = useState(0);

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
    record?.notes?.length ? [...record.notes].sort((a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()) : [];

  useEffect(() => {
    if (sortedNotes.length > 0 && tabIndex >= sortedNotes.length) setTabIndex(0);
    if (sortedNotes.length === 0 && tabIndex !== 0) setTabIndex(0);
  }, [sortedNotes.length, tabIndex]);

  // -------- UI helpers --------
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
    { joint: "Hip", actions: ["Flexion", "Abduction", "Adduction", "Internal Rotation", "External Rotation"] },
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
        // find original index in record.notes matching sortedNotes[editingNoteIndex]
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

      // refresh record & go back to notes
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
      let y = 10;

      // logo
      if (YOUR_LOGO_PATH) {
        const img = new Image();
        img.src = YOUR_LOGO_PATH;
        await new Promise<void>((res) => {
          img.onload = () => res();
          img.onerror = () => res();
        });
        if (img.complete && img.naturalWidth) {
          const w = 30;
          const h = (img.height * w) / img.width;
          doc.addImage(img, "JPEG", 10, y, w, h);
          y += h + 5;
        }
      }

      doc.setFontSize(18).setFont("helvetica", "bold");
      doc.text(CLINIC_NAME, 105, y, { align: "center" });
      y += 8;
      doc.setFontSize(10).setFont("helvetica", "normal");
      doc.text(CLINIC_ADDRESS, 105, y, { align: "center" });
      y += 5;
      doc.text(`Phone: ${CLINIC_PHONE} | Email: ${CLINIC_EMAIL}`, 105, y, { align: "center" });
      y += 15;

      // patient info
      doc.setFontSize(14).setFont("helvetica", "bold").text("Patient Information", 15, y);
      y += 8;
      doc.setFontSize(11).setFont("helvetica", "normal");
      const lines = [
        `Name: ${record.name}`,
        `Age: ${record.age ?? "N/A"}`,
        `Gender: ${record.gender ?? "N/A"}`,
        `Phone: ${record.phoneNumber ?? "N/A"}`,
        `Condition: ${record.condition ?? "N/A"}`,
        `Alternate Phone: ${record.alternatePhoneNumber ?? "N/A"}`,
        `Email: ${record.email ?? "N/A"}`,
        `Address: ${
          record.address
            ? `${record.address.street}, ${record.address.city}, ${record.address.state} ${record.address.postalCode}`
            : "N/A"
        }`,
      ];
      for (const ln of lines) {
        if (y > 280) {
          doc.addPage();
          y = 20;
        }
        doc.text(ln, 15, y);
        y += 7;
      }

      y += 10;
      doc.setFontSize(14).setFont("helvetica", "bold").text("Patient Notes", 15, y);
      y += 8;

      if (!sortedNotes.length) {
        doc.setFontSize(11).setFont("helvetica", "italic").text("No notes available.", 15, y);
        y += 7;
      } else {
        const list = [...sortedNotes].sort((a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime());
        for (const note of list) {
          if (y > 270) {
            doc.addPage();
            y = 20;
          }
          doc.setFontSize(12).setFont("helvetica", "bold");
          doc.text(`Date: ${new Date(note.noteDate).toLocaleDateString()}`, 15, y);
          y += 7;
          doc.setFontSize(11).setFont("helvetica", "normal");

          const fields: Array<{ label: string; value?: string }> = [
            { label: "Chief Complaint", value: note.chiefComplaint },
            { label: "History", value: note.history },
            { label: "Medications", value: note.medications },
            { label: "On Observation", value: note.onObservation },
            { label: "On Palpation", value: note.onPalpation },
            { label: "Pain Assessment (NPRS)", value: note.painAssessmentNPRS },
            { label: "On Examination", value: note.onExamination },
            {
              label: "MMT",
              value:
                note.mmt?.length
                  ? note.mmt
                      .map((j) => {
                        const parts: string[] = [];
                        if (j.right?.actions?.length) {
                          parts.push(`Right: ${j.right.actions.map((a) => `${a.action}: ${a.grade}`).join(" | ")}`);
                        }
                        if (j.left?.actions?.length) {
                          parts.push(`Left: ${j.left.actions.map((a) => `${a.action}: ${a.grade}`).join(" | ")}`);
                        }
                        return `${j.joint}: ${parts.length ? parts.join(" | ") : "N/A"}`;
                      })
                      .join("\n")
                  : undefined,
            },
            { label: "Treatment", value: note.treatment },
            {
              label: "Additional Notes",
              value: note.additionalNotes?.length
                ? note.additionalNotes.map((n) => `${n.heading}: ${n.description}`).join("\n")
                : undefined,
            },
          ];

          for (const f of fields) {
            if (!f.value) continue;
            const block = doc.splitTextToSize(`${f.label}: ${f.value}`, 180);
            if (y + block.length * 6 > 285) {
              doc.addPage();
              y = 20;
            }
            doc.text(block, 15, y);
            y += block.length * 6 + 2;
          }

          y += 6;
        }
      }

      const pages = doc.getNumberOfPages();
      for (let i = 1; i <= pages; i++) {
        doc.setPage(i).setFontSize(8).text(`Page ${i} of ${pages}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, {
          align: "right",
        });
      }

      doc.save(`Patient_Report_${record.name.replace(/\s/g, "_")}.pdf`);
      notify("PDF generated", { type: "success" });
    } catch {
      notify("Failed to generate PDF", { type: "error" });
    } finally {
      setPdfLoading(false);
    }
  };

  if (!record) return <Typography m={3}>Loading patient data...</Typography>;

  // -------- UI --------
  return (
    <Box p={{ xs: 2, md: 3 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2}>
        <Typography variant="h5" fontWeight={700}>
          Patient Notes — {record.name}
        </Typography>
        <Stack direction="row" spacing={1}>
          {viewMode === "notes" ? (
            <Button variant="contained" startIcon={<AddCircleOutlineIcon />} onClick={goToEditor}>
              Add Note
            </Button>
          ) : (
            <Button variant="outlined" startIcon={<ArrowBackIcon />} onClick={backToNotes}>
              Back to Notes
            </Button>
          )}
          <Button
            variant="contained"
            color="secondary"
            startIcon={pdfLoading ? <CircularProgress size={18} /> : <PictureAsPdfIcon />}
            onClick={handleDownloadPdf}
            disabled={pdfLoading}
          >
            {pdfLoading ? "Generating..." : "Download PDF"}
          </Button>
        </Stack>
      </Stack>

      {/* Patient info card */}
      <Paper variant="outlined" sx={{ p: 2, borderRadius: 2, mb: 2 }}>
        <Typography variant="subtitle1" fontWeight={600} gutterBottom>
          Personal Information
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <Stack spacing={0.5} direction="row" flexWrap="wrap" useFlexGap>
          <Info label="Age" value={record.age} />
          <Info label="Sex" value={record.gender} />
          <Info label="Phone" value={record.phoneNumber} />
          <Info label="Email" value={record.email} />
          <Info label="Condition" value={record.condition} />
          <Info
            label="Address"
            value={
              record.address
                ? `${record.address.street}, ${record.address.city}, ${record.address.state} ${record.address.postalCode}`
                : undefined
            }
          />
        </Stack>
      </Paper>

      {/* View Mode Switch */}
      {viewMode === "notes" ? (
        // ----- PREVIOUS NOTES -----
        <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
            <Typography variant="h6" fontWeight={700}>
              Previous Notes
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {sortedNotes.length} note{sortedNotes.length === 1 ? "" : "s"}
            </Typography>
          </Stack>
          {!sortedNotes.length ? (
            <Typography color="text.secondary" sx={{ mt: 1 }}>
              No notes yet. Click “Add Note” to create one.
            </Typography>
          ) : (
            <>
              <Tabs
                value={tabIndex}
                onChange={(_, v: number) => setTabIndex(v)}
                variant="scrollable"
                scrollButtons="auto"
                allowScrollButtonsMobile
                sx={{ mb: 2, "& .MuiTabs-indicator": { backgroundColor: "primary.main" } }}
              >
                {sortedNotes.map((n, i) => (
                  <Tab
                    key={`tab-${i}`}
                    label={new Date(n.noteDate).toLocaleDateString()}
                    sx={{
                      fontWeight: 600,
                      textTransform: "none",
                    }}
                  />
                ))}
              </Tabs>

              {sortedNotes[tabIndex] && (
                <Paper variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                    <Typography variant="subtitle1" fontWeight={700}>
                      {new Date(sortedNotes[tabIndex].noteDate).toDateString()}
                    </Typography>
                    <Box>
                      <Tooltip title="Edit this note">
                        <IconButton color="primary" size="small" onClick={() => handleEditNote(tabIndex)}>
                          <EditIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete this note">
                        <IconButton color="error" size="small" onClick={() => handleDeleteClick(tabIndex)}>
                          <DeleteIcon />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </Stack>
                  <Divider sx={{ mb: 2 }} />

                  <NoteField label="Chief Complaint" value={sortedNotes[tabIndex].chiefComplaint} />
                  <NoteField label="History" value={sortedNotes[tabIndex].history} />
                  <NoteField label="Medications" value={sortedNotes[tabIndex].medications} />
                  <NoteField label="On Observation" value={sortedNotes[tabIndex].onObservation} />
                  <NoteField label="On Palpation" value={sortedNotes[tabIndex].onPalpation} />
                  <NoteField label="Pain Assessment (NPRS)" value={sortedNotes[tabIndex].painAssessmentNPRS} />
                  <NoteField label="On Examination" value={sortedNotes[tabIndex].onExamination} />

                  {/* MMT */}
                  <Box mt={1}>
                    <Typography variant="subtitle2" fontWeight={700}>
                      MMT
                    </Typography>
                    {sortedNotes[tabIndex].mmt?.length ? (
                      <Box>
                        {sortedNotes[tabIndex].mmt.map((j) => (
                          <Box key={j.joint} sx={{ pl: 1, py: 0.5 }}>
                            <Typography fontWeight={700}>{j.joint}</Typography>
                            {!!j.right?.actions?.length && (
                              <Typography variant="body2" color="text.secondary">
                                <strong>Right:</strong>{" "}
                                {j.right.actions.map((a) => `${a.action}: ${a.grade}`).join(" | ")}
                              </Typography>
                            )}
                            {!!j.left?.actions?.length && (
                              <Typography variant="body2" color="text.secondary">
                                <strong>Left:</strong>{" "}
                                {j.left.actions.map((a) => `${a.action}: ${a.grade}`).join(" | ")}
                              </Typography>
                            )}
                            {!j.right?.actions?.length && !j.left?.actions?.length && (
                              <Typography variant="body2" color="text.secondary">
                                N/A
                              </Typography>
                            )}
                          </Box>
                        ))}
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        N/A
                      </Typography>
                    )}
                  </Box>

                  <NoteField label="Treatment" value={sortedNotes[tabIndex].treatment} />

                  {/* Additional Notes */}
                  {(sortedNotes[tabIndex].additionalNotes ?? []).length > 0 && (
                    <Box mt={1}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Additional Notes
                      </Typography>
                      <List dense disablePadding>
                        {sortedNotes[tabIndex].additionalNotes!.map((n, i) => (
                          <ListItem key={`an-${i}`} sx={{ py: 0.5 }}>
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <TextsmsIcon fontSize="small" color="action" />
                            </ListItemIcon>
                            <ListItemText primary={<Typography fontWeight={700}>{n.heading}</Typography>} secondary={n.description} />
                          </ListItem>
                        ))}
                      </List>
                    </Box>
                  )}

                  {/* Images */}
                  {!!sortedNotes[tabIndex].images?.length && (
                    <Box mt={1}>
                      <Typography variant="subtitle2" fontWeight={700}>
                        Attached Images
                      </Typography>
                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        {sortedNotes[tabIndex].images.map((img, idx) => (
                          <Box
                            key={`img-${idx}`}
                            sx={{
                              width: 110,
                              height: 110,
                              borderRadius: 1,
                              overflow: "hidden",
                              border: "1px solid",
                              borderColor: "divider",
                              position: "relative",
                              cursor: "pointer",
                            }}
                            onClick={() => handleImageClick(img, idx)}
                          >
                            <img src={img} alt={`Note-${idx}`} width={110} height={110} style={{ objectFit: "cover" }} loading="lazy" />
                            <IconButton
                              size="small"
                              sx={{ position: "absolute", bottom: 4, right: 4, bgcolor: "rgba(0,0,0,0.6)", color: "#fff" }}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDownloadImage(img, sortedNotes[tabIndex].noteDate, idx);
                              }}
                            >
                              <FileDownloadIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
                </Paper>
              )}
            </>
          )}
        </Paper>
      ) : (
        // ----- EDITOR -----
        <Paper ref={formRef} variant="outlined" sx={{ p: 2, borderRadius: 2 }}>
          <Typography variant="h6" fontWeight={700} gutterBottom>
            {editingNoteIndex !== null ? "Edit Note" : "Add New Note"}
          </Typography>
          <Divider sx={{ mb: 2 }} />

          <Stack spacing={2}>
            <TextField
              label="Note Date"
              type="date"
              value={noteDate}
              onChange={(e) => setNoteDate(e.target.value)}
              InputLabelProps={{ shrink: true }}
              fullWidth
            />

            <Textarea label="Chief Complaint" value={chiefComplaint} onChange={setChiefComplaint} rows={2} />
            <Textarea label="History" value={history} onChange={setHistory} rows={3} />
            <Textarea label="Medications" value={medications} onChange={setMedications} rows={2} />
            <Textarea label="On Observation" value={onObservation} onChange={setOnObservation} rows={3} />
            <Textarea label="On Palpation" value={onPalpation} onChange={setOnPalpation} rows={3} />
            <Textarea label="Pain Assessment (NPRS)" value={painAssessmentNPRS} onChange={setPainAssessmentNPRS} rows={1} />
            <Textarea label="On Examination" value={onExamination} onChange={setOnExamination} rows={3} />

            {/* MMT */}
            <Box>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                MMT (Manual Muscle Testing)
              </Typography>
              {mmtActions.map((jg) => (
                <Box key={jg.joint} sx={{ mb: 2 }}>
                  <Typography fontWeight={700} sx={{ mb: 1 }}>
                    {jg.joint}
                  </Typography>
                  <Stack direction="row" flexWrap="wrap" gap={1.5}>
                    {jg.actions.map((action) => (
                      <Box
                        key={action}
                        sx={{
                          display: "flex",
                          alignItems: "center",
                          gap: 1,
                          p: 1,
                          border: "1px solid",
                          borderColor: "divider",
                          borderRadius: 1.5,
                          minWidth: 240,
                          bgcolor: "background.default",
                        }}
                      >
                        <Typography sx={{ flex: 1 }}>{action}</Typography>
                        <FormControl size="small" sx={{ width: 100 }}>
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
                        <FormControl size="small" sx={{ width: 100 }}>
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
                      </Box>
                    ))}
                  </Stack>
                </Box>
              ))}
            </Box>

            {/* Additional notes */}
            <Box>
              <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                Additional Notes
              </Typography>
              {(additionalNotes ?? []).length > 0 && (
                <List dense disablePadding sx={{ mb: 1 }}>
                  {additionalNotes.map((n, i) => (
                    <ListItem
                      key={`ad-${i}`}
                      secondaryAction={
                        <IconButton edge="end" onClick={() => handleDeleteAdditionalNote(i)} size="small">
                          <DeleteIcon fontSize="small" />
                        </IconButton>
                      }
                      sx={{ py: 0.5 }}
                    >
                      <ListItemIcon sx={{ minWidth: 30 }}>
                        <TextsmsIcon fontSize="small" color="action" />
                      </ListItemIcon>
                      <ListItemText primary={<Typography fontWeight={700}>{n.heading}</Typography>} secondary={n.description} />
                    </ListItem>
                  ))}
                </List>
              )}

              <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                <Textarea placeholder="Heading" value={newNoteHeading} onChange={setNewNoteHeading} rows={2} />
                <Textarea placeholder="Description" value={newNoteDescription} onChange={setNewNoteDescription} rows={3} />
                <Button
                  variant="contained"
                  startIcon={<AddCircleOutlineIcon />}
                  onClick={handleAddAdditionalNote}
                  disabled={!newNoteHeading.trim() || !newNoteDescription.trim()}
                >
                  Add
                </Button>
              </Stack>
            </Box>

            <Textarea label="Treatment" value={treatment} onChange={setTreatment} rows={4} />

            {/* existing images */}
            {!!existingImagesToDisplay.length && (
              <Box>
                <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                  Existing Images
                </Typography>
                <Stack direction="row" spacing={2} flexWrap="wrap">
                  {existingImagesToDisplay.map((img, idx) => (
                    <Box
                      key={`ex-${idx}`}
                      sx={{
                        position: "relative",
                        width: 110,
                        height: 110,
                        border: "1px solid",
                        borderColor: "divider",
                        borderRadius: 1,
                        p: 0.5,
                        cursor: "pointer",
                      }}
                      onClick={() => handleImageClick(img, idx)}
                    >
                      <img src={img} alt={`Existing-${idx}`} width={110} height={110} style={{ objectFit: "cover" }} loading="lazy" />
                      <IconButton
                        size="small"
                        sx={{ position: "absolute", top: 4, right: 4, bgcolor: "error.main", color: "#fff" }}
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
                        sx={{ position: "absolute", bottom: 4, right: 4, bgcolor: "rgba(0,0,0,0.6)", color: "#fff" }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadImage(img, noteDate, idx);
                        }}
                      >
                        <FileDownloadIcon fontSize="small" />
                      </IconButton>
                    </Box>
                  ))}
                </Stack>
              </Box>
            )}

            {/* new images */}
            <Box>
              <Input
                type="file"
                inputProps={{ multiple: true, accept: "image/*" }}
                onChange={(e) => setImages(Array.from((e.target as HTMLInputElement).files ?? []))}
                fullWidth
              />
              {!!images.length && (
                <Typography variant="caption" color="text.secondary">
                  {images.length} new image(s) selected
                </Typography>
              )}
            </Box>

            <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
              <Button variant="contained" onClick={handleNoteSubmit} disabled={loading} fullWidth>
                {loading ? (editingNoteIndex !== null ? "Updating..." : "Saving...") : editingNoteIndex !== null ? "Update Note" : "Save Note"}
              </Button>
              <Button variant="outlined" onClick={backToNotes} disabled={loading} fullWidth>
                Cancel
              </Button>
            </Stack>
          </Stack>
        </Paper>
      )}

      {/* Delete dialog */}
      <Dialog open={openDeleteDialog} onClose={() => setOpenDeleteDialog(false)}>
        <DialogTitle>Confirm deletion</DialogTitle>
        <DialogContent>
          <DialogContentText>Delete this note? This cannot be undone.</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDeleteDialog(false)}>Cancel</Button>
          <Button onClick={handleDeleteNoteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image dialog */}
      <Dialog open={openImageDialog} onClose={handleImageDialogClose} maxWidth="md" fullWidth>
        <DialogTitle sx={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <Typography>Image</Typography>
          <IconButton onClick={handleImageDialogClose}>
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ display: "flex", justifyContent: "center" }}>
          {selectedImage && <img src={selectedImage} alt="Note" style={{ maxWidth: "100%", height: "auto" }} />}
        </DialogContent>
        <DialogActions>
          {selectedImage && (
            <Button onClick={() => handleDownloadImage(selectedImage, noteDate, selectedImageIndex ?? 0)} startIcon={<FileDownloadIcon />}>
              Download
            </Button>
          )}
          {selectedImageIndex !== null && viewMode === "editor" && (
            <Button onClick={handleDeleteExistingImage} color="error" startIcon={<DeleteIcon />}>
              Remove from Note
            </Button>
          )}
          <Button onClick={handleImageDialogClose}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

// -------- Small helpers (typed, no any) --------
const Info: React.FC<{ label: string; value?: string | number }> = ({ label, value }) => (
  <Typography sx={{ mr: 3 }} color={value ? "text.primary" : "text.secondary"}>
    <Typography component="span" fontWeight={700}>
      {label}:
    </Typography>{" "}
    {value ?? "N/A"}
  </Typography>
);

const NoteField: React.FC<{ label: string; value?: string }> = ({ label, value }) =>
  value ? (
    <Box sx={{ mb: 1 }}>
      <Typography variant="subtitle2" fontWeight={700}>
        {label}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: "pre-line" }}>
        {value}
      </Typography>
    </Box>
  ) : null;

const Textarea: React.FC<{ label?: string; value: string; onChange: (v: string) => void; rows: number; placeholder?: string }> = ({
  label,
  value,
  onChange,
  rows,
  placeholder,
}) => (
  <Box>
    {label && (
      <Typography variant="subtitle2" fontWeight={700} sx={{ mb: 0.5 }}>
        {label}
      </Typography>
    )}
    <TextareaAutosize
      minRows={rows}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder ?? label ?? ""}
      style={{
        width: "100%",
        padding: "10px",
        border: "1px solid #ddd",
        borderRadius: 8,
        fontSize: 16,
        background: "#fff",
      }}
    />
  </Box>
);

export default PatientNotes;
