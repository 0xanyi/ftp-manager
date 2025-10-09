import { useState, useEffect, useCallback } from 'react';
import { uploadService } from '../services/uploadService';
import { UploadProgress } from '../types';

export const useUploads = () => {
  const [uploads, setUploads] = useState<UploadProgress[]>([]);
  const [activeUploads, setActiveUploads] = useState<UploadProgress[]>([]);
  const [completedUploads, setCompletedUploads] = useState<UploadProgress[]>([]);
  const [failedUploads, setFailedUploads] = useState<UploadProgress[]>([]);

  // Update uploads periodically
  useEffect(() => {
    const interval = setInterval(() => {
      const allUploads = uploadService.getAllUploads();
      setUploads(allUploads);
      setActiveUploads(uploadService.getActiveUploads());
      setCompletedUploads(uploadService.getCompletedUploads());
      setFailedUploads(uploadService.getFailedUploads());
    }, 500);

    // Initial load
    const allUploads = uploadService.getAllUploads();
    setUploads(allUploads);
    setActiveUploads(uploadService.getActiveUploads());
    setCompletedUploads(uploadService.getCompletedUploads());
    setFailedUploads(uploadService.getFailedUploads());

    return () => clearInterval(interval);
  }, []);

  const startUpload = useCallback(
    async (
      file: File,
      channelId: string,
      onProgress?: (progress: UploadProgress) => void,
      onComplete?: (fileId: string, file: any) => void,
      onError?: (error: string, retryable: boolean) => void
    ) => {
      return uploadService.startUpload(file, channelId, onProgress, onComplete, onError);
    },
    []
  );

  const pauseUpload = useCallback((uploadId: string) => {
    uploadService.pauseUpload(uploadId);
  }, []);

  const resumeUpload = useCallback((uploadId: string) => {
    uploadService.resumeUpload(uploadId);
  }, []);

  const cancelUpload = useCallback((uploadId: string) => {
    uploadService.cancelUpload(uploadId);
  }, []);

  const retryUpload = useCallback(async (uploadId: string) => {
    await uploadService.retryUpload(uploadId);
  }, []);

  const clearCompleted = useCallback(() => {
    uploadService.clearCompleted();
  }, []);

  const getUploadProgress = useCallback((uploadId: string) => {
    return uploadService.getUploadProgress(uploadId);
  }, []);

  return {
    uploads,
    activeUploads,
    completedUploads,
    failedUploads,
    startUpload,
    pauseUpload,
    resumeUpload,
    cancelUpload,
    retryUpload,
    clearCompleted,
    getUploadProgress,
    formatFileSize: uploadService.formatFileSize
  };
};