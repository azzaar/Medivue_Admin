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
  TextareaAutosize,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import CloseIcon from "@mui/icons-material/Close";
import PictureAsPdfIcon from "@mui/icons-material/PictureAsPdf";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import TextsmsIcon from "@mui/icons-material/Textsms"; // Icon for additional notes

// PDF Generation Imports
import jsPDF from "jspdf";

// Define the structure for each patient note
interface MMTAction {
  action: string;
  grade: string;
}

interface MMT {
  joint: string;
  actions: MMTAction[];
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
  mmt: MMT[]; // This is the array of joints and actions
  treatment?: string;
  additionalNotes?: AdditionalNote[];
  images: string[];
}
interface AdditionalNote {
  heading: string;
  description: string;
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
  };
  email?: string;
  occupation?: string;
  chiefComplaint?: string;
  address: {
    // Added address details as per backend schema
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
  notes: Note[];
  [key: string]: unknown;
}

const CLINIC_NAME = "Medivue Health and Wellness Pvt Ltd";
const CLINIC_ADDRESS =
  "Ward 21, No 98, Vettiyara P.O, Navaikulam, Thiruvananthapuram, Kerala - 695603";
const CLINIC_PHONE = "+91 8089180303";
const CLINIC_EMAIL = "info@medivue.life";

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
  const [mmt, setMmt] = useState<MMT[]>([]); // MMT updated to an array of objects
  const [treatment, setTreatment] = useState("");
  const [additionalNotes, setAdditionalNotes] = useState<AdditionalNote[]>([]);
  const [newNoteHeading, setNewNoteHeading] = useState("");
  const [newNoteDescription, setNewNoteDescription] = useState("");
  const [chiefComplaint, setChiefComplaint] = useState("");
  const [onExamination, setOnExamination] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [existingImagesToDisplay, setExistingImagesToDisplay] = useState<
    string[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null);
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [noteToDeleteIndex, setNoteToDeleteIndex] = useState<number | null>(
    null
  );
  const [openImageDialog, setOpenImageDialog] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(
    null
  ); // To help with deleting
  const [gradesSelection, setGradesSelection] = useState<{
    [key: string]: string;
  }>({});

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
          (a, b) =>
            new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
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
    setChiefComplaint("");
    setOnExamination("");
    setMmt([]); // Reset MMT to an empty array
    setTreatment("");
    setAdditionalNotes([]); // Reset array
    setNewNoteHeading("");
    setNewNoteDescription("");
    setImages([]);
    setExistingImagesToDisplay([]);
    setEditingNoteIndex(null);
    setGradesSelection({}); // Reset grades selection
  };

  const handleAddAdditionalNote = () => {
    setAdditionalNotes([
      ...additionalNotes,
      {
        heading: newNoteHeading.trim(),
        description: newNoteDescription.trim(),
      },
    ]);
    setNewNoteHeading("");
    setNewNoteDescription("");
  };

  const handleDeleteAdditionalNote = (indexToDelete: number) => {
    setAdditionalNotes(
      additionalNotes.filter((_, idx) => idx !== indexToDelete)
    );
  };

  const handleGradeChange = (joint: string, action: string, grade: string) => {
    // First, update the grades selection map (if you're storing grades outside mmt state)
    const jointActionKey = `${joint}-${action}`;
    setGradesSelection((prev) => ({
      ...prev,
      [jointActionKey]: grade, // Store the grade for this joint-action pair
    }));

    const updatedMmt = [...mmt];

    // Find if joint already exists in the mmt state
    const jointIndex = updatedMmt.findIndex((item) => item.joint === joint);

    if (jointIndex > -1) {
      // Joint exists, update the action and grade
      const actionIndex = updatedMmt[jointIndex].actions.findIndex(
        (item) => item.action === action
      );

      if (actionIndex > -1) {
        // Action exists, update its grade
        updatedMmt[jointIndex].actions[actionIndex].grade = grade;
      } else {
        // Action doesn't exist, add it
        updatedMmt[jointIndex].actions.push({ action, grade });
      }
    } else {
      // Joint doesn't exist, add a new joint with actions
      updatedMmt.push({
        joint,
        actions: [{ action, grade }],
      });
    }

    setMmt(updatedMmt);
  };

  const handleNoteSubmit = async () => {
    if (
      !history.trim() &&
      !chiefComplaint.trim() &&
      !onExamination.trim() &&
      !medications.trim() &&
      !onObservation.trim() &&
      !onPalpation.trim() &&
      !painAssessmentNPRS.trim() &&
      mmt.length === 0 &&
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
      chiefComplaint: chiefComplaint.trim() || undefined,
      onExamination: onExamination.trim() || undefined,
      medications: medications.trim() || undefined,
      onObservation: onObservation.trim() || undefined,
      onPalpation: onPalpation.trim() || undefined,
      painAssessmentNPRS: painAssessmentNPRS.trim() || undefined,
      mmt, // Using the updated mmt structure
      treatment: typeof treatment === "string" ? treatment.trim() : undefined, // Ensure treatment is a string
      additionalNotes:
        additionalNotes.length > 0
          ? additionalNotes.map(({ heading, description }) => ({
              heading: heading.trim(),
              description: description.trim(),
            }))
          : undefined,
      images: allImages,
    };

    if (!record) return;

    setLoading(true);
    try {
      let updatedNotes: Note[];

      if (editingNoteIndex !== null) {
        updatedNotes = [...record.notes];
        // Find the index of the note to update
        const originalIndex = record.notes.findIndex(
          (note) =>
            note.noteDate === sortedNotes[editingNoteIndex].noteDate &&
            note.history === sortedNotes[editingNoteIndex].history // Ensure you're updating the correct note
        );

        if (originalIndex !== -1) {
          // Replace the old note with the updated one
          updatedNotes[originalIndex] = updatedOrNewNote;
        } else {
          console.warn(
            "Original note not found for update, appending instead."
          );
          updatedNotes.push(updatedOrNewNote); // In case of an unexpected condition, append the new note
        }
      } else {
        // If not editing, just append the new note
        updatedNotes = [...(record.notes || []), updatedOrNewNote];
      }

      await dataProvider.update("patients", {
        id,
        data: {
          notes: updatedNotes, // Send the updated notes array
        },
        previousData: record,
      });

      notify(
        editingNoteIndex !== null
          ? "Note updated successfully"
          : "Note added successfully",
        { type: "success" }
      );

      resetFormFields();

      // Refresh the record after the update
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

  const handleDownloadImage = (
    base64String: string,
    noteDate: string,
    imgIndex: number
  ) => {
    const mimeTypeMatch = base64String.match(/^data:(.*?);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png";
    const extension = mimeType.split("/")[1] || "png";

    const link = document.createElement("a");
    link.href = base64String;
    link.download = `patient_image_${record?.name.replace(
      /\s/g,
      "_"
    )}_${noteDate}_${imgIndex}.${extension}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleEditNote = (index: number) => {
    const noteToEdit = sortedNotes[index];
    setEditingNoteIndex(index);
    setNoteDate(noteToEdit.noteDate);
    setHistory(noteToEdit.history || "");
    setChiefComplaint(noteToEdit.chiefComplaint || "");
    setOnExamination(noteToEdit.onExamination || "");
    setMedications(noteToEdit.medications || "");
    setOnObservation(noteToEdit.onObservation || "");
    setOnPalpation(noteToEdit.onPalpation || "");
    setPainAssessmentNPRS(noteToEdit.painAssessmentNPRS || "");
    setMmt(
      Array.isArray(noteToEdit.mmt)
        ? noteToEdit.mmt.map((joint) => ({
            joint: joint.joint,
            actions: joint.actions.map((action) => ({
              action: action.action,
              grade: action.grade,
            })),
          }))
        : []
    );
    const initialGradesSelection: { [key: string]: string } = {};
    noteToEdit.mmt.forEach((joint) => {
      joint.actions.forEach((action) => {
        const jointActionKey = `${joint.joint}-${action.action}`;
        initialGradesSelection[jointActionKey] = action.grade;
      });
    });
    setGradesSelection(initialGradesSelection);
    setTreatment(noteToEdit.treatment || "");
    setAdditionalNotes(noteToEdit.additionalNotes || []); // Set the array
    setNewNoteHeading("");
    setNewNoteDescription("");
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
        console.warn(
          "Note to delete not found in original array. Cannot delete."
        );
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
      const updatedImages = existingImagesToDisplay.filter(
        (_, idx) => idx !== selectedImageIndex
      );
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
    const doc = new jsPDF("p", "mm", "a4");
    let yOffset = 10;

    // —————————————————————————
    // Clinic Header (logo + name/address)
    // —————————————————————————
    if (YOUR_LOGO_PATH) {
      const img = new Image();
      img.src = YOUR_LOGO_PATH;
      await new Promise((res) => {
        img.onload = res;
        img.onerror = () => {
          console.warn("Logo load failed, skipping.");
          res(null);
        };
      });
      if (img.complete && img.naturalWidth) {
        const w = 30;
        const h = (img.height * w) / img.width;
        doc.addImage(img, "JPEG", 10, yOffset, w, h);
        yOffset += h + 5;
      }
    }
    doc.setFontSize(18).setFont("helvetica", "bold");
    doc.text(CLINIC_NAME, 105, yOffset, { align: "center" });
    yOffset += 8;
    doc.setFontSize(10).setFont("helvetica", "normal");
    doc.text(CLINIC_ADDRESS, 105, yOffset, { align: "center" });
    yOffset += 5;
    doc.text(`Phone: ${CLINIC_PHONE} | Email: ${CLINIC_EMAIL}`, 105, yOffset, {
      align: "center",
    });
    yOffset += 15;

    // —————————————————————————
    // Patient Information
    // —————————————————————————
    doc.setFontSize(14).setFont("helvetica", "bold");
    doc.text("Patient Information", 15, yOffset);
    yOffset += 8;
    doc.setFontSize(11).setFont("helvetica", "normal");

    const patientInfo = [
      `Name: ${record.name}`,
      `Age: ${record.age ?? "N/A"}`,
      `Gender: ${record.gender ?? "N/A"}`,
      `Phone: ${record.phoneNumber ?? "N/A"}`,
      `Alternate Phone: ${record.alternatePhoneNumber ?? "N/A"}`,
      `Email: ${record.email ?? "N/A"}`,
      `Address: ${
        record.address
          ? `${record.address.street}, ${record.address.city}, ${record.address.state} ${record.address.postalCode}`
          : "N/A"
      }`,
    ];
    for (const line of patientInfo) {
      if (yOffset > 280) {
        doc.addPage();
        yOffset = 20;
      }
      doc.text(line, 15, yOffset);
      yOffset += 7;
    }

    // —————————————————————————
    // Notes Section Title
    // —————————————————————————
    yOffset += 10;
    doc.setFontSize(14).setFont("helvetica", "bold");
    doc.text("Patient Notes", 15, yOffset);
    yOffset += 8;

    if (sortedNotes.length === 0) {
      doc.setFontSize(11).setFont("helvetica", "italic");
      doc.text("No notes available for this patient.", 15, yOffset);
      yOffset += 7;
    } else {
      for (const note of sortedNotes) {
        // new page if we're too low
        if (yOffset > 270) {
          doc.addPage();
          yOffset = 20;
        }

        // — Date heading —
        doc.setFontSize(12).setFont("helvetica", "bold");
        doc.text(
          `Date: ${new Date(note.noteDate).toLocaleDateString()}`,
          15,
          yOffset
        );
        yOffset += 7;
        doc.setFontSize(11).setFont("helvetica", "normal");

        // — Build an array of all fields —
        const noteFields: { label: string; value?: string }[] = [
          { label: "Chief Complaint", value: note.chiefComplaint },
          { label: "On Examination", value: note.onExamination },
          { label: "History", value: note.history },
          { label: "Medications", value: note.medications },
          { label: "On Observation", value: note.onObservation },
          { label: "On Palpation", value: note.onPalpation },
          { label: "Pain Assessment (NPRS)", value: note.painAssessmentNPRS },
          {
            label: "MMT",
            value:
              note.mmt && note.mmt.length > 0
                ? note.mmt
                    .map(
                      (j) =>
                        `${j.joint}: ${j.actions
                          .map((a) => `${a.action} ${a.grade}`)
                          .join(" | ")}`
                    )
                    .join("\n")
                : undefined,
          },
          { label: "Treatment", value: note.treatment },
          {
            label: "Additional Notes",
            value:
              note.additionalNotes && note.additionalNotes.length > 0
                ? note.additionalNotes
                    .map((an) => `${an.heading}: ${an.description}`)
                    .join("\n")
                : undefined,
          },
        ];

        // — Loop & render each field —
        for (const field of noteFields) {
          if (!field.value) continue;
          const textBlock = doc.splitTextToSize(
            `${field.label}: ${field.value}`,
            180
          );
          if (yOffset + textBlock.length * 6 > 285) {
            doc.addPage();
            yOffset = 20;
          }
          doc.text(textBlock, 15, yOffset);
          yOffset += textBlock.length * 6 + 2;
        }

        yOffset += 8;
      }
    }

    // —————————————————————————
    // Footer: page numbers
    // —————————————————————————
    const pageCount = doc.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i)
        .setFontSize(8)
        .text(
          `Page ${i} of ${pageCount}`,
          doc.internal.pageSize.width - 20,
          doc.internal.pageSize.height - 10,
          { align: "right" }
        );
    }

    // — Save & finish —
    doc.save(`Patient_Report_${record.name.replace(/\s/g, "_")}.pdf`);
    notify("PDF report generated successfully", { type: "success" });
  } catch (err) {
    console.error("PDF generation error:", err);
    notify("Failed to generate PDF report", { type: "error" });
  } finally {
    setPdfLoading(false);
  }
};


  const mmtActions = [
    {
      joint: "Shoulder",
      actions: [
        "Flexion",
        "Extension",
        "Abduction",
        "Adduction",
        "Internal Rotation",
        "External Rotation",
      ],
    },
    {
      joint: "Elbow",
      actions: ["Flexion", "Extension"],
    },
    {
      joint: "Wrist",
      actions: ["Flexion", "Extension", "Radial Deviation", "Ulnar Deviation"],
    },
    {
      joint: "Hip",
      actions: [
        "Flexion",
        "Abduction",
        "Adduction",
        "Internal Rotation",
        "External Rotation",
      ],
    },
    {
      joint: "Knee",
      actions: ["Flexion", "Extension"],
    },
    {
      joint: "Ankle",
      actions: ["Plantarflexion", "Dorsiflexion"],
    },
    {
      joint: "Foot",
      actions: ["Inversion", "Eversion"],
    },
  ];

const grades = [
  "-2", "-1+", "-1",
  "0", "0+",
  "1", "1+",
  "2", "2+",
  "3", "3+",
  "4", "4+",
  "5"
];  if (!record) return <Typography m={3}>Loading patient data...</Typography>;

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
          startIcon={
            pdfLoading ? (
              <CircularProgress size={20} color="inherit" />
            ) : (
              <PictureAsPdfIcon />
            )
          }
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
            {record.address
              ? `${record.address.street}, ${record.address.city}, ${record.address.state} ${record.address.postalCode}`
              : "N/A"}
          </Typography>
        </Stack>
      </Box>

      <Typography variant="h6" gutterBottom ref={formRef}>
        {editingNoteIndex !== null ? "Edit Note" : "Add New Note"}
      </Typography>

      <Stack
        spacing={3}
        mb={4}
        p={3}
        border={1}
        borderRadius={2}
        borderColor="grey.300"
        boxShadow={2} // Adding shadow for depth
        sx={{ backgroundColor: "background.paper" }} // Light background for the form container
      >
        <TextField
          label="Note Date"
          type="date"
          value={noteDate}
          onChange={(e) => setNoteDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
          fullWidth
          sx={{ borderRadius: 1 }} // Rounded corners
        />
        <TextareaAutosize
          minRows={2}
          placeholder="Chief Complaint"
          value={chiefComplaint}
          onChange={(e) => setChiefComplaint(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "16px",
          }}
        />

        {/* On Examination */}
        <TextareaAutosize
          minRows={3}
          placeholder="On Examination"
          value={onExamination}
          onChange={(e) => setOnExamination(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "16px",
          }}
        />

        <TextareaAutosize
          minRows={3}
          placeholder="History"
          value={history}
          onChange={(e) => setHistory(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "16px",
          }}
        />

        <TextareaAutosize
          minRows={2}
          placeholder="Medications"
          value={medications}
          onChange={(e) => setMedications(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "16px",
          }}
        />

        <TextareaAutosize
          minRows={3}
          placeholder="On Observation"
          value={onObservation}
          onChange={(e) => setOnObservation(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "16px",
          }}
        />

        <TextareaAutosize
          minRows={3}
          placeholder="On Palpation"
          value={onPalpation}
          onChange={(e) => setOnPalpation(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "16px",
          }}
        />

        <TextareaAutosize
          minRows={1}
          placeholder="Pain Assessment (NPRS)"
          value={painAssessmentNPRS}
          onChange={(e) => setPainAssessmentNPRS(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "16px",
          }}
        />

        <Box mb={3}>
          <Typography variant="h6" fontWeight="bold">
            MMT (Manual Muscle Testing)
          </Typography>
          {mmtActions.map((jointGroup) => (
            <Box key={jointGroup.joint} my={3}>
              <Typography variant="h6" fontWeight="bold">
                {jointGroup.joint}
              </Typography>
              <Stack direction="row" flexWrap="wrap" spacing={3}>
                {jointGroup.actions.map((action) => (
                  <Box
                    key={action}
                    display="flex"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{
                      width: "220px",
                      marginBottom: "10px",
                      padding: "10px",
                      border: "1px solid #ddd",
                      borderRadius: "8px",
                      backgroundColor: "#f5f5f5",
                    }}
                  >
                    <Typography variant="body1" sx={{ flex: 1 }}>
                      {action}
                    </Typography>
                    <FormControl sx={{ width: "80px" }}>
                      <InputLabel>Grade</InputLabel>
                      <Select
                        value={
                          gradesSelection[`${jointGroup.joint}-${action}`] || ""
                        }
                        onChange={(e) =>
                          handleGradeChange(
                            jointGroup.joint,
                            action,
                            e.target.value
                          )
                        }
                        label="Grade"
                        sx={{ backgroundColor: "#fff", borderRadius: "5px" }}
                      >
                        {grades.map((grade) => (
                          <MenuItem key={grade} value={grade}>
                            {grade}
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

        {/* Additional Notes Section */}
        <Box>
          <Typography variant="h6" fontWeight="bold">
            Additional Notes
          </Typography>

          {additionalNotes.length > 0 && (
            <List dense disablePadding>
              {additionalNotes.map((note, idx) => (
                <ListItem
                  key={`add-note-${idx}`}
                  secondaryAction={
                    <IconButton
                      edge="end"
                      aria-label="delete"
                      onClick={() => handleDeleteAdditionalNote(idx)}
                      size="small"
                    >
                      <DeleteIcon />
                    </IconButton>
                  }
                  sx={{ py: 0.5 }}
                >
                  <ListItemIcon sx={{ minWidth: 30 }}>
                    <TextsmsIcon fontSize="small" color="action" />
                  </ListItemIcon>
                  <ListItemText
                    primary={
                      <Typography fontWeight="bold">{note.heading}</Typography>
                    }
                    secondary={note.description}
                  />
                </ListItem>
              ))}
            </List>
          )}

          <Stack direction="column" spacing={1} mt={2}>
            <TextField
              label="Heading"
              value={newNoteHeading}
              onChange={(e) => setNewNoteHeading(e.target.value)}
              fullWidth
              size="small"
            />
            <TextField
              label="Description"
              multiline
              rows={2}
              value={newNoteDescription}
              onChange={(e) => setNewNoteDescription(e.target.value)}
              fullWidth
              size="small"
            />
            <Button
              variant="contained"
              onClick={handleAddAdditionalNote}
              disabled={!newNoteHeading.trim() || !newNoteDescription.trim()}
              startIcon={<AddCircleOutlineIcon />}
              sx={{ alignSelf: "flex-end", px: 3 }}
            >
              Add Note
            </Button>
          </Stack>
        </Box>

        <TextareaAutosize
          minRows={4}
          placeholder="Treatment"
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
          style={{
            width: "100%",
            padding: "10px",
            border: "1px solid #ddd",
            borderRadius: "8px",
            fontSize: "16px",
          }}
        />

        {/* Existing Images */}
        {existingImagesToDisplay.length > 0 && (
          <Box mt={2}>
            <Typography variant="h6" fontWeight="bold" mb={1}>
              Existing Images for this Note:
            </Typography>
            <Stack direction="row" spacing={2} flexWrap="wrap">
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
                  onClick={() => handleImageClick(img, idx)}
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
                      top: 4,
                      right: 4,
                      backgroundColor: "rgba(255,0,0,0.7)",
                      color: "white",
                      "&:hover": { backgroundColor: "rgba(255,0,0,0.9)" },
                    }}
                    onClick={(e) => {
                      e.stopPropagation();
                      const confirmDelete = window.confirm(
                        "Are you sure you want to remove this image from the note?"
                      );
                      if (confirmDelete) {
                        setExistingImagesToDisplay((prev) =>
                          prev.filter((_, i) => i !== idx)
                        );
                        notify(
                          "Image removed from note edit. Save note to confirm.",
                          { type: "info" }
                        );
                      }
                    }}
                    aria-label="remove image"
                  >
                    <DeleteIcon fontSize="small" />
                  </IconButton>
                  <IconButton
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
                      handleDownloadImage(img, noteDate, idx);
                    }}
                    aria-label="download image"
                  >
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" mt={1}>
              Click an image to view it larger. Use the red &apos;X&apos; to
              remove it from this note.
            </Typography>
          </Box>
        )}

        {/* Image Upload */}
        <Input
          type="file"
          inputProps={{ multiple: true, accept: "image/*" }}
          onChange={(e) =>
            setImages(Array.from((e.target as HTMLInputElement).files || []))
          }
          fullWidth
          sx={{ borderRadius: 1 }}
        />
        {images.length > 0 && (
          <Typography variant="caption" color="text.secondary">
            {images.length} new image(s) selected
          </Typography>
        )}

        {/* Buttons */}
        <Stack direction="row" spacing={2}>
          <Button
            variant="contained"
            onClick={handleNoteSubmit}
            disabled={loading}
            fullWidth
            sx={{ borderRadius: 1 }}
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
              sx={{ borderRadius: 1 }}
            >
              Cancel Edit
            </Button>
          )}
        </Stack>
      </Stack>

      {/* Previous Notes Display */}
      <Typography variant="h6" gutterBottom>
        Previous Notes
      </Typography>

      {sortedNotes.length === 0 ? (
        <Typography mt={2} style={{ whiteSpace: "pre-line" }}>
          No notes available.
        </Typography>
      ) : (
        <>
          <Tabs
            value={tabIndex}
            onChange={(_, newIndex) => setTabIndex(newIndex)}
            sx={{
              mb: 2,
              "& .MuiTabs-indicator": { backgroundColor: "#16669f" },
            }}
            variant="scrollable"
            scrollButtons="auto"
            allowScrollButtonsMobile
          >
            {sortedNotes.map((note, index) => (
              <Tab
                key={index}
                label={new Date(note.noteDate).toLocaleDateString()}
                sx={{
                  fontWeight: "bold",
                  fontSize: 14,
                  "&.Mui-selected": {
                    color: "#16669f",
                    backgroundColor: "#f0f0f0",
                  },
                  "&:hover": { backgroundColor: "#e8e8e8" },
                }}
              />
            ))}
          </Tabs>

          <Box border={1} borderRadius={2} p={2} borderColor="grey.300">
            {sortedNotes[tabIndex] && (
              <Stack direction="column" spacing={2} alignItems="flex-start">
                <Typography
                  variant="h6"
                  fontWeight="bold"
                  color="primary"
                  style={{ whiteSpace: "pre-line" }}
                >
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
                {/* Chief Complaint */}
                {sortedNotes[tabIndex].chiefComplaint && (
                  <Box sx={{ whiteSpace: "pre-line", mt: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>Chief Complaint:</strong>{" "}
                      {sortedNotes[tabIndex].chiefComplaint}
                    </Typography>
                  </Box>
                )}

                {/* On Examination */}
                {sortedNotes[tabIndex]?.onExamination && (
                  <Box sx={{ whiteSpace: "pre-line", mt: 1 }}>
                    <Typography variant="body2" color="textSecondary">
                      <strong>On Examination:</strong>{" "}
                      {sortedNotes[tabIndex].onExamination}
                    </Typography>
                  </Box>
                )}
                {sortedNotes[tabIndex].history && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    <strong>History:</strong> {sortedNotes[tabIndex].history}
                  </Typography>
                )}
                {sortedNotes[tabIndex].medications && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    <strong>Medications:</strong>{" "}
                    {sortedNotes[tabIndex].medications}
                  </Typography>
                )}
                {sortedNotes[tabIndex].onObservation && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    <strong>On Observation:</strong>{" "}
                    {sortedNotes[tabIndex].onObservation}
                  </Typography>
                )}
                {sortedNotes[tabIndex].onPalpation && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    <strong>On Palpation:</strong>{" "}
                    {sortedNotes[tabIndex].onPalpation}
                  </Typography>
                )}
                {sortedNotes[tabIndex].painAssessmentNPRS && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    <strong>Pain Assessment (NPRS):</strong>{" "}
                    {sortedNotes[tabIndex].painAssessmentNPRS}
                  </Typography>
                )}
                {sortedNotes[tabIndex].mmt && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    <strong>MMT:</strong>{" "}
                    {sortedNotes[tabIndex]?.mmt &&
                    sortedNotes[tabIndex]?.mmt.length > 0
                      ? sortedNotes[tabIndex].mmt.map((joint) => (
                          <Box key={joint.joint} mb={2}>
                            <Typography variant="h6" fontWeight="bold">
                              {joint.joint}
                            </Typography>
                            <Typography variant="body2" color="textSecondary">
                              {joint.actions
                                .map(
                                  (action) =>
                                    `${action.action}: ${action.grade}` // Join action and grade
                                )
                                .join(" | ")}
                            </Typography>
                          </Box>
                        ))
                      : "N/A"}
                  </Typography>
                )}

                {sortedNotes[tabIndex].treatment && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    style={{ whiteSpace: "pre-line" }}
                  >
                    <strong>Treatment:</strong>{" "}
                    {sortedNotes[tabIndex].treatment}
                  </Typography>
                )}
                {(sortedNotes[tabIndex]?.additionalNotes ?? []).length > 0 && (
                  <Box sx={{ whiteSpace: "pre-line", mt: 2 }}>
                    <Typography
                      variant="body2"
                      color="textSecondary"
                      gutterBottom
                    >
                      <strong>Additional Notes:</strong>
                    </Typography>
                    <List dense disablePadding>
                      {sortedNotes[tabIndex]!.additionalNotes!.map(
                        (note, idx) => (
                          <ListItem
                            key={`display-add-note-${idx}`}
                            sx={{ py: 0.5 }}
                          >
                            <ListItemIcon sx={{ minWidth: 30 }}>
                              <TextsmsIcon fontSize="small" color="action" />
                            </ListItemIcon>
                            <ListItemText
                              primary={
                                <Typography fontWeight="bold">
                                  {note.heading}
                                </Typography>
                              }
                              secondary={note.description}
                            />
                          </ListItem>
                        )
                      )}
                    </List>
                  </Box>
                )}

                {sortedNotes[tabIndex].images &&
                  sortedNotes[tabIndex].images.length > 0 && (
                    <Box>
                      <Typography
                        variant="body2"
                        color="textSecondary"
                        style={{ whiteSpace: "pre-line" }}
                      >
                        <strong>Attached Images:</strong>
                      </Typography>
                      <Stack direction="row" spacing={2} flexWrap="wrap">
                        {sortedNotes[tabIndex].images.map((img, idx) => (
                          <Box
                            key={idx}
                            sx={{
                              position: "relative",
                              width: 100,
                              height: 100,
                            }}
                          >
                            <img
                              src={img}
                              alt={`Note-${idx}`}
                              style={{
                                width: "100%",
                                height: "100%",
                                objectFit: "cover",
                                borderRadius: "8px",
                              }}
                            />
                            <IconButton
                              size="small"
                              sx={{
                                position: "absolute",
                                top: 4,
                                right: 4,
                                backgroundColor: "rgba(255, 0, 0, 0.7)",
                                color: "white",
                                "&:hover": {
                                  backgroundColor: "rgba(255, 0, 0, 0.9)",
                                },
                              }}
                              onClick={() =>
                                handleDownloadImage(
                                  img,
                                  sortedNotes[tabIndex].noteDate,
                                  idx
                                )
                              }
                              aria-label="download image"
                            >
                              <FileDownloadIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Stack>
                    </Box>
                  )}
              </Stack>
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
            Are you sure you want to delete this note? This action cannot be
            undone.
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
        <DialogTitle sx={{ display: "flex", justifyContent: "flex-end", p: 1 }}>
          <IconButton onClick={handleImageDialogClose} aria-label="close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent
          sx={{
            p: 0,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            overflow: "hidden",
          }}
        >
          {selectedImage && (
            <img
              src={selectedImage}
              alt="Full-size Note Image"
              style={{ maxWidth: "100%", height: "auto" }}
            />
          )}
        </DialogContent>
        <DialogActions>
          {selectedImage && (
            <Button
              onClick={() =>
                handleDownloadImage(
                  selectedImage,
                  noteDate,
                  selectedImageIndex ?? 0
                )
              }
              startIcon={<FileDownloadIcon />}
            >
              Download
            </Button>
          )}
          {selectedImageIndex !== null &&
            editingNoteIndex !== null && ( // Only show delete if in edit mode and image is from existingImagesToDisplay
              <Button
                onClick={handleDeleteExistingImage}
                color="error"
                startIcon={<DeleteIcon />}
              >
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
