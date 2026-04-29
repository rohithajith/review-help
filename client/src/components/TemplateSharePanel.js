import React, { useMemo, useRef, useState } from 'react';
import { Box, Button, Chip, Stack, Typography } from '@mui/material';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import CheckIcon from '@mui/icons-material/Check';
import DownloadIcon from '@mui/icons-material/Download';
import { QRCodeCanvas, QRCodeSVG } from 'qrcode.react';
import { copyTextToClipboard } from '../utils/clipboardUtils';
import { getTemplateShareData } from '../utils/templateShare';

function supportsCanvasQr() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  // JSDOM lacks a real canvas implementation and logs noisy not-implemented errors.
  if (typeof navigator !== 'undefined' && /jsdom/i.test(String(navigator.userAgent || ''))) return false;
  try {
    const c = document.createElement('canvas');
    return Boolean(c && typeof c.getContext === 'function');
  } catch (e) {
    return false;
  }
}

export default function TemplateSharePanel({ businessId }) {
  const [copied, setCopied] = useState(false);
  const qrCanvasRef = useRef(null);
  const canDownloadQr = useMemo(() => supportsCanvasQr(), []);

  const shareData = useMemo(() => getTemplateShareData(businessId), [businessId]);

  const handleCopy = () => {
    if (!shareData?.shortUrl) return;
    copyTextToClipboard(shareData.shortUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  const handleDownloadQr = () => {
    if (!shareData) return;
    if (!canDownloadQr) return;
    const canvasElement = qrCanvasRef.current
      || document.getElementById(`share-qr-${shareData.businessId}`);
    if (!canvasElement || typeof canvasElement.toDataURL !== 'function') return;

    const downloadUrl = canvasElement.toDataURL('image/png');
    const a = document.createElement('a');
    a.href = downloadUrl;
    a.download = `reviewhelp-qr-business-${shareData.businessId}.png`;
    a.click();
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
      <Box sx={{ display: 'flex', gap: 2, alignItems: { xs: 'stretch', sm: 'center' }, flexWrap: 'wrap' }}>
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
            mx: { xs: 'auto', sm: 0 },
          }}
        >
          {canDownloadQr ? (
            <QRCodeCanvas
              id={`share-qr-${shareData.businessId}`}
              ref={qrCanvasRef}
              value={shareData.shortUrl}
              size={128}
              level="M"
              includeMargin
            />
          ) : (
            <QRCodeSVG value={shareData.shortUrl} size={128} level="M" includeMargin />
          )}
        </Box>
        <Stack spacing={1} sx={{ minWidth: { xs: '100%', sm: 240 }, flex: 1 }}>
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button
              variant="contained"
              size="small"
              startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
              onClick={handleCopy}
              sx={{
                borderRadius: 1,
                textTransform: 'none',
                width: { xs: '100%', sm: 'auto' },
                minHeight: 42,
                justifyContent: 'center',
              }}
            >
              {copied ? 'Copied' : 'Copy Link'}
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<DownloadIcon />}
              onClick={handleDownloadQr}
              disabled={!canDownloadQr}
              sx={{
                borderRadius: 1,
                textTransform: 'none',
                width: { xs: '100%', sm: 'auto' },
                minHeight: 42,
                justifyContent: 'center',
              }}
            >
              Download QR
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<OpenInNewIcon />}
              onClick={() => window.open(shareData.fullUrl, '_blank', 'noopener,noreferrer')}
              sx={{
                borderRadius: 1,
                textTransform: 'none',
                width: { xs: '100%', sm: 'auto' },
                minHeight: 42,
                justifyContent: 'center',
              }}
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
