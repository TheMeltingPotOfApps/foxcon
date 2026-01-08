import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';
import { DatabaseHealthService } from './database/database-health.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly databaseHealthService: DatabaseHealthService,
  ) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  async getHealth() {
    const dbStats = await this.databaseHealthService.getConnectionStats();
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      database: dbStats,
    };
  }
}

