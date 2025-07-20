import React from "react";
import { useRecordContext, Button } from "react-admin";
import { useNavigate } from "react-router-dom";

const AddNoteButton: React.FC = () => {
  const record = useRecordContext();
  const navigate = useNavigate();

  if (!record) return null;

  const label = "Notes";

  return (
    <Button
      variant="outlined"
      size={ "medium"}
      onClick={(e) => {
        e.stopPropagation(); // don’t trigger row click
        navigate(`/patients/${record.id}/notes`);
      }}
    >
     <p style={{fontSize:'15px'}}>{label}</p> 
    </Button>
  );
};

export default AddNoteButton;
