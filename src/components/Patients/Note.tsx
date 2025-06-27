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
  Dialog, // Added for confirmation dialog
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import Image from "next/image";
import FileDownloadIcon from "@mui/icons-material/FileDownload";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";

// Define the structure for each patient note, now with more detailed fields
interface Note {
  noteDate: string;
  history?: string;
  medications?: string;
  onObservation?: string;
  onPalpation?: string;
  painAssessmentNPRS?: string;
  mmt?: string;
  treatment?: string;
  additionalNote?: string;
  images: string[]; // Base64 encoded images
}

// Define the patient structure, including their personal details
interface Patient {
  id: string | number;
  name: string;
  age?: number;
  gender?: string;
  phoneNumber?: string;
  emergencyContact: {
    name: string;
    relation: string;
    contactNumber: string;
  }
  email?: string;
  occupation?: string;
  chiefComplaint?: string;
  notes: Note[]; // Array of detailed notes
  [key: string]: unknown; // Optional: if patient contains other props
}

const PatientNotes = () => {
  const { id } = useParams<{ id: string }>();
  const dataProvider = useDataProvider();
  const notify = useNotify();

  const [record, setRecord] = useState<Patient | null>(null);
  const [noteDate, setNoteDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  // State for new physiotherapy fields
  const [history, setHistory] = useState("");
  const [medications, setMedications] = useState("");
  const [onObservation, setOnObservation] = useState("");
  const [onPalpation, setOnPalpation] = useState("");
  const [painAssessmentNPRS, setPainAssessmentNPRS] = useState("");
  const [mmt, setMmt] = useState("");
  const [treatment, setTreatment] = useState("");
  const [additionalNote, setAdditionalNote] = useState("");

  const [images, setImages] = useState<File[]>([]); // For new image uploads
  const [existingImagesToDisplay, setExistingImagesToDisplay] = useState<
    string[]
  >([]); // For images from the note being edited
  const [loading, setLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  const [editingNoteIndex, setEditingNoteIndex] = useState<number | null>(null); // New state for editing

  // State for delete confirmation dialog
  const [openDeleteDialog, setOpenDeleteDialog] = useState(false);
  const [noteToDeleteIndex, setNoteToDeleteIndex] = useState<number | null>(null);

  // Ref for scrolling to the form
  const formRef = useRef<HTMLDivElement | null>(null); // Use useRef for mutable ref

  // Fetch patient data on component mount or ID change
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

  // Sort notes by date, most recent first
  const sortedNotes =
    record && record.notes
      ? [...record.notes].sort(
          (a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
        )
      : [];

  // If there are notes, ensure tabIndex is valid
  useEffect(() => {
    if (sortedNotes.length > 0 && tabIndex >= sortedNotes.length) {
      setTabIndex(0); // Reset tab to the first note if the current tab becomes invalid
    } else if (sortedNotes.length === 0 && tabIndex !== 0) {
      setTabIndex(0); // If all notes are deleted, reset tab to 0
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
    setAdditionalNote("");
    setImages([]);
    setExistingImagesToDisplay([]);
    setEditingNoteIndex(null);
  };

  const handleNoteSubmit = async () => {
    // Basic validation: ensure at least one field is filled
    if (
      !history.trim() &&
      !medications.trim() &&
      !onObservation.trim() &&
      !onPalpation.trim() &&
      !painAssessmentNPRS.trim() &&
      !mmt.trim() &&
      !treatment.trim() &&
      !additionalNote.trim() &&
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

    // Combine existing images with newly uploaded ones
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
      additionalNote: additionalNote.trim() || undefined,
      images: allImages,
    };

    if (!record) return;

    setLoading(true);
    try {
      let updatedNotes: Note[];
      if (editingNoteIndex !== null) {
        // Update existing note
        updatedNotes = [...record.notes];
        // Find the original index of the note (since sortedNotes is a copy)
        const originalIndex = record.notes.findIndex(
            (note) =>
                note.noteDate === sortedNotes[editingNoteIndex].noteDate &&
                note.history === sortedNotes[editingNoteIndex].history // Add more unique identifiers if needed
        );
        if (originalIndex !== -1) {
            updatedNotes[originalIndex] = updatedOrNewNote;
        } else {
            // Fallback if original index not found (shouldn't happen with proper ID handling)
            console.warn("Original note not found for update, appending instead.");
            updatedNotes.push(updatedOrNewNote);
        }
      } else {
        // Add new note
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
      resetFormFields(); // Reset form and exit edit mode
      // Refresh patient record to show new/updated note immediately
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

  const handleDownloadImage = (base64String: string, index: number) => {
    // Extract file type from base64 string (e.g., image/png, image/jpeg)
    const mimeTypeMatch = base64String.match(/^data:(.*?);base64,/);
    const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : "image/png"; // Default to png if not found
    const extension = mimeType.split("/")[1] || "png";

    const link = document.createElement("a");
    link.href = base64String;
    link.download = `patient_image_${record?.name.replace(/\s/g, "_")}_${
      sortedNotes[tabIndex].noteDate
    }_${index}.${extension}`;
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
    setAdditionalNote(noteToEdit.additionalNote || "");
    setImages([]); // Clear new images when editing an existing one
    setExistingImagesToDisplay(noteToEdit.images || []); // Set existing images for display

    // Scroll to the form
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
      // Find the original index of the note within `record.notes` before deletion
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
      resetFormFields(); // Reset form in case deleted note was being edited
      // Refresh patient record
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

  if (!record) return <Typography m={3}>Loading patient data...</Typography>;

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Patient Details & Notes for {record.name}
      </Typography>

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
              Alt Phone No:
            </Typography>{" "}
            {record.emergencyContact.contactNumber || "N/A"}
          </Typography>
          <Typography sx={{ ml: { sm: 3 } }}>
            <Typography component="span" fontWeight="bold">
              Email:
            </Typography>{" "}
            {record.email || "N/A"}
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
        <TextField
          label="Treatment"
          multiline
          rows={4}
          value={treatment}
          onChange={(e) => setTreatment(e.target.value)}
          fullWidth
        />
        <TextField
          label="Additional Note"
          multiline
          rows={3}
          value={additionalNote}
          onChange={(e) => setAdditionalNote(e.target.value)}
          fullWidth
        />

        {/* Display existing images if in edit mode */}
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
                  }}
                >
                  <Image
                    src={img}
                    alt={`Existing Note-${idx}`}
                    width={100}
                    height={100}
                    style={{ borderRadius: 4, objectFit: "cover" }}
                    unoptimized
                  />
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
                    onClick={() => handleDownloadImage(img, idx)}
                    aria-label="download image"
                  >
                    <FileDownloadIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Stack>
            <Typography variant="caption" color="text.secondary" mt={1}>
              Note: Uploading new images below will add to these existing images.
            </Typography>
          </Box>
        )}

        <Input
          type="file"
          inputProps={{ multiple: true, accept: "image/*" }} // Restrict to image files
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
            {sortedNotes[tabIndex] && ( // Ensure note exists for the current tabIndex
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
                {sortedNotes[tabIndex].treatment && (
                  <Typography variant="body2" mb={1}>
                    <Typography component="span" fontWeight="bold">
                      Treatment:
                    </Typography>{" "}
                    {sortedNotes[tabIndex].treatment}
                  </Typography>
                )}
                {sortedNotes[tabIndex].additionalNote && (
                  <Typography variant="body2" mb={1}>
                    <Typography component="span" fontWeight="bold">
                      Additional Note:
                    </Typography>{" "}
                    {sortedNotes[tabIndex].additionalNote}
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
                            }}
                          >
                            <Image
                              src={img}
                              alt={`Note-${idx}`}
                              width={120} // Increased size slightly for better visibility
                              height={120}
                              style={{ borderRadius: 4, objectFit: "cover" }}
                              unoptimized // Important if using base64 or external images not optimized by Next.js
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
                              onClick={() => handleDownloadImage(img, idx)}
                              aria-label="download image"
                            >
                              <FileDownloadIcon fontSize="small" />
                            </IconButton>
                          </Box>
                        ))}
                      </Stack>
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
    </Box>
  );
};

export default PatientNotes;