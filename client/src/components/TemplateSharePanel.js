import React, { useMemo, useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import { QRCodeSVG } from 'qrcode.react';
import { copyTextToClipboard } from '../utils/clipboardUtils';
import { getTemplateShareData } from '../utils/templateShare';

export default function TemplateSharePanel({ businessId }) {
  const [copied, setCopied] = useState(false);

  const shareData = useMemo(() => getTemplateShareData(businessId), [businessId]);

  const handleCopy = () => {
    if (!shareData?.shortUrl) return;
    copyTextToClipboard(shareData.shortUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  if (!shareData) {
    return (
      <Typography variant="body2" color="text.secondary">
        Share link is unavailable for this business.
      </Typography>
    );
  }

  return (
    <Stack spacing={2}>
      <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
        <Box
          sx={{
            border: '1px solid #d9dee7',
            borderRadius: 1,
            backgroundColor: '#fff',
            p: 1.25,
            width: 152,
            height: 152,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <QRCodeSVG value={shareData.shortUrl} size={128} level="M" includeMargin />
        </Box>
        <Stack spacing={1} sx={{ minWidth: 240, flex: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Short Link
          </Typography>
          <Chip
            label={shareData.shortUrl}
            variant="outlined"
            sx={{
              justifyContent: 'flex-start',
              borderRadius: 1,
              px: 0.5,
              '& .MuiChip-label': {
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: '100%',
                fontFamily: '"IBM Plex Mono", monospace',
              },
            }}
          />
          <Stack direction="row" spacing={1}>
            <Button
              variant="contained"
              size="small"
              startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
              onClick={handleCopy}
              sx={{ borderRadius: 1, textTransform: 'none' }}
            >
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<OpenInNewIcon />}
              onClick={() => window.open(shareData.fullUrl, '_blank', 'noopener,noreferrer')}
              sx={{ borderRadius: 1, textTransform: 'none' }}
            >
              Open Template Page
            </Button>
          </Stack>
        </Stack>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Customers can scan the QR code or open the short link to submit reviews.
      </Typography>
    </Stack>
  );
}
