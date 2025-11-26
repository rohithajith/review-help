import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Typography,
  Button,
  Paper,
  CircularProgress,
  Alert,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';

export default function LogsViewer({ lines = 200 }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/_client-log?lines=${lines}`);
      if (!res.ok) throw new Error('Failed to fetch logs');
      const data = await res.json();
      setLogs(data);
    } catch (e) {
      setError(e.message || 'unknown');
    } finally {
      setLoading(false);
    }
  }, [lines]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6" component="h5" sx={{ m: 0 }}>
          Recent Logs
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<RefreshIcon />}
          onClick={fetchLogs}
          disabled={loading}
        >
          Refresh
        </Button>
      </Box>
      
      {loading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 2 }}>
          <CircularProgress size={24} />
        </Box>
      )}
      
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          Error: {error}
        </Alert>
      )}
      
      {!loading && !error && (
        <Paper
          sx={{
            maxHeight: 420,
            overflow: 'auto',
            bgcolor: '#111',
            color: '#e6e6e6',
            p: 1,
            borderRadius: 1,
          }}
        >
          {logs.length === 0 && (
            <Typography variant="body2" sx={{ opacity: 0.7 }}>
              No logs
            </Typography>
          )}
          {logs.map((entry, idx) => (
            <Box
              component="pre"
              key={idx}
              sx={{
                whiteSpace: 'pre-wrap',
                m: 0,
                fontSize: 12,
                fontFamily: 'source-code-pro, Menlo, Monaco, Consolas, "Courier New", monospace',
              }}
            >
              {typeof entry === 'string' ? entry : JSON.stringify(entry, null, 2)}
            </Box>
          ))}
        </Paper>
      )}
    </Box>
  );
}
