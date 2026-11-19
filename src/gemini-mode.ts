import { BadRequestException } from '@nestjs/common';
import { getStorageInfo } from './storage-mode';

export type GeminiMode = 'off' | 'mock' | 'live';

export interface GeminiInfo {
  gemini_mode: GeminiMode;
  gemini_label: '꺼짐(off)' | '연습용(mock)' | '실제 Gemini(live)';
}

const labels: Record<GeminiMode, GeminiInfo['gemini_label']> = {
  off: '꺼짐(off)',
  mock: '연습용(mock)',
  live: '실제 Gemini(live)',
};

export function getGeminiInfo(): GeminiInfo {
  const configured = process.env.GEMINI_MODE;
  let mode: GeminiMode;

  if (configured === undefined || configured === '') {
    mode = getStorageInfo().storage === 'live' ? 'live' : 'off';
  } else if (configured === 'off' || configured === 'mock' || configured === 'live') {
    mode = configured;
  } else {
    throw new BadRequestException('GEMINI_MODE를 off, mock, live 가운데 하나로 설정하세요.');
  }

  const storage = getStorageInfo().storage;
  if (storage === 'mock' && mode === 'live') {
    throw new BadRequestException('STORAGE_MODE=mock에서는 GEMINI_MODE=live를 사용할 수 없습니다.');
  }
  if (storage === 'live' && mode === 'mock') {
    throw new BadRequestException('STORAGE_MODE=live에서는 GEMINI_MODE=mock을 사용할 수 없습니다.');
  }

  return { gemini_mode: mode, gemini_label: labels[mode] };
}

export function validateGeminiMode(): void {
  getGeminiInfo();
}