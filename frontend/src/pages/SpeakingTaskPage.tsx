import React, { useState, useEffect, useRef } from 'react';
import Navigation from '../components/Navigation';
import TaskPromptArea from '../components/TaskPromptArea';
import PreparationTimerArea from '../components/PreparationTimerArea';
import { TaskConfig } from '../types/speaking';
import AudioPlayerComponent from '../components/AudioPlayerComponent';
import MediaRecorderComponent from '../components/MediaRecorderComponent';

interface SpeakingTaskPageProps {
    taskType: 'independent' | 'integrated';
    taskConfig: TaskConfig;
    prepTime: number;
    responseTime: number;
    onPrepTimeEnd: () => void;
    onResponseTimeEnd: () => void;
    isInitialPromptPhase: boolean;
    title: string;
    onTaskComplete: () => void;
}

const SpeakingTaskPage: React.FC<SpeakingTaskPageProps> = ({
    taskType,
    taskConfig,
    prepTime,
    responseTime,
    onPrepTimeEnd,
    onResponseTimeEnd,
    isInitialPromptPhase,
    title,
    onTaskComplete
}) => {
    const [isReadingPhase, setIsReadingPhase] = useState(false);
    const [isPromptReadingPhase, setIsPromptReadingPhase] = useState(false);
    const [isPreparationPhase, setIsPreparationPhase] = useState(false);
    const [isRecordingPhase, setIsRecordingPhase] = useState(false);
    const [hasRecording, setHasRecording] = useState(false);
    const [readingTimeRemaining, setReadingTimeRemaining] = useState(taskConfig.readingTime || 5);
    const [preparationTimeRemaining, setPreparationTimeRemaining] = useState(prepTime);
    const [recordingTimeRemaining, setRecordingTimeRemaining] = useState(5); // Example, adjust as needed
    const [recordedAudio, setRecordedAudio] = useState<string | null>(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [startRecording, setStartRecording] = useState(false);

    const handleRecordingComplete = (audioUrl: string) => {
        setRecordedAudio(audioUrl);
        setHasRecording(true);
        setIsRecordingPhase(false);
        setIsPlaying(true);
        setStartRecording(false);
        onResponseTimeEnd();
    };

    const handlePlay = () => {
        setIsPlaying(true);
    };

    const handlePause = () => {
        setIsPlaying(false);
    };

    useEffect(() => {
        if (isInitialPromptPhase) {
            const timer = setTimeout(() => {
                onPrepTimeEnd();
                setIsPromptReadingPhase(true);
            }, 5000); // 5 seconds for initial prompt

            return () => clearTimeout(timer);
        }
    }, [isInitialPromptPhase, taskConfig.readingPassage]);

    useEffect(() => {
      if (isPromptReadingPhase) {
          const timer = setTimeout(() => {
              setIsPromptReadingPhase(false);
              if (taskConfig.readingPassage) {
                  setIsReadingPhase(true);
              } else {
                  setIsPreparationPhase(true);
              }
          }, 5000); // 5 seconds for initial prompt

          return () => clearTimeout(timer);
      }
  }, [isInitialPromptPhase, taskConfig.readingPassage]);


    useEffect(() => {
        if (isReadingPhase && readingTimeRemaining > 0) {
            const timer = setTimeout(() => {
                setIsReadingPhase(false);
                setIsPreparationPhase(true);
            }, readingTimeRemaining * 1000);

            return () => clearTimeout(timer);
        }
    }, [isReadingPhase, readingTimeRemaining]);

    useEffect(() => {
        if (isPreparationPhase) {
            const timer = setTimeout(() => {
                setIsPreparationPhase(false);
                setIsRecordingPhase(true);
                setStartRecording(true); // Start recording after preparation
            }, preparationTimeRemaining * 1000);

            return () => clearTimeout(timer);
        }
    }, [isPreparationPhase, preparationTimeRemaining]);

    const handleNext = () => {
        if (isReadingPhase) {
            setIsReadingPhase(false);
            setIsPreparationPhase(true);
        }
    };

    return (
        <div className="min-h-screen flex flex-col bg-gray-100">
            <main className="flex-grow container mx-auto px-4 py-8">
                <div className="max-w-4xl mx-auto space-y-8">
                    <h1 className="text-2xl font-bold text-gray-800 text-center">
                        {title}
                    </h1>
                    {isInitialPromptPhase ? (
                        <>
                            <TaskPromptArea promptText={taskConfig.prompt} />
                            <div className="text-gray-600 text-center">
                                Initial Prompt - Please wait...
                            </div>
                        </>
                    ) : isReadingPhase && taskConfig.readingPassage ? (
                        <>
                            <div className="text-gray-700">
                                {taskConfig.readingPassage}
                            </div>
                            <p>
                                Time remaining: {readingTimeRemaining} seconds
                            </p>
                            <button onClick={handleNext}>Next</button>
                        </>
                    ) : isPromptReadingPhase ? (
                       <>
                            <TaskPromptArea promptText={taskConfig.prompt} />
                       </>

                    ) : isPreparationPhase ? (
                        <>
                            <TaskPromptArea promptText={taskConfig.prompt} />
                            <PreparationTimerArea timeRemaining={preparationTimeRemaining} />
                        </>
                    ) : isRecordingPhase ? (
                        <MediaRecorderComponent
                            recordingTime={recordingTimeRemaining}
                            onRecordingComplete={handleRecordingComplete}
                            startRecording={startRecording}
                        />
                    ) : (
                        <>
                            {recordedAudio && (
                                <AudioPlayerComponent
                                    audioSrc={recordedAudio}
                                    isPlaying={isPlaying}
                                    onPlay={handlePlay}
                                    onPause={handlePause}
                                />
                            )}
                            <Navigation
                                onNext={onTaskComplete}
                                isNextDisabled={!hasRecording}
                            />
                        </>
                    )}
                </div>
            </main>
        </div>
    );
};

export default SpeakingTaskPage;