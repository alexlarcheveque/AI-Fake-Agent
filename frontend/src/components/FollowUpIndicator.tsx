import React from "react";

interface FollowUpIndicatorProps {
  nextScheduledMessage?: string;
  messageCount: number;
  className?: string;
}

const FollowUpIndicator: React.FC<FollowUpIndicatorProps> = ({
  nextScheduledMessage,
  messageCount,
  className,
}) => {
  if (!nextScheduledMessage) {
    return null;
  }

  const scheduledDate = new Date(nextScheduledMessage);
  // Check if the date is valid
  if (isNaN(scheduledDate.getTime())) {
    return null;
  }

  return (
    <span className={`text-xs ${className}`}>
      {messageCount === 0 ? (
        <>First message scheduled for {scheduledDate.toLocaleDateString()}</>
      ) : (
        <>
          Next message #{messageCount} scheduled for{" "}
          {scheduledDate.toLocaleDateString()}
        </>
      )}
    </span>
  );
};

export default FollowUpIndicator;
