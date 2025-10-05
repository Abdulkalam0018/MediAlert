// src/components/ui/card.jsx
import React from "react";

export function Card({ children, className = "", ...props }) {
  return (
    <div className={`bg-white rounded-xl shadow p-4 ${className}`} {...props}>
      {children}
    </div>
  );
}
