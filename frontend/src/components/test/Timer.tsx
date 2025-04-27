import React, { useState, useEffect, useRef } from 'react';
import { Clock } from 'lucide-react';

interface TimerProps {
  initialSeconds: number; // Changed prop name
  running: boolean;       // Added prop to control timer
  onTimeout?: () => void;
  className?: string;      // Pass className down for flexibility
}

// Safer formatting function
const formatTime = (totalSeconds: number): string => {
  if (typeof totalSeconds !== 'number' || isNaN(totalSeconds) || totalSeconds < 0) {
    return "00:00"; // Return default format on invalid input
  }
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
};


const Timer: React.FC<TimerProps> = ({
  initialSeconds,
  running, // Use this prop
  onTimeout,
  className = '', // Default className
}) => {
  // Initialize state safely based on the prop's validity
  const [secondsLeft, setSecondsLeft] = useState(() =>
    typeof initialSeconds === 'number' && initialSeconds > 0 ? initialSeconds : 0
  );
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Effect to handle the countdown logic
  useEffect(() => {
    // Clear previous interval if running state changes or component unmounts
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    // Only start interval if running is true and time is left
    if (running && secondsLeft > 0) {
      intervalRef.current = setInterval(() => {
        setSecondsLeft((prevSeconds) => {
          const nextSeconds = prevSeconds - 1;
          if (nextSeconds <= 0) {
            if (intervalRef.current) clearInterval(intervalRef.current); // Clear immediately
            intervalRef.current = null;
            onTimeout?.(); // Call timeout callback
            return 0; // Stop at 0
          }
          return nextSeconds;
        });
      }, 1000);
    }

    // Cleanup function
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
    // Dependencies: running controls start/stop, secondsLeft changes trigger re-evaluation (e.g., hitting 0)
    // onTimeout reference stability is assumed or handled by useCallback in parent if necessary
  }, [running, secondsLeft, onTimeout]);

  // Effect to RESET the timer when initialSeconds prop changes (e.g., task switch)
  useEffect(() => {
    // Reset time only if initialSeconds is a valid number
    if (typeof initialSeconds === 'number' && initialSeconds >= 0) {
      setSecondsLeft(initialSeconds);
    } else {
      setSecondsLeft(0); // Default to 0 if prop is invalid
    }
    // NOTE: This effect assumes that when initialSeconds changes,
    // the timer should reset, even if it was already running.
    // The 'running' prop will then determine if it starts counting down again.
  }, [initialSeconds]); // Depend ONLY on initialSeconds

  // Determine color (optional - adapt if needed, ensure initialSeconds is valid)
  const getColor = () => {
     const totalDuration = typeof initialSeconds === 'number' && initialSeconds > 0 ? initialSeconds : 1; // Avoid division by zero
     const percentage = (secondsLeft / totalDuration) * 100;
     // Using fixed classes for simplicity - you might pass these via className from parent if needed
     if (percentage < 10) return 'text-red-600'; // Example: Use Tailwind colors
     if (percentage < 30) return 'text-yellow-600'; // Example
     return 'text-gray-700'; // Default
   };

  return (
    // Combine passed className with local classes
    <div className={`flex items-center gap-1 timer-display ${className}`}>
      {/* Example: Icon color matches text color */}
      {/* <Clock className={`h-5 w-5 flex-shrink-0 ${getColor()}`} /> */}
      {/* The parent component already adds the icon and text, so maybe just return the time? */}
      {/* Or, if this component IS the display block in the parent: */}
      <span className={`font-mono font-bold ${getColor()}`}>
        {formatTime(secondsLeft)}
      </span>
    </div>
  );
};

export default Timer;