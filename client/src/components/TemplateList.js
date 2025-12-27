import React from 'react';
import { Grid, Box } from '@mui/material';
import TemplateCard from './TemplateCard';

/**
 * TemplateList - Legacy component for admin/edit flows
 * The main customer flow now uses ReviewFlowWizard instead
 */
const TemplateList = ({ templates, onEdit, onCopyAndLeaveReview }) => {
  return (
    <Box>
      <Grid container spacing={3}>
        {templates.map(template => (
          <Grid item key={template.id} xs={12} sm={6} md={4}>
            <TemplateCard
              template={template}
              onEdit={onEdit}
              onCopyAndLeaveReview={onCopyAndLeaveReview}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
};

export default TemplateList;