import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { PrinterAgentModel } from './entities/printer-agent.entity';
import { PrinterJobModel } from './entities/printer-job.entity';
import { PrinterAgentService } from './printer-agent.service';
import { PrinterAgentController } from './printer-agent.controller';
import { PrinterAgentGateway } from './printer-agent.gateway';

@Module({
  imports: [
    SequelizeModule.forFeature([PrinterAgentModel, PrinterJobModel]),
  ],
  controllers: [PrinterAgentController],
  providers: [PrinterAgentService, PrinterAgentGateway],
  exports: [PrinterAgentService, PrinterAgentGateway],
})
export class PrinterAgentModule {}
