import { useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";

export default function useNavigateWithParams() {
  const navigate = useNavigate();
  const location = useLocation();

  return useCallback(
    (to, options = {}) => {
      navigate(to + location.search, options);
    },
    [navigate, location.search],
  );
}
