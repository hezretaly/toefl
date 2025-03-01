import React, { useState, useEffect } from 'react';
import TopMenu from '../components/TopMenu';
import SpeakingTaskPage from './SpeakingTaskPage';
import { TaskConfig } from '../types/speaking';

// Task configurations
const TASK_CONFIGS: TaskConfig[] = [
  {
    id: 'task1',
    type: 1,
    title: 'Task 1: Independent Speaking - Personal Experience/Opinion',
    prepTime: 5,
    responseTime: 45,
    prompt: 'Describe a time when you faced a difficult challenge. What did you do to overcome it, and what did you learn from the experience?',
    promptAudio: '/src/assets/prompt_audio.mp3'
  },
  {
    id: 'task2',
    type: 2,
    title: 'Task 2: Integrated Speaking - Reading & Listening & Speaking (Campus Situation)',
    prepTime: 5,
    responseTime: 60,
    readingPassage: 'Reading passage about a proposed change to university library hours...',
    audioUrl: '/src/assets/listening.mp3',
    prompt: 'The university is planning to change the library hours. Explain the proposal and give your opinion.',
    promptAudio: '/src/assets/prompt_audio.mp3',
    readingTime: 5
  },
  {
    id: 'task3',
    type: 3,
    title: 'Task 3: Integrated Speaking - Academic Lecture',
    prepTime: 5,
    responseTime: 60,
    readingPassage: 'Reading passage about the concept of cognitive dissonance...',
    audioUrl: '/src/assets/listening.mp3',
    prompt: 'Explain the concept of cognitive dissonance and provide an example from the lecture.',
    promptAudio: '/src/assets/prompt_audio.mp3',
    readingTime: 5
  },
  {
    id: 'task4',
    type: 4,
    title: 'Task 4: Integrated Speaking - Academic Lecture (Concept/Process)',
    prepTime: 5,
    responseTime: 60,
    audioUrl: '/src/assets/listening.mp3',
    prompt: 'Describe the process of photosynthesis, using examples from the lecture.',
    promptAudio: '/src/assets/prompt_audio.mp3'
  }
];

const SpeakingSectionPage: React.FC = () => {
  // Section state
  const [currentTaskIndex, setCurrentTaskIndex] = useState(0);
  const [sectionComplete, setSectionComplete] = useState(false);
  const [sectionTimeRemaining, setSectionTimeRemaining] = useState(1200); // 20 minutes
  const [isPrepTime, setIsPrepTime] = useState(true);

  const currentTask = TASK_CONFIGS[currentTaskIndex];

  // Timer effect
  useEffect(() => {
    if (sectionTimeRemaining > 0 && !sectionComplete) {
      const timer = setTimeout(() => {
        setSectionTimeRemaining(prev => prev - 1);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [sectionTimeRemaining, sectionComplete]);

  // Format time for display
  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const getTaskProgress = (): string => {
    const taskNumber = currentTaskIndex + 1;
    const totalTasks = TASK_CONFIGS.length;
    return `Task ${taskNumber} of ${totalTasks}`;
  };

  const handleTaskComplete = () => {
    if (currentTaskIndex < TASK_CONFIGS.length - 1) {
      setCurrentTaskIndex(prev => prev + 1);
      setIsPrepTime(true);
    } else {
      setSectionComplete(true);
    }
  };

  const handlePrepTimeEnd = () => {
    setIsPrepTime(false);
  };

  const handleResponseTimeEnd = () => {
    console.log("Do nothing on repsonse timeout for now");
  };

  if (sectionComplete) {
    return (
      <div className="min-h-screen flex flex-col bg-gray-100">
        <TopMenu
          sectionTitle="Speaking Section"
          questionProgress="Complete"
          timer={formatTime(sectionTimeRemaining)}
        />
        <main className="flex-grow container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto text-center">
            <h2 className="text-2xl font-bold text-gray-800 mb-4">
              Speaking Section Completed
            </h2>
            <p className="text-gray-600">
              You have completed all speaking tasks. Your responses have been recorded.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return currentTask ? (
    <div className="min-h-screen flex flex-col">
      <TopMenu
        sectionTitle="Speaking Section"
        questionProgress={getTaskProgress()}
        timer={formatTime(sectionTimeRemaining)}
      />
      <SpeakingTaskPage
        taskType={currentTask.type}
        taskConfig={currentTask}
        prepTime={currentTask.prepTime}
        responseTime={currentTask.responseTime}
        onPrepTimeEnd={handlePrepTimeEnd}
        onResponseTimeEnd={handleResponseTimeEnd}
        isInitialPromptPhase={isPrepTime}
        title={currentTask.title}
        onTaskComplete={handleTaskComplete}
        // onRecordingPhaseEnd={handleTaskComplete}
      />
    </div>
  ) : null;
};

export default SpeakingSectionPage;
