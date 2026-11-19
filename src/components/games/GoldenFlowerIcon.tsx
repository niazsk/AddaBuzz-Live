import React from 'react';

export const GoldenFlowerIcon: React.FC<{ className?: string }> = ({
  className,
}) => {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14l-3-3l-2.29 2.29L7 15l5-5 2.29 2.29L15 9l3 3-3 3zm5.5-5.5l-.86.86-3.43 3.43-.71-.71L15 13.5l3.5-3.5-.71.71 3.43 3.43-.86-.86L17.5 11z" />
    </svg>
  );
};