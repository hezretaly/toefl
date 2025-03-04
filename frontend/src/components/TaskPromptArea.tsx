import React from 'react';
import AudioPlayerComponent from './AudioPlayerComponent';

interface TaskPromptAreaProps {
  promptText: string;
}

const TaskPromptArea: React.FC<TaskPromptAreaProps> = ({ promptText }) => {
  return (
    <div className="bg-white rounded-lg shadow-md p-6 space-y-6">
      {/* Prompt Text */}
      <div className="prose prose-gray max-w-none">
        <p className="text-gray-700 text-lg leading-relaxed">
          {promptText}
        </p>
      </div>
    </div>
  );
};

export default TaskPromptArea;
