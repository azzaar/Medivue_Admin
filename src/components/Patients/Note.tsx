// PatientNotes.tsx
"use client";

import { useDataProvider, useNotify } from "react-admin";
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
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";

import FileDownloadIcon from "@mui/icons-material/FileDownload";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import TextsmsIcon from '@mui/icons-material/Textsms'; // Icon for additional notes

// PDF Generation Imports
import jsPDF from 'jspdf';
// Ensure jspdf-autotable is installed for better table formatting if needed.
// For now, manual text positioning is used.

// Define the structure for each patient note
interface Note {
  noteDate: string;
  history?: string;
  medications?: string;
  onObservation?: string;
  onPalpation?: string;
  painAssessmentNPRS?: string;
  mmt?: string;
  treatment?: string;
  additionalNotes?: string[]; // CHANGED: Now an array of strings
  images: string[]; // Array to store base64 strings
}

// Define the patient structure
interface Patient {
  id: string | number;
  name: string;
  age?: number;
  gender?: string;
  phoneNumber?: string;
  alternatePhoneNumber?: string; // New field
  emergencyContact: {
    name: string;
    relation: string;
    contactNumber: string;
  }
  email?: string;
  occupation?: string;
  chiefComplaint?: string;
  address: { // Added address details as per backend schema
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  notes: Note[];
  [key: string]: unknown;
}


const CLINIC_NAME = "Medivue Health and Wellness Pvt Ltd";
const CLINIC_ADDRESS = "Ward 21, No 98, Vettiyara P.O, Navaikulam, Thiruvananthapuram, Kerala - 695603";
const CLINIC_PHONE = "+91 8089180303";
const CLINIC_EMAIL = "info@medivue.life";
// ----------------------------------------


// ---------------------------

const PatientNotes = () => {
  const { id } = useParams<{ id: string }>();
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const [record, setRecord] = useState<Patient | null>(null);
  const [noteDate, setNoteDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [history, setHistory] = useState("");
  const [medications, setMedications] = useState("");
  const [onObservation, setOnObservation] = useState("");
  const [onPalpation, setOnPalpation] = useState("");
  const [painAssessmentNPRS, setPainAssessmentNPRS] = useState("");
  const [mmt, setMmt] = useState("");
  const [treatment, setTreatment] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState<string[]>([]); // CHANGED: array
  const [newAdditionalNoteText, setNewAdditionalNoteText] = useState(""); // For adding new notes

  const [images, setImages] = useState<File[]>([]);
  const [existingImagesToDisplay, setExistingImagesToDisplay] = useState<
    string[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);

  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [noteToDeleteIndex, setNoteToDeleteIndex] = useState<number | null>(null);

  const [openImageDialog, setOpenImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null); // To help with deleting

  const formRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (id !== undefined && id !== null) {
      dataProvider
        .getOne<Patient>("patients", { id: id as string | number })
        .then(({ data }) => setRecord(data))
        .catch((error) => {
          console.error("Error fetching patient data:", error);
          notify("Failed to load patient data", { type: "error" });
        });
    }
  }, [id, dataProvider, notify]);

