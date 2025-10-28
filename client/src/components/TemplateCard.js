import React from 'react';
import PropTypes from 'prop-types';
import { Card, Button } from 'react-bootstrap';

/**
 * TemplateCard displays a single template with actions.
 *
 * @param {Object} props
 * @param {Object} props.template - Template data
 * @param {Function} props.onEdit - Callback when edit button clicked
 * @param {Function} props.onCopyAndLeaveReview - Callback for copy/review
 */
const TemplateCard = ({ template, onEdit, onCopyAndLeaveReview }) => (
  <Card className="template-card" aria-label={`Template ${template.id}`}>
    <Card.Body>
      <Card.Text className="template-text">{template.text}</Card.Text>
      <div className="template-actions">
        <Button
          variant="primary"
          size="sm"
          onClick={() => onEdit(template)}
          aria-label={`Edit template ${template.id}`}
        >
          Edit
        </Button>
        <Button
          variant="success"
          size="sm"
          onClick={() => onCopyAndLeaveReview(template)}
          aria-label={`Copy and review template ${template.id}`}
        >
          Copy & Review
        </Button>
      </div>
    </Card.Body>
  </Card>
);

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