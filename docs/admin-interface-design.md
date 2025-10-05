# Admin Interface Design

## Overview

The admin interface provides comprehensive management capabilities for system administrators to oversee channels, users, files, and system settings. It's designed to be intuitive while providing powerful tools for managing the FTP file management system.

## Admin Dashboard Layout

```
┌─────────────────────────────────────────────────────────────────┐
│  FTP Manager Admin                                    [Logout]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐  ┌─────────┐ │
│  │   Channels  │  │    Users    │  │    Files    │  │ System  │ │
│  │    12       │  │    48       │  │   1,247     │  │ Health  │ │
│  │   Active    │  │   Active    │  │   Total     │  │  Good   │ │
│  └─────────────┘  └─────────────┘  └─────────────┘  └─────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Quick Actions                           │ │
│  │  [+ New Channel]  [+ New User]  [System Sync]  [Settings]  │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Recent Activity                         │ │
│  │  • User john@example.com uploaded 3 files to Love Channel   │ │
│  │  • New user jane@example.com added to Jammy Channel        │ │
│  │  • System sync completed for Music Channel (12 new files)   │ │
│  │  • Storage usage at 75% (3.7GB of 5GB)                     │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Channel Management Interface

### Channel List View

```
┌─────────────────────────────────────────────────────────────────┐
│  Channel Management                            [+ New Channel]   │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Search: [________________]  Filter: [Active ▼]  [Sync All]    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Channel Name    │ Slug    │ Files │ Users │ Storage │ Status │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Love Channel    │ love    │ 125   │ 8     │ 2.1GB   │ Active │ │
│  │ [Edit] [Delete] │         │       │       │         │        │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Jammy Channel   │ jammy   │ 87    │ 5     │ 1.5GB   │ Active │ │
│  │ [Edit] [Delete] │         │       │       │         │        │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ Music Channel   │ music   │ 342   │ 12    │ 3.2GB   │ Active │ │
│  │ [Edit] [Delete] │         │       │       │         │        │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ News Channel    │ news    │ 45    │ 3     │ 0.8GB   │ Inactive│ │
│  │ [Edit] [Delete] │         │       │       │         │        │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Showing 4 of 12 channels    [◀ Previous] [1] [2] [3] [Next ▶]   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Channel Detail View

```
┌─────────────────────────────────────────────────────────────────┐
│  Love Channel Details                                    [Back] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐ │
│  │  Channel Info       │  │  Channel Statistics                 │ │
│  │                     │  │                                     │ │
│  │ Name: Love Channel  │  │ Total Files: 125                    │ │
│  │ Slug: love          │  │ Total Size: 2.1GB                  │ │
│  │ Description: Love   │  │ Uploads Today: 7                   │ │
│  │ channel content     │  │ Active Users: 8                    │ │
│  │ FTP Path: /love     │  │ Last Sync: 2 hours ago             │ │
│  │ Status: Active      │  │                                     │ │
│  │ Created: Jan 1, 2023│  │ [Sync Now] [Export Data]            │ │
│  │                     │  │                                     │ │
│  │ [Edit Channel]      │  │                                     │ │
│  └─────────────────────┘  └─────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Channel Users                                    [+ User]  │ │
│  │                                                     │ │
│  │ Email              │ Role     │ Files │ Last Login │ Action │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ john@example.com  │ User     │ 45    │ 2h ago    │[Remove]│ │
│  │ jane@example.com  │ User     │ 23    │ 1d ago    │[Remove]│ │
│  │ mike@example.com  │ User     │ 67    │ 3h ago    │[Remove]│ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Create/Edit Channel Form

```
┌─────────────────────────────────────────────────────────────────┐
│  Create New Channel                                    [Cancel] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Channel Information                                           │
│  ───────────────────────────────────────────────────────────  │
│                                                                 │
│  Channel Name:                                                 │
│  [_________________________________________________]           │
│                                                                 │
│  Channel Slug:                                                 │
│  [_________________________________________________]           │
│  (Used for URL and FTP folder name)                            │
│                                                                 │
│  Description:                                                  │
│  [_________________________________________________]           │
│  [_________________________________________________]           │
│  [_________________________________________________]           │
│                                                                 │
│  FTP Path:                                                     │
│  [/_________________________________________________]           │
│  (Path on FTP server where files will be stored)               │
│                                                                 │
│  Status:                                                       │
│  ○ Active  ○ Inactive                                         │
│                                                                 │
│  ───────────────────────────────────────────────────────────  │
│                                                                 │
│                        [Create Channel]                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## User Management Interface

### User List View

