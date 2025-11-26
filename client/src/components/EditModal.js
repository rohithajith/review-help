import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  IconButton,
  Box,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

const EditModal = ({ template, onClose, onSave, onCopyAndLeaveReview }) => {
  const [text, setText] = useState(template.text);

  // handleSave is kept for potential future use with a Save button
  // eslint-disable-next-line no-unused-vars
  const handleSave = () => {
    if (onSave) onSave({ ...template, text });
  };

  const handleCopyAndReview = async () => {
    const updated = { ...template, text };
    if (onCopyAndLeaveReview) await onCopyAndLeaveReview(updated);
    if (onClose) onClose();
  };

  return (
    <Dialog 
      open={true} 
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: { borderRadius: 3 }
      }}
    >
      <DialogTitle sx={{ m: 0, p: 2, pr: 6 }}>
        Edit Template
        <IconButton
          aria-label="close"
          onClick={onClose}
          sx={{
            position: 'absolute',
            right: 8,
            top: 8,
            color: (theme) => theme.palette.grey[500],
          }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers>
        <Box component="form">
          <TextField
            id="templateText"
            label="Template Text"
            multiline
            rows={5}
            fullWidth
            value={text}
            onChange={(e) => setText(e.target.value)}
            variant="outlined"
            sx={{ mt: 1 }}
          />
        </Box>
      </DialogContent>
      <DialogActions sx={{ p: 2, gap: 1 }}>
        <Button variant="outlined" onClick={onClose}>
          Close
        </Button>
        <Button 
          variant="contained" 
          color="success" 
          onClick={handleCopyAndReview}
          startIcon={<ContentCopyIcon />}
          sx={{ background: 'linear-gradient(90deg, #10b981, #059669)' }}
        >
          Copy & Review
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default EditModal;