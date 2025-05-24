import { useRecordContext, Button } from "react-admin";
import { useNavigate } from "react-router-dom";

const AddNoteButton = () => {
  const record = useRecordContext();
  const navigate = useNavigate();

  if (!record) return null;

  return (
    <Button
      variant="outlined"
      size="small"
      onClick={(e) => {
        e.stopPropagation(); // ✅ Prevent row click from redirecting to Show
        navigate(`/patients/${record.id}/notes`);
      }}
    >
      Add/View Notes
    </Button>
  );
};

export default AddNoteButton;
