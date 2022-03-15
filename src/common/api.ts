import { sendCommand } from './browser';
import type { ListData, ConfigStorage, FeatureToggles } from '../types';

export async function loadLists() {
  return (await sendCommand('GetLists')) as {
    [key: string]: ListData[];
  };
}

export async function loadData() {
  return (await sendCommand('GetData')) as {
    config: ConfigStorage | undefined;
    features: FeatureToggles;
    listErrors: { [id: number]: string };
  };
}
