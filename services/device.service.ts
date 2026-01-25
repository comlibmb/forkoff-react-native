import { apiClient } from './api.client';
import { Device, PaginatedResponse } from '@/types';
import { mockDevices } from '@/mocks/devices';

const USE_MOCKS = process.env.EXPO_PUBLIC_USE_MOCKS === 'true';

class DeviceService {
  async getDevices(): Promise<Device[]> {
    if (USE_MOCKS) {
      return mockDevices;
    }

    return apiClient.get<Device[]>('/devices');
  }

  async getDevice(id: string): Promise<Device> {
    if (USE_MOCKS) {
      const device = mockDevices.find((d) => d.id === id);
      if (!device) {
        throw new Error('Device not found');
      }
      return device;
    }

    return apiClient.get<Device>(`/devices/${id}`);
  }

  async pairDevice(pairingCode: string): Promise<Device> {
    if (USE_MOCKS) {
      // Simulate pairing delay
      await new Promise((resolve) => setTimeout(resolve, 1500));
      return {
        id: `device-${Date.now()}`,
        name: 'New Device',
        type: 'desktop',
        status: 'online',
        platform: 'windows',
        lastSeen: new Date().toISOString(),
        connectedTools: [],
        userId: 'user-1',
      };
    }

    return apiClient.post<Device>('/devices/pair', { pairingCode });
  }

  async renameDevice(id: string, name: string): Promise<Device> {
    if (USE_MOCKS) {
      const device = mockDevices.find((d) => d.id === id);
      if (!device) {
        throw new Error('Device not found');
      }
      return { ...device, name };
    }

    return apiClient.patch<Device>(`/devices/${id}`, { name });
  }

  async removeDevice(id: string): Promise<void> {
    if (USE_MOCKS) {
      return;
    }

    await apiClient.delete(`/devices/${id}`);
  }

  async refreshDeviceStatus(id: string): Promise<Device> {
    if (USE_MOCKS) {
      const device = mockDevices.find((d) => d.id === id);
      if (!device) {
        throw new Error('Device not found');
      }
      return device;
    }

    return apiClient.post<Device>(`/devices/${id}/refresh`);
  }

  async getDeviceActivity(id: string, page = 1, pageSize = 20): Promise<PaginatedResponse<unknown>> {
    if (USE_MOCKS) {
      return {
        data: [],
        total: 0,
        page,
        pageSize,
        hasMore: false,
      };
    }

    return apiClient.get<PaginatedResponse<unknown>>(
      `/devices/${id}/activity`,
      { params: { page, pageSize } }
    );
  }
}

export const deviceService = new DeviceService();
export default deviceService;
