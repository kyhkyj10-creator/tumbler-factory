export interface StorageInfo {
  storage: 'mock' | 'live';
  label: '내 컴퓨터(mock)' | 'Google 시트·드라이브(live)';
}

export function getStorageInfo(): StorageInfo {
  if (process.env.STORAGE_MODE === 'live') {
    return { storage: 'live', label: 'Google 시트·드라이브(live)' };
  }

  return { storage: 'mock', label: '내 컴퓨터(mock)' };
}