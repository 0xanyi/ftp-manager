import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import { ApiResponse } from '../../types';
import Button from '../Button';
import {
  User as UserIcon,
  Mail,
  Shield,
  Lock,
  Save,
  X,
  Eye,
  EyeOff
} from 'lucide-react';

interface User {
  id: string;
  email: string;
  role: 'ADMIN' | 'CHANNEL_USER';
  isActive: boolean;
  createdAt: string;
  lastLoginAt?: string;
  _count: {
    channels: number;
  };
}

interface UserFormProps {
  user?: User | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
}

interface FormData {
  email: string;
  password: string;
  confirmPassword: string;
  role: 'ADMIN' | 'CHANNEL_USER';
  isActive: boolean;
}

interface FormErrors {
  email?: string;
  password?: string;
  confirmPassword?: string;
  role?: string;
}

const UserForm: React.FC<UserFormProps> = ({
  user,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    role: 'CHANNEL_USER',
    isActive: true
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Initialize form data when user changes
  useEffect(() => {
    if (user) {
      setFormData({
        email: user.email,
        password: '',
        confirmPassword: '',
        role: user.role,
        isActive: user.isActive
      });
    } else {
      setFormData({
        email: '',
        password: '',
        confirmPassword: '',
        role: 'CHANNEL_USER',
        isActive: true
      });
    }
    setErrors({});
  }, [user, isOpen]);

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Invalid email address';
    }

    // Password validation (only for new users or when password is being changed)
    if (!user || formData.password) {
      if (!formData.password) {
        newErrors.password = 'Password is required';
      } else if (formData.password.length < 8) {
        newErrors.password = 'Password must be at least 8 characters long';
      } else if (!/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(formData.password)) {
        newErrors.password = 'Password must contain at least one lowercase letter, one uppercase letter, one number, and one special character';
      }

      if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle form submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let response: ApiResponse<any>;

      if (user) {
        // Update existing user
        const updateData: any = {
          email: formData.email,
          role: formData.role,
          isActive: formData.isActive
        };

        // Only include password if it's being changed
        if (formData.password) {
          updateData.password = formData.password;
        }

        response = await adminService.updateUser(user.id, updateData);
      } else {
        // Create new user
        response = await adminService.createUser({
          email: formData.email,
          password: formData.password,
          role: formData.role
        });
      }

      if (response.success) {
        onSave();
        onClose();
      } else {
        throw new Error(response.error?.message || 'Failed to save user');
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';

      // Set specific error messages
      if (errorMessage.includes('email already exists')) {
        setErrors({ email: 'A user with this email already exists' });
      } else {
        alert(errorMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  // Handle input changes
  const handleInputChange = (field: keyof FormData, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));

    // Clear specific error when user starts typing
    if (errors[field as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
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
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 h-12 w-12 bg-blue-100 rounded-full flex items-center justify-center">
                  <UserIcon className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    {user ? 'Edit User' : 'Create New User'}
                  </h3>
                  <p className="text-sm text-gray-500">
                    {user ? 'Update user information and settings' : 'Add a new user to the system'}
                  </p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-500 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="email"
                    id="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.email ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="user@example.com"
                    disabled={loading}
                  />
                </div>
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password {user && '(leave blank to keep current)'}
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    value={formData.password}
                    onChange={(e) => handleInputChange('password', e.target.value)}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.password ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Enter password"
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="mt-1 text-sm text-red-600">{errors.password}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">
                  Must be at least 8 characters with uppercase, lowercase, number, and special character
                </p>
              </div>

              {/* Confirm Password */}
              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange('confirmPassword', e.target.value)}
                    className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                      errors.confirmPassword ? 'border-red-500' : 'border-gray-300'
                    }`}
                    placeholder="Confirm password"
                    disabled={loading || (!user && !formData.password)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
                {errors.confirmPassword && (
                  <p className="mt-1 text-sm text-red-600">{errors.confirmPassword}</p>
                )}
              </div>

              {/* Role */}
              <div>
                <label htmlFor="role" className="block text-sm font-medium text-gray-700 mb-2">
                  User Role
                </label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <select
                    id="role"
                    value={formData.role}
                    onChange={(e) => handleInputChange('role', e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent appearance-none"
                    disabled={loading}
                  >
                    <option value="CHANNEL_USER">Channel User</option>
                    <option value="ADMIN">Administrator</option>
                  </select>
                </div>
                <p className="mt-1 text-xs text-gray-500">
                  {formData.role === 'ADMIN'
                    ? 'Administrators have full system access and can manage all users and channels.'
                    : 'Channel users can only access assigned channels and upload/manage files.'}
                </p>
              </div>

              {/* Active Status (only for existing users) */}
              {user && (
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={formData.isActive}
                    onChange={(e) => handleInputChange('isActive', e.target.checked)}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    disabled={loading}
                  />
                  <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                    User is active
                  </label>
                </div>
              )}
            </form>
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <Button
              type="submit"
              onClick={handleSubmit}
              disabled={loading}
              className="w-full sm:w-auto"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                  {user ? 'Updating...' : 'Creating...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4 mr-2" />
                  {user ? 'Update User' : 'Create User'}
                </>
              )}
            </Button>
            <Button
              variant="secondary"
              onClick={onClose}
              disabled={loading}
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

export default UserForm;