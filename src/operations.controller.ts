import { Controller, Get } from '@nestjs/common';
import { getStorageInfo, type StorageInfo } from './storage-mode';
import { getGeminiInfo, type GeminiInfo } from './gemini-mode';

@Controller('api/operations')
export class OperationsController {
  @Get()
  getOperations(): StorageInfo & GeminiInfo {
    return { ...getStorageInfo(), ...getGeminiInfo() };
  }
}