```
┌─────────────────────────────────────────────────────────────────┐
│  User Management                                    [+ New User] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Search: [________________]  Role: [All ▼]  Status: [Active ▼] │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ Email              │ Role    │ Channels │ Files │ Last Login │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ john@example.com  │ User    │ love    │ 45    │ 2h ago     │ │
│  │                    │         │ jammy   │       │            │ │
│  │ [Edit] [Delete]    │         │         │       │            │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ jane@example.com  │ User    │ love    │ 23    │ 1d ago     │ │
│  │                    │         │ music   │       │            │ │
│  │ [Edit] [Delete]    │         │         │       │            │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ admin@example.com │ Admin   │ All     │ 0     │ 30m ago    │ │
│  │ [Edit] [Delete]    │         │         │       │            │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Showing 3 of 48 users     [◀ Previous] [1] [2] [3] [Next ▶]    │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### Create/Edit User Form

```
┌─────────────────────────────────────────────────────────────────┐
│  Create New User                                      [Cancel] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  User Information                                              │
│  ───────────────────────────────────────────────────────────  │
│                                                                 │
│  Email Address:                                                │
│  [_________________________________________________]           │
│                                                                 │
│  Password:                                                     │
│  [_________________________________________________]           │
│  [Show Password]                                               │
│                                                                 │
│  Role:                                                         │
│  ○ Channel User  ● Admin                                      │
│                                                                 │
│  Channel Assignments:                                          │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ☑ Love Channel      ☑ Jammy Channel                        │ │
│  │ ☐ Music Channel     ☐ News Channel                         │ │
│  │ ☐ Sports Channel   ☐ Tech Channel                          │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  Status:                                                       │
│  ● Active  ○ Inactive                                         │
│                                                                 │
│  ───────────────────────────────────────────────────────────  │
│                                                                 │
│                        [Create User]                           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## File Management Interface

### File List View

```
┌─────────────────────────────────────────────────────────────────┐
│  File Management                                    [Bulk Actions]│
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Channel: [All ▼]  Search: [________________]  Type: [All ▼]    │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ ☐ │ File Name        │ Channel │ Size   │ Uploaded │ Action │ │
│  ├─────────────────────────────────────────────────────────────┤ │
│  │ ☐ │ love-song.mp3    │ Love    │ 3.2MB  │ 2h ago   │[DL][Del]│ │
│  │ ☐ │ podcast-ep1.mp3  │ Love    │ 15.7MB │ 1d ago   │[DL][Del]│ │
│  │ ☐ │ jam-mix.wav      │ Jammy   │ 8.4MB  │ 3d ago   │[DL][Del]│ │
│  │ ☐ │ music-track.mp4  │ Music   │ 25.1MB │ 1w ago   │[DL][Del]│ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  [Delete Selected] [Download Selected]  Showing 4 of 1,247 files │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### File Detail Modal

```
┌─────────────────────────────────────────────────────────────────┐
│  File Details                                           [×]     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  File Name: love-song.mp3                                      │
│  Original Name: love-song-final.mp3                            │
│  Size: 3.2MB                                                   │
│  Type: Audio/MPEG                                               │
│  Channel: Love Channel                                          │
│  Uploaded By: john@example.com                                  │
│  Upload Date: January 15, 2023 at 2:30 PM                      │
│  FTP Path: /love/love-song.mp3                                 │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │                    Preview                                  │ │
│  │                                                             │ │
│  │      [▶] Audio Player Controls                              │ │
│  │      ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │ │
│  │      0:00                    ━━━━━━━━━━                  3:45 │ │
│  │                                                             │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ───────────────────────────────────────────────────────────  │
│                                                                 │
│  [Download] [Delete] [View FTP Logs] [Edit Metadata]            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## System Settings Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  System Settings                                        [Save] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐ │
│  │  FTP Configuration   │  │  Upload Settings                   │ │
│  │                     │  │                                     │ │
│  │ Host: [____________]│  │ Max File Size: [5____] GB          │ │
│  │ Port: [21]          │  │ Chunk Size: [5____] MB             │ │
│  │ User: [____________]│  │ Concurrent Uploads: [3]            │ │
│  │ Pass: [********]    │  │ Retry Attempts: [3]                │ │
│  │                     │  │                                     │ │
│  │ [Test Connection]   │  │ [Save Settings]                     │ │
│  └─────────────────────┘  └─────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────┐  ┌─────────────────────────────────────┐ │
│  │  Security Settings  │  │  System Information                 │ │
│  │                     │  │                                     │ │
│  │ Session Timeout:    │  │ Version: 1.0.0                     │ │
│  │ [24____] hours      │  │ Uptime: 5 days, 12 hours           │ │
│  │                     │  │ Storage Used: 3.7GB / 5GB           │ │
│  │ Password Policy:    │  │ Active Users: 48                   │ │
│  │ [Min Length: 8]     │  │ Total Files: 1,247                 │ │
│  │                     │  │ Last Backup: 2 hours ago            │ │
│  │ [Save Settings]     │  │                                     │ │
│  └─────────────────────┘  └─────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Reports & Analytics Interface

