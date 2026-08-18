import React from 'react';
import { Navigate } from 'react-router-dom';

export function Compliance() {
  // Simple redirect to Dashboard for now as it contains the compliance overview.
  // In a fuller app, this could be a detailed reporting page.
  return <Navigate to="/dashboard" replace />;
}
