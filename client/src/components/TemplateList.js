import { Card } from 'react-bootstrap';
import React from 'react';
import { Button } from 'react-bootstrap';

const TemplateList = ({ templates, onEdit, onCopyAndLeaveReview }) => {
  console.log("Templates received:", templates); // Debug log
  return (
    <div className="template-grid">
      {templates.map(template => (
        <Card key={template.id} className="template-card">
          <Card.Body>
            <Card.Text className="template-text">{template.text}</Card.Text>
            <div className="template-actions">
              <Button variant="primary" size="sm" onClick={() => onEdit(template)}>
                Edit
              </Button>
              <Button
                variant="success"
                size="sm"
                onClick={() => onCopyAndLeaveReview(template)}
              >
                Copy & Review
              </Button>
            </div>
          </Card.Body>
        </Card>
      ))}
    </div>
  );
};

export default TemplateList;