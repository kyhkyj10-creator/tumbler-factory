import { Injectable } from '@nestjs/common';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import type { Inspection } from './inspection.types';
import type { GeminiResultFields, GeminiResultRecord, GeminiRunState, GeminiRunStatus } from './gemini-result.types';
import { getGeminiInfo } from './gemini-mode';
import { getStorageInfo } from './storage-mode';

const { normalizeGeminiResult } = require(path.join(__dirname, '..', 'shared', 'gemini-result.js')) as {
  normalizeGeminiResult: (value: unknown) => GeminiResultFields | null;
};

interface RunState {
  state: GeminiRunState;
  error?: string;
}

@Injectable()
export class GeminiResultStore {
  private readonly filePath = path.join(process.cwd(), 'runtime', 'gemini-results.json');
  private readonly runStates = new Map<string, RunState>();

  async getStatus(inspection: Inspection): Promise<GeminiRunStatus> {
    const results = this.readLocalResults()
      .filter((record) => record.inspection_id === inspection.inspection_id)
      .sort((left, right) => right.created_at.localeCompare(left.created_at));
    const state = this.runStates.get(inspection.inspection_id) ?? { state: 'idle' as const };
    const latest = results[0];
    const stale = Boolean(
      latest &&
        (latest.product_id !== inspection.product_id ||
          latest.weight_g !== inspection.weight_g ||
          JSON.stringify(latest.images) !== JSON.stringify(inspection.images)),
    );

    return {
      mode: getGeminiInfo().gemini_mode,
      state: state.state,
      ...(state.state === 'failed' && state.error ? { error: state.error } : {}),
      results,
      stale,
    };
  }

  async startMock(
    inspection: Inspection,
    revision: 'Rev.A' | 'Rev.B',
    instructionName: string,
    instructionText: string,
  ): Promise<GeminiRunStatus> {
    if (getStorageInfo().storage !== 'mock') {
      throw new Error('연습용 판독은 내 컴퓨터 저장에서만 사용할 수 있습니다.');
    }

    this.runStates.set(inspection.inspection_id, { state: 'running' });
    const snapshot = { ...inspection, images: [...inspection.images] };
    setTimeout(() => {
      void this.completeMock(snapshot, revision, instructionName, instructionText);
    }, 1500);

    return {
      mode: 'mock',
      state: 'running',
      results: [],
      stale: false,
    };
  }

  private async completeMock(
    inspection: Inspection,
    revision: 'Rev.A' | 'Rev.B',
    instructionName: string,
    instructionText: string,
  ): Promise<void> {
    try {
      const weight = inspection.weight_g === null ? '미측정' : `${inspection.weight_g}g`;
      const result = normalizeGeminiResult({
        판정: 'HOLD',
        불량유형: '[모의 테스트 초안] 실제 사진 판독은 하지 않았습니다.',
        '관찰·수치 근거': `[모의 테스트 초안] 중량 ${weight}. 실제 사진 판독은 하지 않았습니다.`,
        '적용 기준과 출처': `[모의 테스트 초안] ${revision}을 선택했습니다.`,
        '권고 조치': '[모의 테스트 초안] 사람이 사진과 측정값을 확인해 주세요.',
        '사람 승인 필요 여부': '[모의 테스트 초안] 사람의 확인이 필요합니다.',
      });
      if (!result) throw new Error('연습용 판독 결과를 만들지 못했습니다.');

      this.saveLocalResult({
        result_id: `GR-${randomBytes(4).toString('hex')}`,
        inspection_id: inspection.inspection_id,
        created_at: this.koreanDateTime(),
        mode: 'mock',
        revision,
        instruction_name: instructionName,
        instruction_text: instructionText,
        product_id: inspection.product_id,
        weight_g: inspection.weight_g,
        images: [...inspection.images],
        result,
      });
      this.runStates.set(inspection.inspection_id, { state: 'idle' });
    } catch (error) {
      this.runStates.set(inspection.inspection_id, {
        state: 'failed',
        error: error instanceof Error ? error.message : '판독 결과를 저장하지 못했습니다.',
      });
    }
  }

  private saveLocalResult(record: GeminiResultRecord): void {
    const records = this.readLocalResults();
    records.push(record);
    mkdirSync(path.dirname(this.filePath), { recursive: true });
    const temporaryPath = `${this.filePath}.tmp`;
    writeFileSync(temporaryPath, `${JSON.stringify(records, null, 2)}\n`, 'utf8');
    renameSync(temporaryPath, this.filePath);
  }

  private readLocalResults(): GeminiResultRecord[] {
    if (!existsSync(this.filePath)) return [];
    const value: unknown = JSON.parse(readFileSync(this.filePath, 'utf8'));
    return Array.isArray(value) ? (value as GeminiResultRecord[]) : [];
  }

  private koreanDateTime(): string {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Seoul',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day} ${values.hour}:${values.minute}:${values.second}`;
  }
}