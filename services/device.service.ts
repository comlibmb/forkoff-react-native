import AsyncStorage from '@react-native-async-storage/async-storage';
import { Device } from '@/types';
import { sentryService } from './sentry.service';

const ASYNC_DEVICES_KEY = '@forkoff/devices';

/**
 * Device service — local AsyncStorage-backed CRUD.
 * No server calls. Device data comes from pairing events and WS status updates.
 */
class DeviceService {
  async getDevices(): Promise<Device[]> {
    try {
      const raw = await AsyncStorage.getItem(ASYNC_DEVICES_KEY);
      if (!raw) return [];

      const devices = JSON.parse(raw);
      if (!Array.isArray(devices)) return [];

      // Validate structure to prevent corrupted data
      return devices.filter(
        (d: any) => typeof d.id === 'string' && typeof d.name === 'string'
      );
    } catch (error) {
      sentryService.captureException(error as Error, { context: 'get_devices' });
      return [];
    }
  }

  async getDevice(id: string): Promise<Device | null> {
    const devices = await this.getDevices();
    return devices.find((d) => d.id === id) || null;
  }

  async saveDevice(device: Device): Promise<Device> {
    const devices = await this.getDevices();
    const existing = devices.findIndex((d) => d.id === device.id);

    if (existing >= 0) {
      devices[existing] = { ...devices[existing], ...device };
    } else {
      devices.push(device);
    }

    await AsyncStorage.setItem(ASYNC_DEVICES_KEY, JSON.stringify(devices));
    return existing >= 0 ? devices[existing] : device;
  }

  async renameDevice(id: string, name: string): Promise<Device> {
    const devices = await this.getDevices();
    const device = devices.find((d) => d.id === id);
    if (!device) throw new Error('Device not found');

    device.name = name;
    await AsyncStorage.setItem(ASYNC_DEVICES_KEY, JSON.stringify(devices));
    return device;
  }

  async removeDevice(id: string): Promise<void> {
    const devices = await this.getDevices();
    const filtered = devices.filter((d) => d.id !== id);
    await AsyncStorage.setItem(ASYNC_DEVICES_KEY, JSON.stringify(filtered));
  }

  async updateDeviceStatus(
    id: string,
    status: Device['status'],
    lastSeenAt?: string,
    cliVersion?: string
  ): Promise<void> {
    const devices = await this.getDevices();
    const device = devices.find((d) => d.id === id);
    if (!device) return;

    device.status = status;
    if (lastSeenAt) {
      device.lastSeen = lastSeenAt;
      device.lastSeenAt = lastSeenAt;
    }
    if (cliVersion) {
      device.cliVersion = cliVersion;
    }

    await AsyncStorage.setItem(ASYNC_DEVICES_KEY, JSON.stringify(devices));
  }

  async clearAll(): Promise<void> {
    await AsyncStorage.removeItem(ASYNC_DEVICES_KEY);
  }
}

export const deviceService = new DeviceService();
export default deviceService;