```
┌─────────────────────────────────────────────────────────────────┐
│  Reports & Analytics                                   [Export] │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  Time Range: [Last 30 Days ▼]  Channels: [All ▼]  [Generate]   │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Storage Usage Trend                                        │ │
│  │                                                             │ │
│  │   5GB ┤                                                    │ │
│  │        │    ●                                              │ │
│  │   4GB ┤   ╱ ╲                                             │ │
│  │        │  ╱   ╲                                            │ │
│  │   3GB ┤ ╱     ●                                            │ │
│  │        │╱       ╲                                          │ │
│  │   2GB ┤●         ╲                                         │ │
│  │        │           ╲                                        │ │
│  │   1GB ┤            ●                                       │ │
│  │        └───────────────────────────────────                │ │
│  │          Jan 1    Jan 7    Jan 14    Jan 21    Jan 28       │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Upload Activity by Channel                                  │ │
│  │                                                             │ │
│  │ Love Channel    ████████████████████░░░  85%                │ │
│  │ Jammy Channel   ████████████████░░░░░░░  70%                │ │
│  │ Music Channel   ████████████████████████ 100%               │ │
│  │ News Channel    ████████░░░░░░░░░░░░░░░░  35%                │ │
│  │ Sports Channel  ██████████░░░░░░░░░░░░░  60%                │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │  Top Users by Upload Count                                   │ │
│  │                                                             │ │
│  │ 1. john@example.com  - 45 files (18.2MB)                   │ │
│  │ 2. mike@example.com  - 38 files (15.7MB)                   │ │
│  │ 3. jane@example.com  - 32 files (12.4MB)                   │ │
│  │ 4. sarah@example.com - 28 files (9.8MB)                    │ │
│  │ 5. tom@example.com   - 24 files (8.1MB)                    │ │
│  └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## Admin Component Architecture

### Component Structure

```
AdminApp
├── AdminLayout
│   ├── AdminHeader
│   ├── AdminSidebar
│   └── AdminFooter
├── Dashboard
│   ├── StatsCards
│   ├── QuickActions
│   └── RecentActivity
├── ChannelManagement
│   ├── ChannelList
│   ├── ChannelDetail
│   ├── ChannelForm
│   └── ChannelUsers
├── UserManagement
│   ├── UserList
│   ├── UserDetail
│   ├── UserForm
│   └── UserChannels
├── FileManagement
│   ├── FileList
│   ├── FileDetail
│   ├── FilePreview
│   └── FileActions
├── SystemSettings
│   ├── FTPSettings
│   ├── UploadSettings
│   ├── SecuritySettings
│   └── SystemInfo
└── Reports
    ├── StorageAnalytics
    ├── UserAnalytics
    ├── ChannelAnalytics
    └── ExportTools
```

### Key Features Implementation

#### 1. Data Tables with Advanced Filtering

```javascript
const useAdminData = (endpoint, initialFilters = {}) => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState(initialFilters);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0
  });

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const response = await api.get(endpoint, {
        params: { ...filters, ...pagination }
      });
      setData(response.data.items);
      setPagination(prev => ({
        ...prev,
        total: response.data.total
      }));
    } catch (error) {
      console.error('Error fetching data:', error);
    } finally {
      setLoading(false);
    }
  }, [endpoint, filters, pagination]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    data,
    loading,
    filters,
    setFilters,
    pagination,
    setPagination,
    refetch: fetchData
  };
};
```

#### 2. Bulk Actions

```javascript
const useBulkActions = (items, fetchData) => {
  const [selectedItems, setSelectedItems] = useState([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map(item => item.id));
    }
  };

  const handleSelectItem = (itemId) => {
    setSelectedItems(prev => {
      if (prev.includes(itemId)) {
        return prev.filter(id => id !== itemId);
      } else {
        return [...prev, itemId];
      }
    });
  };

  const executeBulkAction = async (action) => {
    setBulkActionLoading(true);
    try {
      await api.post('/admin/bulk-actions', {
        action,
        itemIds: selectedItems
      });
      setSelectedItems([]);
      fetchData();
    } catch (error) {
      console.error('Error executing bulk action:', error);
    } finally {
      setBulkActionLoading(false);
    }
  };

  return {
    selectedItems,
    handleSelectAll,
    handleSelectItem,
    executeBulkAction,
    bulkActionLoading,
    hasSelection: selectedItems.length > 0
  };
};
```

#### 3. Real-time Updates

```javascript
const useAdminWebSocket = () => {
  const [notifications, setNotifications] = useState([]);
  const socketRef = useRef(null);

  useEffect(() => {
    socketRef.current = new WebSocket(WS_URL);
    
    socketRef.current.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'user_activity':
          setNotifications(prev => [data.payload, ...prev.slice(0, 9)]);
          break;
        case 'system_alert':
          // Handle system alerts
          break;
        case 'sync_complete':
          // Handle sync completion
          break;
      }
    };

    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, []);

  return notifications;
};
```

## Responsive Design for Admin Interface

### Mobile/Tablet View

```
┌─────────────────────┐
│ ☰  Admin     [Logout]│
├─────────────────────┤
│                     │
│ Dashboard           │
│ ┌─────────────────┐ │
│ │ Channels: 12    │ │
│ │ Users: 48       │ │
│ │ Files: 1,247    │ │
│ └─────────────────┘ │
│                     │
│ Quick Actions       │
│ [+ New Channel]     │
│ [+ New User]        │
│                     │
│ Recent Activity     │
│ • John uploaded...  │
│ • New user added... │
│                     │
└─────────────────────┘
```

This admin interface design provides comprehensive management capabilities with an intuitive layout, powerful features, and responsive design for administrators to effectively manage the FTP file management system.