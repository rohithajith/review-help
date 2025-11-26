import React from 'react';
import PropTypes from 'prop-types';
import {
  Card,
  CardContent,
  Typography,
  Box,
  Button,
} from '@mui/material';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

/**
 * TemplateCard displays a single template with actions.
 *
 * @param {Object} props
 * @param {Object} props.template - Template data
 * @param {Function} props.onEdit - Callback when edit button clicked
 * @param {Function} props.onCopyAndLeaveReview - Callback for copy/review
 */
const TemplateCard = ({ template, onEdit, onCopyAndLeaveReview }) => {
  return (
    <Card 
      aria-label={`Template ${template.id}`}
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        border: '1px solid',
        borderColor: 'divider',
        borderRadius: 3,
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: '0 8px 24px rgba(0,0,0,0.1)',
        },
      }}
    >
      <CardContent sx={{ flexGrow: 1, pb: 1 }}>
        <Typography 
          variant="body1" 
          sx={{ 
            lineHeight: 1.7,
            color: 'text.primary',
            whiteSpace: 'pre-wrap',
            wordBreak: 'break-word',
            fontSize: '0.95rem',
          }}
        >
          {template.text}
        </Typography>
      </CardContent>

      {/* Action Bar - Centered Buttons */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 2,
          p: 2,
          borderTop: '1px solid',
          borderColor: 'divider',
        }}
      >
        <Button
          variant="outlined"
          startIcon={<EditOutlinedIcon />}
          onClick={() => onEdit(template)}
          aria-label={`Edit template ${template.id}`}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
          }}
        >
          Edit
        </Button>

        <Button
          variant="contained"
          startIcon={<ContentCopyIcon />}
          onClick={() => onCopyAndLeaveReview(template)}
          aria-label={`Copy and review template ${template.id}`}
          sx={{
            borderRadius: 2,
            textTransform: 'none',
            fontWeight: 600,
            px: 3,
            background: 'linear-gradient(135deg, #10b981, #059669)',
            '&:hover': {
              background: 'linear-gradient(135deg, #059669, #047857)',
            },
          }}
        >
          Copy & Review
        </Button>
      </Box>
    </Card>
  );
};

TemplateCard.propTypes = {
  template: PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    text: PropTypes.string.isRequired,
    businessId: PropTypes.string,
  }).isRequired,
  onEdit: PropTypes.func.isRequired,
  onCopyAndLeaveReview: PropTypes.func.isRequired,
};

export default TemplateCard;