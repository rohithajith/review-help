import { useState, useEffect } from 'react';
import api from '../api';

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
      const res = await api.get(`/${bizId}/templates`);
      const data = res && res.data;
      // Ensure templates is always an array to avoid runtime errors when the
      // API returns unexpected payloads (e.g. raw text or HTML). Coerce to []
      // when the response is not an array.
      setTemplates(Array.isArray(data) ? data : []);
    } catch (err) {
        console.error('useTemplates: failed to fetch templates for business', bizId, err);
        setError(err.message || String(err));
        setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // when businessId changes, attempt fetch; do not include fetchTemplates in
    // the dependency array to avoid re-creating the effect on every render.
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