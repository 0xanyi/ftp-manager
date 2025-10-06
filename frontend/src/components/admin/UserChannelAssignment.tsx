import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { ApiResponse } from '../../types';
import Button from '../Button';
import {
  FolderOpen,
  Users,
  ArrowLeft,
  ArrowRight,
  RefreshCw,
  Save,
  X
} from 'lucide-react';

interface Channel {
  id: string;
  name: string;
  slug: string;
  description?: string;
  isActive?: boolean;
}

interface UserChannelAssignmentProps {
  userId: string;
  userName: string;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

const UserChannelAssignment: React.FC<UserChannelAssignmentProps> = ({
  userId,
  userName,
  isOpen,
  onClose,
  onSave
}) => {
  const [assignedChannels, setAssignedChannels] = useState<Channel[]>([]);
  const [availableChannels, setAvailableChannels] = useState<Channel[]>([]);
  const [selectedAvailable, setSelectedAvailable] = useState<string[]>([]);
  const [selectedAssigned, setSelectedAssigned] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch channels when modal opens
  useEffect(() => {
    if (isOpen && userId) {
      fetchChannels();
    }
  }, [isOpen, userId]);

  const fetchChannels = async () => {
    try {
      setLoading(true);
      setError(null);

      const response: ApiResponse<{
        assignedChannels: Channel[];
        availableChannels: Channel[];
      }> = await adminService.getUserChannels(userId);

      if (response.success && response.data) {
        setAssignedChannels(response.data.assignedChannels);
        setAvailableChannels(response.data.availableChannels);
      } else {
        throw new Error(response.error?.message || 'Failed to fetch channels');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  // Handle adding channels to assignment
  const handleAddChannels = () => {
    if (selectedAvailable.length === 0) return;

    const channelsToAdd = availableChannels.filter(ch =>
      selectedAvailable.includes(ch.id)
    );

    setAssignedChannels(prev => [...prev, ...channelsToAdd]);
    setAvailableChannels(prev =>
      prev.filter(ch => !selectedAvailable.includes(ch.id))
    );
    setSelectedAvailable([]);
  };

  // Handle removing channels from assignment
  const handleRemoveChannels = () => {
    if (selectedAssigned.length === 0) return;

    const channelsToRemove = assignedChannels.filter(ch =>
      selectedAssigned.includes(ch.id)
    );

    setAvailableChannels(prev => [...prev, ...channelsToRemove]);
    setAssignedChannels(prev =>
      prev.filter(ch => !selectedAssigned.includes(ch.id))
    );
    setSelectedAssigned([]);
  };

  // Handle save
  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);

      const channelIds = assignedChannels.map(ch => ch.id);
      const response = await adminService.updateUserChannels(userId, channelIds);

      if (response.success) {
        onSave();
        onClose();
      } else {
        throw new Error(response.error?.message || 'Failed to update channel assignments');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSaving(false);
    }
  };

  // Handle channel selection
  const handleSelectAvailable = (channelId: string) => {
    setSelectedAvailable(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  const handleSelectAssigned = (channelId: string) => {
    setSelectedAssigned(prev =>
      prev.includes(channelId)
        ? prev.filter(id => id !== channelId)
        : [...prev, channelId]
    );
  };

  // Select/deselect all
  const handleSelectAllAvailable = () => {
    if (selectedAvailable.length === availableChannels.length) {
      setSelectedAvailable([]);
    } else {
      setSelectedAvailable(availableChannels.map(ch => ch.id));
    }
  };

  const handleSelectAllAssigned = () => {
    if (selectedAssigned.length === assignedChannels.length) {
      setSelectedAssigned([]);
    } else {
      setSelectedAssigned(assignedChannels.map(ch => ch.id));
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        {/* Background overlay */}
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        {/* Modal panel */}
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-6xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Manage Channel Assignments
                  </h3>
                  <p className="text-sm text-gray-500">
                    User: <span className="font-medium">{userName}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button
                  variant="secondary"
                  onClick={fetchChannels}
                  disabled={loading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                  Refresh
                </Button>
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-500 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Error state */}
            {error && (
              <div className="mb-4 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex">
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-red-800">Error</h3>
                    <div className="mt-2 text-sm text-red-700">
                      <p>{error}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Channel Assignment Interface */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Available Channels */}
              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Available Channels</h4>
                    <label className="flex items-center text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedAvailable.length === availableChannels.length && availableChannels.length > 0}
                        onChange={handleSelectAllAvailable}
                        className="mr-2"
                      />
                      Select All
                    </label>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                      <span className="text-gray-500">Loading...</span>
                    </div>
                  ) : availableChannels.length === 0 ? (
                    <div className="text-center py-8">
                      <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No available channels</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {availableChannels.map((channel) => (
                        <div
                          key={channel.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedAvailable.includes(channel.id)
                              ? 'border-blue-500 bg-blue-50'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleSelectAvailable(channel.id)}
                        >
                          <div className="flex items-start">
                            <input
                              type="checkbox"
                              checked={selectedAvailable.includes(channel.id)}
                              onChange={() => handleSelectAvailable(channel.id)}
                              className="mt-1 mr-3"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {channel.name}
                              </p>
                              {channel.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {channel.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {channel.slug}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Assignment Controls */}
              <div className="lg:col-span-1">
                <div className="flex flex-col items-center justify-center h-full py-8">
                  <div className="space-y-4">
                    <Button
                      onClick={handleAddChannels}
                      disabled={selectedAvailable.length === 0}
                      className="flex items-center"
                    >
                      <ArrowRight className="w-4 h-4 mr-2" />
                      Add Selected
                      {selectedAvailable.length > 0 && (
                        <span className="ml-2 bg-white bg-opacity-20 px-2 py-0.5 rounded text-xs">
                          {selectedAvailable.length}
                        </span>
                      )}
                    </Button>

                    <Button
                      variant="secondary"
                      onClick={handleRemoveChannels}
                      disabled={selectedAssigned.length === 0}
                      className="flex items-center"
                    >
                      <ArrowLeft className="w-4 h-4 mr-2" />
                      Remove Selected
                      {selectedAssigned.length > 0 && (
                        <span className="ml-2 bg-gray-200 px-2 py-0.5 rounded text-xs">
                          {selectedAssigned.length}
                        </span>
                      )}
                    </Button>
                  </div>

                  <div className="mt-8 text-center">
                    <p className="text-sm text-gray-500 mb-2">Statistics</p>
                    <div className="bg-gray-100 rounded-lg p-4">
                      <div className="text-2xl font-bold text-gray-900">
                        {assignedChannels.length}
                      </div>
                      <p className="text-xs text-gray-500">Assigned Channels</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Assigned Channels */}
              <div className="lg:col-span-1">
                <div className="bg-green-50 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-gray-900">Assigned Channels</h4>
                    <label className="flex items-center text-sm text-gray-600">
                      <input
                        type="checkbox"
                        checked={selectedAssigned.length === assignedChannels.length && assignedChannels.length > 0}
                        onChange={handleSelectAllAssigned}
                        className="mr-2"
                      />
                      Select All
                    </label>
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-8">
                      <RefreshCw className="w-6 h-6 animate-spin text-blue-500 mr-2" />
                      <span className="text-gray-500">Loading...</span>
                    </div>
                  ) : assignedChannels.length === 0 ? (
                    <div className="text-center py-8">
                      <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">No channels assigned</p>
                      <p className="text-xs text-gray-400 mt-2">
                        Select channels from the left to assign
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {assignedChannels.map((channel) => (
                        <div
                          key={channel.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                            selectedAssigned.includes(channel.id)
                              ? 'border-green-500 bg-green-100'
                              : 'border-gray-200 hover:border-gray-300'
                          }`}
                          onClick={() => handleSelectAssigned(channel.id)}
                        >
                          <div className="flex items-start">
                            <input
                              type="checkbox"
                              checked={selectedAssigned.includes(channel.id)}
                              onChange={() => handleSelectAssigned(channel.id)}
                              className="mt-1 mr-3"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">
                                {channel.name}
                              </p>
                              {channel.description && (
                                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                                  {channel.description}
                                </p>
                              )}
                              <p className="text-xs text-gray-400 mt-1">
                                {channel.slug}
                              </p>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              onClick={handleSave}
              disabled={saving || loading}
              className="w-full sm:w-auto"
            >
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  Save Assignments
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={saving}
              className="mt-3 sm:mt-0 sm:ml-3 sm:w-auto"
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserChannelAssignment;