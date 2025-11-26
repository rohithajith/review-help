import React, { useEffect, useState } from 'react';
import {
  Dialog,
  DialogContent,
  Box,
  Typography,
  Button,
  Paper,
  Fade,
} from '@mui/material';

/**
 * TemplateIntroModal
 * Small reusable modal that appears once per session to show a quick demo
 * and capture the user's preferred review platform (Booking / Google).
 *
 * Usage: <TemplateIntroModal />
 */
const TemplateIntroModal = () => {
  const SESSION_SHOWN_KEY = 'templateIntroShown';
  const SESSION_PLATFORM_KEY = 'preferredReviewPlatform';

  const [show, setShow] = useState(false);
  const [selection, setSelection] = useState(null); // 'booking' | 'google'

  useEffect(() => {
    try {
      const shown = sessionStorage.getItem(SESSION_SHOWN_KEY);
      if (!shown) {
        // show on first visit in this session
        // small timeout so CSS animation looks smooth when mounted
        setTimeout(() => setShow(true), 80);
      }
    } catch (e) {
      // sessionStorage may be blocked; ignore and do not show
    }
  }, []);

  const choose = (platform) => {
    setSelection(platform);
    // persist selection for this session
    try {
      sessionStorage.setItem(SESSION_PLATFORM_KEY, platform);
    } catch (e) {}
  };

  const close = () => {
    // set shown flag and close
    try {
      sessionStorage.setItem(SESSION_SHOWN_KEY, '1');
    } catch (e) {}
    setShow(false);
  };

  return (
    <Dialog
      open={show}
      onClose={() => {}}
      maxWidth="sm"
      fullWidth
      TransitionComponent={Fade}
      TransitionProps={{ timeout: 300 }}
      PaperProps={{
        sx: {
          borderRadius: 3,
          maxWidth: 520,
          m: 2,
        }
      }}
      slotProps={{
        backdrop: {
          sx: {
            backgroundColor: 'rgba(10,12,16,0.45)',
            backdropFilter: 'blur(3px)',
          }
        }
      }}
      aria-label="How it works"
    >
      <DialogContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Typography 
          variant="h6" 
          component="div" 
          sx={{ 
            textAlign: 'center', 
            fontWeight: 600, 
            mb: 2 
          }}
        >
          How it works ✨
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, alignItems: 'center', color: 'text.primary', mb: 2 }}>
          <Typography variant="body1">• Choose a review template</Typography>
          <Typography variant="body1">• Edit if you like</Typography>
          <Typography variant="body1">• Copy & paste your review</Typography>
        </Box>

        <Box sx={{ height: 1, bgcolor: 'divider', my: 2, borderRadius: 1 }} />

        <Typography variant="subtitle1" sx={{ textAlign: 'center', fontWeight: 600, mb: 1.5 }}>
          Where would you like to leave your review?
        </Typography>

        <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'center', flexWrap: 'wrap', mb: 1 }}>
          <Paper
            component="button"
            onClick={() => choose('booking')}
            sx={{
              flex: '1 1 140px',
              minWidth: 140,
              p: 1.5,
              border: '1px solid',
              borderColor: selection === 'booking' ? 'primary.main' : 'divider',
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              boxShadow: selection === 'booking' ? '0 6px 18px rgba(0,123,255,0.12)' : 'none',
              background: selection === 'booking' 
                ? 'linear-gradient(180deg, rgba(0,123,255,0.03), rgba(0,123,255,0.01))'
                : 'background.paper',
              '&:hover': {
                transform: 'scale(1.04)',
              },
            }}
            aria-pressed={selection === 'booking'}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0b6fff' }}>
              Booking.com
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Leave a review on Booking
            </Typography>
          </Paper>

          <Paper
            component="button"
            onClick={() => choose('google')}
            sx={{
              flex: '1 1 140px',
              minWidth: 140,
              p: 1.5,
              border: '1px solid',
              borderColor: selection === 'google' ? 'success.main' : 'divider',
              borderRadius: 2,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 0.5,
              cursor: 'pointer',
              transition: 'all 150ms ease',
              boxShadow: selection === 'google' ? '0 6px 18px rgba(16,185,129,0.12)' : 'none',
              background: selection === 'google' 
                ? 'linear-gradient(180deg, rgba(16,185,129,0.03), rgba(16,185,129,0.01))'
                : 'background.paper',
              '&:hover': {
                transform: 'scale(1.04)',
              },
            }}
            aria-pressed={selection === 'google'}
          >
            <Typography variant="subtitle2" sx={{ fontWeight: 600, color: '#0b7a1f' }}>
              Google Reviews
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Open Google Maps review
            </Typography>
          </Paper>
        </Box>

        <Typography variant="caption" sx={{ display: 'block', textAlign: 'center', color: 'text.secondary', mb: 1.5 }}>
          Your review helps others discover great experiences ❤️
        </Typography>

        <Box sx={{ display: 'flex', justifyContent: 'center' }}>
          <Button
            variant="contained"
            disabled={!selection}
            onClick={close}
            sx={{
              px: 3,
              py: 1,
              fontWeight: 600,
              background: selection ? 'linear-gradient(90deg, #2563eb, #1e40af)' : undefined,
              '&:hover': {
                transform: selection ? 'translateY(-2px)' : 'none',
              },
            }}
          >
            Continue
          </Button>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default TemplateIntroModal;
