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
  Typography,
  Divider,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';

const EditModal = ({ template, onClose, onSave, onCopyAndLeaveReview, reviewPlatforms = [] }) => {
  const [text, setText] = useState(template.text);
  const [showPlatformChoice, setShowPlatformChoice] = useState(false);

  // handleSave is kept for potential future use with a Save button
  // eslint-disable-next-line no-unused-vars
  const handleSave = () => {
    if (onSave) onSave({ ...template, text });
  };

  const handleCopyAndReview = async (platformUrl = null) => {
    const updated = { ...template, text };
    if (onCopyAndLeaveReview) await onCopyAndLeaveReview(updated, platformUrl);
    if (onClose) onClose();
  };

  const handleCopyClick = () => {
    // Filter platforms that have URLs configured
    const validPlatforms = reviewPlatforms.filter(p => p.url && p.url.trim());
    
    if (validPlatforms.length === 0) {
      // No platforms configured, just proceed with default behavior
      handleCopyAndReview(null);
    } else if (validPlatforms.length === 1) {
      // Only one platform, use it directly
      handleCopyAndReview(validPlatforms[0].url);
    } else {
      // Multiple platforms, show choice
      setShowPlatformChoice(true);
    }
  };

  // Platform selection view
  if (showPlatformChoice) {
    const validPlatforms = reviewPlatforms.filter(p => p.url && p.url.trim());
    
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
          Where would you like to leave your review?
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
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Your review has been copied to your clipboard. Choose a platform to leave your review:
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {validPlatforms.map((platform, index) => (
              <Button
                key={index}
                variant="outlined"
                size="large"
                startIcon={<OpenInNewIcon />}
                onClick={() => handleCopyAndReview(platform.url)}
                sx={{
                  justifyContent: 'flex-start',
                  py: 1.5,
                  px: 3,
                  textTransform: 'none',
                  fontSize: '1rem',
                }}
              >
                Leave review on {platform.name}
              </Button>
            ))}
          </Box>
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button variant="text" onClick={() => setShowPlatformChoice(false)}>
            Back to Edit
          </Button>
        </DialogActions>
      </Dialog>
    );
  }

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
          onClick={handleCopyClick}
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