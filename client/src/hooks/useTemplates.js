import { useState, useEffect } from 'react';

/**
 * Custom hook to fetch and manage templates.
 *
 * @returns {Object} { templates, loading, error, refresh }
 */
// Updated to accept a businessId and include it in API requests
const useTemplates = (businessId) => {
  const [templates, setTemplates] = useState([]);
  // don't assume loading until we attempt to fetch — when no businessId is set we
  // should not stay stuck in "loading" state.
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchTemplates = async (bizId = businessId) => {
    // if no businessId provided, do nothing and clear state
    if (!bizId) {
      setTemplates([]);
      setError(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const apiBase = process.env.REACT_APP_API_URL || '';
      const url = `${apiBase}/${bizId}/templates`;
      const response = await fetch(url);
      if (!response.ok) {
        const text = await response.text().catch(() => '');
        throw new Error(text || 'Failed to fetch templates');
      }
      const data = await response.json();
      setTemplates(data);
    } catch (err) {
      setError(err.message || String(err));
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // when businessId changes, attempt fetch; if falsy, ensure we are not stuck
    // in loading state
    if (businessId) {
      fetchTemplates();
    } else {
      setTemplates([]);
      setError(null);
      setLoading(false);
    }
  }, [businessId]);

  return { templates, loading, error, refresh: fetchTemplates };
};

export default useTemplates;