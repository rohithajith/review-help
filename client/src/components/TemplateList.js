import React from 'react';
import TemplateCard from './TemplateCard';

const TemplateList = ({ templates, onEdit, onCopyAndLeaveReview }) => {
  console.log("Templates received:", templates); // Debug log
  return (
    <div className="template-grid">
      {templates.map(template => (
        <TemplateCard
          key={template.id}
          template={template}
          onEdit={onEdit}
          onCopyAndLeaveReview={onCopyAndLeaveReview}
        />
      ))}
    </div>
  );
};

export default TemplateList;