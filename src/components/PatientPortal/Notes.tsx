import React, { useEffect, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  MedicalServices,
  CalendarToday,
  Description,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { useNotify } from "react-admin";

interface Note {
  _id: string;
  noteDate: string;
  history?: string;
  chiefComplaint?: string;
  onExamination?: string;
  medications?: string;
  onObservation?: string;
  onPalpation?: string;
  painAssessmentNPRS?: string;
  treatment?: string[];
  additionalNotes?: Array<{ heading: string; description: string }>;
  createdAt: string;
}

const PatientNotes: React.FC = () => {
  const notify = useNotify();
  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | false>(false);

  useEffect(() => {
    fetchNotes();
  }, []);

  const fetchNotes = async () => {
    try {
      setLoading(true);
      setError("");

      const token = localStorage.getItem("token");
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:9000"}/patient-portal/notes`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to fetch medical notes");
      }

      const data = await response.json();
      setNotes(data.notes || []);
    } catch (err) {
      console.error("Error fetching notes:", err);
      setError(err.message || "Failed to load medical notes");
      notify("Failed to load medical notes", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  const handleAccordionChange = (panel: string) => (event: React.SyntheticEvent, isExpanded: boolean) => {
    setExpanded(isExpanded ? panel : false);
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      {/* Header */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={3}>
        <Box>
          <Typography variant="h4" fontWeight={700} gutterBottom>
            Medical Notes
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View your medical history and treatment records
          </Typography>
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={fetchNotes}>
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 3 }}>{error}</Alert>}

      {/* Summary Card */}
      <Card sx={{ mb: 3 }} elevation={2}>
        <CardContent>
          <Box display="flex" alignItems="center" gap={2}>
            <MedicalServices color="primary" sx={{ fontSize: 40 }} />
            <Box>
              <Typography variant="h5" fontWeight={600}>
                {notes.length}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Medical Notes
              </Typography>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Notes List */}
      {notes.length === 0 ? (
        <Card elevation={2}>
          <CardContent>
            <Box textAlign="center" py={4}>
              <Description sx={{ fontSize: 60, color: "text.secondary", mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No Medical Notes Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Your medical notes and treatment records will appear here
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ) : (
        <Box>
          {notes.map((note, index) => (
            <Accordion
              key={note._id}
              expanded={expanded === note._id}
              onChange={handleAccordionChange(note._id)}
              elevation={2}
              sx={{ mb: 2 }}
            >
              <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                <Box display="flex" alignItems="center" gap={2} width="100%">
                  <CalendarToday color="primary" />
                  <Box flex={1}>
                    <Typography variant="h6" fontWeight={600}>
                      Visit #{notes.length - index}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Date(note.noteDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Typography>
                  </Box>
                  {note.chiefComplaint && (
                    <Chip
                      label={note.chiefComplaint.substring(0, 30) + (note.chiefComplaint.length > 30 ? "..." : "")}
                      size="small"
                      color="primary"
                      variant="outlined"
                    />
                  )}
                </Box>
              </AccordionSummary>
              <AccordionDetails>
                <Stack spacing={2}>
                  {note.chiefComplaint && (
                    <Box>
                      <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
                        Chief Complaint
                      </Typography>
                      <Typography variant="body1">{note.chiefComplaint}</Typography>
                    </Box>
                  )}

                  {note.history && (
                    <Box>
                      <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
                        History
                      </Typography>
                      <Typography variant="body1">{note.history}</Typography>
                    </Box>
                  )}

                  {note.onExamination && (
                    <Box>
                      <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
                        On Examination
                      </Typography>
                      <Typography variant="body1">{note.onExamination}</Typography>
                    </Box>
                  )}

                  {note.onObservation && (
                    <Box>
                      <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
                        On Observation
                      </Typography>
                      <Typography variant="body1">{note.onObservation}</Typography>
                    </Box>
                  )}

                  {note.onPalpation && (
                    <Box>
                      <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
                        On Palpation
                      </Typography>
                      <Typography variant="body1">{note.onPalpation}</Typography>
                    </Box>
                  )}

                  {note.painAssessmentNPRS && (
                    <Box>
                      <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
                        Pain Assessment (NPRS)
                      </Typography>
                      <Chip label={`Pain Level: ${note.painAssessmentNPRS}/10`} color="warning" />
                    </Box>
                  )}

                  {note.medications && (
                    <Box>
                      <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
                        Medications
                      </Typography>
                      <Typography variant="body1">{note.medications}</Typography>
                    </Box>
                  )}

                  {note.treatment && note.treatment.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
                        Treatment
                      </Typography>
                      <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                        {note.treatment.map((t, idx) => (
                          <Chip key={idx} label={t} size="small" color="success" variant="outlined" />
                        ))}
                      </Stack>
                    </Box>
                  )}

                  {note.additionalNotes && note.additionalNotes.length > 0 && (
                    <Box>
                      <Typography variant="subtitle2" color="primary" gutterBottom fontWeight={600}>
                        Additional Notes
                      </Typography>
                      {note.additionalNotes.map((addNote, idx) => (
                        <Box key={idx} sx={{ mb: 1, pl: 2, borderLeft: "3px solid", borderColor: "primary.main" }}>
                          <Typography variant="subtitle2" fontWeight={600}>
                            {addNote.heading}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {addNote.description}
                          </Typography>
                        </Box>
                      ))}
                    </Box>
                  )}

                  <Box sx={{ mt: 2, pt: 2, borderTop: "1px dashed", borderColor: "divider" }}>
                    <Typography variant="caption" color="text.secondary">
                      Recorded on: {new Date(note.createdAt).toLocaleString()}
                    </Typography>
                  </Box>
                </Stack>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>
      )}
    </Box>
  );
};

export default PatientNotes;
