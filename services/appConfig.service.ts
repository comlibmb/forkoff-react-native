import { createClient } from '@supabase/supabase-js';
import { sentryService } from './sentry.service';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface AppVersionConfig {
  minVersion: string;
  forceUpdate: boolean;
  updateMessage?: string;
}

export interface CliVersionConfig {
  minCliVersion: string;
  updateMessage?: string;
}

class AppConfigService {
  async fetchVersionConfig(): Promise<AppVersionConfig | null> {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'version')
        .single();

      if (error || !data) return null;
      return data.value as AppVersionConfig;
    } catch (e) {
      console.warn('[AppConfig] Failed to fetch version config:', e);
      sentryService.captureException(e, { context: 'app_config_version' });
      return null;
    }
  }

  async fetchCliVersionConfig(): Promise<CliVersionConfig | null> {
    try {
      const { data, error } = await supabase
        .from('app_config')
        .select('value')
        .eq('key', 'cli-version')
        .single();

      if (error || !data) return null;
      return data.value as CliVersionConfig;
    } catch (e) {
      console.warn('[AppConfig] Failed to fetch CLI version config:', e);
      sentryService.captureException(e, { context: 'app_config_cli_version' });
      return null;
    }
  }
}

export const appConfigService = new AppConfigService();
