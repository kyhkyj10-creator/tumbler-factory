import { Module } from '@nestjs/common';
import { ApiFallbackController } from './api-fallback.controller';
import { AuthController } from './auth.controller';
import { CatalogController } from './catalog.controller';
import { InspectionsController } from './inspections.controller';
import { InspectionStore } from './inspection.store';

@Module({
  controllers: [AuthController, CatalogController, InspectionsController, ApiFallbackController],
  providers: [InspectionStore],
})
export class AppModule {}