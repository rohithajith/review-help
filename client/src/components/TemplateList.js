import React from 'react';
import { Button } from 'react-bootstrap';
import { copyTextToClipboard } from '../utils/clipboardUtils';
import { copyTextToClipboard } from '../utils/clipboardUtils';

const TemplateList = ({ templates, onEdit }) => {
  const handleCopyAndLeaveReview = (template) => {
    copyTextToClipboard(template.text);
    window.open(`https://www.google.com/maps/place/${template.businessId}/reviews`, '_blank');
    fetch(`/api/templates/${template._id}/use`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
    .then(response => response.json())
    .then(data => {
      console.log(data.message);
      // Optionally, update the templates state to reflect the change
      // For example, filter out the used template from the list
      setTemplates(templates.filter(t => t._id !== template._id));
    })
    .catch(error => console.error('Error marking template as used:', error));
  };

  return (
    <div>
      <h1>Review Templates</h1>
      <ul>
        {templates.map(template => (
          <li key={template._id}>
            <p>{template.text}</p>
            <Button variant="primary" onClick={() => onEdit(template)}>Edit</Button>
            <Button variant="success" onClick={() => handleCopyAndLeaveReview(template)}>Copy & Leave Review</Button>
          </li>
        ))}
      </ul>
    </div>
  );
};

export default TemplateList;