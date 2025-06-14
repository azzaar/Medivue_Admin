"use client";

import {
  useDataProvider,
  useNotify,
  useRedirect,
} from "react-admin";
import {
  Box,
  Button,
  Stack,
  TextField,
  Typography,
  Input,
  Tabs,
  Tab,
} from "@mui/material";
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Image from "next/image";

interface Note {
  noteDate: string;
  text: string;
  images: string[];
}

interface Patient {
  id: string | number;
  name: string;
  notes: Note[];
  [key: string]: unknown; // Optional: if patient contains other props
}

const PatientNotes = () => {
  const { id } = useParams<{ id: string }>();
  const dataProvider = useDataProvider();
  const notify = useNotify();
  const redirect = useRedirect();

  const [record, setRecord] = useState<Patient | null>(null);
  const [noteDate, setNoteDate] = useState(new Date().toISOString().slice(0, 10));
  const [noteText, setNoteText] = useState("");
  const [images, setImages] = useState<File[]>([]);
  const [loading, setLoading] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);

  useEffect(() => {
    if (id) {
      dataProvider.getOne<Patient>("patients", { id }).then(({ data }) => setRecord(data));
    }
  }, [id, dataProvider]);

  const handleNoteSubmit = async () => {
    if (!noteText.trim()) {
      notify("Enter Notes", { type: "warning" });
      return;
    }

    const base64Images = await Promise.all(
      images.map(
        (file) =>
          new Promise<string>((resolve) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result as string);
            reader.readAsDataURL(file);
          })
      )
    );

    const newNote: Note = {
      noteDate,
      text: noteText,
      images: base64Images,
    };

    if (!record) return;

    setLoading(true);
    try {
      await dataProvider.update("patients", {
        id,
        data: {
          notes: [...(record.notes || []), newNote],
        },
        previousData: record,
      });
      notify("Note added successfully");
      redirect(`/patients/${id}/show`);
    } catch (error) {
      console.error("Note save error:", error);
      notify("Failed to add note", { type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (!record) return <Typography m={3}>Loading patient data...</Typography>;

  const sortedNotes = (record.notes || []).sort(
    (a, b) => new Date(b.noteDate).getTime() - new Date(a.noteDate).getTime()
  );

  return (
    <Box p={3}>
      <Typography variant="h5" gutterBottom>
        Notes for {record.name}
      </Typography>

      <Stack spacing={2} mb={4}>
        <TextField
          label="Note Date"
          type="date"
          value={noteDate}
          onChange={(e) => setNoteDate(e.target.value)}
          InputLabelProps={{ shrink: true }}
        />

        <TextField
          label="Note Text"
          multiline
          rows={4}
          value={noteText}
          onChange={(e) => setNoteText(e.target.value)}
        />

        <Input
          type="file"
          inputProps={{ multiple: true }}
          onChange={(e) =>
            setImages(Array.from((e.target as HTMLInputElement).files || []))
          }
        />

        <Button
          variant="contained"
          onClick={handleNoteSubmit}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Note"}
        </Button>
      </Stack>

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
          >
            {sortedNotes.map((note, index) => (
              <Tab
                key={index}
                label={new Date(note.noteDate).toLocaleDateString()}
              />
            ))}
          </Tabs>

          <Box border={1} borderRadius={2} p={2}>
            <Typography fontWeight="bold">
              {new Date(sortedNotes[tabIndex].noteDate).toDateString()}
            </Typography>
            <Typography>{sortedNotes[tabIndex].text}</Typography>
            <Stack direction="row" spacing={1} mt={1}>
            {sortedNotes[tabIndex].images?.map((img, idx) => (
  <Image
    key={idx}
    src={img}
    alt={`Note-${idx}`}
    width={100}
    height={100}          // You need to provide height too
    style={{ borderRadius: 4 }}
    unoptimized           // Optional: skip optimization if images are already optimized or external
  />
))}

            </Stack>
          </Box>
        </>
      )}
    </Box>
  );
};

export default PatientNotes;