  const sortedNotes =
    record && record.notes
      ? [...record.notes].sort(
          (a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
        )
      : [];

  useEffect(() => {
    if (sortedNotes.length > 0 && tabIndex >= sortedNotes.length) {
      setTabIndex(0);
    } else if (sortedNotes.length === 0 && tabIndex !== 0) {
      setTabIndex(0);
    }
  }, [sortedNotes.length, tabIndex]);

  const resetFormFields = () => {
    setNoteDate(new Date().toISOString().slice(0, 10));
    setHistory("");
    setMedications("");
    setOnObservation("");
    setOnPalpation("");
    setPainAssessmentNPRS("");
    setMmt("");
    setTreatment("");
    setAdditionalNotes([]); // Reset array
    setNewAdditionalNoteText("");
    setImages([]);
    setExistingImagesToDisplay([]);
    setEditingNoteIndex(null);
  };

  const handleAddAdditionalNote = () => {
    if (newAdditionalNoteText.trim()) {
      setAdditionalNotes([...additionalNotes, newAdditionalNoteText.trim()]);
      setNewAdditionalNoteText("");
    }
  };

  const handleDeleteAdditionalNote = (indexToDelete: number) => {
    setAdditionalNotes(additionalNotes.filter((_, idx) => idx !== indexToDelete));
  };

  const handleNoteSubmit = async () => {
    if (
      !history.trim() &&
      !medications.trim() &&
      !onObservation.trim() &&
      !onPalpation.trim() &&
      !painAssessmentNPRS.trim() &&
      !mmt.trim() &&
      !treatment.trim() &&
      additionalNotes.length === 0 && // Check the array
      images.length === 0 &&
      existingImagesToDisplay.length === 0
    ) {
      notify("Please fill at least one note field or upload an image", {
        type: "warning",
      });
      return;
    }

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

    const updatedOrNewNote: Note = {
      noteDate,
      history: history.trim() || undefined,
      medications: medications.trim() || undefined,
      onObservation: onObservation.trim() || undefined,
      onPalpation: onPalpation.trim() || undefined,
      painAssessmentNPRS: painAssessmentNPRS.trim() || undefined,
      mmt: mmt.trim() || undefined,
      treatment: treatment.trim() || undefined,
      additionalNotes: additionalNotes.length > 0 ? additionalNotes : undefined, // CHANGED: pass the array
      images: allImages,
    };

    if (!record) return;

    setLoading(true);
    try {
      let updatedNotes: Note[];
      if (editingNoteIndex !== null) {
        updatedNotes = [...record.notes];
        // Find the original index of the note being edited to ensure correct update
        const originalIndex = record.notes.findIndex(
            (note) =>
                note.noteDate === sortedNotes[editingNoteIndex].noteDate &&
                note.history === sortedNotes[editingNoteIndex].history // Using history as a tie-breaker, consider a unique ID for notes in backend
        );
        if (originalIndex !== -1) {
            updatedNotes[originalIndex] = updatedOrNewNote;
        } else {
            console.warn("Original note not found for update, appending instead.");
            updatedNotes.push(updatedOrNewNote);
        }
      } else {
        updatedNotes = [...(record.notes || []), updatedOrNewNote];
      }

      await dataProvider.update("patients", {
        id,
        data: {
          notes: updatedNotes,
        },
        previousData: record,
      });

      notify(
        editingNoteIndex !== null ? "Note updated successfully" : "Note added successfully",
        { type: "success" }
      );
      resetFormFields();
      dataProvider
        .getOne<Patient>("patients", { id: id! })
        .then(({ data }) => setRecord(data));
    } catch (error) {
      console.error("Note save/update error:", error);
      notify("Failed to save/update note", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadImage = (base64String: string, noteDate: string, imgIndex: number) => {
    const mimeTypeMatch = base64String.match(/^data:(.*?);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png";
    const extension = mimeType.split("/")[1] || "png";

    const link = document.createElement("a");
    link.href = base64String;
    link.download = `patient_image_${record?.name.replace(/\s/g, "_")}_${noteDate}_${imgIndex}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditNote = (index: number) => {
    const noteToEdit = sortedNotes[index];
    setEditingNoteIndex(index);
    setNoteDate(noteToEdit.noteDate);
    setHistory(noteToEdit.history || "");
    setMedications(noteToEdit.medications || "");
    setOnObservation(noteToEdit.onObservation || "");
    setOnPalpation(noteToEdit.onPalpation || "");
    setPainAssessmentNPRS(noteToEdit.painAssessmentNPRS || "");
    setMmt(noteToEdit.mmt || "");
    setTreatment(noteToEdit.treatment || "");
    setAdditionalNotes(noteToEdit.additionalNotes || []); // Set the array
    setNewAdditionalNoteText(""); // Clear input for new notes
    setImages([]);
    setExistingImagesToDisplay(noteToEdit.images || []);

    if (formRef.current) {
      formRef.current.scrollIntoView({ behavior: "smooth", block: "start" });
    }
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
      const noteToDelete = sortedNotes[noteToDeleteIndex];
      const originalIndex = record.notes.findIndex(
        (note) =>
          note.noteDate === noteToDelete.noteDate &&
          note.history === noteToDelete.history
      );

      const updatedNotes = [...record.notes];
      if (originalIndex !== -1) {
        updatedNotes.splice(originalIndex, 1);
      } else {
        console.warn("Note to delete not found in original array. Cannot delete.");
        notify("Failed to delete note: Note not found.", { type: "error" });
        return;
      }

      await dataProvider.update("patients", {
        id,
        data: {
          notes: updatedNotes,
        },
        previousData: record,
      });

      notify("Note deleted successfully", { type: "success" });
      resetFormFields();
      dataProvider
        .getOne<Patient>("patients", { id: id! })
        .then(({ data }) => setRecord(data));
    } catch (error) {
      console.error("Note delete error:", error);
      notify("Failed to delete note", { type: "error" });
    } finally {
      setLoading(false);
      setNoteToDeleteIndex(null);
    }
  };

  const handleDeleteDialogClose = () => {
    setOpenDeleteDialog(false);
    setNoteToDeleteIndex(null);
  };

  const handleImageClick = (imageSrc: string, index: number | null) => {
    setSelectedImage(imageSrc);
    setSelectedImageIndex(index); // Store index for deletion
    setOpenImageDialog(true);
  };

  const handleImageDialogClose = () => {
    setOpenImageDialog(false);
    setSelectedImage(null);
    setSelectedImageIndex(null);
  };

  const handleDeleteExistingImage = () => {
      if (selectedImageIndex !== null && existingImagesToDisplay) {
          const updatedImages = existingImagesToDisplay.filter((_, idx) => idx !== selectedImageIndex);
          setExistingImagesToDisplay(updatedImages);
          handleImageDialogClose(); // Close dialog after deletion
          notify("Image removed from current note edit.", { type: "info" });
      }
  };
  const YOUR_LOGO_PATH = "/medivueLogo.jpeg";
  // --- PDF GENERATION LOGIC ---
  const handleDownloadPdf = async () => {
    if (!record) {
      notify("No patient data to generate report.", { type: "warning" });
      return;
    }
  
    setPdfLoading(true);
    notify("Generating PDF report...", { type: "info", autoHideDuration: 3000 });
  
    try {
      const doc = new jsPDF('p', 'mm', 'a4');
      let yOffset = 10;
  
      // --- Header with Logo and Clinic Info ---
      if (YOUR_LOGO_PATH) {
        try {
          const img = new window.Image() as HTMLImageElement;
          img.src = YOUR_LOGO_PATH; // Load logo from the public directory
          await new Promise((resolve) => {
            img.onload = resolve;
            img.onerror = (e) => {
              console.warn("Failed to load logo image for PDF, skipping.", e);
              resolve(null);
            };
          });
  
          if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
            const imgWidth = 30;
            const imgHeight = (img.height * imgWidth) / img.width;
            doc.addImage(img, 'JPEG', 10, yOffset, imgWidth, imgHeight);
            yOffset += imgHeight + 5;
          }
        } catch (logoError) {
          console.error("Error adding logo to PDF:", logoError);
        }
      }
  
      // --- Clinic Info (Centered) ---
      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(CLINIC_NAME, 105, yOffset, { align: 'center' });
      yOffset += 8;
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.text(CLINIC_ADDRESS, 105, yOffset, { align: 'center' });
      yOffset += 5;
      doc.text(`Phone: ${CLINIC_PHONE} | Email: ${CLINIC_EMAIL}`, 105, yOffset, { align: 'center' });
      yOffset += 15;
  
      // --- Patient Information Section ---
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Patient Information", 15, yOffset);
      yOffset += 8;
  
      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      const patientInfo = [
        `Name: ${record.name}`,
        `Age: ${record.age || "N/A"}`,
        `Gender: ${record.gender || "N/A"}`,
        `Phone Number: ${record.phoneNumber || "N/A"}`,
        `Alternate Phone: ${record.alternatePhoneNumber || "N/A"}`,
        `Emergency Contact: ${record.emergencyContactName} (${record.emergencyContactRelation}) - ${record.emergencyContactNumber || "N/A"}`,
        `Email: ${record.email || "N/A"}`,
        `Address: ${record.address.street}, ${record.address.city}, ${record.address.state} ${record.address.postalCode}`,
      ];
  
      patientInfo.forEach(info => {
        if (yOffset > 280) {
          doc.addPage();
          yOffset = 20;
        }
        doc.text(info, 15, yOffset);
        yOffset += 7;
      });
  
      yOffset += 10;
  
      // --- Notes Section ---
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Patient Notes", 15, yOffset);
      yOffset += 8;
  
      if (sortedNotes.length === 0) {
        doc.setFontSize(11);
        doc.setFont("helvetica", "italic");
        doc.text("No notes available for this patient.", 15, yOffset);
      } else {
        doc.setFont("helvetica", "normal");
        for (const note of sortedNotes) {
          if (yOffset > 270) {
            doc.addPage();
            yOffset = 20;
            doc.setFontSize(14);
            doc.setFont("helvetica", "bold");
            doc.text("Patient Notes (continued)", 15, yOffset);
            yOffset += 8;
            doc.setFont("helvetica", "normal");
          }
  
          doc.setFontSize(12);
          doc.setFont("helvetica", "bold");
          doc.text(`Date: ${new Date(note.noteDate).toLocaleDateString()}`, 15, yOffset);
          yOffset += 7;
          doc.setFontSize(11);
          doc.setFont("helvetica", "normal");
  
          const noteFields = [
            { label: "History", value: note.history },
            { label: "Medications", value: note.medications },
            { label: "On Observation", value: note.onObservation },
            { label: "On Palpation", value: note.onPalpation },
            { label: "Pain Assessment (NPRS)", value: note.painAssessmentNPRS },
            { label: "MMT", value: note.mmt },
            { label: "Treatment", value: note.treatment },
            { label: "Additional Notes", value: note.additionalNotes && note.additionalNotes.length > 0 ? note.additionalNotes.join("\n- ") : undefined },
          ];
  
          for (const field of noteFields) {
            if (field.value) {
              let text = `${field.label}: ${field.value}`;
              if (field.label === "Additional Notes" && note.additionalNotes && note.additionalNotes.length > 0) {
                text = `${field.label}:\n- ` + note.additionalNotes.join("\n- ");
              }
              const splitText = doc.splitTextToSize(text, 180);
              if (yOffset + (splitText.length * 6) > 285) {
                doc.addPage();
                yOffset = 20;
              }
              doc.text(splitText, 18, yOffset);
              yOffset += (splitText.length * 6) + 2;
            }
          }
  
          // --- Images Section ---
          if (note.images && note.images.length > 0) {
            if (yOffset > 270) {
              doc.addPage();
              yOffset = 20;
            }
            doc.setFontSize(11);
            doc.setFont("helvetica", "bold");
            doc.text("Attached Images:", 18, yOffset);
            yOffset += 5;
            doc.setFont("helvetica", "normal");
  
            for (const imgBase64 of note.images) {
              const img = new Image() as HTMLImageElement;
              img.src = imgBase64;
              await new Promise((resolve) => {
                img.onload = resolve;
                img.onerror = (e) => {
                  console.warn("Failed to load image for PDF, skipping.", e);
                  resolve(null);
                };
              });
  
              if (img.complete && img.naturalWidth > 0 && img.naturalHeight > 0) {
                const imgWidth = 80;
                const imgHeight = (img.height * imgWidth) / img.width;
  
                if (yOffset + imgHeight + 10 > 285) {
                  doc.addPage();
                  yOffset = 20;
                }
                doc.addImage(imgBase64, 'PNG', 25, yOffset, imgWidth, imgHeight);
                yOffset += imgHeight + 5;
              }
            }
          }
          yOffset += 8;
        }
      }
  
      // --- Footer: Page Number ---
      const pageCount = doc.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width - 20, doc.internal.pageSize.height - 10, { align: 'right' });
      }
  
      doc.save(`Patient_Report_${record.name.replace(/\s/g, "_")}.pdf`);
      notify("PDF report generated successfully", { type: "success" });
    } catch (error) {
      console.error("Error generating PDF:", error);
      notify("Failed to generate PDF report", { type: "error" });
    } finally {
      setPdfLoading(false);
    }
  };
  


  if (!record) return <Typography m={3}>Loading patient data...</Typography>;

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Patient Details & Notes for {record.name}
      </Typography>

      {/* Download PDF Button */}
      <Box mb={3}>
        <Button
          variant="contained"
          color="secondary"
          startIcon={pdfLoading ? <CircularProgress size={20} color="inherit" /> : <PictureAsPdfIcon />}
          onClick={handleDownloadPdf}
          disabled={pdfLoading || !record}
        >
          {pdfLoading ? "Generating PDF..." : "Download Full Report (PDF)"}
        </Button>
      </Box>

      {/* Patient Personal Information */}
      <Box mb={4} p={2} border={1} borderRadius={2} borderColor="grey.300">
        <Typography variant="h6" mb={2}>
          Personal Information
        </Typography>
        <Stack
          spacing={1}
          direction={{ xs: "column", sm: "row" }}
          flexWrap="wrap"
          useFlexGap
        >
          <Typography>
            <Typography component="span" fontWeight="bold">
              Name:
            </Typography>{" "}
            {record.name}
          </Typography>
          <Typography sx={{ ml: { sm: 3 } }}>
            <Typography component="span" fontWeight="bold">
              Age:
            </Typography>{" "}
            {record.age || "N/A"}
          </Typography>
          <Typography sx={{ ml: { sm: 3 } }}>
            <Typography component="span" fontWeight="bold">
              Sex:
            </Typography>{" "}
            {record.gender || "N/A"}
          </Typography>
          <Typography sx={{ ml: { sm: 3 } }}>
            <Typography component="span" fontWeight="bold">
              Phone No:
            </Typography>{" "}
            {record.phoneNumber || "N/A"}
          </Typography>
          <Typography sx={{ ml: { sm: 3 } }}>
            <Typography component="span" fontWeight="bold">
              Email:
            </Typography>{" "}
            {record.email || "N/A"}
          </Typography>
          <Typography sx={{ ml: { sm: 3 } }}>
            <Typography component="span" fontWeight="bold">
              Address:
            </Typography>{" "}
            {record.address.street}, {record.address.city}, {record.address.state}, {record.address.postalCode}
          </Typography>
        </Stack>
      </Box>


      {/* New Note Submission Form */}
      <Typography variant="h6" gutterBottom ref={formRef}>
        {editingNoteIndex !== null ? "Edit Note" : "Add New Note"}
      </Typography>
      <Stack
        spacing={2}
        mb={4}
        p={2}
        border={1}
        borderRadius={2}
        borderColor="grey.300"
      >
        <TextField
          label="Note Date"
          type="date"
          value={noteDate}
          onChange={(e) => setNoteDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
        />

        <TextField
          label="History"
          multiline
          rows={3}
          value={history}
          onChange={(e) => setHistory(e.target.value)}
          fullWidth
        />
        <TextField
          label="Medications"
          multiline
          rows={2}
          value={medications}
          onChange={(e) => setMedications(e.target.value)}
          fullWidth
        />
        <TextField
          label="On Observation"
          multiline
          rows={3}
          value={onObservation}
          onChange={(e) => setOnObservation(e.target.value)}
          fullWidth
        />
        <TextField
          label="On Palpation"
          multiline
          rows={3}
          value={onPalpation}
          onChange={(e) => setOnPalpation(e.target.value)}
          fullWidth
        />
        <TextField
          label="Pain Assessment (NPRS)"
          multiline
          rows={1}
          value={painAssessmentNPRS}
          onChange={(e) => setPainAssessmentNPRS(e.target.value)}
          fullWidth
        />
        <TextField
          label="MMT (Manual Muscle Testing)"
          multiline
          rows={3}
          value={mmt}
          onChange={(e) => setMmt(e.target.value)}
          fullWidth
        />

        {/* Multiple Additional Notes Input */}
        <Box>
            <Typography variant="subtitle1" fontWeight="bold">Additional Notes:</Typography>
            {additionalNotes.length > 0 && (
                <List dense disablePadding>
                    {additionalNotes.map((note, idx) => (
                        <ListItem
                            key={`add-note-${idx}`}
                            secondaryAction={
                                <IconButton edge="end" aria-label="delete" onClick={() => handleDeleteAdditionalNote(idx)} size="small">
                                    <DeleteIcon />
                                </IconButton>
                            }
                            sx={{ py: 0.5 }}
                        >
                            <ListItemIcon sx={{ minWidth: 30 }}>
                                <TextsmsIcon fontSize="small" color="action" />
                            </ListItemIcon>
                            <ListItemText primary={note} />
                        </ListItem>
                    ))}
                </List>
            )}
            <Stack direction="row" spacing={1} alignItems="center" mt={1}>
                <TextField
                    label="Add new additional note"
                    multiline
                    rows={1}
                    value={newAdditionalNoteText}
                    onChange={(e) => setNewAdditionalNoteText(e.target.value)}
                    fullWidth
                    size="small"
                />
                <Button
                    variant="contained"
                    onClick={handleAddAdditionalNote}
                    disabled={!newAdditionalNoteText.trim()}
                    startIcon={<AddCircleOutlineIcon />}
                >
                    Add
                </Button>
            </Stack>
        </Box>

        <TextField
          label="Treatment"
          multiline
          rows={4}
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
          fullWidth
        />

        {/* Display existing images if in edit mode, with delete option */}
        {existingImagesToDisplay.length > 0 && (
          <Box mt={2}>
            <Typography variant="subtitle2" fontWeight="bold" mb={1}>
              Existing Images for this Note:
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              {existingImagesToDisplay.map((img, idx) => (
                <Box
                  key={`existing-${idx}`}
                  sx={{
                    position: "relative",
                    border: "1px solid #ddd",
                    borderRadius: 1,
                    p: 0.5,
                    cursor: "pointer",
                  }}
                  onClick={() => handleImageClick(img, idx)} // Pass index here
                >
                  <img
                    src={img}
                    alt={`Existing Note-${idx}`}
                    width={100}
                    height={100}
                    style={{ borderRadius: 4, objectFit: "cover" }}
                  />
                  <IconButton
                    size="small"
                    sx={{
                      position: "absolute",
                      top: 4, // Changed from bottom to top for better visibility
                      right: 4,
                      backgroundColor: "rgba(255,0,0,0.7)", // Red background for delete
                      color: "white",
                      "&:hover": { backgroundColor: "rgba(255,0,0,0.9)" },
                    }}
                    onClick={(e) => {
                        e.stopPropagation(); // Prevent opening the large image dialog
                        const confirmDelete = window.confirm("Are you sure you want to remove this image from the note?");
                        if (confirmDelete) {
                            setExistingImagesToDisplay(prev => prev.filter((_, i) => i !== idx));
                            notify("Image removed from note edit. Save note to confirm.", { type: "info" });
                        }
                    }}
                    aria-label="remove image"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <IconButton // Download icon
                    size="small"
                    sx={{
                      position: "absolute",
                      bottom: 4,
                      right: 4,
                      backgroundColor: "rgba(0,0,0,0.6)",
                      color: "white",
                      "&:hover": { backgroundColor: "rgba(0,0,0,0.8)" },
                    }}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadImage(img, noteDate, idx); // Pass current noteDate
                    }}
                    aria-label="download image"
                  >
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" mt={1}>
              Click an image to view it larger. Use the red &apos;X&#39; to remove it from this note.
            </Typography>
          </Box>
        )}

        <Input
          type="file"
          inputProps={{ multiple: true, accept: "image/*" }}
          onChange={(e) =>
            setImages(Array.from((e.target as HTMLInputElement).files || []))
          }
          fullWidth
        />
        {images.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {images.length} new image(s) selected
          </Typography>
        )}

        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            onClick={handleNoteSubmit}
            disabled={loading}
            fullWidth
          >
            {loading
              ? editingNoteIndex !== null
                ? "Updating..."
                : "Saving..."
              : editingNoteIndex !== null
              ? "Update Note"
              : "Save Note"}
          </Button>
          {editingNoteIndex !== null && (
            <Button
              variant="outlined"
              onClick={resetFormFields}
              disabled={loading}
              fullWidth
            >
              Cancel Edit
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Previous Notes Display */}
      <Typography variant="h6">Previous Notes</Typography>

      {sortedNotes.length === 0 ? (
        <Typography mt={2}>No notes available.</Typography>
      ) : (
        <>
          <Tabs
            value={tabIndex}
            onChange={(_, newIndex) => setTabIndex(newIndex)}
            sx={{ mb: 2 }}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            {sortedNotes.map((note, index) => (
              <Tab
                key={index}
                label={new Date(note.noteDate).toLocaleDateString()}
              />
            ))}
          </Tabs>

          <Box border={1} borderRadius={2} p={2} borderColor="grey.300">
            {sortedNotes[tabIndex] && (
              <>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="center"
                  mb={1}
                >
                  <Typography variant="h6" fontWeight="bold">
                    Note for{" "}
                    {new Date(sortedNotes[tabIndex].noteDate).toDateString()}
                  </Typography>
                  <Box>
                    <IconButton
                      aria-label="edit note"
                      onClick={() => handleEditNote(tabIndex)}
                      color="primary"
                      size="small"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      aria-label="delete note"
                      onClick={() => handleDeleteClick(tabIndex)}
                      color="error"
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Stack>

                {sortedNotes[tabIndex].history && (
                  <Typography variant="body2" mb={1}>
                    <Typography component="span" fontWeight="bold">
                      History:
                    </Typography>{" "}
                    {sortedNotes[tabIndex].history}
                  </Typography>
                )}
                {sortedNotes[tabIndex].medications && (
                  <Typography variant="body2" mb={1}>
                    <Typography component="span" fontWeight="bold">
                      Medications:
                    </Typography>{" "}
                    {sortedNotes[tabIndex].medications}
                  </Typography>
                )}
                {sortedNotes[tabIndex].onObservation && (
                  <Typography variant="body2" mb={1}>
                    <Typography component="span" fontWeight="bold">
                      On Observation:
                    </Typography>{" "}
                    {sortedNotes[tabIndex].onObservation}
                  </Typography>
                )}
                {sortedNotes[tabIndex].onPalpation && (
                  <Typography variant="body2" mb={1}>
                    <Typography component="span" fontWeight="bold">
                      On Palpation:
                    </Typography>{" "}
                    {sortedNotes[tabIndex].onPalpation}
                  </Typography>
                )}
                {sortedNotes[tabIndex].painAssessmentNPRS && (
                  <Typography variant="body2" mb={1}>
                    <Typography component="span" fontWeight="bold">
                      Pain Assessment (NPRS):
                    </Typography>{" "}
                    {sortedNotes[tabIndex].painAssessmentNPRS}
                  </Typography>
                )}
                {sortedNotes[tabIndex].mmt && (
                  <Typography variant="body2" mb={1}>
                    <Typography component="span" fontWeight="bold">
                      MMT:
                    </Typography>{" "}
                    {sortedNotes[tabIndex].mmt}
                  </Typography>
                )}

                {/* Display Multiple Additional Notes */}
                {sortedNotes[tabIndex].additionalNotes &&
                  sortedNotes[tabIndex].additionalNotes.length > 0 && (
                    <Box mb={1}>
                        <Typography component="span" fontWeight="bold">
                            Additional Notes:
                        </Typography>{" "}
                        <List dense disablePadding>
                            {sortedNotes[tabIndex].additionalNotes?.map((note, idx) => (
                                <ListItem key={`display-add-note-${idx}`} sx={{ py: 0.2 }}>
                                    <ListItemIcon sx={{ minWidth: 30 }}>
                                        <TextsmsIcon fontSize="small" color="action" />
                                    </ListItemIcon>
                                    <ListItemText primary={note} />
                                </ListItem>
                            ))}
                        </List>
                    </Box>
                )}

                {sortedNotes[tabIndex].treatment && (
                  <Typography variant="body2" mb={1}>
                    <Typography component="span" fontWeight="bold">
                      Treatment:
                    </Typography>{" "}
                    {sortedNotes[tabIndex].treatment}
                  </Typography>
                )}


                {/* Display Images with Download Option */}
                {sortedNotes[tabIndex].images &&
                  sortedNotes[tabIndex].images.length > 0 && (
                    <Box mt={2}>
                      <Typography variant="subtitle2" fontWeight="bold" mb={1}>
                        Attached Images:
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap">
                        {sortedNotes[tabIndex].images.map((img, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              position: "relative",
                              border: "1px solid #ddd",
                              borderRadius: 1,
                              p: 0.5,
                              cursor: "pointer",
                            }}
                            onClick={() => handleImageClick(img, null)} // No delete for displayed notes here
                          >
                            <img
                              src={img}
                              alt={`Note-${idx}`}
                              width={120}
                              height={120}
                              style={{ borderRadius: 4, objectFit: "cover" }}
                            />
                            <IconButton
                              size="small"
                              sx={{
                                position: "absolute",
                                bottom: 4,
                                right: 4,
                                backgroundColor: "rgba(0,0,0,0.6)",
                                color: "white",
                                "&:hover": {
                                  backgroundColor: "rgba(0,0,0,0.8)",
                                },
                              }}
                              onClick={(e) => {
                                  e.stopPropagation();
                                  handleDownloadImage(img, sortedNotes[tabIndex].noteDate, idx);
                              }}
                              aria-label="download image"
                            >
                              <FileDownloadIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Stack>
                      <Typography variant="caption" color="text.secondary" mt={1}>
                        Click an image to view it larger.
                      </Typography>
                    </Box>
                  )}
              </>
            )}
          </Box>
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={openDeleteDialog}
        onClose={handleDeleteDialogClose}
        aria-labelledby="alert-dialog-title"
        aria-describedby="alert-dialog-description"
      >
        <DialogTitle id="alert-dialog-title">{"Confirm Deletion"}</DialogTitle>
        <DialogContent>
          <DialogContentText id="alert-dialog-description">
            Are you sure you want to delete this note? This action cannot be undone.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={handleDeleteDialogClose} autoFocus>
            Cancel
          </Button>
          <Button onClick={handleDeleteNoteConfirm} color="error">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Image Viewer Dialog (with delete option for editing images) */}
      <Dialog
        open={openImageDialog}
        onClose={handleImageDialogClose}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'flex-end', p: 1 }}>
          <IconButton onClick={handleImageDialogClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent sx={{ p: 0, display: 'flex', justifyContent: 'center', alignItems: 'center', overflow: 'hidden' }}>
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Full-size Note Image"
              style={{ maxWidth: '100%', height: 'auto' }}
            />
          )}
        </DialogContent>
        <DialogActions>
            {selectedImage && (
                <Button onClick={() => handleDownloadImage(selectedImage, noteDate, selectedImageIndex ?? 0)} startIcon={<FileDownloadIcon />}>
                    Download
                </Button>
            )}
            {selectedImageIndex !== null && editingNoteIndex !== null && ( // Only show delete if in edit mode and image is from existingImagesToDisplay
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

export default PatientNotes;