import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import api from './api';

let recording: Audio.Recording | null = null;

/**
 * START RECORDING
 */
export const startRecording = async (): Promise<void> => {
  const permission = await Audio.requestPermissionsAsync();
  if (!permission.granted) {
    throw new Error('Microphone permission not granted');
  }

  // 🔥 FIX MIC ROUTING (IMPORTANT)
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: true,
    playsInSilentModeIOS: true,

    shouldDuckAndroid: true,
    playThroughEarpieceAndroid: false,
    staysActiveInBackground: false,
    interruptionModeAndroid: 1,
  });

  // ✅ NO TYPE HERE (fixes error)
  const recordingOptions = {
    android: {
      extension: '.m4a',
      outputFormat: 2,
      audioEncoder: 3,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 16000,
    },
    ios: {
      extension: '.m4a',
      audioQuality: 0,
      sampleRate: 16000,
      numberOfChannels: 1,
      bitRate: 16000,
    },
    web: {
      mimeType: 'audio/webm',
      bitsPerSecond: 16000,
    },
  };

  const result = await Audio.Recording.createAsync(recordingOptions as any);
  recording = result.recording;
};

/**
 * STOP RECORDING
 */
export const stopRecording = async (): Promise<string> => {
  if (!recording) {
    throw new Error('No active recording');
  }

  const current = recording;
  recording = null;

  await current.stopAndUnloadAsync();

  const uri = current.getURI();
  if (!uri) {
    throw new Error('Recording failed');
  }

  // 🔥 RESET AUDIO MODE
  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
    shouldDuckAndroid: false,
  });

  return uri;
};

/**
 * CANCEL RECORDING
 */
export const cancelRecording = async (): Promise<void> => {
  if (!recording) return;

  try {
    await recording.stopAndUnloadAsync();
  } catch {}

  recording = null;

  await Audio.setAudioModeAsync({
    allowsRecordingIOS: false,
    playsInSilentModeIOS: true,
  });
};

/**
 * AUDIO → BASE64
 */
export const audioToBase64 = async (uri: string): Promise<string> => {
  return await FileSystem.readAsStringAsync(uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
};

/**
 * SEND TO BACKEND
 */
export const sendVoiceMessage = async (
  nodeId: string,
  base64Audio: string
) => {
  return await api.post('/api/messages', {
    nodeId,
    content: base64Audio,
    type: 'voice',
  });
};