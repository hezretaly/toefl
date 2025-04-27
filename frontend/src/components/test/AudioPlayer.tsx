
import React, { useState, useRef, useEffect } from 'react';
import { Play, Pause, RotateCcw, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

interface AudioPlayerProps {
  src: string;
  className?: string;
  onComplete?: () => void;
  autoPlay?: boolean;
}

const AudioPlayer: React.FC<AudioPlayerProps> = ({ 
  src,
  className,
  onComplete,
  autoPlay = false
}) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.8);
  
  const audioRef = useRef<HTMLAudioElement>(null);

  // Handle initial loading of audio metadata
  useEffect(() => {
    const audio = audioRef.current;
    
    if (!audio) return;
    
    const setAudioData = () => {
      setDuration(audio.duration);
    };
    
    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
      onComplete?.();
    };
    
    audio.addEventListener('loadedmetadata', setAudioData);
    audio.addEventListener('ended', handleEnded);
    
    if (autoPlay) {
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            setIsPlaying(true);
          })
          .catch(error => {
            console.error("Auto-play was prevented:", error);
          });
      }
    }
    
    return () => {
      audio.removeEventListener('loadedmetadata', setAudioData);
      audio.removeEventListener('ended', handleEnded);
    };
  }, [src, autoPlay, onComplete]);

  // Update progress during playback
  useEffect(() => {
    const audio = audioRef.current;
    
    if (!audio) return;
    
    const updateProgress = () => {
      setProgress(audio.currentTime);
    };
    
    audio.addEventListener('timeupdate', updateProgress);
    
    return () => {
      audio.removeEventListener('timeupdate', updateProgress);
    };
  }, []);

  const togglePlayPause = () => {
    const audio = audioRef.current;
    
    if (!audio) return;
    
    if (isPlaying) {
      audio.pause();
    } else {
      audio.play();
    }
    
    setIsPlaying(!isPlaying);
  };

  const handleRestart = () => {
    const audio = audioRef.current;
    
    if (!audio) return;
    
    audio.currentTime = 0;
    if (!isPlaying) {
      audio.play();
      setIsPlaying(true);
    }
  };

  const handleProgressChange = (newValue: number[]) => {
    const audio = audioRef.current;
    
    if (!audio) return;
    
    const newTime = newValue[0];
    audio.currentTime = newTime;
    setProgress(newTime);
  };

  const handleVolumeChange = (newValue: number[]) => {
    const audio = audioRef.current;
    
    if (!audio) return;
    
    const newVolume = newValue[0];
    audio.volume = newVolume;
    setVolume(newVolume);
  };

  const formatTime = (timeInSeconds: number) => {
    const minutes = Math.floor(timeInSeconds / 60);
    const seconds = Math.floor(timeInSeconds % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className={cn('audio-player', className)}>
      <audio ref={audioRef} src={src} />
      
      <div className="flex items-center gap-4 w-full">
        <Button 
          variant="outline"
          size="sm"
          onClick={togglePlayPause}
          className="p-2 h-10 w-10 rounded-full"
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        
        <Button 
          variant="ghost" 
          size="sm" 
          onClick={handleRestart}
          className="p-2 h-8 w-8 rounded-full"
        >
          <RotateCcw className="h-4 w-4" />
        </Button>
        
        <div className="flex-1 flex flex-col gap-1">
          <Slider
            value={[progress]}
            min={0}
            max={duration || 100}
            step={0.1}
            onValueChange={handleProgressChange}
            className="w-full"
          />
          
          <div className="flex justify-between text-xs text-gray-500">
            <span>{formatTime(progress)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Volume2 className="h-4 w-4 text-gray-500" />
          <Slider
            value={[volume]}
            min={0}
            max={1}
            step={0.01}
            onValueChange={handleVolumeChange}
            className="w-24"
          />
        </div>
      </div>
    </div>
  );
};

export default AudioPlayer;
